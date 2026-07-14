"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Cpu,
  CheckCircle,
  AlertCircle,
  Play,
  Lock,
  Unlock,
  Edit2,
  X,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";

interface Generation {
  id: string;
  semester: string;
  semester_name: string;
  status: string;
  version: number;
  is_active: boolean;
  progress_percent: number;
  solve_time_seconds: number | null;
  conflicts: any[];
}

export default function TimetableManagementPage() {
  const queryClient = useQueryClient();
  const [semesterId, setSemesterId] = useState("");
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [activeTab, setActiveTab] = useState<"grid" | "solver">("grid");

  // Manual Edit Slot Modal
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [editRoom, setEditRoom] = useState("");
  const [editDay, setEditDay] = useState("0");
  const [editLock, setEditLock] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  // Polling states for Solver
  const [pollingGenId, setPollingGenId] = useState<string | null>(null);

  // Fetch semesters
  const { data: semestersList } = useQuery({
    queryKey: ["semesters-simple"],
    queryFn: () => apiClient.get("/semesters/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  // Automatically select first semester
  useEffect(() => {
    if (semestersList && semestersList.length > 0 && !semesterId) {
      const activeSem = semestersList.find((s: any) => s.is_current) || semestersList[0];
      setSemesterId(activeSem.id);
    }
  }, [semestersList]);

  // Fetch generations for selected semester
  const { data: generationsData } = useQuery({
    queryKey: ["generations", semesterId],
    queryFn: () =>
      apiClient.get(`/scheduling/generations/?semester=${semesterId}`).then((res) => res.data.results || res.data || []),
    enabled: !!semesterId,
  });

  const generations = Array.isArray(generationsData) ? generationsData : [];

  // Auto-select latest generation
  useEffect(() => {
    if (generations.length > 0 && !selectedGen) {
      const activeGen = generations.find((g) => g.is_active) || generations[0];
      setSelectedGen(activeGen);
    }
  }, [generations]);

  // Fetch sections for the program/semester selection
  const { data: sectionsList } = useQuery({
    queryKey: ["sections", semesterId],
    queryFn: () => apiClient.get(`/sections/?semester=${semesterId}`).then((res) => res.data.results || res.data || []),
    enabled: !!semesterId,
  });

  // Fetch timetable slots for the selected generation and section
  const { data: timetableData, isLoading: slotsLoading } = useQuery({
    queryKey: ["timetable-slots", selectedGen?.id],
    queryFn: () => apiClient.get(`/scheduling/generations/${selectedGen?.id}/timetable/`).then((res) => res.data),
    enabled: !!selectedGen && selectedGen.status === "COMPLETED",
  });

  // Fetch rooms for editing slots dropdown
  const { data: roomsList } = useQuery({
    queryKey: ["rooms-simple"],
    queryFn: () => apiClient.get("/rooms/?page_size=100").then((res) => res.data.results || res.data || []),
    enabled: !!editingSlot,
  });

  // Solver Polling effect
  useEffect(() => {
    if (!pollingGenId) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/scheduling/generations/${pollingGenId}/status_check/`);
        const { status: currentStatus, progress } = res.data;

        // Update list
        queryClient.invalidateQueries({ queryKey: ["generations"] });

        if (selectedGen && selectedGen.id === pollingGenId) {
          setSelectedGen((prev) => (prev ? { ...prev, status: currentStatus, progress_percent: progress } : null));
        }

        if (currentStatus === "COMPLETED") {
          toast.success("Timetable solved successfully!");
          setPollingGenId(null);
          queryClient.invalidateQueries({ queryKey: ["timetable-slots"] });
        } else if (currentStatus === "FAILED" || currentStatus === "INFEASIBLE") {
          toast.error(`Timetable solver run: ${currentStatus}`);
          setPollingGenId(null);
        }
      } catch {
        setPollingGenId(null);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingGenId, selectedGen]);

  // Trigger Solver Run Mutation
  const solveMutation = useMutation({
    mutationFn: (semId: string) => apiClient.post("/scheduling/generations/", { semester: semId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      setSelectedGen(res.data);
      setPollingGenId(res.data.id);
      setActiveTab("solver");
      toast.success("Solver started. Running constraints optimizer...");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to start solver");
    },
  });

  // Activate Timetable Mutation
  const activateMutation = useMutation({
    mutationFn: (genId: string) => apiClient.post(`/scheduling/generations/${genId}/activate/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      setSelectedGen((prev) => (prev ? { ...prev, is_active: true } : null));
      toast.success("Timetable activated for the university!");
    },
  });

  // Update Slot Mutation (Manual Moves)
  const updateSlotMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/scheduling/slots/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-slots"] });
      toast.success("Slot updated successfully!");
      setEditingSlot(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Conflict: Slot overlaps with another assignment");
    },
  });

  const handleSlotClick = (slot: any) => {
    setEditingSlot(slot);
    setEditRoom(slot.room?.id || "");
    setEditDay(slot.day.toString());
    setEditLock(slot.is_locked);
    setEditNotes(slot.notes || "");
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    updateSlotMutation.mutate({
      id: editingSlot.id,
      data: {
        room: editRoom,
        day: parseInt(editDay, 10),
        is_locked: editLock,
        notes: editNotes,
      },
    });
  };

  // Restructure the slots from generation/timetable API into the structure expected by TimetableGrid
  const rawSlots = timetableData?.timetable || {};
  const currentSectionName =
    sectionsList?.find((s: any) => s.id === selectedSectionId)?.name ||
    sectionsList?.[0]?.name;

  // Flatten slots for selected section
  const sectionSlots: any[] = [];
  Object.keys(rawSlots).forEach((dayKey) => {
    const daySectionSlots = rawSlots[dayKey][currentSectionName] || [];
    daySectionSlots.forEach((slot: any) => {
      sectionSlots.push({
        id: slot.id,
        day: slot.day,
        subject: { name: slot.subject_name, code: slot.subject_code },
        faculty: { name: slot.faculty_name },
        room: { number: slot.room_number },
        start_time: slot.time_slots_data?.start_time || "09:30",
        end_time: slot.time_slots_data?.end_time || "10:30",
        is_lab: slot.is_lab_block,
        is_locked: slot.is_locked,
      });
    });
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Timetable Scheduling</h1>
          <p className="text-white/50 text-sm mt-1">Select semester sessions, deploy CP-SAT solver solver algorithms</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={semesterId}
            onChange={(e) => {
              setSemesterId(e.target.value);
              setSelectedGen(null);
            }}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
          >
            {Array.isArray(semestersList) &&
              semestersList.map((s: any) => (
                <option key={s.id} value={s.id} className="bg-[#0a1628]">
                  {s.name}
                </option>
              ))}
          </select>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={solveMutation.isPending || !!pollingGenId}
            onClick={() => solveMutation.mutate(semesterId)}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Cpu className="w-5 h-5 animate-pulse" />
            Optimize schedule
          </motion.button>
        </div>
      </div>

      {/* Tabs / Generation Selectors */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 gap-4">
        <div className="flex gap-4 text-sm">
          <button
            onClick={() => setActiveTab("grid")}
            className={`pb-2 border-b-2 font-semibold transition-all ${
              activeTab === "grid" ? "border-tnu-accent text-white" : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            Schedule Grid
          </button>
          <button
            onClick={() => setActiveTab("solver")}
            className={`pb-2 border-b-2 font-semibold transition-all ${
              activeTab === "solver"
                ? "border-tnu-accent text-white"
                : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            Solver Runs ({generations.length})
          </button>
        </div>

        {activeTab === "grid" && generations.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-xs">Run Version:</span>
            <select
              value={selectedGen?.id || ""}
              onChange={(e) => setSelectedGen(generations.find((g) => g.id === e.target.value) || null)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
            >
              {generations.map((g) => (
                <option key={g.id} value={g.id} className="bg-[#0a1628]">
                  v{g.version} - {g.status} {g.is_active ? "[Active]" : ""}
                </option>
              ))}
            </select>
            {selectedGen?.status === "COMPLETED" && !selectedGen.is_active && (
              <button
                onClick={() => activateMutation.mutate(selectedGen.id)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-600/30 transition-all"
              >
                Activate Version
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === "grid" ? (
        <div className="space-y-6">
          {/* Main Grid Section Selector */}
          {generations.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
              <Cpu className="w-12 h-12 mx-auto text-white/20 mb-3" />
              <p>No timetables generated for this semester yet.</p>
              <button
                onClick={() => solveMutation.mutate(semesterId)}
                className="mt-4 px-5 py-2 rounded-xl bg-tnu-primary border border-white/20 text-white text-xs font-semibold hover:bg-tnu-primary/80"
              >
                Trigger First Optimizer Run
              </button>
            </div>
          ) : selectedGen?.status !== "COMPLETED" ? (
            <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-tnu-accent mb-3" />
              <p>
                The selected run is currently <strong>{selectedGen?.status}</strong>.
              </p>
              <button onClick={() => setActiveTab("solver")} className="mt-3 text-tnu-accent text-sm hover:underline">
                View Run Status →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-white/40" />
                  <span className="text-white text-sm font-semibold">Select Section:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(sectionsList) &&
                      sectionsList.map((sec: any) => (
                        <button
                          key={sec.id}
                          onClick={() => setSelectedSectionId(sec.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            (selectedSectionId === sec.id || (!selectedSectionId && sectionsList[0]?.id === sec.id))
                              ? "bg-tnu-primary border-tnu-accent text-white"
                              : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                          }`}
                        >
                          {sec.name}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {slotsLoading ? (
                <div className="h-64 flex items-center justify-center text-white/40">
                  <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
                  Loading Grid...
                </div>
              ) : (
                <TimetableGrid slots={sectionSlots} editable={true} onSlotClick={handleSlotClick} />
              )}
            </div>
          )}
        </div>
      ) : (
        /* Solver runs summary */
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-lg">CP-SAT Optimizer Runs</h3>
          <div className="space-y-3">
            {generations.map((gen) => (
              <div
                key={gen.id}
                className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-white font-bold">Timetable Run v{gen.version}</h4>
                    {gen.is_active && (
                      <span className="badge-completed text-[10px] py-0.5">Active timetable</span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    Solve Time: {gen.solve_time_seconds ? `${gen.solve_time_seconds.toFixed(1)}s` : "n/a"}
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        gen.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : gen.status === "RUNNING"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse"
                          : "bg-red-500/20 text-red-300 border-red-500/30"
                      }`}
                    >
                      {gen.status}
                    </span>
                  </div>

                  {/* Progress Bar (Visible when running) */}
                  {gen.status === "RUNNING" && (
                    <div className="w-48 bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-tnu-accent h-full transition-all duration-300"
                        style={{ width: `${gen.progress_percent || 0}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Slot Editor Modal */}
      <AnimatePresence>
        {editingSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSlot(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1628] p-6 shadow-xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-tnu-accent" />
                  <h2 className="text-xl font-bold text-white">Manual Override Slot</h2>
                </div>
                <button
                  onClick={() => setEditingSlot(null)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSlot} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Class Info</p>
                  <p className="text-white font-semibold">{editingSlot.subject.code} — {editingSlot.subject.name}</p>
                  <p className="text-xs text-white/60">👨‍🏫 Instructor: {editingSlot.faculty.name}</p>
                  <p className="text-xs text-white/60">⏰ Current Time: {editingSlot.start_time} - {editingSlot.end_time}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Re-assign Room</label>
                    <select
                      value={editRoom}
                      onChange={(e) => setEditRoom(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      {Array.isArray(roomsList) &&
                        roomsList.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.number} (Cap: {r.capacity})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Re-assign Day</label>
                    <select
                      value={editDay}
                      onChange={(e) => setEditDay(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, idx) => (
                        <option key={idx} value={idx.toString()}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-white/5">
                  <div className="space-y-0.5">
                    <label className="text-white text-xs font-semibold uppercase tracking-wider">Lock Slot State</label>
                    <p className="text-[10px] text-white/40">Locked slots are skipped during future regenerations</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editLock}
                    onChange={(e) => setEditLock(e.target.checked)}
                    className="w-5 h-5 accent-tnu-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Override Notes</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Provide reason for manual change..."
                    className="input-dark text-sm py-2 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="px-5 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateSlotMutation.isPending}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    {updateSlotMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Apply Override
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

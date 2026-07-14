"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, Clock, HelpCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { getDayName } from "@/lib/utils";

interface Availability {
  id: string;
  faculty: string;
  day: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  reason: string;
}

export default function FacultyAvailabilityPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [day, setDay] = useState("0");
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("11:30");
  const [reason, setReason] = useState("");

  // Fetch current faculty profile to get their ID
  const { data: facultyProfile } = useQuery({
    queryKey: ["my-faculty-profile"],
    queryFn: () => apiClient.get("/faculty/me/").then((r) => r.data),
  });

  const facultyId = facultyProfile?.id;

  // Fetch availability list
  const { data: availList, isLoading } = useQuery({
    queryKey: ["my-availability", facultyId],
    queryFn: () =>
      apiClient.get(`/faculty-availability/?faculty=${facultyId}`).then((r) => r.data.results || r.data || []),
    enabled: !!facultyId,
  });

  // Create Availability Mutation
  const createMutation = useMutation({
    mutationFn: (newAvail: any) => apiClient.post("/faculty-availability/", newAvail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-availability"] });
      toast.success("Availability window updated!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to add availability slot");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/faculty-availability/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-availability"] });
      toast.success("Availability slot removed.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyId) return;

    createMutation.mutate({
      faculty: facultyId,
      day: parseInt(day, 10),
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      is_available: false, // False = Unavailable slot (solver constraint)
      reason,
      is_recurring: true,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this unavailability rule?")) {
      deleteMutation.mutate(id);
    }
  };

  const availabilities = Array.isArray(availList) ? availList : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Availability Settings</h1>
          <p className="text-white/50 text-sm mt-1">Set weekly unavailable intervals (e.g. for meetings, clinical work)</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Unavailability Slot
        </motion.button>
      </div>

      {/* Intro info box */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3 text-xs leading-relaxed max-w-2xl">
        <AlertCircle className="w-5 h-5 text-tnu-accent flex-shrink-0" />
        <p className="text-blue-300">
          <strong>Important:</strong> Rules added here represent times when the CP-SAT timetable optimizer will guarantee
          not to schedule any classes for you. Keep these updated to avoid teaching scheduling conflicts.
        </p>
      </div>

      {/* Availability List */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading rules...
        </div>
      ) : availabilities.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <Clock className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No unavailability constraints set. You are fully available!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availabilities.map((avail: Availability, i: number) => (
            <motion.div
              key={avail.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold">
                    UNAVAILABLE
                  </div>
                  <button
                    onClick={() => handleDelete(avail.id)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <h3 className="text-white font-bold text-lg">{getDayName(avail.day)}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-white/60 mt-1">
                    <Clock className="w-4 h-4 text-white/30" />
                    <span>{avail.start_time.slice(0, 5)} - {avail.end_time.slice(0, 5)}</span>
                  </div>
                  <p className="text-white/40 text-xs mt-3 leading-relaxed">
                    Reason: {avail.reason || "No reason specified."}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Unavailability Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a1628] p-6 shadow-xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h2 className="text-xl font-bold text-white">Add Unavailability</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Day of the Week</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="input-dark text-sm py-2 bg-[#0d1f35]"
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                      <option key={i} value={i.toString()}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Start Time</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">End Time</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Reason</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Faculty Meeting, Lab prep"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input-dark text-sm py-2"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Add Exclusion
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

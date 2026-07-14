"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Calendar, Lock, Unlock, CheckCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Semester {
  id: string;
  academic_year: string;
  academic_year_label: string;
  semester_type: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_locked: boolean;
}

export default function SemestersPage() {
  const queryClient = useQueryClient();
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [editingSem, setEditingSem] = useState<Semester | null>(null);

  // Form states - Semesters
  const [semName, setSemName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semesterType, setSemesterType] = useState("ODD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Form states - Academic Years
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");

  // Fetch academic years
  const { data: yearsData } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiClient.get("/academic-years/").then((res) => res.data.results || res.data || []),
  });

  // Fetch semesters
  const { data: semsData, isLoading } = useQuery({
    queryKey: ["semesters"],
    queryFn: () => apiClient.get("/semesters/").then((res) => res.data.results || res.data || []),
  });

  const openAddSemModal = () => {
    setEditingSem(null);
    setSemName("");
    setAcademicYear(yearsData?.[0]?.id || "");
    setSemesterType("ODD");
    setStartDate("");
    setEndDate("");
    setIsSemesterModalOpen(true);
  };

  const openEditSemModal = (sem: Semester) => {
    setEditingSem(sem);
    setSemName(sem.name);
    setAcademicYear(sem.academic_year);
    setSemesterType(sem.semester_type);
    setStartDate(sem.start_date);
    setEndDate(sem.end_date);
    setIsSemesterModalOpen(true);
  };

  // Add Academic Year Mutation
  const createYearMutation = useMutation({
    mutationFn: (newYear: any) => apiClient.post("/academic-years/", newYear),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Academic year created!");
      setIsYearModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create academic year");
    },
  });

  // Create Semester Mutation
  const createSemMutation = useMutation({
    mutationFn: (newSem: any) => apiClient.post("/semesters/", newSem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
      toast.success("Semester created successfully!");
      setIsSemesterModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create semester");
    },
  });

  // Update Semester Mutation
  const updateSemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/semesters/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
      toast.success("Semester updated successfully!");
      setIsSemesterModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update semester");
    },
  });

  // Delete Semester Mutation
  const deleteSemMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/semesters/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
      toast.success("Semester deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete semester");
    },
  });

  // Set Current Semester Mutation
  const setCurrentMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/semesters/${id}/set_current/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
      toast.success("Current semester updated!");
    },
  });

  // Toggle Lock Semester Mutation
  const toggleLockMutation = useMutation({
    mutationFn: ({ id, locked }: { id: string; locked: boolean }) =>
      apiClient.patch(`/semesters/${id}/`, { is_locked: locked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
      toast.success("Lock status updated!");
    },
  });

  const handleYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearStart || !yearEnd) return;

    createYearMutation.mutate({
      year_start: parseInt(yearStart, 10),
      year_end: parseInt(yearEnd, 10),
      is_current: false,
    });
  };

  const handleSemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semName || !academicYear) {
      toast.error("Name and Academic Year are required");
      return;
    }

    const payload = {
      academic_year: academicYear,
      semester_type: semesterType,
      name: semName,
      start_date: startDate,
      end_date: endDate,
      is_current: editingSem ? editingSem.is_current : false,
      is_locked: editingSem ? editingSem.is_locked : false,
    };

    if (editingSem) {
      updateSemMutation.mutate({ id: editingSem.id, data: payload });
    } else {
      createSemMutation.mutate(payload);
    }
  };

  const handleSemDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this semester?")) {
      deleteSemMutation.mutate(id);
    }
  };

  const semesters = Array.isArray(semsData) ? semsData : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Semesters</h1>
          <p className="text-white/50 text-sm mt-1">Configure active semesters, locking controls, and academic years</p>
        </div>
        <div className="flex gap-3 self-start sm:self-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsYearModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm font-semibold"
          >
            Add Academic Year
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAddSemModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Semester
          </motion.button>
        </div>
      </div>

      {/* Semesters List */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading semesters...
        </div>
      ) : semesters.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <Calendar className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No semesters found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {semesters.map((sem: Semester, i: number) => (
            <motion.div
              key={sem.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-5 rounded-2xl bg-[#0d1f35] border transition-all flex flex-col justify-between ${
                sem.is_current ? "border-tnu-accent/50 shadow-glow" : "border-white/10 hover:border-white/20"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-tnu-primary/50 border border-tnu-primary flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-tnu-accent" />
                    </div>
                    {sem.is_current && (
                      <span className="badge-completed text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditSemModal(sem)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSemDelete(sem.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-white font-semibold text-lg">{sem.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-white/70 border border-white/10">
                      {sem.academic_year_label}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tnu-secondary/15 text-tnu-secondary border border-tnu-secondary/20">
                      {sem.semester_type}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-white/60">
                    <p>📅 Start Date: {formatDate(sem.start_date)}</p>
                    <p>📅 End Date: {formatDate(sem.end_date)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                <button
                  disabled={sem.is_current}
                  onClick={() => setCurrentMutation.mutate(sem.id)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                    sem.is_current
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 cursor-default"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  }`}
                >
                  {sem.is_current ? "Current" : "Make Current"}
                </button>

                <button
                  onClick={() => toggleLockMutation.mutate({ id: sem.id, locked: !sem.is_locked })}
                  className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-semibold border transition-all ${
                    sem.is_locked
                      ? "bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {sem.is_locked ? (
                    <>
                      <Lock className="w-3.5 h-3.5" /> Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-white/40" /> Unlock
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Semester Modal */}
      <AnimatePresence>
        {isSemesterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSemesterModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1628] p-6 shadow-xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editingSem ? "Edit Semester" : "Add Semester"}
                </h2>
                <button
                  onClick={() => setIsSemesterModalOpen(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSemSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Semester Name</label>
                  <input
                    type="text"
                    required
                    value={semName}
                    onChange={(e) => setSemName(e.target.value)}
                    placeholder="e.g. Odd Semester 2024-25"
                    className="input-dark text-sm py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Academic Year</label>
                    <select
                      required
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="">Select Year...</option>
                      {Array.isArray(yearsData) &&
                        yearsData.map((y: any) => (
                          <option key={y.id} value={y.id}>
                            {y.label}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Semester Type</label>
                    <select
                      value={semesterType}
                      onChange={(e) => setSemesterType(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="ODD">Odd Semester</option>
                      <option value="EVEN">Even Semester</option>
                      <option value="SUMMER">Summer Term</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsSemesterModalOpen(false)}
                    className="px-5 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSemMutation.isPending || updateSemMutation.isPending}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    {(createSemMutation.isPending || updateSemMutation.isPending) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {editingSem ? "Save Changes" : "Create Semester"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Year Modal */}
      <AnimatePresence>
        {isYearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsYearModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a1628] p-6 shadow-xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h2 className="text-xl font-bold text-white">Add Academic Year</h2>
                <button
                  onClick={() => setIsYearModalOpen(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleYearSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Start Year</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 2024"
                      value={yearStart}
                      onChange={(e) => setYearStart(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">End Year</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 2025"
                      value={yearEnd}
                      onChange={(e) => setYearEnd(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsYearModalOpen(false)}
                    className="px-5 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createYearMutation.isPending}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    {createYearMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Year
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

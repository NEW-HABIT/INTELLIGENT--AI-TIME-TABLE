"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, Clock, UserCheck, BookOpen, Layers, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Allocation {
  id: string;
  semester: string;
  subject: string;
  subject_name: string;
  subject_code: string;
  faculty: string;
  faculty_name: string;
  section: string;
  section_name: string;
  weekly_hours_override: number | null;
  weekly_hours: number;
  notes: string;
}

export default function AllocationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [semFilter, setSemFilter] = useState("");
  const [secFilter, setSecFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<Allocation | null>(null);

  // Form states
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [faculty, setFaculty] = useState("");
  const [section, setSection] = useState("");
  const [weeklyHoursOverride, setWeeklyHoursOverride] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch allocations
  const { data: allocsData, isLoading } = useQuery({
    queryKey: ["allocations"],
    queryFn: () => apiClient.get("/allocations/").then((res) => res.data.results || res.data || []),
  });

  // Fetch semesters
  const { data: semestersList } = useQuery({
    queryKey: ["semesters-simple"],
    queryFn: () => apiClient.get("/semesters/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  // Fetch subjects
  const { data: subjectsList } = useQuery({
    queryKey: ["subjects-simple"],
    queryFn: () => apiClient.get("/subjects/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  // Fetch faculty
  const { data: facultyList } = useQuery({
    queryKey: ["faculty-simple"],
    queryFn: () => apiClient.get("/faculty/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  // Fetch sections
  const { data: sectionsList } = useQuery({
    queryKey: ["sections-simple"],
    queryFn: () => apiClient.get("/sections/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  const openAddModal = () => {
    setEditingAlloc(null);
    setSemester(semestersList?.find((s: any) => s.is_current)?.id || semestersList?.[0]?.id || "");
    setSubject(subjectsList?.[0]?.id || "");
    setFaculty(facultyList?.[0]?.id || "");
    setSection(sectionsList?.[0]?.id || "");
    setWeeklyHoursOverride("");
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (a: Allocation) => {
    setEditingAlloc(a);
    setSemester(a.semester);
    setSubject(a.subject);
    setFaculty(a.faculty);
    setSection(a.section);
    setWeeklyHoursOverride(a.weekly_hours_override?.toString() || "");
    setNotes(a.notes || "");
    setIsModalOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newAlloc: any) => apiClient.post("/allocations/", newAlloc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      toast.success("Subject allocated successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create subject allocation");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/allocations/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      toast.success("Allocation updated successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update allocation");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/allocations/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      toast.success("Allocation deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete allocation");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semester || !subject || !faculty || !section) {
      toast.error("All dropdown fields are required");
      return;
    }

    const payload = {
      semester,
      subject,
      faculty,
      section,
      weekly_hours_override: weeklyHoursOverride ? parseInt(weeklyHoursOverride, 10) : null,
      notes,
      is_active: true,
    };

    if (editingAlloc) {
      updateMutation.mutate({ id: editingAlloc.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this allocation?")) {
      deleteMutation.mutate(id);
    }
  };

  const allocations = Array.isArray(allocsData) ? allocsData : [];

  const filteredAllocs = allocations.filter((a: Allocation) => {
    const matchesSearch =
      a.subject_name.toLowerCase().includes(search.toLowerCase()) ||
      a.subject_code.toLowerCase().includes(search.toLowerCase()) ||
      a.faculty_name.toLowerCase().includes(search.toLowerCase());
    const matchesSem = semFilter ? a.semester === semFilter : true;
    const matchesSec = secFilter ? a.section === secFilter : true;
    return matchesSearch && matchesSem && matchesSec;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Subject Allocations</h1>
          <p className="text-white/50 text-sm mt-1">Assign subjects and faculty mentors to section timetables</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Allocation
        </motion.button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 min-w-[280px] flex-1 focus-within:border-tnu-accent/50 transition-colors">
          <Search className="w-5 h-5 text-white/30 ml-3" />
          <input
            type="text"
            placeholder="Search by subject code, name, or faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent px-2 py-2 text-white text-sm focus:outline-none placeholder-white/30"
          />
        </div>

        <select
          value={semFilter}
          onChange={(e) => setSemFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Semesters</option>
          {Array.isArray(semestersList) &&
            semestersList.map((s: any) => (
              <option key={s.id} value={s.id} className="bg-[#0a1628]">
                {s.name}
              </option>
            ))}
        </select>

        <select
          value={secFilter}
          onChange={(e) => setSecFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Sections</option>
          {Array.isArray(sectionsList) &&
            sectionsList.map((s: any) => (
              <option key={s.id} value={s.id} className="bg-[#0a1628]">
                {s.name} ({s.program_code})
              </option>
            ))}
        </select>
      </div>

      {/* Allocations Grid */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading allocations...
        </div>
      ) : filteredAllocs.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <Clock className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No subject allocations found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAllocs.map((a: Allocation, i: number) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-tnu-primary/50 border border-tnu-primary flex items-center justify-center">
                    <Clock className="w-5 h-5 text-tnu-accent" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(a)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-white font-semibold text-lg">{a.subject_name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">Code: {a.subject_code}</p>

                  <div className="flex gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tnu-secondary/15 text-tnu-secondary border border-tnu-secondary/20">
                      Hours/Wk: {a.weekly_hours}
                    </span>
                    {a.weekly_hours_override && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Overridden
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-white/60">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-white/30" />
                      <span>Faculty: <strong>{a.faculty_name}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-white/30" />
                      <span>Section: <strong>{a.section_name}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {a.notes && (
                <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-white/40 italic">
                  Note: {a.notes}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
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
              className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a1628] p-6 shadow-xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editingAlloc ? "Edit Subject Allocation" : "Add Subject Allocation"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Academic Semester</label>
                    <select
                      required
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="">Select Semester...</option>
                      {Array.isArray(semestersList) &&
                        semestersList.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Subject</label>
                    <select
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="">Select Subject...</option>
                      {Array.isArray(subjectsList) &&
                        subjectsList.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.code} - {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Faculty Member</label>
                    <select
                      required
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="">Select Faculty...</option>
                      {Array.isArray(facultyList) &&
                        facultyList.map((f: any) => (
                          <option key={f.id} value={f.id}>
                            {f.full_name} ({f.employee_id})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Section</label>
                    <select
                      required
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="">Select Section...</option>
                      {Array.isArray(sectionsList) &&
                        sectionsList.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.program_code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Weekly Hours Override (Optional)</label>
                  <input
                    type="number"
                    placeholder="Leave empty to use subject default"
                    value={weeklyHoursOverride}
                    onChange={(e) => setWeeklyHoursOverride(e.target.value)}
                    className="input-dark text-sm py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Allocation notes..."
                    className="input-dark text-sm py-2 resize-none"
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
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {editingAlloc ? "Save Changes" : "Create Allocation"}
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

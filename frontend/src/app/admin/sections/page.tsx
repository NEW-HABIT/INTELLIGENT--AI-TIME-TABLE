"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, Users, Layers, AlertCircle, ShieldCheck, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Section {
  id: string;
  name: string;
  program: string;
  program_name: string;
  program_code: string;
  semester: string;
  semester_name: string;
  semester_number: number;
  max_students: number;
  current_strength: number;
  parent_section: string | null;
}

export default function SectionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [progFilter, setProgFilter] = useState("");
  const [semFilter, setSemFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [splitCapacity, setSplitCapacity] = useState("60");
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [program, setProgram] = useState("");
  const [semester, setSemester] = useState("");
  const [semesterNumber, setSemesterNumber] = useState("1");
  const [maxStudents, setMaxStudents] = useState("60");
  const [currentStrength, setCurrentStrength] = useState("0");

  // Fetch sections
  const { data: sectionsData, isLoading } = useQuery({
    queryKey: ["sections"],
    queryFn: () => apiClient.get("/sections/").then((res) => res.data.results || res.data || []),
  });

  // Fetch programs
  const { data: programsList } = useQuery({
    queryKey: ["programs-simple"],
    queryFn: () => apiClient.get("/programs/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  // Fetch semesters
  const { data: semestersList } = useQuery({
    queryKey: ["semesters-simple"],
    queryFn: () => apiClient.get("/semesters/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  const openAddModal = () => {
    setEditingSection(null);
    setName("");
    setProgram(programsList?.[0]?.id || "");
    setSemester(semestersList?.find((s: any) => s.is_current)?.id || semestersList?.[0]?.id || "");
    setSemesterNumber("1");
    setMaxStudents("60");
    setCurrentStrength("0");
    setIsModalOpen(true);
  };

  const openEditModal = (sec: Section) => {
    setEditingSection(sec);
    setName(sec.name);
    setProgram(sec.program);
    setSemester(sec.semester);
    setSemesterNumber(sec.semester_number.toString());
    setMaxStudents(sec.max_students.toString());
    setCurrentStrength(sec.current_strength.toString());
    setIsModalOpen(true);
  };

  const openSplitModal = (sec: Section) => {
    setSelectedSection(sec);
    setSplitCapacity(sec.max_students.toString());
    setIsSplitModalOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newSec: any) => apiClient.post("/sections/", newSec),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Section created successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create section");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/sections/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Section updated successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update section");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/sections/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Section deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete section");
    },
  });

  // Auto Split Mutation
  const autoSplitMutation = useMutation({
    mutationFn: (vars: { section_id: string; max_capacity: number }) =>
      apiClient.post("/sections/auto_split/", vars),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      if (res.data.split) {
        toast.success(res.data.message || "Section split successfully!");
      } else {
        toast.info(res.data.message || "Section does not need splitting.");
      }
      setIsSplitModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Auto-split failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !program || !semester) {
      toast.error("Name, Program, and Semester are required");
      return;
    }

    const payload = {
      name,
      program,
      semester,
      semester_number: parseInt(semesterNumber, 10),
      max_students: parseInt(maxStudents, 10),
      current_strength: parseInt(currentStrength, 10),
      is_active: true,
    };

    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this section?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAutoSplit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;
    autoSplitMutation.mutate({
      section_id: selectedSection.id,
      max_capacity: parseInt(splitCapacity, 10),
    });
  };

  const sections = Array.isArray(sectionsData) ? sectionsData : [];

  const filteredSections = sections.filter((s: Section) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.program_code.toLowerCase().includes(search.toLowerCase());
    const matchesProg = progFilter ? s.program === progFilter : true;
    const matchesSem = semFilter ? s.semester === semFilter : true;
    return matchesSearch && matchesProg && matchesSem;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Sections</h1>
          <p className="text-white/50 text-sm mt-1">Manage class sections and utilize auto-split partition tools</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Section
        </motion.button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 min-w-[280px] flex-1 focus-within:border-tnu-accent/50 transition-colors">
          <Search className="w-5 h-5 text-white/30 ml-3" />
          <input
            type="text"
            placeholder="Search by section name or program code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent px-2 py-2 text-white text-sm focus:outline-none placeholder-white/30"
          />
        </div>

        <select
          value={progFilter}
          onChange={(e) => setProgFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Programs</option>
          {Array.isArray(programsList) &&
            programsList.map((p: any) => (
              <option key={p.id} value={p.id} className="bg-[#0a1628]">
                {p.name}
              </option>
            ))}
        </select>

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
      </div>

      {/* Section Grid */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading sections...
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <Users className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No sections found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSections.map((sec: Section, i: number) => (
            <motion.div
              key={sec.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-tnu-primary/50 border border-tnu-primary flex items-center justify-center">
                    <Users className="w-5 h-5 text-tnu-accent" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(sec)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sec.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-white font-semibold text-lg">Section {sec.name}</h3>
                    {sec.parent_section && (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 rounded">
                        Sub-section
                      </span>
                    )}
                  </div>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-white/70 border border-white/10">
                    Sem Number: {sec.semester_number}
                  </span>

                  <div className="mt-4 space-y-1.5 text-xs text-white/60">
                    <div className="flex items-center justify-between">
                      <span>Capacity Limit:</span>
                      <span className="text-white font-medium">{sec.max_students}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Current Strength:</span>
                      <span className={`font-semibold ${
                        sec.current_strength > sec.max_students ? "text-red-400 animate-pulse" : "text-white"
                      }`}>
                        {sec.current_strength}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="truncate">{sec.program_name}</span>
                </div>
                {sec.current_strength > sec.max_students && (
                  <button
                    onClick={() => openSplitModal(sec)}
                    className="w-full text-xs py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 font-semibold transition-all"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Auto-Split Section
                  </button>
                )}
              </div>
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
                  {editingSection ? "Edit Section" : "Add Section"}
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
                    <label className="text-white/70 text-xs font-medium">Section Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. A, B or CS-3A"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Semester Number</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={12}
                      value={semesterNumber}
                      onChange={(e) => setSemesterNumber(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Program</label>
                    <select
                      required
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="">Select Program...</option>
                      {Array.isArray(programsList) &&
                        programsList.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Max Students Capacity</label>
                    <input
                      type="number"
                      required
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Current Strength</label>
                    <input
                      type="number"
                      value={currentStrength}
                      onChange={(e) => setCurrentStrength(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
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
                    {editingSection ? "Save Changes" : "Create Section"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auto Split Configuration Modal */}
      <AnimatePresence>
        {isSplitModalOpen && selectedSection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSplitModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a1628] p-6 shadow-xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h2 className="text-xl font-bold text-white">Auto Split Partition</h2>
                <button
                  onClick={() => setIsSplitModalOpen(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAutoSplit} className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <p className="text-amber-300 text-xs leading-relaxed">
                    This will split Section <strong>{selectedSection.name}</strong> ({selectedSection.current_strength} students) into sub-sections to match room capacities.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Max Limit Per Sub-Section</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={splitCapacity}
                    onChange={(e) => setSplitCapacity(e.target.value)}
                    className="input-dark text-sm py-2"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsSplitModalOpen(false)}
                    className="px-5 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={autoSplitMutation.isPending}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    {autoSplitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Split
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

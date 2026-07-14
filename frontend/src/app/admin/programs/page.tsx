"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, GraduationCap, Building2, Layers, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Program {
  id: string;
  name: string;
  code: string;
  department: string;
  department_name: string;
  degree_type: string;
  duration_years: number;
  total_semesters: number;
  max_students_per_section: number;
  description: string;
}

const DEGREE_TYPES = [
  { value: "BTECH", label: "B.Tech" },
  { value: "MTECH", label: "M.Tech" },
  { value: "MBA", label: "MBA" },
  { value: "BBA", label: "BBA" },
  { value: "BSC", label: "B.Sc" },
  { value: "MSC", label: "M.Sc" },
  { value: "PHD", label: "Ph.D" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "OTHER", label: "Other" },
];

export default function ProgramsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("");
  const [degreeType, setDegreeType] = useState("BTECH");
  const [durationYears, setDurationYears] = useState("4");
  const [totalSemesters, setTotalSemesters] = useState("8");
  const [maxStudents, setMaxStudents] = useState("60");
  const [description, setDescription] = useState("");

  // Fetch programs
  const { data: programsData, isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiClient.get("/programs/").then((res) => res.data.results || res.data || []),
  });

  // Fetch departments
  const { data: deptsList } = useQuery({
    queryKey: ["departments-simple"],
    queryFn: () => apiClient.get("/departments/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  const openAddModal = () => {
    setEditingProgram(null);
    setName("");
    setCode("");
    setDepartment(deptsList?.[0]?.id || "");
    setDegreeType("BTECH");
    setDurationYears("4");
    setTotalSemesters("8");
    setMaxStudents("60");
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (prog: Program) => {
    setEditingProgram(prog);
    setName(prog.name);
    setCode(prog.code);
    setDepartment(prog.department);
    setDegreeType(prog.degree_type);
    setDurationYears(prog.duration_years.toString());
    setTotalSemesters(prog.total_semesters.toString());
    setMaxStudents(prog.max_students_per_section.toString());
    setDescription(prog.description || "");
    setIsModalOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newProg: any) => apiClient.post("/programs/", newProg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program created successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create program");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/programs/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program updated successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update program");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/programs/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete program");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !department) {
      toast.error("Name, Code, and Department are required");
      return;
    }

    const payload = {
      name,
      code,
      department,
      degree_type: degreeType,
      duration_years: parseInt(durationYears, 10),
      total_semesters: parseInt(totalSemesters, 10),
      max_students_per_section: parseInt(maxStudents, 10),
      description,
      is_active: true,
    };

    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this program?")) {
      deleteMutation.mutate(id);
    }
  };

  const programs = Array.isArray(programsData) ? programsData : [];

  const filteredPrograms = programs.filter((p: Program) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter ? p.department === deptFilter : true;
    const matchesDegree = degreeFilter ? p.degree_type === degreeFilter : true;
    return matchesSearch && matchesDept && matchesDegree;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Programs</h1>
          <p className="text-white/50 text-sm mt-1">Manage courses, durations, and department ownership</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Program
        </motion.button>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 min-w-[280px] flex-1 focus-within:border-tnu-accent/50 transition-colors">
          <Search className="w-5 h-5 text-white/30 ml-3" />
          <input
            type="text"
            placeholder="Search by program name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent px-2 py-2 text-white text-sm focus:outline-none placeholder-white/30"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Departments</option>
          {Array.isArray(deptsList) &&
            deptsList.map((d: any) => (
              <option key={d.id} value={d.id} className="bg-[#0a1628]">
                {d.name}
              </option>
            ))}
        </select>

        <select
          value={degreeFilter}
          onChange={(e) => setDegreeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Degrees</option>
          {DEGREE_TYPES.map((t) => (
            <option key={t.value} value={t.value} className="bg-[#0a1628]">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Program Grid */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading programs...
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <GraduationCap className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No programs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((prog: Program, i: number) => (
            <motion.div
              key={prog.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-tnu-primary/50 border border-tnu-primary flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-tnu-secondary" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(prog)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(prog.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-white font-semibold text-lg">{prog.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tnu-accent/10 text-tnu-accent border border-tnu-accent/20">
                      {prog.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-white/80 border border-white/10">
                      {DEGREE_TYPES.find((d) => d.value === prog.degree_type)?.label || prog.degree_type}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs mt-3 leading-relaxed line-clamp-2">
                    {prog.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <Building2 className="w-3.5 h-3.5 text-tnu-accent" />
                  <span className="truncate">{prog.department_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {prog.duration_years} Years ({prog.total_semesters} Semesters)
                  </span>
                  <span>Cap: {prog.max_students_per_section} / Sec</span>
                </div>
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
                  {editingProgram ? "Edit Program" : "Add Program"}
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
                    <label className="text-white/70 text-xs font-medium">Program Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. B.Tech Computer Science"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Program Code</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. BT-CSE"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Department</label>
                    <select
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="">Select Department...</option>
                      {Array.isArray(deptsList) &&
                        deptsList.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Degree Type</label>
                    <select
                      value={degreeType}
                      onChange={(e) => setDegreeType(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      {DEGREE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Duration (Years)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={6}
                      value={durationYears}
                      onChange={(e) => setDurationYears(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Total Semesters</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={12}
                      value={totalSemesters}
                      onChange={(e) => setTotalSemesters(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Max Strength / Sec</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={200}
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description..."
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
                    {editingProgram ? "Save Changes" : "Create Program"}
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

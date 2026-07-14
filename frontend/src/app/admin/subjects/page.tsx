"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, BookOpen, Layers, Award, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string;
  program: string;
  program_name: string;
  semester_number: number;
  credits: number;
  subject_type: string;
  weekly_hours: number;
  lab_hours_per_week: number;
  difficulty_level: string;
  is_elective: boolean;
  description: string;
}

const SUBJECT_TYPES = [
  { value: "THEORY", label: "Theory" },
  { value: "LAB", label: "Laboratory" },
  { value: "TUTORIAL", label: "Tutorial" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "PROJECT", label: "Project" },
];

const DIFFICULTY_LEVELS = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [progFilter, setProgFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [semFilter, setSemFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [program, setProgram] = useState("");
  const [semesterNumber, setSemesterNumber] = useState("1");
  const [credits, setCredits] = useState("3");
  const [subjectType, setSubjectType] = useState("THEORY");
  const [weeklyHours, setWeeklyHours] = useState("3");
  const [labHours, setLabHours] = useState("0");
  const [difficultyLevel, setDifficultyLevel] = useState("MEDIUM");
  const [isElective, setIsElective] = useState(false);
  const [description, setDescription] = useState("");

  // Fetch subjects
  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => apiClient.get("/subjects/").then((res) => res.data.results || res.data || []),
  });

  // Fetch programs
  const { data: programsList } = useQuery({
    queryKey: ["programs-simple"],
    queryFn: () => apiClient.get("/programs/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  const openAddModal = () => {
    setEditingSubject(null);
    setName("");
    setCode("");
    setProgram(programsList?.[0]?.id || "");
    setSemesterNumber("1");
    setCredits("3");
    setSubjectType("THEORY");
    setWeeklyHours("3");
    setLabHours("0");
    setDifficultyLevel("MEDIUM");
    setIsElective(false);
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code);
    setProgram(sub.program);
    setSemesterNumber(sub.semester_number.toString());
    setCredits(sub.credits.toString());
    setSubjectType(sub.subject_type);
    setWeeklyHours(sub.weekly_hours.toString());
    setLabHours(sub.lab_hours_per_week.toString());
    setDifficultyLevel(sub.difficulty_level);
    setIsElective(sub.is_elective);
    setDescription(sub.description || "");
    setIsModalOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newSub: any) => apiClient.post("/subjects/", newSub),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject created successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create subject");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/subjects/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject updated successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update subject");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/subjects/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete subject");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !program) {
      toast.error("Name, Code, and Program are required");
      return;
    }

    const payload = {
      name,
      code,
      program,
      semester_number: parseInt(semesterNumber, 10),
      credits: parseInt(credits, 10),
      subject_type: subjectType,
      weekly_hours: parseInt(weeklyHours, 10),
      lab_hours_per_week: parseInt(labHours, 10),
      difficulty_level: difficultyLevel,
      is_elective: isElective,
      description,
      is_active: true,
    };

    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this subject?")) {
      deleteMutation.mutate(id);
    }
  };

  const subjects = Array.isArray(subjectsData) ? subjectsData : [];

  const filteredSubjects = subjects.filter((s: Subject) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchesProg = progFilter ? s.program === progFilter : true;
    const matchesType = typeFilter ? s.subject_type === typeFilter : true;
    const matchesSem = semFilter ? s.semester_number === parseInt(semFilter, 10) : true;
    return matchesSearch && matchesProg && matchesType && matchesSem;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Subjects</h1>
          <p className="text-white/50 text-sm mt-1">Manage core courses, credit weightings, and hours</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Subject
        </motion.button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 min-w-[280px] flex-1 focus-within:border-tnu-accent/50 transition-colors">
          <Search className="w-5 h-5 text-white/30 ml-3" />
          <input
            type="text"
            placeholder="Search by subject name or code..."
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
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Types</option>
          {SUBJECT_TYPES.map((t) => (
            <option key={t.value} value={t.value} className="bg-[#0a1628]">
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={semFilter}
          onChange={(e) => setSemFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s} className="bg-[#0a1628]">
              Semester {s}
            </option>
          ))}
        </select>
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading subjects...
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <BookOpen className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No subjects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((sub: Subject, i: number) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-tnu-primary/50 border border-tnu-primary flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-tnu-accent" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(sub)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-white font-semibold text-lg">{sub.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tnu-accent/10 text-tnu-accent border border-tnu-accent/20">
                      {sub.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-white/70 border border-white/10">
                      Sem {sub.semester_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      sub.subject_type === "THEORY" ? "bg-blue-500/10 text-blue-300 border-blue-500/20" :
                      sub.subject_type === "LAB" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
                      "bg-purple-500/10 text-purple-300 border-purple-500/20"
                    }`}>
                      {sub.subject_type}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs mt-3 leading-relaxed line-clamp-2">
                    {sub.description || "No syllabus description details provided."}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="truncate">{sub.program_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-tnu-secondary" />
                    Credits: {sub.credits}
                  </span>
                  <span>
                    Hrs: {sub.weekly_hours}w {sub.lab_hours_per_week > 0 && `(+ ${sub.lab_hours_per_week} Labs)`}
                  </span>
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
                  {editingSubject ? "Edit Subject" : "Add Subject"}
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
                    <label className="text-white/70 text-xs font-medium">Subject Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Operating Systems"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Subject Code</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. CS-401"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1 col-span-2">
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
                    <label className="text-white/70 text-xs font-medium">Semester</label>
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Credits</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={credits}
                      onChange={(e) => setCredits(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Subject Type</label>
                    <select
                      value={subjectType}
                      onChange={(e) => setSubjectType(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      {SUBJECT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Difficulty</label>
                    <select
                      value={difficultyLevel}
                      onChange={(e) => setDifficultyLevel(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      {DIFFICULTY_LEVELS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Weekly Hours</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Lab Hours / Week</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={10}
                      value={labHours}
                      onChange={(e) => setLabHours(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="isElective"
                    checked={isElective}
                    onChange={(e) => setIsElective(e.target.checked)}
                    className="w-4 h-4 accent-tnu-accent"
                  />
                  <label htmlFor="isElective" className="text-white/70 text-sm font-medium cursor-pointer">
                    Is this an elective course?
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Subject overview or details..."
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
                    {editingSubject ? "Save Changes" : "Create Subject"}
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

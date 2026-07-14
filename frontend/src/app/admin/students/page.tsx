"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, GraduationCap, Calendar, Phone, ShieldAlert, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Student {
  id: string;
  user: string;
  full_name: string;
  email: string;
  enrollment_number: string;
  program: string;
  program_name: string;
  current_semester: number;
  date_of_birth: string | null;
  guardian_name: string;
  guardian_phone: string;
}

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [progFilter, setProgFilter] = useState("");
  const [semFilter, setSemFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [program, setProgram] = useState("");
  const [currentSemester, setCurrentSemester] = useState("1");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Fetch students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students-profiles"],
    queryFn: () => apiClient.get("/students/").then((res) => res.data.results || res.data || []),
  });

  // Fetch programs
  const { data: programsList } = useQuery({
    queryKey: ["programs-simple"],
    queryFn: () => apiClient.get("/programs/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  const openAddModal = () => {
    setEditingStudent(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setEnrollmentNumber("");
    setProgram(programsList?.[0]?.id || "");
    setCurrentSemester("1");
    setDateOfBirth("");
    setGuardianName("");
    setGuardianPhone("");
    setIsModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    const names = s.full_name.split(" ");
    setFirstName(names[0] || "");
    setLastName(names.slice(1).join(" ") || "");
    setEmail(s.email || "");
    setEnrollmentNumber(s.enrollment_number);
    setProgram(s.program);
    setCurrentSemester(s.current_semester.toString());
    setDateOfBirth(s.date_of_birth || "");
    setGuardianName(s.guardian_name || "");
    setGuardianPhone(s.guardian_phone || "");
    setIsModalOpen(true);
  };

  // Create Student Mutation (Creates User, then StudentProfile)
  const createMutation = useMutation({
    mutationFn: async (vars: any) => {
      // 1. Create User
      const userRes = await apiClient.post("/auth/users/", {
        email: vars.email,
        username: vars.email,
        first_name: vars.firstName,
        last_name: vars.lastName,
        phone: vars.phone,
        role: "STUDENT",
        password: "TnuStudentTempPass123!",
        password_confirm: "TnuStudentTempPass123!",
      });

      const userId = userRes.data.id;

      // 2. Create Student Profile
      const profileRes = await apiClient.post("/students/", {
        user: userId,
        enrollment_number: vars.enrollmentNumber,
        program: vars.program,
        current_semester: parseInt(vars.currentSemester, 10),
        date_of_birth: vars.dateOfBirth || null,
        guardian_name: vars.guardianName,
        guardian_phone: vars.guardianPhone,
      });

      return profileRes.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-profiles"] });
      toast.success("Student added successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create student profile");
    },
  });

  // Update Student Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/students/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-profiles"] });
      toast.success("Student profile updated successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update profile");
    },
  });

  // Delete Student Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/students/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-profiles"] });
      toast.success("Student deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete student");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingStudent) {
      const payload = {
        user: editingStudent.user,
        enrollment_number: enrollmentNumber,
        program,
        current_semester: parseInt(currentSemester, 10),
        date_of_birth: dateOfBirth || null,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
      };
      updateMutation.mutate({ id: editingStudent.id, data: payload });
    } else {
      if (!firstName || !lastName || !email || !enrollmentNumber) {
        toast.error("Name, Email, and Enrollment Number are required");
        return;
      }
      createMutation.mutate({
        firstName,
        lastName,
        email,
        phone,
        enrollmentNumber,
        program,
        currentSemester,
        dateOfBirth,
        guardianName,
        guardianPhone,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this student profile?")) {
      deleteMutation.mutate(id);
    }
  };

  const students = Array.isArray(studentsData) ? studentsData : [];

  const filteredStudents = students.filter((s: Student) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.enrollment_number.toLowerCase().includes(search.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase()));
    const matchesProg = progFilter ? s.program === progFilter : true;
    const matchesSem = semFilter ? s.current_semester === parseInt(semFilter, 10) : true;
    return matchesSearch && matchesProg && matchesSem;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Students Profiles</h1>
          <p className="text-white/50 text-sm mt-1">Manage enrolled students, academic programs, and semesters</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Student
        </motion.button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 min-w-[280px] flex-1 focus-within:border-tnu-accent/50 transition-colors">
          <Search className="w-5 h-5 text-white/30 ml-3" />
          <input
            type="text"
            placeholder="Search by name, roll number, email..."
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
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s} className="bg-[#0a1628]">
              Semester {s}
            </option>
          ))}
        </select>
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading students...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <GraduationCap className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No student profiles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((s: Student, i: number) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-tnu-primary/50 border border-tnu-primary flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {s.full_name?.charAt(0) || "S"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-white font-semibold text-lg">{s.full_name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">Roll: {s.enrollment_number}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tnu-accent/10 text-tnu-accent border border-tnu-accent/20">
                      Sem {s.current_semester}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-white/60">
                    <p className="truncate">📧 {s.email || "No email"}</p>
                    {s.guardian_name && <p>👨‍👦 Guardian: {s.guardian_name}</p>}
                    {s.guardian_phone && <p>📞 Parent Ph: {s.guardian_phone}</p>}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                <span className="truncate max-w-[160px] text-white/60">{s.program_name}</span>
                {s.date_of_birth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {s.date_of_birth}
                  </span>
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
                  {editingStudent ? "Edit Student Profile" : "Add Student Profile"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* User Info (Only for New Students) */}
                {!editingStudent && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-white/70 text-xs font-medium">First Name</label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Alice"
                          className="input-dark text-sm py-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-white/70 text-xs font-medium">Last Name</label>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Smith"
                          className="input-dark text-sm py-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-white/70 text-xs font-medium">Email Address</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alice@neotiauniversity.edu.in"
                          className="input-dark text-sm py-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-white/70 text-xs font-medium">Phone Number</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="10 digit number"
                          className="input-dark text-sm py-2"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Profile Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-white/70 text-xs font-medium">Enrollment Number</label>
                    <input
                      type="text"
                      required
                      value={enrollmentNumber}
                      onChange={(e) => setEnrollmentNumber(e.target.value)}
                      placeholder="e.g. TNU/2024/CSE/05"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Current Sem</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={12}
                      value={currentSemester}
                      onChange={(e) => setCurrentSemester(e.target.value)}
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
                    <label className="text-white/70 text-xs font-medium">Date of Birth</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Guardian Name</label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Robert Smith"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Guardian Phone</label>
                    <input
                      type="text"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="Parent's phone"
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
                    {editingStudent ? "Save Changes" : "Create Profile"}
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

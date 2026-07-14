"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, User, Briefcase, Mail, Phone, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Faculty {
  id: string;
  user: string;
  full_name: string;
  email: string;
  department: string;
  department_name: string;
  employee_id: string;
  designation: string;
  max_weekly_hours: number;
  joining_date: string | null;
  qualification: string;
  can_take_lab: boolean;
}

const DESIGNATIONS = [
  { value: "PROFESSOR", label: "Professor" },
  { value: "ASSOC_PROFESSOR", label: "Associate Professor" },
  { value: "ASST_PROFESSOR", label: "Assistant Professor" },
  { value: "LECTURER", label: "Lecturer" },
  { value: "VISITING", label: "Visiting Faculty" },
  { value: "HOD", label: "Head of Department" },
];

export default function FacultyPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [desgFilter, setDesgFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("ASST_PROFESSOR");
  const [maxWeeklyHours, setMaxWeeklyHours] = useState("18");
  const [qualification, setQualification] = useState("");
  const [canTakeLab, setCanTakeLab] = useState(true);

  // Fetch faculty profiles
  const { data: facultyData, isLoading } = useQuery({
    queryKey: ["faculty-profiles"],
    queryFn: () => apiClient.get("/faculty/").then((res) => res.data.results || res.data || []),
  });

  // Fetch departments
  const { data: deptsList } = useQuery({
    queryKey: ["departments-simple"],
    queryFn: () => apiClient.get("/departments/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  const openAddModal = () => {
    setEditingFaculty(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setEmployeeId("");
    setDepartment(deptsList?.[0]?.id || "");
    setDesignation("ASST_PROFESSOR");
    setMaxWeeklyHours("18");
    setQualification("");
    setCanTakeLab(true);
    setIsModalOpen(true);
  };

  const openEditModal = (f: Faculty) => {
    setEditingFaculty(f);
    // Since we are editing, we populate standard fields. Name / Email are read-only from the user object in edit mode.
    const names = f.full_name.split(" ");
    setFirstName(names[0] || "");
    setLastName(names.slice(1).join(" ") || "");
    setEmail(f.email || "");
    setEmployeeId(f.employee_id);
    setDepartment(f.department);
    setDesignation(f.designation);
    setMaxWeeklyHours(f.max_weekly_hours.toString());
    setQualification(f.qualification || "");
    setCanTakeLab(f.can_take_lab);
    setIsModalOpen(true);
  };

  // Create Faculty Mutation (Requires creating user first, then creating faculty profile)
  const createMutation = useMutation({
    mutationFn: async (vars: any) => {
      // 1. Create the CustomUser
      const userRes = await apiClient.post("/auth/users/", {
        email: vars.email,
        username: vars.email,
        first_name: vars.firstName,
        last_name: vars.lastName,
        phone: vars.phone,
        role: "FACULTY",
        password: "TnuFacultyTempPass123!",
        password_confirm: "TnuFacultyTempPass123!",
      });

      const userId = userRes.data.id;

      // 2. Create the Faculty Profile
      const profileRes = await apiClient.post("/faculty/", {
        user: userId,
        department: vars.department,
        employee_id: vars.employeeId,
        designation: vars.designation,
        max_weekly_hours: parseInt(vars.maxWeeklyHours, 10),
        qualification: vars.qualification,
        can_take_lab: vars.canTakeLab,
        specializations: [],
      });

      return profileRes.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty-profiles"] });
      toast.success("Faculty member added successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create faculty profile");
    },
  });

  // Update Faculty Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/faculty/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty-profiles"] });
      toast.success("Faculty profile updated successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update profile");
    },
  });

  // Delete Faculty Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/faculty/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty-profiles"] });
      toast.success("Faculty member deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete faculty");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingFaculty) {
      const payload = {
        user: editingFaculty.user,
        department,
        employee_id: employeeId,
        designation,
        max_weekly_hours: parseInt(maxWeeklyHours, 10),
        qualification,
        can_take_lab: canTakeLab,
      };
      updateMutation.mutate({ id: editingFaculty.id, data: payload });
    } else {
      if (!firstName || !lastName || !email || !employeeId) {
        toast.error("Name, Email, and Employee ID are required");
        return;
      }
      createMutation.mutate({
        firstName,
        lastName,
        email,
        phone,
        employeeId,
        department,
        designation,
        maxWeeklyHours,
        qualification,
        canTakeLab,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this faculty profile?")) {
      deleteMutation.mutate(id);
    }
  };

  const faculty = Array.isArray(facultyData) ? facultyData : [];

  const filteredFaculty = faculty.filter((f: Faculty) => {
    const matchesSearch =
      f.full_name.toLowerCase().includes(search.toLowerCase()) ||
      f.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      (f.email && f.email.toLowerCase().includes(search.toLowerCase()));
    const matchesDept = deptFilter ? f.department === deptFilter : true;
    const matchesDesg = desgFilter ? f.designation === desgFilter : true;
    return matchesSearch && matchesDept && matchesDesg;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Faculty Profiles</h1>
          <p className="text-white/50 text-sm mt-1">Manage teaching staff, workload parameters, and departments</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Faculty
        </motion.button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 min-w-[280px] flex-1 focus-within:border-tnu-accent/50 transition-colors">
          <Search className="w-5 h-5 text-white/30 ml-3" />
          <input
            type="text"
            placeholder="Search by name, employee ID, email..."
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
          value={desgFilter}
          onChange={(e) => setDesgFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Designations</option>
          {DESIGNATIONS.map((d) => (
            <option key={d.value} value={d.value} className="bg-[#0a1628]">
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of faculty profiles */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading faculty...
        </div>
      ) : filteredFaculty.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <User className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No faculty profiles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFaculty.map((f: Faculty, i: number) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-tnu-primary/50 border border-tnu-primary flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {f.full_name?.charAt(0) || "F"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(f)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-white font-semibold text-lg">{f.full_name}</h3>
                  <p className="text-tnu-accent text-xs font-semibold mt-0.5">
                    {DESIGNATIONS.find((d) => d.value === f.designation)?.label || f.designation}
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs bg-white/5 text-white/70 border border-white/10">
                    ID: {f.employee_id}
                  </span>

                  <div className="mt-4 space-y-2 text-xs text-white/60">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-white/30" />
                      <span className="truncate">{f.email || "No email"}</span>
                    </div>
                    {f.qualification && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-white/30" />
                        <span>{f.qualification}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                <span className="truncate max-w-[120px] text-white/60">{f.department_name}</span>
                <span>Max Weekly: {f.max_weekly_hours} hrs</span>
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
                  {editingFaculty ? "Edit Faculty Profile" : "Add Faculty Profile"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* User Info (Only for New Faculty) */}
                {!editingFaculty && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-white/70 text-xs font-medium">First Name</label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. John"
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
                          placeholder="e.g. Doe"
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
                          placeholder="john.doe@neotiauniversity.edu.in"
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Employee ID</label>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. EMP1024"
                      className="input-dark text-sm py-2"
                    />
                  </div>
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
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="text-white/70 text-xs font-medium">Designation</label>
                    <select
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      {DESIGNATIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Weekly Hours</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={40}
                      value={maxWeeklyHours}
                      onChange={(e) => setMaxWeeklyHours(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Qualification</label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. Ph.D. in Computer Science"
                    className="input-dark text-sm py-2"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="canTakeLab"
                    checked={canTakeLab}
                    onChange={(e) => setCanTakeLab(e.target.checked)}
                    className="w-4 h-4 accent-tnu-accent"
                  />
                  <label htmlFor="canTakeLab" className="text-white/70 text-sm font-medium cursor-pointer">
                    Can supervise lab sessions?
                  </label>
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
                    {editingFaculty ? "Save Changes" : "Create Profile"}
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

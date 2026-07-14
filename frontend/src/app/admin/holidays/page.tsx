"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, CalendarOff, ShieldAlert, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Holiday {
  id: string;
  name: string;
  date: string;
  description: string;
  is_public: boolean;
  created_by_name: string | null;
}

export default function HolidaysPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Fetch holidays
  const { data: holidaysData, isLoading } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => apiClient.get("/holidays/").then((res) => res.data.results || res.data || []),
  });

  const openAddModal = () => {
    setEditingHoliday(null);
    setName("");
    setDate("");
    setDescription("");
    setIsPublic(true);
    setIsModalOpen(true);
  };

  const openEditModal = (h: Holiday) => {
    setEditingHoliday(h);
    setName(h.name);
    setDate(h.date);
    setDescription(h.description || "");
    setIsPublic(h.is_public);
    setIsModalOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newHoliday: any) => apiClient.post("/holidays/", newHoliday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Holiday created successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create holiday");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/holidays/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Holiday updated successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update holiday");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/holidays/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Holiday deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete holiday");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) {
      toast.error("Name and Date are required");
      return;
    }

    const payload = {
      name,
      date,
      description,
      is_public: isPublic,
    };

    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this holiday?")) {
      deleteMutation.mutate(id);
    }
  };

  const holidays = Array.isArray(holidaysData) ? holidaysData : [];

  const filteredHolidays = holidays.filter(
    (h: Holiday) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.date.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Holidays</h1>
          <p className="text-white/50 text-sm mt-1">Manage public holidays and university closure events</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Holiday
        </motion.button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 p-1 rounded-2xl bg-white/5 border border-white/10 max-w-md focus-within:border-tnu-accent/50 transition-colors">
        <Search className="w-5 h-5 text-white/30 ml-3" />
        <input
          type="text"
          placeholder="Search by holiday name or date (YYYY-MM-DD)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent px-2 py-2 text-white text-sm focus:outline-none placeholder-white/30"
        />
      </div>

      {/* Grid of holiday cards */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading holidays...
        </div>
      ) : filteredHolidays.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <CalendarOff className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No holidays found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHolidays.map((h: Holiday, i: number) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-tnu-primary/50 border border-tnu-primary flex items-center justify-center">
                    <CalendarOff className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(h)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-white font-semibold text-lg">{h.name}</h3>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    h.is_public ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  }`}>
                    {h.is_public ? "Public Holiday" : "University Holiday"}
                  </span>
                  <p className="text-white/60 text-xs mt-3 leading-relaxed line-clamp-2">
                    {h.description || "No holiday remarks."}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                <span className="text-white font-medium">📅 {formatDate(h.date)}</span>
                {h.created_by_name && <span>Added by: {h.created_by_name}</span>}
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
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1628] p-6 shadow-xl z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editingHoliday ? "Edit Holiday" : "Add Holiday"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Holiday Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Independence Day"
                    className="input-dark text-sm py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Holiday Category</label>
                    <select
                      value={isPublic ? "true" : "false"}
                      onChange={(e) => setIsPublic(e.target.value === "true")}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="true">Public Holiday</option>
                      <option value="false">University Closed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Holiday details or remarks..."
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
                    {editingHoliday ? "Save Changes" : "Create Holiday"}
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

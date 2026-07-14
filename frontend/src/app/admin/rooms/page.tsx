"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, MapPin, Monitor, Tv, Wind, Check, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface Room {
  id: string;
  number: string;
  name: string;
  block: string;
  floor: number;
  room_type: string;
  capacity: number;
  lab_type: string;
  department: string | null;
  department_name: string | null;
  has_projector: boolean;
  has_smart_board: boolean;
  has_ac: boolean;
  has_computers: boolean;
  computer_count: number;
  notes: string;
}

const ROOM_TYPES = [
  { value: "THEORY", label: "Theory Classroom" },
  { value: "LAB", label: "Laboratory" },
  { value: "SEMINAR", label: "Seminar Hall" },
  { value: "AUDITORIUM", label: "Auditorium" },
];

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form states
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [block, setBlock] = useState("");
  const [floor, setFloor] = useState("0");
  const [roomType, setRoomType] = useState("THEORY");
  const [capacity, setCapacity] = useState("60");
  const [labType, setLabType] = useState("");
  const [department, setDepartment] = useState("");
  const [hasProjector, setHasProjector] = useState(true);
  const [hasSmartBoard, setHasSmartBoard] = useState(false);
  const [hasAc, setHasAc] = useState(false);
  const [hasComputers, setHasComputers] = useState(false);
  const [computerCount, setComputerCount] = useState("0");
  const [notes, setNotes] = useState("");

  // Fetch rooms
  const { data: roomsData, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => apiClient.get("/rooms/").then((res) => res.data.results || res.data || []),
  });

  // Fetch departments
  const { data: deptsList } = useQuery({
    queryKey: ["departments-simple"],
    queryFn: () => apiClient.get("/departments/?page_size=100").then((res) => res.data.results || res.data || []),
  });

  const openAddModal = () => {
    setEditingRoom(null);
    setNumber("");
    setName("");
    setBlock("");
    setFloor("0");
    setRoomType("THEORY");
    setCapacity("60");
    setLabType("");
    setDepartment("");
    setHasProjector(true);
    setHasSmartBoard(false);
    setHasAc(false);
    setHasComputers(false);
    setComputerCount("0");
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setNumber(room.number);
    setName(room.name || "");
    setBlock(room.block || "");
    setFloor(room.floor.toString());
    setRoomType(room.room_type);
    setCapacity(room.capacity.toString());
    setLabType(room.lab_type || "");
    setDepartment(room.department || "");
    setHasProjector(room.has_projector);
    setHasSmartBoard(room.has_smart_board);
    setHasAc(room.has_ac);
    setHasComputers(room.has_computers);
    setComputerCount(room.computer_count.toString());
    setNotes(room.notes || "");
    setIsModalOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newRoom: any) => apiClient.post("/rooms/", newRoom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Room created successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create room");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/rooms/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Room updated successfully!");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update room");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/rooms/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Room deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete room");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !capacity) {
      toast.error("Room Number and Capacity are required");
      return;
    }

    const payload = {
      number,
      name,
      block,
      floor: parseInt(floor, 10),
      room_type: roomType,
      capacity: parseInt(capacity, 10),
      lab_type: roomType === "LAB" ? labType : "",
      department: department || null,
      has_projector: hasProjector,
      has_smart_board: hasSmartBoard,
      has_ac: hasAc,
      has_computers: hasComputers,
      computer_count: hasComputers ? parseInt(computerCount, 10) : 0,
      notes,
      is_active: true,
    };

    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this room?")) {
      deleteMutation.mutate(id);
    }
  };

  const rooms = Array.isArray(roomsData) ? roomsData : [];

  const filteredRooms = rooms.filter((r: Room) => {
    const matchesSearch =
      r.number.toLowerCase().includes(search.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter ? r.room_type === typeFilter : true;
    const matchesBlock = blockFilter ? r.block === blockFilter : true;
    return matchesSearch && matchesType && matchesBlock;
  });

  // Extract unique blocks for filter option list
  const uniqueBlocks = Array.from(new Set(rooms.map((r) => r.block).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Rooms</h1>
          <p className="text-white/50 text-sm mt-1">Manage classrooms, labs, capacities, and facilities</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Room
        </motion.button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 min-w-[280px] flex-1 focus-within:border-tnu-accent/50 transition-colors">
          <Search className="w-5 h-5 text-white/30 ml-3" />
          <input
            type="text"
            placeholder="Search by room number or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent px-2 py-2 text-white text-sm focus:outline-none placeholder-white/30"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Types</option>
          {ROOM_TYPES.map((t) => (
            <option key={t.value} value={t.value} className="bg-[#0a1628]">
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tnu-accent/50"
        >
          <option value="" className="bg-[#0a1628]">All Blocks</option>
          {uniqueBlocks.map((b) => (
            <option key={b} value={b} className="bg-[#0a1628]">
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of cards */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
          Loading rooms...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center text-white/40">
          <MapPin className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p>No rooms found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room: Room, i: number) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-tnu-primary/50 border border-tnu-primary flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-tnu-accent" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(room)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-white font-semibold text-lg">Room {room.number}</h3>
                  {room.name && <p className="text-white/60 text-xs mt-0.5">{room.name}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tnu-accent/10 text-tnu-accent border border-tnu-accent/20">
                      {ROOM_TYPES.find((t) => t.value === room.room_type)?.label || room.room_type}
                    </span>
                    {room.block && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-white/70 border border-white/10">
                        {room.block} (Floor {room.floor})
                      </span>
                    )}
                  </div>

                  {/* Facilities list */}
                  <div className="flex gap-3 mt-4 text-white/40">
                    <span title="Projector"><Tv className={`w-4 h-4 ${room.has_projector ? "text-emerald-400" : ""}`} /></span>
                    <span title="Computers"><Monitor className={`w-4 h-4 ${room.has_computers ? "text-emerald-400" : ""}`} /></span>
                    <span title="AC"><Wind className={`w-4 h-4 ${room.has_ac ? "text-emerald-400" : ""}`} /></span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
                <span>Capacity: {room.capacity}</span>
                {room.has_computers && room.computer_count > 0 && (
                  <span>{room.computer_count} PC's</span>
                )}
                {room.department_name && (
                  <span className="truncate max-w-[120px]">{room.department_name}</span>
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
                  {editingRoom ? "Edit Room" : "Add Room"}
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
                    <label className="text-white/70 text-xs font-medium">Room Number</label>
                    <input
                      type="text"
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="e.g. B-201"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Room Name (Optional)</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Smart Room B201"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Block</label>
                    <input
                      type="text"
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      placeholder="e.g. Block-B"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Floor</label>
                    <input
                      type="number"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Capacity</label>
                    <input
                      type="number"
                      required
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Room Type</label>
                    <select
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      {ROOM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Owning Dept (Optional)</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="input-dark text-sm py-2 bg-[#0d1f35]"
                    >
                      <option value="">Shared / Common</option>
                      {Array.isArray(deptsList) &&
                        deptsList.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {roomType === "LAB" && (
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Lab Type</label>
                    <input
                      type="text"
                      value={labType}
                      onChange={(e) => setLabType(e.target.value)}
                      placeholder="e.g. Computer Lab, Chemistry Lab"
                      className="input-dark text-sm py-2"
                    />
                  </div>
                )}

                {/* Facilities Checklist */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-white/75 text-xs font-semibold uppercase tracking-wider">Facilities</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasProjector"
                        checked={hasProjector}
                        onChange={(e) => setHasProjector(e.target.checked)}
                        className="w-4 h-4 accent-tnu-accent"
                      />
                      <label htmlFor="hasProjector" className="text-white/60 text-xs font-medium cursor-pointer">
                        Has Projector
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasSmartBoard"
                        checked={hasSmartBoard}
                        onChange={(e) => setHasSmartBoard(e.target.checked)}
                        className="w-4 h-4 accent-tnu-accent"
                      />
                      <label htmlFor="hasSmartBoard" className="text-white/60 text-xs font-medium cursor-pointer">
                        Has Smart Board
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasAc"
                        checked={hasAc}
                        onChange={(e) => setHasAc(e.target.checked)}
                        className="w-4 h-4 accent-tnu-accent"
                      />
                      <label htmlFor="hasAc" className="text-white/60 text-xs font-medium cursor-pointer">
                        Has AC
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hasComputers"
                        checked={hasComputers}
                        onChange={(e) => setHasComputers(e.target.checked)}
                        className="w-4 h-4 accent-tnu-accent"
                      />
                      <label htmlFor="hasComputers" className="text-white/60 text-xs font-medium cursor-pointer">
                        Has Computers
                      </label>
                    </div>
                  </div>
                </div>

                {hasComputers && (
                  <div className="space-y-1">
                    <label className="text-white/70 text-xs font-medium">Computer Count</label>
                    <input
                      type="number"
                      value={computerCount}
                      onChange={(e) => setComputerCount(e.target.value)}
                      className="input-dark text-sm py-2"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-white/70 text-xs font-medium">Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special remarks..."
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
                    {editingRoom ? "Save Changes" : "Create Room"}
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

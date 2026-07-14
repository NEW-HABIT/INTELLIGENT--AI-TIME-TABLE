"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, BookOpen, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";

export default function FacultySchedulePage() {
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["faculty-schedule"],
    queryFn: () => apiClient.get("/faculty/me_schedule/").then((r) => r.data),
  });

  const slots = scheduleData?.slots || [];

  // Map slots to fit TimetableGrid format
  const gridSlots = slots.map((s: any) => ({
    id: s.id,
    day: s.day,
    subject: { name: s.subject_name, code: s.subject_code },
    faculty: { name: s.faculty_name },
    room: { number: s.room_number },
    start_time: s.time_slots_data?.start_time || "09:30",
    end_time: s.time_slots_data?.end_time || "10:30",
    is_lab: s.is_lab_block,
    is_locked: s.is_locked,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-display text-3xl font-bold text-white"
        >
          My Teaching Schedule
        </motion.h1>
        <p className="text-white/50 mt-1">Weekly lecture assignments and laboratory sessions</p>
      </div>

      {/* Weekly Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-[#0d1f35] border border-white/10"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-display font-semibold text-lg">Weekly Schedule</h3>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-400/60" /> Theory
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400/60" /> Lab
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex items-center gap-3 text-white/40">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading your schedule...
            </div>
          </div>
        ) : gridSlots.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <BookOpen className="w-12 h-12 text-white/20" />
            <p className="text-white/40 text-center">
              No classes assigned to you in the current timetable.
              <br />
              <span className="text-sm">Please check with the system administrator.</span>
            </p>
          </div>
        ) : (
          <TimetableGrid slots={gridSlots} />
        )}
      </motion.div>
    </div>
  );
}

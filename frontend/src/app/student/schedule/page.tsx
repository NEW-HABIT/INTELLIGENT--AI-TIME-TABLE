"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Download, RefreshCw, BookOpen, Clock } from "lucide-react";
import { apiClient } from "@/lib/api";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { useAuthStore } from "@/store/auth";

export default function StudentSchedulePage() {
  const { user } = useAuthStore();

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["student-schedule"],
    queryFn: () => apiClient.get("/student/me/schedule/").then(r => r.data),
  });

  const { data: sectionInfo } = useQuery({
    queryKey: ["student-section"],
    queryFn: () => apiClient.get("/student/me/section/").then(r => r.data),
  });

  const handleExport = async (format: "pdf" | "ical") => {
    try {
      if (format === "pdf") {
        const res = await apiClient.get("/export/student/schedule/pdf/", { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my-timetable.pdf";
        a.click();
      }
    } catch {
      alert("Export failed. Please try again.");
    }
  };

  const slots = scheduleData?.slots || [];
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const todayIndex = today === 0 ? 4 : today - 1; // Convert to Mon=0 index

  const todaySlots = slots.filter((s: any) => s.day === todayIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-display text-3xl font-bold text-white"
          >
            My Schedule
          </motion.h1>
          <p className="text-white/50 mt-1">
            {sectionInfo?.section_name || "Loading section..."} — Weekly Timetable
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/15 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Today's Classes */}
      {todaySlots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-gradient-to-r from-tnu-primary/30 to-blue-900/30 border border-tnu-primary/40"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-tnu-accent" />
            <h3 className="text-white font-semibold">Today's Classes</h3>
            <span className="badge-completed">{todaySlots.length} classes</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todaySlots.map((slot: any, i: number) => (
              <div key={slot.id || i} className="p-3 rounded-xl bg-white/10 border border-white/15">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-tnu-accent text-xs font-bold">{slot.subject?.code}</span>
                  {slot.is_lab && <span className="badge-completed text-[10px] py-0">LAB</span>}
                </div>
                <p className="text-white text-sm font-medium">{slot.subject?.name}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-white/50 text-xs">
                    <Clock className="w-3 h-3" /> {slot.start_time} – {slot.end_time}
                  </div>
                  <p className="text-white/50 text-xs">📍 {slot.room?.number}</p>
                  <p className="text-white/50 text-xs">👨‍🏫 {slot.faculty?.name}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weekly Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
        ) : slots.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <BookOpen className="w-12 h-12 text-white/20" />
            <p className="text-white/40 text-center">
              No timetable generated yet for your section.
              <br />
              <span className="text-sm">Check back when the admin generates the timetable.</span>
            </p>
          </div>
        ) : (
          <TimetableGrid slots={slots} />
        )}
      </motion.div>
    </div>
  );
}

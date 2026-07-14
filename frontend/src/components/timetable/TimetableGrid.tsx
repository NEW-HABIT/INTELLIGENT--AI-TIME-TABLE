"use client";
import { motion } from "framer-motion";
import { Clock, MapPin, User, Lock, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
  { label: "9:30", sub: "10:30" },
  { label: "10:30", sub: "11:30" },
  { label: "11:30", sub: "12:30" },
  { label: "12:30", sub: "13:15" },
  // LUNCH 13:15 – 14:15
  { label: "14:15", sub: "15:15" },
  { label: "15:15", sub: "16:15" },
  { label: "16:15", sub: "16:30" },
];

type TimetableSlot = {
  id: string;
  day: number;
  subject: { name: string; code: string };
  faculty: { name: string };
  room: { number: string };
  start_time: string;
  end_time: string;
  is_lab: boolean;
  is_locked: boolean;
};

interface TimetableGridProps {
  slots: TimetableSlot[];
  showSaturday?: boolean;
  viewMode?: "section" | "faculty" | "room";
  onSlotClick?: (slot: TimetableSlot) => void;
  editable?: boolean;
}

const SUBJECT_COLORS = [
  "bg-blue-500/20 border-blue-400/40 text-blue-200",
  "bg-emerald-500/20 border-emerald-400/40 text-emerald-200",
  "bg-purple-500/20 border-purple-400/40 text-purple-200",
  "bg-amber-500/20 border-amber-400/40 text-amber-200",
  "bg-rose-500/20 border-rose-400/40 text-rose-200",
  "bg-cyan-500/20 border-cyan-400/40 text-cyan-200",
  "bg-indigo-500/20 border-indigo-400/40 text-indigo-200",
  "bg-teal-500/20 border-teal-400/40 text-teal-200",
];

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function TimetableGrid({
  slots,
  showSaturday = false,
  onSlotClick,
  editable = false,
}: TimetableGridProps) {
  const days = showSaturday ? DAYS : DAYS.slice(0, 5);

  const getSlotForDayTime = (day: number, slotLabel: string): TimetableSlot | null => {
    const slotStart = timeToMinutes(slotLabel);
    return (
      slots.find((s) => {
        if (s.day !== day) return false;
        const sStart = timeToMinutes(s.start_time);
        const sEnd = timeToMinutes(s.end_time);
        return sStart <= slotStart && slotStart < sEnd;
      }) || null
    );
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <div className="min-w-[900px]">
        {/* Header row */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}
        >
          {/* Corner */}
          <div className="p-3 border-b border-r border-white/10 bg-[#0d1f35]">
            <p className="text-white/30 text-xs font-medium text-center">TIME</p>
          </div>
          {/* Day headers */}
          {days.map((day) => (
            <div
              key={day}
              className="p-3 border-b border-r border-white/10 bg-[#0d1f35] text-center"
            >
              <p className="text-white font-semibold text-sm">{day}</p>
            </div>
          ))}
        </div>

        {/* Time rows */}
        {TIME_SLOTS.map((ts, ti) => (
          <div
            key={ts.label}
            className="grid"
            style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}
          >
            {/* Time label */}
            <div className="p-2 border-b border-r border-white/10 bg-[#0a1628] flex flex-col items-center justify-center">
              <p className="text-white/60 text-xs font-mono font-medium">{ts.label}</p>
              <p className="text-white/30 text-xs font-mono">{ts.sub}</p>
            </div>

            {/* Day cells */}
            {days.map((_, di) => {
              const slot = getSlotForDayTime(di, ts.label);
              const isFirstSlotOfClass = slot && timeToMinutes(slot.start_time) === timeToMinutes(ts.label);
              const color = slot ? hashColor(slot.subject.code) : "";

              return (
                <div
                  key={di}
                  className="min-h-[80px] border-b border-r border-white/10 p-1.5 bg-[#0a1628] relative"
                >
                  {slot && isFirstSlotOfClass && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onSlotClick?.(slot)}
                      className={cn(
                        "rounded-lg p-2 border h-full cursor-pointer transition-all duration-200",
                        color,
                        slot.is_lab ? "border-l-4 border-l-emerald-400" : "",
                        editable ? "hover:shadow-lg hover:brightness-110" : ""
                      )}
                    >
                      {/* Subject */}
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-bold leading-tight truncate">
                          {slot.subject.code}
                        </p>
                        <div className="flex gap-1 flex-shrink-0">
                          {slot.is_lab && (
                            <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1 rounded">LAB</span>
                          )}
                          {slot.is_locked && (
                            <Lock className="w-3 h-3 text-amber-400" />
                          )}
                          {editable && !slot.is_locked && (
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] opacity-80 leading-tight mt-0.5 truncate">
                        {slot.subject.name}
                      </p>
                      {/* Meta */}
                      <div className="mt-1.5 space-y-0.5">
                        <div className="flex items-center gap-1 opacity-70">
                          <User className="w-2.5 h-2.5 flex-shrink-0" />
                          <p className="text-[10px] truncate">{slot.faculty.name}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-70">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          <p className="text-[10px] truncate">{slot.room.number}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-60">
                          <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                          <p className="text-[10px]">{slot.start_time} – {slot.end_time}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {slot && !isFirstSlotOfClass && (
                    <div className={cn("rounded-lg h-full border opacity-30", color)} />
                  )}
                  {!slot && (
                    <div className="h-full rounded-lg border border-dashed border-white/5" />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Lunch break row */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}
        >
          <div className="p-2 border-b border-r border-white/10 bg-amber-500/5 flex flex-col items-center justify-center">
            <p className="text-amber-400/60 text-xs font-mono">13:15</p>
            <p className="text-amber-400/40 text-[10px]">14:15</p>
          </div>
          {days.map((_, di) => (
            <div
              key={di}
              className="border-b border-r border-white/10 bg-amber-500/5 flex items-center justify-center py-3"
            >
              <p className="text-amber-400/50 text-xs font-medium">🍽 Lunch Break</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

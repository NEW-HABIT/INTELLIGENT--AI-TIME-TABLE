"use client";
import { motion } from "framer-motion";
import { Clock, MapPin, User, Lock, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIME_SLOTS = [
  { label: "9:30",  sub: "10:30" },
  { label: "10:30", sub: "11:30" },
  { label: "11:30", sub: "12:30" },
  { label: "12:30", sub: "13:15" },
  { label: "13:15", sub: "14:15", isLunch: true },
  { label: "14:15", sub: "15:15" },
  { label: "15:15", sub: "16:15" },
  { label: "16:15", sub: "16:30" },
] as const;

// Height (px) of each grid row — must match min-h-[80px] in the cell classNames
const ROW_HEIGHT = 80;

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
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
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

  /** Find the slot whose time window contains this row label for a given day column */
  const getSlotForDayTime = (dayIdx: number, label: string): TimetableSlot | null => {
    const rowStart = timeToMinutes(label);
    return (
      slots.find((s) => {
        if (s.day !== dayIdx) return false;
        return timeToMinutes(s.start_time) <= rowStart && rowStart < timeToMinutes(s.end_time);
      }) || null
    );
  };

  /**
   * Count how many consecutive non-lunch TIME_SLOTS rows this slot occupies,
   * starting from `startTi`. Used to calculate the merged card height.
   */
  const getSpanCount = (slot: TimetableSlot, startTi: number, dayIdx: number): number => {
    let count = 1;
    for (let i = startTi + 1; i < TIME_SLOTS.length; i++) {
      if ((TIME_SLOTS[i] as any).isLunch) continue; // skip lunch row index
      const next = getSlotForDayTime(dayIdx, TIME_SLOTS[i].label);
      if (next?.id === slot.id) count++;
      else break;
    }
    return count;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <div className="min-w-[900px]">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
          <div className="p-3 border-b border-r border-white/10 bg-[#0d1f35]">
            <p className="text-white/30 text-xs font-medium text-center">TIME</p>
          </div>
          {days.map((day) => (
            <div key={day} className="p-3 border-b border-r border-white/10 bg-[#0d1f35] text-center">
              <p className="text-white font-semibold text-sm">{day}</p>
            </div>
          ))}
        </div>

        {/* ── Time rows ─────────────────────────────────────────────────── */}
        {TIME_SLOTS.map((ts, ti) => {
          const isLunch = !!(ts as any).isLunch;

          /* ── Lunch banner ── */
          if (isLunch) {
            return (
              <div key="lunch" className="grid" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
                <div className="p-2 border-b border-r border-white/10 bg-amber-500/5 flex flex-col items-center justify-center">
                  <p className="text-amber-400/60 text-xs font-mono">13:15</p>
                  <p className="text-amber-400/40 text-[10px]">14:15</p>
                </div>
                {days.map((_, di) => (
                  <div key={di} className="border-b border-r border-white/10 bg-amber-500/5 flex items-center justify-center py-3">
                    <p className="text-amber-400/50 text-xs font-medium">🍽 Lunch Break</p>
                  </div>
                ))}
              </div>
            );
          }

          /* ── Regular row ── */
          return (
            <div key={ts.label} className="grid" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>

              {/* Time label */}
              <div className="p-2 border-b border-r border-white/10 bg-[#0a1628] flex flex-col items-center justify-center">
                <p className="text-white/60 text-xs font-mono font-medium">{ts.label}</p>
                <p className="text-white/30 text-xs font-mono">{ts.sub}</p>
              </div>

              {/* Day cells */}
              {days.map((_, di) => {
                const slot = getSlotForDayTime(di, ts.label);

                const prevTs   = ti > 0 ? TIME_SLOTS[ti - 1] : null;
                const prevSlot = prevTs && !(prevTs as any).isLunch
                  ? getSlotForDayTime(di, prevTs.label)
                  : null;

                const isFirst = slot !== null && prevSlot?.id !== slot.id;
                const color   = slot ? hashColor(slot.subject.code) : "";

                // How many consecutive rows does this slot span?
                const span = isFirst ? getSpanCount(slot!, ti, di) : 1;

                // Card height: span rows * ROW_HEIGHT, minus small gap for inset padding
                const cardHeight = span * ROW_HEIGHT - 8;

                return (
                  <div
                    key={di}
                    className="min-h-[80px] border-b border-r border-white/10 bg-[#0a1628]"
                    // Allow first-row cards to visually overflow into continuation rows
                    style={{ position: "relative", overflow: isFirst ? "visible" : "hidden", zIndex: isFirst ? 2 : 1 }}
                  >
                    {/* ── FIRST row: full card, stretched to cover all span rows ── */}
                    {slot && isFirst && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => onSlotClick?.(slot)}
                        style={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          right: 4,
                          height: cardHeight,
                          zIndex: 10,
                        }}
                        className={cn(
                          "rounded-lg p-2 border cursor-pointer transition-all duration-200 flex flex-col",
                          color,
                          slot.is_lab ? "border-l-4 border-l-emerald-400" : "",
                          editable ? "hover:shadow-lg hover:brightness-110" : ""
                        )}
                      >
                        {/* Code (muted) + LAB badge row */}
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] font-medium text-white/40 leading-none">{slot.subject.code}</p>
                          <div className="flex gap-1 flex-shrink-0">
                            {slot.is_lab && (
                              <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-semibold tracking-wide">LAB</span>
                            )}
                            {slot.is_locked && <Lock className="w-3 h-3 text-amber-400" />}
                            {editable && !slot.is_locked && (
                              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                        </div>

                        {/* Subject name — prominent */}
                        <p className="text-[11px] font-bold leading-tight mt-1 line-clamp-3">
                          {slot.subject.name}
                        </p>

                        {/* Meta — shown for cards taller than 1 row */}
                        {span > 1 && (
                          <div className="mt-2 space-y-0.5">
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
                        )}

                        {/* For single-row cards: show only faculty inline */}
                        {span === 1 && (
                          <div className="mt-1 flex items-center gap-1 opacity-60">
                            <User className="w-2.5 h-2.5 flex-shrink-0" />
                            <p className="text-[9px] truncate">{slot.faculty.name}</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ── CONTINUATION rows: empty — card above covers this space ── */}

                    {/* ── EMPTY cell ── */}
                    {!slot && (
                      <div className="absolute inset-1">
                        <div className="h-full rounded-lg border border-dashed border-white/5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

      </div>
    </div>
  );
}

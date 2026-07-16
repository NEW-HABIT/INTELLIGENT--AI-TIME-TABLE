"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, BookOpen, Building2, UserCheck, Calendar,
  TrendingUp, Clock, AlertCircle, CheckCircle2, Cpu,
  GraduationCap, Layers
} from "lucide-react";
import { apiClient } from "@/lib/api";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// Stat card component
function StatCard({
  icon: Icon, label, value, sub, color, trend, index
}: {
  icon: any; label: string; value: string | number; sub?: string;
  color: string; trend?: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="stat-card bg-[#0d1f35] border-white/10 hover:border-white/20"
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-white/50 text-sm">{label}</p>
        <p className="text-white font-display text-3xl font-bold mt-1">{value}</p>
        {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

const COLORS = ["#1e3a5f", "#c8922a", "#2dd4bf", "#a855f7", "#ef4444"];

export default function AdminDashboard() {
  const { data: dashboardData } = useQuery({
    queryKey: ["admin-dashboard-analytics"],
    queryFn: () => apiClient.get("/analytics/dashboard/").then(r => r.data),
    refetchInterval: 5000,
    initialData: {
      stats: { departments: 0, faculty: 0, students: 0, rooms: 0 },
      weekly_load: [],
      class_types: [],
      recent_generations: []
    },
  });

  const stats = dashboardData.stats || { departments: 0, faculty: 0, students: 0, rooms: 0 };
  const weeklyData = dashboardData.weekly_load || [];
  const pieData = dashboardData.class_types || [];
  const generations = dashboardData.recent_generations || [];

  const statCards = [
    { icon: Building2, label: "Departments", value: stats.departments, color: "from-blue-600 to-blue-800", trend: "+2 this year", sub: "Active departments" },
    { icon: UserCheck, label: "Faculty Members", value: stats.faculty, color: "from-emerald-600 to-emerald-800", trend: "+5 this sem", sub: "Teaching staff" },
    { icon: GraduationCap, label: "Students", value: stats.students, color: "from-purple-600 to-purple-800", trend: "+120 enrolled", sub: "Enrolled students" },
    { icon: Building2, label: "Rooms", value: stats.rooms, color: "from-amber-600 to-amber-800", sub: "Theory + Labs" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-display text-3xl font-bold text-white"
        >
          Dashboard
        </motion.h1>
        <p className="text-white/50 mt-1">
          The Neotia University — Timetable Management Overview
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} {...card} index={i} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Classes Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 p-6 rounded-2xl bg-[#0d1f35] border border-white/10"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-display font-semibold text-lg">Weekly Schedule Load</h3>
              <p className="text-white/40 text-sm">Classes scheduled per day</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-white/60">
                <span className="w-3 h-3 rounded-full bg-tnu-primary inline-block" /> Classes
              </span>
              <span className="flex items-center gap-1.5 text-white/60">
                <span className="w-3 h-3 rounded-full bg-tnu-accent inline-block" /> Rooms Used
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="classGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="roomGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#0d1f35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }}
              />
              <Area type="monotone" dataKey="classes" stroke="#2563eb" strokeWidth={2} fill="url(#classGrad)" />
              <Area type="monotone" dataKey="rooms" stroke="#2dd4bf" strokeWidth={2} fill="url(#roomGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Class Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-[#0d1f35] border border-white/10"
        >
          <h3 className="text-white font-display font-semibold text-lg mb-1">Class Types</h3>
          <p className="text-white/40 text-sm mb-6">Distribution by type</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0d1f35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Generations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-6 rounded-2xl bg-[#0d1f35] border border-white/10"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-display font-semibold text-lg">Recent Timetable Generations</h3>
            <p className="text-white/40 text-sm">Latest solver runs</p>
          </div>
          <a href="/admin/timetable" className="text-tnu-accent text-sm hover:underline">View all →</a>
        </div>

        {generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Cpu className="w-12 h-12 text-white/20 mb-3" />
            <p className="text-white/40">No timetable generations yet.</p>
            <a href="/admin/timetable" className="mt-3 text-tnu-accent text-sm hover:underline">
              Generate your first timetable →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {generations.map((gen: any) => (
              <div key={gen.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    gen.status === "COMPLETED" ? "bg-emerald-500/20" :
                    gen.status === "RUNNING" ? "bg-blue-500/20 animate-pulse" :
                    gen.status === "INFEASIBLE" ? "bg-red-500/20" : "bg-amber-500/20"
                  }`}>
                    {gen.status === "COMPLETED" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
                     gen.status === "RUNNING" ? <Cpu className="w-5 h-5 text-blue-400" /> :
                     <AlertCircle className="w-5 h-5 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{gen.semester?.name || "Semester"} — v{gen.version}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {gen.solve_time_seconds ? `${gen.solve_time_seconds.toFixed(1)}s` : "—"} solve time
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={
                    gen.status === "COMPLETED" ? "badge-completed" :
                    gen.status === "RUNNING" ? "badge-running" :
                    gen.status === "INFEASIBLE" ? "badge-failed" : "badge-pending"
                  }>
                    {gen.status}
                  </span>
                  <a href={`/admin/timetable/${gen.id}`} className="text-white/40 hover:text-white text-sm transition-colors">
                    View →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

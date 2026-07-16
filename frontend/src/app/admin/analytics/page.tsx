"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { motion } from "framer-motion";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, AreaChart, Area } from "recharts";
import { BarChart3, TrendingUp, Users, BookOpen, Clock, Activity } from "lucide-react";

export default function AnalyticsPage() {
  const { data: overviewData } = useQuery({
    queryKey: ["admin-analytics-overview"],
    queryFn: () => apiClient.get("/analytics/overview/").then(r => r.data),
    refetchInterval: 5000,
    initialData: {
      summary: [],
      weekly_load: [],
      class_distribution: [],
      department_breakdown: []
    },
  });

  const summaryStats = overviewData.summary || [];
  const weeklyLoadData = overviewData.weekly_load || [];
  const classDistribution = overviewData.class_distribution || [];
  const deptData = overviewData.department_breakdown || [];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Activity": return Activity;
      case "Clock": return Clock;
      case "Users": return Users;
      case "BookOpen": return BookOpen;
      default: return Activity;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white">System Analytics</h1>
        <p className="text-white/50 text-sm mt-1">Global workload load, room utility rates, and department performance metrics</p>
      </div>

      {/* Mini Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat: any, idx: number) => {
          const IconComponent = getIcon(stat.icon);
          return (
            <motion.div
              key={stat.label || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10"
            >
              <div className="flex justify-between items-start">
                <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
                <IconComponent className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-white text-2xl font-bold font-display mt-2">{stat.value}</p>
              <span className="text-[10px] text-white/30 mt-1 block flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> {stat.change}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Load Chart */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 p-5 rounded-2xl bg-[#0d1f35] border border-white/10"
        >
          <div className="mb-4">
            <h3 className="text-white font-semibold">Weekly Load Trend</h3>
            <p className="text-white/40 text-xs">Total scheduled periods vs room assignment count</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyLoadData}>
                <defs>
                  <linearGradient id="colorClasses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUtilization" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
                <Area name="Classes Scheduled" type="monotone" dataKey="classes" stroke="#2563eb" fillOpacity={1} fill="url(#colorClasses)" />
                <Area name="Room Utilization %" type="monotone" dataKey="utilization" stroke="#2dd4bf" fillOpacity={1} fill="url(#colorUtilization)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Class Types Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-[#0d1f35] border border-white/10 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-white font-semibold">Class Types</h3>
            <p className="text-white/40 text-xs mb-4">Breakdown of scheduled load types</p>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={classDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                  {classDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {classDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="text-white font-semibold">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Department Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 p-5 rounded-2xl bg-[#0d1f35] border border-white/10"
        >
          <div className="mb-4">
            <h3 className="text-white font-semibold">Department workload breakdown</h3>
            <p className="text-white/40 text-xs">Comparison of faculty capacity, courses, and total weekly hours</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name="Faculty Count" dataKey="faculty" fill="#c8922a" radius={[4, 4, 0, 0]} />
                <Bar name="Subjects Allocated" dataKey="courses" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                <Bar name="Weekly Load (Hours)" dataKey="hours" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

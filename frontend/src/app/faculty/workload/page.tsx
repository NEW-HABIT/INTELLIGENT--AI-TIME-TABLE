"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Clock, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function FacultyWorkloadPage() {
  const { data: workloadData, isLoading } = useQuery({
    queryKey: ["faculty-workload"],
    queryFn: () => apiClient.get("/faculty/me_workload/").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-white/40">
        <Loader2 className="w-8 h-8 animate-spin text-tnu-accent mr-3" />
        Loading workload metrics...
      </div>
    );
  }

  const { total_weekly_hours = 0, max_weekly_hours = 18, utilization_percent = 0, allocations = [] } = workloadData || {};

  const isOverworked = total_weekly_hours > max_weekly_hours;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white">My Workload Summary</h1>
        <p className="text-white/50 text-sm mt-1">Teaching hours utilization rates and course allocations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Utilization Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-[#0d1f35] border border-white/10 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-white font-semibold text-lg">Hours Utilization</h3>
            <p className="text-white/40 text-xs">Total assigned hours relative to limits</p>

            <div className="my-6 space-y-2">
              <div className="flex justify-between items-baseline text-white">
                <span className="text-3xl font-bold font-display">{total_weekly_hours}</span>
                <span className="text-white/40 text-sm">/ {max_weekly_hours} hrs max</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isOverworked ? "bg-red-500" : utilization_percent > 85 ? "bg-amber-500" : "bg-tnu-accent"
                  }`}
                  style={{ width: `${Math.min(utilization_percent, 100)}%` }}
                />
              </div>
              <p className="text-white/50 text-right text-xs">{utilization_percent}% Limit Utilized</p>
            </div>
          </div>

          {isOverworked ? (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-xs">
                Your assigned hours exceed the recommended guidelines. Please contact scheduling administration.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 text-xs">Your workload allocation is within guidelines.</p>
            </div>
          )}
        </motion.div>

        {/* Allocations Table */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 p-6 rounded-2xl bg-[#0d1f35] border border-white/10"
        >
          <div className="mb-4">
            <h3 className="text-white font-semibold text-lg">Active Course Allocations</h3>
            <p className="text-white/40 text-xs">Assigned sections and hours per subject module</p>
          </div>

          {allocations.length === 0 ? (
            <p className="text-white/40 text-sm py-8 text-center">No active allocations assigned.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-white/70">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 text-xs uppercase">
                    <th className="py-2.5">Subject Code</th>
                    <th className="py-2.5">Subject Name</th>
                    <th className="py-2.5">Section</th>
                    <th className="py-2.5 text-right">Weekly Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allocations.map((alloc: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 font-semibold text-tnu-accent">{alloc.code}</td>
                      <td className="py-3 text-white">{alloc.subject}</td>
                      <td className="py-3">{alloc.section}</td>
                      <td className="py-3 text-right text-white font-semibold">{alloc.weekly_hours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

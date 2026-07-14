"use client";
import { ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, LogOut, ChevronRight, Menu, X, Bell, Calendar, BarChart3, Clock } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

const navItems = [
  { href: "/faculty/schedule", icon: Calendar, label: "My Schedule" },
  { href: "/faculty/workload", icon: BarChart3, label: "My Workload" },
  { href: "/faculty/availability", icon: Clock, label: "Availability Settings" },
];

export default function FacultyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      await apiClient.post("/auth/logout/", { refresh: refreshToken });
    } catch {}
    clearAuth();
    document.cookie = "access_token=; path=/; max-age=0";
    document.cookie = "user_role=; path=/; max-age=0";
    router.push("/login");
    toast.success("Logged out successfully");
  };

  return (
    <div className="flex h-screen bg-tnu-dark overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="relative flex-shrink-0 flex flex-col border-r border-white/10 overflow-hidden"
            style={{ background: "linear-gradient(180deg, #0d1f35 0%, #0a1628 100%)" }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tnu-secondary to-amber-600 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-display font-bold text-sm truncate">TNU Timetable</p>
                <p className="text-white/40 text-xs truncate">Faculty Portal</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto custom-scroll">
              <p className="px-3 mb-2 text-white/30 text-[10px] font-semibold uppercase tracking-wider">
                Teaching Workspace
              </p>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`sidebar-item ${isActive ? "active" : ""}`}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                  </Link>
                );
              })}
            </nav>

            {/* User footer */}
            <div className="p-3 border-t border-white/10">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">
                    {user?.full_name?.charAt(0) || "F"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
                  <p className="text-white/40 text-xs truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a1628]/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-white/40">Faculty</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/20" />
              <span className="text-white font-medium capitalize">
                {pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tnu-secondary rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto custom-scroll p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

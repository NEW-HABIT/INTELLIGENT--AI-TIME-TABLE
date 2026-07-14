"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, GraduationCap, Lock, Mail, Sparkles, Shield, Brain } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: Brain, label: "AI-Powered Scheduling", desc: "OR-Tools CP-SAT optimization" },
  { icon: Shield, label: "Zero Conflict Guarantee", desc: "Hard constraint enforcement" },
  { icon: Sparkles, label: "Smart Suggestions", desc: "Gemini AI assistant" },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post("/auth/login/", data);
      const { access, refresh, user } = res.data;

      setTokens(access, refresh);
      setUser(user);

      // Store tokens in cookies for SSR
      document.cookie = `access_token=${access}; path=/; max-age=3600; SameSite=Strict`;
      document.cookie = `user_role=${user.role}; path=/; max-age=604800; SameSite=Strict`;

      toast.success(`Welcome back, ${user.full_name}!`);

      // Redirect based on role
      const roleRoutes: Record<string, string> = {
        ADMIN: "/admin/dashboard",
        FACULTY: "/faculty/dashboard",
        STUDENT: "/student/dashboard",
      };
      router.push(roleRoutes[user.role] || "/");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        "Invalid email or password. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tnu-dark flex overflow-hidden">
      {/* ─── Left Panel — Branding ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f1f33 0%, #1e3a5f 40%, #1a4a6b 70%, #0d3a52 100%)",
        }}
      >
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #2dd4bf, transparent)" }}
          />
          <motion.div
            animate={{ rotate: -360, scale: [1, 1.2, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #c8922a, transparent)" }}
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-tnu-secondary to-amber-600 flex items-center justify-center shadow-glow-amber">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-tnu-secondary font-display font-bold text-xl tracking-wide">TNU</p>
              <p className="text-white/60 text-xs">The Neotia University</p>
            </div>
          </motion.div>
        </div>

        {/* Main Hero Text */}
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <h1 className="font-display text-5xl font-bold text-white leading-tight">
              Intelligent
              <br />
              <span className="bg-gradient-to-r from-tnu-secondary via-amber-400 to-tnu-accent bg-clip-text text-transparent">
                Timetable
              </span>
              <br />
              Management
            </h1>
            <p className="mt-4 text-white/60 text-lg leading-relaxed max-w-md">
              AI-powered scheduling system that eliminates conflicts, optimizes resource usage,
              and creates perfect timetables — automatically.
            </p>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="space-y-3"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-tnu-primary to-tnu-accent flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{feature.label}</p>
                  <p className="text-white/50 text-xs">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Footer quote */}
        <div className="relative z-10">
          <p className="text-white/30 text-sm italic">
            "Excellence through Innovation — The Neotia University"
          </p>
          <p className="text-white/20 text-xs mt-1">
            Diamond Harbour Road, Sarisha, West Bengal 743368
          </p>
        </div>
      </motion.div>

      {/* ─── Right Panel — Login Form ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full lg:w-[45%] flex items-center justify-center p-8"
        style={{ background: "#0a1628" }}
      >
        <div className="w-full max-w-[420px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-tnu-secondary to-amber-600 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white font-display font-bold text-lg">TNU Timetable</p>
              <p className="text-white/40 text-xs">The Neotia University</p>
            </div>
          </div>

          {/* Header */}
          <div>
            <h2 className="font-display text-3xl font-bold text-white">Welcome back</h2>
            <p className="text-white/50 mt-2">Sign in to access your portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-white/70 text-sm font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 w-4 h-4" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@neotiauniversity.edu.in"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 
                             text-white placeholder-white/30 focus:outline-none focus:border-tnu-accent/60 
                             focus:bg-white/8 transition-all duration-200 text-sm"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-white/70 text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 
                             text-white placeholder-white/30 focus:outline-none focus:border-tnu-accent/60 
                             focus:bg-white/8 transition-all duration-200 text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white
                         bg-gradient-to-r from-tnu-primary via-blue-700 to-tnu-primary
                         bg-size-200 bg-pos-0 hover:bg-pos-100
                         shadow-glow transition-all duration-300
                         disabled:opacity-60 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </form>

          {/* Role indicators */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-white/30 text-xs text-center mb-3">Portal Access</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: "Admin", color: "from-purple-500 to-purple-700", emoji: "⚙️" },
                { role: "Faculty", color: "from-blue-500 to-blue-700", emoji: "👨‍🏫" },
                { role: "Student", color: "from-emerald-500 to-emerald-700", emoji: "🎓" },
              ].map((item) => (
                <div
                  key={item.role}
                  className={`p-2.5 rounded-lg bg-gradient-to-br ${item.color} bg-opacity-20 
                               border border-white/10 text-center`}
                >
                  <div className="text-lg">{item.emoji}</div>
                  <p className="text-white/60 text-xs mt-0.5">{item.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

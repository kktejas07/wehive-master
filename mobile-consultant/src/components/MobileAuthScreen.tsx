import React, { useState } from "react";
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck, ArrowRight, Smartphone, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import WeHiveLogo from "./WeHiveLogo";

interface MobileAuthScreenProps {
  onSuccess: () => void;
  colorScheme: any;
}

export default function MobileAuthScreen({ onSuccess, colorScheme }: MobileAuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("student@wehive.com");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("Aman Gupta");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    // Simulate mobile auth check
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 1500);
  };

  return (
    <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-6 z-50 text-white font-sans" style={{ fontFamily: "system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Logo & Brand Tagline */}
      <div className="flex flex-col items-center text-center pt-8 relative z-10">
        <WeHiveLogo className="w-16 h-16 filter drop-shadow-md" />
        <h1 className="text-2xl font-black tracking-tight mt-3 text-slate-100">WeHive Consultant</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-rose-500 mt-2 max-w-xs leading-relaxed">
          Our Ambition. Our Guidance. No Frontiers
        </p>
      </div>

      {/* Form Container */}
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto relative z-10">
        
        <h2 className="text-lg font-bold mb-6 text-slate-200">
          {isLogin ? "Sign In to Client Portal" : "Create Consultant Account"}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Field (Signup only) */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Aman Gupta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-slate-600 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4.5 h-4.5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="student@wehive.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-slate-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Security Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4.5 h-4.5 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-slate-600 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 hover:text-white text-slate-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-950/20 disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? "Verifying Credentials..." : isLogin ? "Sign In to Dashboard" : "Register Account"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-[10px] text-slate-400 hover:text-slate-200 font-bold transition-colors cursor-pointer"
          >
            {isLogin ? "New to WeHive? Create an Account" : "Already registered? Sign In instead"}
          </button>
        </div>

      </div>

      {/* Footer Info */}
      <div className="flex flex-col items-center gap-1.5 pb-4 relative z-10 text-[9px] text-slate-600 font-mono font-medium">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
          <span>Biometric Secure Sandbox</span>
        </div>
        <div>Version 2.4.0 • Built with Lucide Standard</div>
      </div>

    </div>
  );
}

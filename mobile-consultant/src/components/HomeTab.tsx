import React, { useState } from "react";
import { Award, Users, BookOpen, Globe, Calendar, Clock, Video, Phone, CheckCircle, ChevronRight, Sparkles, Bell, Lock, Settings, HelpCircle, ChevronDown, X, PiggyBank, TrendingUp, TrendingDown, Coins, DollarSign, Info, RefreshCw, AlertCircle, FileText, CheckCircle2, Mic, Search, Scan } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { STUDY_DESTINATIONS, CONSULTANTS } from "../data";
import { Consultation } from "../types";
import { useNotifications } from "./NotificationContext";
import { useColorScheme } from "../hooks/useColorScheme";
import WeHiveLogo from "./WeHiveLogo";

interface HomeTabProps {
  onNavigate: (tabId: string) => void;
  onSelectCountry: (countryId: string) => void;
  bookedSessions: Consultation[];
  onBookSession: (session: Consultation) => void;
  onLock?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}

interface RecommendationItem {
  title: string;
  description: string;
  priority: string;
  category: string;
  actionLabel: string;
}

interface NextStepsData {
  recommendations: RecommendationItem[];
  advisoryNote: string;
}

export default function HomeTab({ onNavigate, onSelectCountry, bookedSessions, onBookSession, onLock, onOpenNotifications, onOpenSettings }: HomeTabProps) {
  const { unreadCount } = useNotifications();
  const { colorScheme, theme } = useColorScheme();

  // Recommended Next Steps States
  const [nextSteps, setNextSteps] = useState<NextStepsData | null>(() => {
    try {
      const cached = localStorage.getItem("wehive_next_steps_cache");
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [loadingNextSteps, setLoadingNextSteps] = useState(false);
  const [errorNextSteps, setErrorNextSteps] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState(CONSULTANTS[0]);
  const [bookingDate, setBookingDate] = useState("2026-07-06");
  const [bookingTime, setBookingTime] = useState("10:00 AM");
  const [bookingMode, setBookingMode] = useState<"Video" | "Voice">("Video");
  const [justBooked, setJustBooked] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: Consultation = {
      id: "b_" + Date.now(),
      expertName: selectedConsultant.name,
      role: selectedConsultant.role,
      date: bookingDate,
      time: bookingTime,
      mode: bookingMode,
      status: "Scheduled"
    };
    onBookSession(newSession);
    setJustBooked(true);
    setTimeout(() => {
      setShowBookingModal(false);
      setJustBooked(false);
    }, 1800);
  };

  const activeConsultation = bookedSessions.length > 0 ? bookedSessions[bookedSessions.length - 1] : null;

  // Academic level and profile completion states
  const [academicLevel, setAcademicLevel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("wehive_academic_level");
      if (saved) return saved;
    } catch {}
    return "Master's Degree";
  });

  const [showProfilePopover, setShowProfilePopover] = useState(false);

  // Budget Assistant States & Setup
  const [budgetSavings, setBudgetSavings] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("wehive_budget_savings");
      return saved ? Number(saved) : 1200;
    } catch {
      return 1200;
    }
  });

  const [dreamCountryId, setDreamCountryId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("wehive_dream_country_id");
      return saved || "germany";
    } catch {
      return "germany";
    }
  });

  const handleSavingsChange = (val: number) => {
    setBudgetSavings(val);
    try {
      localStorage.setItem("wehive_budget_savings", String(val));
    } catch {}
  };

  const handleDreamCountryChange = (id: string) => {
    setDreamCountryId(id);
    try {
      localStorage.setItem("wehive_dream_country_id", id);
    } catch {}
  };

  const fetchNextSteps = async (force = false) => {
    if (!force && nextSteps) return;

    setLoadingNextSteps(true);
    setErrorNextSteps(null);

    try {
      let milestones = [];
      try {
        const savedMilestones = localStorage.getItem("wehive_milestones");
        if (savedMilestones) milestones = JSON.parse(savedMilestones);
      } catch (e) {
        console.error("Error reading milestones for AI advisor:", e);
      }

      let vaultDocs = [];
      try {
        const savedDocs = localStorage.getItem("wehive_vault_documents");
        if (savedDocs) vaultDocs = JSON.parse(savedDocs);
      } catch (e) {
        console.error("Error reading vault documents for AI advisor:", e);
      }

      const response = await fetch("/api/next-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicLevel,
          dreamCountry: dreamCountryId,
          milestones,
          vaultDocs,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI next steps");
      }

      const data = await response.json();
      setNextSteps(data);
      try {
        localStorage.setItem("wehive_next_steps_cache", JSON.stringify(data));
      } catch {}
    } catch (err: any) {
      console.error(err);
      setErrorNextSteps("We couldn't connect to Gemini. Tap refresh to try again.");
    } finally {
      setLoadingNextSteps(false);
    }
  };

  // Run on mount, and whenever target country/level changes
  React.useEffect(() => {
    const hasCache = !!localStorage.getItem("wehive_next_steps_cache");
    fetchNextSteps(!hasCache);
  }, [dreamCountryId, academicLevel]);

  const BUDGET_DATA: Record<string, { currency: string; symbol: string; minCost: number; maxCost: number; rateFromUsd: number; nativeCostStr: string }> = {
    uk: { currency: "GBP", symbol: "£", minCost: 1000, maxCost: 1400, rateFromUsd: 0.78, nativeCostStr: "£1,000 - £1,400" },
    usa: { currency: "USD", symbol: "$", minCost: 1200, maxCost: 1800, rateFromUsd: 1.00, nativeCostStr: "$1,200 - $1,800" },
    canada: { currency: "CAD", symbol: "C$", minCost: 1100, maxCost: 1500, rateFromUsd: 1.37, nativeCostStr: "C$1,100 - C$1,500" },
    australia: { currency: "AUD", symbol: "A$", minCost: 1600, maxCost: 2100, rateFromUsd: 1.50, nativeCostStr: "A$1,600 - A$2,100" },
    germany: { currency: "EUR", symbol: "€", minCost: 900, maxCost: 1100, rateFromUsd: 0.92, nativeCostStr: "€900 - €1,100" },
    ireland: { currency: "EUR", symbol: "€", minCost: 1000, maxCost: 1400, rateFromUsd: 0.92, nativeCostStr: "€1,000 - €1,400" },
  };

  const activeBudgetCountry = STUDY_DESTINATIONS.find(c => c.id === dreamCountryId) || STUDY_DESTINATIONS[0];
  const activeBudgetInfo = BUDGET_DATA[dreamCountryId] || BUDGET_DATA["germany"];

  const nativeSavings = Math.round(budgetSavings * activeBudgetInfo.rateFromUsd);
  const averageCost = Math.round((activeBudgetInfo.minCost + activeBudgetInfo.maxCost) / 2);
  const isSurplus = nativeSavings >= averageCost;
  const rawDiff = nativeSavings - averageCost;
  const absDiff = Math.abs(rawDiff);
  const diffPercent = Math.min(100, Math.round((nativeSavings / averageCost) * 100));

  // Calculate dynamic profile completion based on real vault uploads
  const getProfileCompletion = () => {
    let completion = 20; // 20% default for account registration & bio details
    try {
      const savedDocs = localStorage.getItem("wehive_vault_documents");
      if (savedDocs) {
        const docs = JSON.parse(savedDocs);
        const hasPassport = docs.some((d: any) => d.type === "passport");
        const hasOffer = docs.some((d: any) => d.type === "offer_letter");
        const hasVisa = docs.some((d: any) => d.type === "visa");
        const hasTranscript = docs.some((d: any) => d.type === "transcript");

        if (hasPassport) completion += 20;
        if (hasOffer) completion += 20;
        if (hasVisa) completion += 20;
        if (hasTranscript) completion += 20;
      } else {
        // Fallback default docs in state if localStorage hasn't been written to
        completion += 60; // Default passport, offer letter, visa exist initially in state
      }
    } catch {
      completion += 60;
    }
    return Math.min(100, completion);
  };

  const { triggerNotification } = useNotifications();
  const profileCompletion = getProfileCompletion();

  return (
    <div className="flex-1 flex flex-col overflow-y-auto pb-12 bg-slate-50">
      {/* Visual Header Banner */}
      <div className={`${theme.primaryBg} text-white px-5 pt-6 pb-8 rounded-b-[32px] shadow-lg relative overflow-hidden transition-colors duration-500`}>
        {/* Decorative ambient glowing circles */}
        <div className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-2xl transition-all duration-500 ${
          colorScheme === "forced-navy" ? "bg-blue-500/20" : colorScheme === "forced-red" ? "bg-red-600/25" : "bg-red-600/10"
        }`} />
        <div className={`absolute -left-12 -bottom-16 w-36 h-36 rounded-full blur-xl transition-all duration-500 ${
          colorScheme === "forced-navy" ? "bg-indigo-500/20" : colorScheme === "forced-red" ? "bg-rose-600/20" : "bg-blue-500/10"
        }`} />

        <div className="flex justify-between items-center relative z-10 mb-6">
          <WeHiveLogo size="md" theme="white" showTagline={false} />
          <div className="flex items-center gap-2">
            {onLock && (
              <button
                onClick={onLock}
                title="Lock App (Biometric Simulation)"
                className="p-2 bg-blue-900/40 rounded-full border border-blue-800/40 text-blue-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center shadow-md shadow-blue-950/20"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={onOpenNotifications}
              title="Open Notifications"
              className="p-2 bg-blue-900/40 rounded-full border border-blue-800/40 text-blue-200 hover:text-white transition-colors relative cursor-pointer"
            >
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] text-white font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-blue-950 animate-pulse">
                  {unreadCount}
                </span>
              )}
              <Bell className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigate("vault")}
              title="Scan Documents"
              className="p-2 bg-blue-900/40 rounded-full border border-blue-800/40 text-blue-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center shadow-md shadow-blue-950/20"
            >
              <Scan className="w-4 h-4" />
            </button>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="Open Settings"
                className="p-2 bg-blue-900/40 rounded-full border border-blue-800/40 text-blue-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center shadow-md shadow-blue-950/20"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-2">
          <p className="text-white/80 text-sm font-semibold mb-1 flex items-center gap-1.5">
            Good morning, Tejas 👋
          </p>
          <p className={`${colorScheme === "forced-navy" ? "text-blue-400" : "text-red-400"} text-[10px] font-semibold tracking-wider uppercase font-mono`}>Immigration & Education</p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0.5 text-white">
            Where would you <br />like to study & work?
          </h1>

          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-white/50" />
            <input 
              type="text" 
              placeholder="Search universities, programs, or visas..." 
              className="w-full bg-blue-950/40 backdrop-blur-md border border-white/20 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Compact 'Profile Preview' Widget */}
        <div className="relative z-10 mt-4">
          <div 
            onClick={() => setShowProfilePopover(!showProfilePopover)}
            className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/15 transition-all group select-none"
          >
            <div className="flex items-center gap-3">
              {/* Profile Avatar with glowing online state */}
              <div className="relative w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-sm font-black text-white border border-white/20 shadow-sm">
                KT
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
              </div>
              
              {/* Academic Level Info */}
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 font-mono block">Academic Profile</span>
                <span className="text-xs font-black text-white flex items-center gap-1 group-hover:text-amber-300 transition-colors">
                  {academicLevel}
                  <ChevronDown className="w-3.5 h-3.5 text-white/60 group-hover:text-amber-300 transition-colors shrink-0" />
                </span>
              </div>
            </div>

            {/* Completion Percentage Circle */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-0.5 mt-0.5">
                <span className="text-[11px] font-black text-emerald-400 font-mono">
                  {profileCompletion}%
                </span>
                <span className="text-[8px] text-white/60 uppercase tracking-widest">
                  Completed
                </span>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
                  <circle 
                    cx="24" cy="24" r="20" 
                    stroke="currentColor" 
                    strokeWidth="4" 
                    fill="transparent" 
                    strokeDasharray="125.6" 
                    strokeDashoffset={125.6 - (125.6 * profileCompletion) / 100} 
                    className="text-emerald-400 transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" 
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Interactive Profile Detail Popover */}
          <AnimatePresence>
            {showProfilePopover && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-30 text-slate-800 text-left"
              >
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 tracking-tight">Student Profile Details</h3>
                    <p className="text-[9px] text-slate-400 font-mono">KRISHNA KRANTHI TEJA KUMAR</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfilePopover(false);
                    }}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1. Academic Level Dropdown/Selector */}
                <div className="space-y-1.5 mb-3.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    Modify Academic Goal Level
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      "High School",
                      "Bachelor's",
                      "Master's Degree",
                      "Doctoral (PhD)"
                    ].map((level) => {
                      const isSelected = academicLevel === level;
                      return (
                        <button
                          key={level}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAcademicLevel(level);
                            try {
                              localStorage.setItem("wehive_academic_level", level);
                            } catch {}
                            triggerNotification(
                              "Academic Level Updated! 🎓✨",
                              `Your current educational target has been set to ${level}. All evaluation engines adjusted.`,
                              "system",
                              "home"
                            );
                          }}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-bold text-center border transition-all cursor-pointer ${
                            isSelected
                              ? colorScheme === "forced-navy"
                                ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
                                : colorScheme === "forced-red"
                                ? "bg-red-50 border-red-600 text-red-900 shadow-sm"
                                : "bg-slate-900 border-slate-900 text-white shadow-sm"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Interactive Document Completion Progress */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono block">
                    Profile Checklist
                  </span>
                  
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                    {/* Basic details item */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5 font-medium text-slate-600">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Account & Bio Information
                      </span>
                      <span className="font-bold text-emerald-600 font-mono">100%</span>
                    </div>

                    {/* Passport */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5 font-medium text-slate-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("passport") ? "bg-emerald-500" : "bg-slate-300"
                        }`} />
                        Passport Datapage Scan
                      </span>
                      <span className={`font-bold font-mono ${
                        typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("passport") ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("passport") ? "MET" : "PENDING"}
                      </span>
                    </div>

                    {/* Admission Offer */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5 font-medium text-slate-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("offer_letter") ? "bg-emerald-500" : "bg-slate-300"
                        }`} />
                        University Admission Offer
                      </span>
                      <span className={`font-bold font-mono ${
                        typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("offer_letter") ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("offer_letter") ? "MET" : "PENDING"}
                      </span>
                    </div>

                    {/* Visa */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5 font-medium text-slate-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("visa") ? "bg-emerald-500" : "bg-slate-300"
                        }`} />
                        German Student Visa Copy
                      </span>
                      <span className={`font-bold font-mono ${
                        typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("visa") ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("visa") ? "MET" : "PENDING"}
                      </span>
                    </div>

                    {/* Transcripts */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5 font-medium text-slate-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("transcript") ? "bg-emerald-500" : "bg-slate-300"
                        }`} />
                        Academic Merit Transcripts
                      </span>
                      <span className={`font-bold font-mono ${
                        typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("transcript") ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {typeof window !== "undefined" && localStorage.getItem("wehive_vault_documents")?.includes("transcript") ? "MET" : "PENDING"}
                      </span>
                    </div>
                  </div>

                  {/* Navigation to Document Vault */}
                  <div className="pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfilePopover(false);
                        onNavigate("tracking");
                      }}
                      className={`w-full py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm transition-all active:scale-[0.98] cursor-pointer ${
                        colorScheme === "forced-navy" ? "bg-blue-600 hover:bg-blue-700" : colorScheme === "forced-red" ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-black"
                      }`}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      Go to Secure Document Vault
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="px-4 mt-5 space-y-5 relative z-20">
        
        {/* Dynamic Widget: Active Consultation */}
        {activeConsultation && (
          <div className={`mb-5 bg-white rounded-2xl p-4 shadow-md border-l-4 ${colorScheme === "forced-navy" ? "border-blue-600" : "border-red-600"} animate-fade-in`}>
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                  colorScheme === "forced-navy" ? "text-blue-600 bg-blue-50" : "text-red-600 bg-red-50"
                }`}>
                  Upcoming Call
                </span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">{activeConsultation.expertName}</h3>
                <p className="text-xs text-slate-500">{activeConsultation.role}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-xl">
                {activeConsultation.mode === "Video" ? (
                  <Video className="w-4 h-4 text-blue-900" />
                ) : (
                  <Phone className="w-4 h-4 text-blue-900" />
                )}
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeConsultation.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeConsultation.time} ({activeConsultation.mode})</span>
              </div>
            </div>
          </div>
        )}

        {/* AI Evaluator Call-To-Action Card */}
        <div className="mb-6 bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-28 h-28 bg-white/5 rounded-full" />
          <div className="flex items-start gap-3 relative z-10">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Sparkles className="w-6 h-6 text-red-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                WeHive Smart Engine
              </span>
              <h3 className="text-base font-bold mt-1.5">Free Eligibility Evaluator</h3>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                Analyze your GPA, English tests, and background for admissions & visas instantly.
              </p>
              <button
                onClick={() => onNavigate("evaluator")}
                className="mt-4 bg-blue-950 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors flex items-center gap-1.5 shadow-md shadow-blue-950/40 cursor-pointer"
              >
                <span>Assess Profile Now</span>
                <ChevronRight className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Mock Visa Interview Sandbox Call-To-Action Card */}
        <div className="mb-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden border border-white/5">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-28 h-28 bg-white/5 rounded-full" />
          <div className="flex items-start gap-3 relative z-10">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Mic className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Embassy Prep
              </span>
              <h3 className="text-base font-bold mt-1.5">Visa Interview Sandbox</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Practice answering tough embassy questions with interactive voice inputs and scorecards.
              </p>
              <button
                onClick={() => onNavigate("chat")}
                className="mt-4 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1.5 shadow-md shadow-slate-950/20 cursor-pointer"
              >
                <span>Start Practice Sandbox</span>
                <ChevronRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Recommended Next Steps Engine Panel */}
        <div className="mb-6 bg-white rounded-2xl p-5 border border-slate-200/50 shadow-sm space-y-4" id="ai-recommended-steps-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Sparkles className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Recommended Next Steps</h3>
                <p className="text-[10px] text-slate-400 font-medium font-sans">Gemini AI Personalized Preparation Advisor</p>
              </div>
            </div>
            
            <button
              onClick={() => fetchNextSteps(true)}
              disabled={loadingNextSteps}
              title="Refresh Recommendations"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer text-slate-500 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingNextSteps ? "animate-spin text-rose-600" : ""}`} />
            </button>
          </div>

          {/* AI Trajectory Advisory Note */}
          {nextSteps?.advisoryNote && !loadingNextSteps && (
            <div className="p-3 bg-rose-50/40 border border-rose-100/60 rounded-xl text-[11px] leading-relaxed text-slate-600 font-medium flex items-start gap-2 animate-fade-in">
              <Sparkles className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-extrabold text-rose-700 block mb-0.5">AI Advisor Summary</span>
                {nextSteps.advisoryNote}
              </div>
            </div>
          )}

          {/* Loading Skeleton & Spinner */}
          {loadingNextSteps && (
            <div className="space-y-3 py-2">
              <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          )}

          {/* Error Message */}
          {errorNextSteps && !loadingNextSteps && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="font-medium">{errorNextSteps}</span>
            </div>
          )}

          {/* Core Recommendations List */}
          {!loadingNextSteps && !errorNextSteps && nextSteps && nextSteps.recommendations?.length > 0 ? (
            <div className="space-y-3">
              {nextSteps.recommendations.map((item, idx) => {
                const isHigh = item.priority === "High";
                const isMedium = item.priority === "Medium";
                
                const priorityBadge = isHigh 
                  ? "bg-red-50 text-red-700 border-red-100" 
                  : isMedium 
                    ? "bg-amber-50 text-amber-700 border-amber-100" 
                    : "bg-blue-50 text-blue-700 border-blue-100";

                let catColor = "bg-slate-50 text-slate-600 border-slate-100";
                if (item.category === "Visa") catColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
                else if (item.category === "Preparation") catColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                else if (item.category === "Admission") catColor = "bg-sky-50 text-sky-700 border-sky-100";
                else if (item.category === "Finance") catColor = "bg-amber-50 text-amber-700 border-amber-100";

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col justify-between space-y-3 text-left hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${priorityBadge}`}>
                            {item.priority} Priority
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${catColor}`}>
                            {item.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-snug">{item.title}</h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          const labelLower = item.actionLabel.toLowerCase();
                          if (labelLower.includes("vault") || labelLower.includes("upload") || labelLower.includes("document")) {
                            onNavigate("vault");
                          } else if (labelLower.includes("finance") || labelLower.includes("blocked") || labelLower.includes("gic") || labelLower.includes("loan") || labelLower.includes("budget")) {
                            onNavigate("finance");
                          } else if (labelLower.includes("calendar") || labelLower.includes("intake") || labelLower.includes("deadline")) {
                            onNavigate("calendar");
                          } else if (labelLower.includes("agent") || labelLower.includes("refer") || labelLower.includes("lead")) {
                            onNavigate("agent");
                          } else if (labelLower.includes("emergency") || labelLower.includes("hotline") || labelLower.includes("sos")) {
                            onNavigate("emergency");
                          } else if (labelLower.includes("assess") || labelLower.includes("evaluate") || labelLower.includes("profile")) {
                            onNavigate("evaluator");
                          } else if (labelLower.includes("chat") || labelLower.includes("ask") || labelLower.includes("hivy")) {
                            onNavigate("chat");
                          } else {
                            onNavigate("tracking");
                          }
                        }}
                        className="text-[10px] font-extrabold text-blue-900 bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{item.actionLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            !loadingNextSteps && !errorNextSteps && (
              <div className="py-4 text-center text-xs text-slate-400">
                No next steps generated yet. Click refresh to load.
              </div>
            )
          )}
        </div>

        {/* Quick Country Destination Chips */}
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5 font-mono">Popular Destinations</h2>
          <div className="grid grid-cols-3 gap-2">
            {STUDY_DESTINATIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelectCountry(c.id);
                  onNavigate("explore");
                }}
                className="bg-white hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200/60 shadow-xs text-center transition-all hover:scale-102 flex flex-col items-center gap-1 justify-center cursor-pointer"
              >
                <span className="text-2xl filter drop-shadow-xs">{c.flag}</span>
                <span className="text-[11px] font-bold text-slate-700 truncate w-full">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* WeHive Success Index Stats Banner */}
        <div className="mb-6 bg-white rounded-2xl p-4 border border-slate-200/50 shadow-xs">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">WeHive Track Record</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="p-2 bg-red-50 rounded-lg shrink-0">
                <Award className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">99.2%</p>
                <p className="text-[10px] text-slate-500 font-medium">Visa Success Rate</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                <BookOpen className="w-4 h-4 text-blue-900" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">1200+</p>
                <p className="text-[10px] text-slate-500 font-medium">Partner Colleges</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="p-2 bg-red-50 rounded-lg shrink-0">
                <Users className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">25,000+</p>
                <p className="text-[10px] text-slate-500 font-medium">Careers Guided</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                <Globe className="w-4 h-4 text-blue-900" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">100%</p>
                <p className="text-[10px] text-slate-500 font-medium">End-to-End Support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Assistant Widget */}
        <div className="mb-6 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/60 dark:border-slate-800 shadow-md space-y-4" id="budget-assistant-widget">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Budget Assistant</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-sans">Evaluate your move prep savings</p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono tracking-wider">
              Calculator
            </span>
          </div>

          {/* Interactive Inputs */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Dream Country Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono block">
                Dream Country
              </label>
              <div className="relative">
                <select
                  value={dreamCountryId}
                  onChange={(e) => handleDreamCountryChange(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/10 appearance-none cursor-pointer pr-8 text-slate-800 dark:text-slate-200"
                >
                  {STUDY_DESTINATIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 dark:text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Monthly Savings input */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono block flex items-center justify-between">
                <span>Monthly Savings</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">(USD)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 font-mono text-xs font-black">
                  $
                </div>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="50"
                  value={budgetSavings}
                  onChange={(e) => handleSavingsChange(Math.max(0, Number(e.target.value)))}
                  className="w-full text-xs font-bold font-mono border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-7 pr-3 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/10 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Quick Slider control for savings */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">
              <span>Savings range adjustment</span>
              <span className="text-slate-500 dark:text-slate-400 font-bold">${budgetSavings.toLocaleString()} / $5,000</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="50"
              value={budgetSavings}
              onChange={(e) => handleSavingsChange(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Comparison evaluation */}
          <div className="bg-slate-50/80 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 p-3.5 rounded-2xl space-y-3 shadow-2xs">
            {/* Currency conversion notification banner */}
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 dark:text-slate-500 font-mono font-medium flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Estimated Conversion Rate
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">
                1 USD = {activeBudgetInfo.rateFromUsd} {activeBudgetInfo.currency}
              </span>
            </div>

            {/* Main comparison grid */}
            <div className="grid grid-cols-2 gap-4 pt-1 text-left">
              {/* User Native budget */}
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono block">Your Monthly Funds</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {activeBudgetInfo.symbol}{nativeSavings.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">
                    /mo
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 block leading-tight">
                  Equivalent of ${budgetSavings.toLocaleString()} USD
                </span>
              </div>

              {/* Target Country Average cost */}
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono block">Average Living Cost</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {activeBudgetInfo.symbol}{averageCost.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">
                    /mo
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 block leading-tight">
                  Est. range: {activeBudgetInfo.nativeCostStr}
                </span>
              </div>
            </div>

            {/* Budget Coverage progress bar */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-200/40 dark:border-slate-800/40">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500 dark:text-slate-400">Budget Coverage Goal</span>
                <span className={`font-mono ${
                  diffPercent >= 100 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : diffPercent >= 70 
                    ? "text-amber-600 dark:text-amber-400" 
                    : "text-red-500 dark:text-red-400"
                }`}>
                  {diffPercent}% covered
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    diffPercent >= 100 
                      ? "bg-emerald-500" 
                      : diffPercent >= 70 
                      ? "bg-amber-500" 
                      : "bg-red-500"
                  }`}
                  style={{ width: `${diffPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Verdict and Insights Alert box */}
          <div className={`p-3.5 rounded-2xl border transition-all text-left ${
            isSurplus
              ? "bg-emerald-50/25 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/20 text-slate-700 dark:text-slate-300"
              : "bg-amber-50/30 dark:bg-amber-950/10 border-amber-100/60 dark:border-amber-900/20 text-slate-700 dark:text-slate-300"
          }`}>
            <div className="flex items-start gap-2.5">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                isSurplus
                  ? "bg-emerald-100/75 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-100/70 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
              }`}>
                {isSurplus ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold flex items-center gap-1.5">
                  {isSurplus ? (
                    <span className="text-emerald-700 dark:text-emerald-400">Budget Healthy! (+{activeBudgetInfo.symbol}{absDiff.toLocaleString()}/mo)</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">Funding Gap Detected (-{activeBudgetInfo.symbol}{absDiff.toLocaleString()}/mo)</span>
                  )}
                </h4>
                
                {/* Custom insights matching each country's context */}
                <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                  {(() => {
                    if (isSurplus) {
                      switch (dreamCountryId) {
                        case "germany":
                          return "Excellent work! Your savings exceed the average living cost in Germany. Since the mandatory Blocked Account requires €992/month, your current funding comfortably complies with visa requirements. You'll have extra breathing room to enjoy European weekend getaways.";
                        case "uk":
                          return "Great! Your budget covers the typical student living cost in the UK. This should cover accommodation and groceries easily. Remember that living in London is significantly pricier, so choosing cities like Manchester or Birmingham will stretch your surplus further.";
                        case "usa":
                          return "Your savings are on target for typical US university town expenses! Keep in mind that college dining plans and on-campus health insurance can consume a large portion of your initial cash. Your surplus will serve as an excellent emergency cushion.";
                        case "canada":
                          return "Awesome! Your budget comfortably covers the Canadian living expenses guidelines (including GIC requirements). This gives you solid coverage for cold-weather winter wear shopping and monthly transit cards.";
                        case "australia":
                          return "Fantastic! You are well-positioned for life in Australia. Your savings cover average room rentals and coastal lifestyle costs. You'll be able to enjoy cafe culture and explore beautiful regional areas on weekends.";
                        case "ireland":
                          return "Great news! Your savings easily match the average Irish student costs. Dublin is famously expensive for accommodation, so look into shared flats early or consider Limerick or Galway to maximize your surplus.";
                        default:
                          return "Wonderful! Your projected monthly budget is higher than the typical student cost of living. This allows you to focus peacefully on your academic studies and build a healthy financial buffer.";
                      }
                    } else {
                      switch (dreamCountryId) {
                        case "germany":
                          return "To bridge this gap, consider working part-time on or off-campus (international students get 140 full days/yr). You can also apply for DAAD scholarships or find discounted food at university Mensas. Note: the visa Blocked Account requires €992/mo.";
                        case "uk":
                          return "To cover this gap, you can take advantage of your student visa permissions to work up to 20 hours per week during term time (earning approx. £11-£13/hr). Look into scholarship programs or choosing shared housing outside prime city zones.";
                        case "usa":
                          return "US F-1 visas only permit on-campus employment (up to 20 hours/week), such as library desks, dining services, or TA positions. Applying for university graduate assistantships or athletic and academic waivers can significantly offset expenses.";
                        case "canada":
                          return "To bridge the gap, look for off-campus jobs (generally permitted up to 20 hrs/week). Choosing homestays instead of downtown apartments and shopping at discount grocers (like No Frills) will help you save hundreds.";
                        case "australia":
                          return "Aussie student visas offer a flexible part-time work allowance of 48 hours per fortnight. Taking a casual job in retail or hospitality pays high local wages (often $23+/hr) which can easily cover your remaining gap.";
                        case "ireland":
                          return "Ireland allows part-time work of 20 hours/week during term time. Sharing accommodation with fellow international students outside Dublin's city center can reduce your monthly rent by 30-40%.";
                        default:
                          return "To bridge this gap, you could work around 10-15 hours per week part-time or apply for local international student scholarships. Sharing rooms or cooking meals at home are also excellent cost-reduction strategies.";
                      }
                    }
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 1-on-1 Expert Consulting Panel */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2.5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Talk to Counselors</h2>
            <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">Free</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {CONSULTANTS.map((con) => (
              <div
                key={con.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between w-[150px] shrink-0 snap-start"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-lg flex items-center justify-center border border-slate-200/50 mb-2">
                    {con.photo}
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 truncate leading-tight">{con.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight h-7">{con.role}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedConsultant(con);
                    setShowBookingModal(true);
                  }}
                  className="mt-3.5 w-full bg-blue-50 text-blue-900 font-bold text-[10px] py-1.5 rounded-lg border border-blue-100 hover:bg-blue-900 hover:text-white hover:border-blue-900 transition-all select-none cursor-pointer text-center"
                >
                  Book slot
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Help & FAQs Section */}
        <div className="mb-6 bg-white rounded-2xl p-4 border border-slate-200/50 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${colorScheme === "forced-navy" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Help & FAQs</h2>
              <p className="text-[10px] text-slate-400">Common visa & university questions</p>
            </div>
          </div>

          <div className="space-y-2">
            {FAQ_ITEMS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="border border-slate-100 rounded-xl overflow-hidden transition-all duration-300"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full py-3 px-3.5 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-left transition-colors cursor-pointer animate-fade-in"
                  >
                    <span className="text-xs font-bold text-slate-700 pr-4 leading-snug">{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-slate-600" : ""}`} />
                  </button>
                  
                  {isOpen && (
                    <div className="p-3.5 bg-white text-xs text-slate-500 leading-relaxed border-t border-slate-100/60 animate-fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking Dialog Modal */}
      {showBookingModal && (
        <div className="absolute inset-0 bg-black/60 flex items-end justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-3xl w-full max-w-[360px] p-5 shadow-2xl relative animate-slide-up select-none">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            {justBooked ? (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-8 h-8 text-blue-600 animate-scale-up" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Consultation Booked!</h3>
                <p className="text-xs text-slate-500 mt-1">We sent a confirmation calendar invite to your registered email.</p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <span className="text-[9px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full uppercase font-mono">
                    Book WeHive Specialist
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-800 mt-1">Select slot with {selectedConsultant.name}</h3>
                  <p className="text-[11px] text-slate-400">{selectedConsultant.role}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-blue-900"
                      min="2026-07-04"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Choose Time Slot
                    </label>
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-blue-900"
                    >
                      <option value="10:00 AM">10:00 AM - 10:30 AM</option>
                      <option value="11:30 AM">11:30 AM - 12:00 PM</option>
                      <option value="02:00 PM">02:00 PM - 02:30 PM</option>
                      <option value="03:30 PM">03:30 PM - 04:00 PM</option>
                      <option value="05:00 PM">05:00 PM - 05:30 PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Meeting Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBookingMode("Video")}
                        className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                          bookingMode === "Video"
                            ? "border-blue-900 bg-blue-50 text-blue-900"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Video Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode("Voice")}
                        className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                          bookingMode === "Voice"
                            ? "border-blue-900 bg-blue-50 text-blue-900"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Voice Call</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 text-white font-bold text-xs py-3 rounded-xl hover:bg-red-700 transition-colors cursor-pointer text-center"
                >
                  Confirm Free Consultation
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: "How long does it take to process a student visa?",
    answer: "Typically, student visa processing takes between 3 to 8 weeks depending on the destination country. We recommend submitting your visa application at least 3 months prior to your program's start date to allow adequate time for document verification."
  },
  {
    question: "What are the general requirements for university admissions?",
    answer: "Generally, colleges require your past academic transcripts, proof of English proficiency (IELTS, TOEFL, or PTE), a Statement of Purpose (SOP), Letters of Recommendation (LORs), and a copy of your passport. Specific courses may have additional portfolio or standardized test requirements."
  },
  {
    question: "Can I work part-time while studying abroad?",
    answer: "Yes, most major student destinations like Canada, Australia, the UK, and Ireland allow international students to work part-time up to 20 hours per week during academic terms, and full-time during official semester breaks."
  },
  {
    question: "When should I begin preparing my admissions application?",
    answer: "Admissions cycles open 8 to 12 months in advance. For fall intakes (September), starting preparation in November or December of the previous year is highly recommended to secure early scholar offers."
  },
  {
    question: "How does WeHive assist with consular visa interviews?",
    answer: "WeHive conducts structured mock interview sessions, reviews and audits your financial statements, and prepares you with step-by-step guidance to articulate your academic intent clearly to consular officers."
  }
];

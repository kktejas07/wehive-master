import React, { useState } from "react";
import { 
  Sparkles, ArrowRight, RotateCcw, Award, Globe, BookOpen, AlertCircle, 
  Landmark, Coins, GraduationCap, WifiOff, CheckCircle2, Calendar, FileText, Download, Share2, HelpCircle, CheckSquare, Clock, UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, EvaluationResult } from "../types";
import { isAppOffline, computeOfflineEligibility, saveEvaluationToCache } from "../utils/offlineCache";
import { useColorScheme } from "../hooks/useColorScheme";
import { useNotifications } from "./NotificationContext";

const CONFETTI_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];
const CONFETTI_PARTICLES = Array.from({ length: 45 }).map((_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: Math.random() * 8 + 6, // 6px to 14px
  left: `${Math.random() * 100}%`,
  delay: Math.random() * 2,
  duration: Math.random() * 3 + 2, // 2s to 5s
  drift: Math.random() * 100 - 50 // -50px to 50px
}));

export default function EvaluatorTab() {
  const { colorScheme, theme } = useColorScheme();
  const { triggerNotification } = useNotifications();

  const [showCelebration, setShowCelebration] = useState(false);

  const [profile, setProfile] = useState<Profile>({
    name: "",
    targetCountry: "United Kingdom",
    targetDegree: "Masters",
    currentGPA: "",
    englishTest: "",
    workExperience: "",
    budget: "10-20 Lakhs / Year",
    intendedMajor: "Computer Science & IT",
    standardizedTest: "Not planning to take"
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineReport, setIsOfflineReport] = useState(false);

  // Booking Consultation states
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingMode, setBookingMode] = useState<"Video" | "Voice">("Video");
  const [isBooked, setIsBooked] = useState(false);

  // Checklist interactive states (allows toggling document readiness locally)
  const [checklist, setChecklist] = useState<{ name: string; required: boolean; status: "Pending" | "Ready"; desc: string }[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.currentGPA) return;

    setLoading(true);
    setError(null);
    setIsBooked(false);

    // Simulated step texts for enhanced mobile ux
    const steps = [
      "Analyzing transcripts and academic scorecards...",
      "Evaluating English test score thresholds...",
      "Matching profiles with top QS ranked partner colleges...",
      "Generating estimated living budgets & visa ratios...",
      "Finalizing comprehensive admission report..."
    ];

    const offlineMode = isAppOffline();
    setIsOfflineReport(offlineMode);

    if (offlineMode) {
      let currentStepIdx = 0;
      setLoadingStep(steps[currentStepIdx]);
      const interval = setInterval(() => {
        currentStepIdx++;
        if (currentStepIdx < steps.length) {
          setLoadingStep(steps[currentStepIdx]);
        }
      }, 500);

      // Wait 2.2 seconds to simulate processing beautifully
      await new Promise((resolve) => setTimeout(resolve, 2200));
      clearInterval(interval);

      try {
        const localResult = computeOfflineEligibility(profile);
        saveEvaluationToCache(profile, localResult, true);
        setResult(localResult);
        setChecklist(localResult.documentChecklist || []);
        setShowCelebration(true);
      } catch (err: any) {
        console.error("Local offline rules engine failed", err);
        setError("Failed to run local eligibility rules. Please check your inputs.");
      } finally {
        setLoading(false);
      }
      return;
    }

    let currentStepIdx = 0;
    setLoadingStep(steps[currentStepIdx]);
    const interval = setInterval(() => {
      currentStepIdx++;
      if (currentStepIdx < steps.length) {
        setLoadingStep(steps[currentStepIdx]);
      }
    }, 800);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(profile)
      });

      clearInterval(interval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Evaluation failed. Please review your academic parameters.");
      }

      const data = await res.json();
      
      // Inject standard client-side components if not returned from api
      if (!data.documentChecklist || !data.profileCompleteness) {
        const localVal = computeOfflineEligibility(profile);
        data.documentChecklist = localVal.documentChecklist;
        data.profileCompleteness = localVal.profileCompleteness;
      }

      saveEvaluationToCache(profile, data, false);
      setIsOfflineReport(false);
      setResult(data);
      setChecklist(data.documentChecklist || []);
      setShowCelebration(true);
    } catch (err: any) {
      console.warn("Live API evaluation failed, falling back to local offline assessment engine:", err);
      try {
        const localResult = computeOfflineEligibility(profile);
        saveEvaluationToCache(profile, localResult, true);
        setIsOfflineReport(true);
        setResult(localResult);
        setChecklist(localResult.documentChecklist || []);
        setShowCelebration(true);
      } catch (fallbackErr) {
        setError("Both live server and offline assessments failed. Please review your credentials.");
      }
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setIsBooked(false);
  };

  const toggleChecklistStatus = (index: number) => {
    const updated = [...checklist];
    updated[index].status = updated[index].status === "Ready" ? "Pending" : "Ready";
    setChecklist(updated);
    
    // Recalculate completeness based on toggles
    if (result) {
      const totalItems = updated.length;
      const readyItems = updated.filter(item => item.status === "Ready").length;
      const updatedCompleteness = Math.round((readyItems / totalItems) * 35 + 65); // base 65 from form
      setResult({
        ...result,
        profileCompleteness: Math.min(updatedCompleteness, 100)
      });
    }

    triggerNotification(
      "Document Status Updated",
      `Marked "${updated[index].name}" as ${updated[index].status.toUpperCase()}`,
      "system"
    );
  };

  const handleDownloadReport = () => {
    triggerNotification(
      "Report Download Begun",
      `Preparing your customized academic compatibility PDF report...`,
      "system"
    );
    setTimeout(() => {
      triggerNotification(
        "PDF Saved Successfully",
        `WeHive_Admissions_Report_${profile.name.replace(/\s+/g, "_") || "Student"}.pdf has been saved to your downloads folder.`,
        "system"
      );
    }, 1500);
  };

  const handleShareReport = () => {
    if (!result) return;
    const shareUrl = `${window.location.origin}/share/report?name=${encodeURIComponent(profile.name || "Student")}&score=${result.overallScore}`;
    navigator.clipboard.writeText(shareUrl);
    triggerNotification(
      "Shareable Link Copied",
      "Dynamic profiling assessment link copied to your device's clipboard.",
      "system"
    );
  };

  const handleBookConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) return;
    
    setIsBooked(true);
    triggerNotification(
      "Consultation Scheduled!",
      `A premium virtual advisory session is booked for ${bookingDate} at ${bookingTime} (${bookingMode}). Check your email inbox.`,
      "system"
    );
  };

  // Dynamic Theme Styling configuration for consistency
  const isNavy = colorScheme === "forced-navy";
  const isRed = colorScheme === "forced-red";
  
  const accentColorClass = isNavy ? "text-blue-500" : "text-red-500";
  const accentBgClass = isNavy ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700";
  const accentLightBgClass = isNavy ? "bg-blue-50 text-blue-900 border-blue-100" : "bg-red-50 text-red-900 border-red-100";
  const outlineFocusClass = isNavy ? "focus:outline-blue-500" : "focus:outline-red-500";

  return (
    <div className="flex-1 flex flex-col overflow-y-auto pb-12 bg-slate-50 animate-fade-in relative">
      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 overflow-hidden"
          >
            {/* Confetti rain */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {CONFETTI_PARTICLES.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ y: -50, x: 0, opacity: 1, rotate: 0 }}
                  animate={{ 
                    y: "110vh", 
                    x: p.drift,
                    rotate: 360,
                    opacity: [1, 1, 0.8, 0] 
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    ease: "linear",
                    repeat: Infinity
                  }}
                  style={{
                    position: "absolute",
                    left: p.left,
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    borderRadius: p.id % 3 === 0 ? "50%" : p.id % 3 === 1 ? "0%" : "40% 10%",
                    transformOrigin: "center"
                  }}
                />
              ))}
            </div>

            {/* Floating sparkles */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1.2, 0.8, 1, 0], 
                    opacity: [0, 1, 1, 0.5, 0],
                    x: [0, Math.sin(i) * 80],
                    y: [0, Math.cos(i) * 80]
                  }}
                  transition={{
                    duration: 3.5,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute"
                  style={{
                    left: `${35 + (i * 5)}%`,
                    top: `${30 + (i * 5)}%`
                  }}
                >
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </motion.div>
              ))}
            </div>

            {/* Central Card */}
            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 15 }}
              className="bg-white rounded-[32px] p-6 max-w-sm w-full border border-slate-200/50 shadow-2xl relative text-center space-y-5"
            >
              {/* Animated Graduation cap background glow */}
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.15, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className={`absolute inset-0 rounded-full ${isNavy ? "bg-blue-100/70" : "bg-red-50"} blur-xl`}
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className={`w-18 h-18 rounded-2xl ${isNavy ? "bg-blue-600" : "bg-red-600"} flex items-center justify-center shadow-lg text-white`}
                >
                  <GraduationCap className="w-10 h-10 animate-pulse" />
                </motion.div>
                
                {/* Twinkle Spark */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 -right-1 text-yellow-500"
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-base font-black text-slate-800"
                >
                  Profile Match Complete!
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-xs text-slate-500 leading-relaxed font-sans px-2"
                >
                  Congratulations, <span className="font-extrabold text-slate-700">{profile.name || "Scholar"}</span>! We have successfully mapped your profile parameters across global admission databases.
                </motion.p>
              </div>

              {/* Key Metrics Dashboard Summary inside modal */}
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className={`p-4 rounded-2xl ${isNavy ? "bg-blue-50/70" : "bg-red-50/50"} border border-slate-100 flex items-center justify-around gap-2`}
              >
                <div className="text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Overall Score</span>
                  <span className={`text-xl font-black font-mono ${isNavy ? "text-blue-600" : "text-red-600"}`}>{result.overallScore}</span>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Visa Chance</span>
                  <span className={`text-xs font-black uppercase ${
                    result.visaProbability === "High" ? "text-emerald-600" : result.visaProbability === "Medium" ? "text-blue-600" : "text-amber-600"
                  }`}>{result.visaProbability}</span>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Colleges Matched</span>
                  <span className="text-xs font-black text-slate-800">{result.topUniversities.length}</span>
                </div>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowCelebration(false);
                  triggerNotification(
                    "Assessment unlocked!",
                    "Explore your university matches and customized checklists below.",
                    "system"
                  );
                }}
                className={`w-full ${accentBgClass} text-white font-bold text-xs py-3.5 rounded-2xl shadow-lg shadow-red-500/10 cursor-pointer flex items-center justify-center gap-1.5`}
              >
                <span>View Full Report Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner Header */}
      <div className={`${isNavy ? "bg-slate-900" : isRed ? "bg-stone-900" : "bg-blue-950"} px-5 pt-8 pb-6 rounded-b-[24px] shadow-sm text-white shrink-0`}>
        {/* WeHive small brand tag */}
        <div className="flex items-center gap-1.5 mb-2.5 opacity-90">
          <div className={`w-4.5 h-4.5 rounded ${isNavy ? "bg-blue-600" : "bg-red-600"} flex items-center justify-center font-bold text-white text-[10px] shadow`}>W</div>
          <span className="text-[10px] font-bold tracking-wider text-blue-100 font-mono">WEHIVE SMART ENGINE</span>
        </div>
        <h1 className="text-xl font-black">AI Eligibility Evaluator</h1>
        <p className="text-xs text-slate-300 mt-1">Get an instant, data-backed study visa and college compatibility report</p>
      </div>

      <div className="p-4">
        {loading ? (
          /* High-fidelity interactive loading screen */
          <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-5 bg-white rounded-3xl border border-slate-200/50 shadow-md animate-fade-in">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
              <div className={`absolute inset-0 border-4 ${isNavy ? "border-blue-600" : "border-red-600"} border-t-transparent rounded-full animate-spin`} />
              <Sparkles className={`w-6 h-6 ${isNavy ? "text-blue-500" : "text-red-500"} animate-pulse`} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-800 animate-pulse">Consulting Hivy AI</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[220px] h-12 flex items-center justify-center font-medium font-sans">
                {loadingStep}
              </p>
            </div>
            <span className={`text-[9px] ${isNavy ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"} font-bold px-2.5 py-1 rounded-md uppercase font-mono tracking-wider animate-bounce`}>
              Securing Report
            </span>
          </div>
        ) : result ? (
          /* Report Dashboard Output view */
          <div className="space-y-5 animate-slide-up">
            {isOfflineReport && (
              <div className="bg-amber-50 border border-amber-200/55 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs">
                <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950">Offline Assessment Active</h4>
                  <p className="text-[10px] text-amber-800 leading-normal mt-0.5 font-medium">
                    This profile evaluation was calculated client-side using cached local rules to ensure complete utility under low-connectivity environments.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions (Share/Download) Bar */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save PDF</span>
              </button>
              <button
                onClick={handleShareReport}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share link</span>
              </button>
            </div>

            {/* Header / Score banner */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-md flex items-center gap-4">
              {/* Dynamic Score Dial */}
              <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${isNavy ? "text-blue-600" : "text-red-600"} transition-all duration-500`}
                    strokeDasharray={`${result.overallScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-base font-black text-slate-800 font-mono">{result.overallScore}</span>
                  <p className="text-[8px] text-slate-400 font-extrabold -mt-1 uppercase">Score</p>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Assessment Summary</span>
                <h3 className="text-sm font-black text-slate-800 mt-0.5 truncate">WeHive Profile Rating</h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    result.visaProbability === "High"
                      ? "bg-green-100 text-green-800"
                      : result.visaProbability === "Medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    Visa Chance: {result.visaProbability}
                  </span>
                  <span className="text-[9px] bg-slate-100 text-slate-800 border border-slate-200 font-bold px-2 py-0.5 rounded font-mono">
                    Intake: {result.recommendedIntake}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Completeness Section */}
            {result.profileCompleteness !== undefined && (
              <div className="bg-white rounded-3xl p-4 border border-slate-200/50 shadow-xs space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-slate-700">WeHive Profile Completeness</span>
                  <span className={accentColorClass}>{result.profileCompleteness}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${isNavy ? "bg-blue-600" : "bg-red-600"} transition-all duration-500`}
                    style={{ width: `${result.profileCompleteness}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-normal font-sans">
                  {result.profileCompleteness < 90 
                    ? "Completing missing documentation in the checklist below will boost your profile assessment value." 
                    : "Excellent! Your documentation is highly complete. You are ready for formal consultant file submission."}
                </p>
              </div>
            )}

            {/* Match University Panel */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/50 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Matched Universities</h3>
              </div>
              <div className="space-y-2.5">
                {result.topUniversities.map((uni, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{uni.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">QS Rank Estimate: {uni.rank}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wide ${
                          uni.matchType === "Safe"
                            ? "bg-green-100 text-green-800"
                            : uni.matchType === "Dream"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {uni.matchType} Match
                        </span>
                        <p className="text-[9px] text-slate-500 font-extrabold mt-1">{uni.estFees}</p>
                      </div>
                    </div>
                    {uni.courseMatch && (
                      <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between text-[9px]">
                        <span className="text-slate-400">Match Accuracy</span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-mono">
                          {uni.courseMatch}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdowns */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/50 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Cost Breakdown Estimates</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Avg Tuition / Yr</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{result.estimatedCost.tuition}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Est Living Costs</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{result.estimatedCost.living}</p>
                </div>
              </div>
            </div>

            {/* AI Analytical Feedback */}
            <div className={`${isNavy ? "bg-blue-950/20 border-blue-900/30" : "bg-blue-50 border-blue-100"} border rounded-3xl p-4 shadow-xs space-y-2.5`}>
              <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs">
                <Award className={`w-4 h-4 ${isNavy ? "text-blue-400" : "text-blue-900"}`} />
                <span className={isNavy ? "text-blue-300" : "text-blue-950"}>WeHive Senior Counseling Memo</span>
              </div>
              <p className={`text-xs ${isNavy ? "text-blue-100" : "text-blue-950"} leading-relaxed font-medium`}>
                {result.eligibilityFeedback}
              </p>
            </div>

            {/* WeHive Standard Document Checklist Tracker */}
            {checklist.length > 0 && (
              <div className="bg-white rounded-3xl p-4 border border-slate-200/50 shadow-xs space-y-3">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className={`w-4 h-4 ${isNavy ? "text-blue-500" : "text-red-600"}`} />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Document Checklist Tracker</h3>
                </div>
                <div className="space-y-2">
                  {checklist.map((doc, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => toggleChecklistStatus(idx)}
                      className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-start gap-2.5 hover:border-slate-200 transition-colors cursor-pointer"
                    >
                      <button className="mt-0.5 focus:outline-none cursor-pointer">
                        {doc.status === "Ready" ? (
                          <CheckCircle2 className={`w-4 h-4 ${isNavy ? "text-blue-600" : "text-red-600"}`} />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">{doc.name}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            doc.status === "Ready" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{doc.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* suggested Scholarships & Action Plan */}
            <div className="grid grid-cols-1 gap-4">
              {/* Scholarships */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/50 shadow-xs space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className={`w-4 h-4 ${isNavy ? "text-blue-500" : "text-red-600"}`} />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Suggested Scholarships</h3>
                </div>
                <div className="space-y-1.5">
                  {result.scholarships.map((sch, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 font-medium leading-relaxed">
                      <span className={`${isNavy ? "text-blue-500" : "text-red-500"} font-bold`}>•</span>
                      <span>{sch}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Plan */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/50 shadow-xs space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-900" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Next Steps Action Plan</h3>
                </div>
                <div className="space-y-1.5">
                  {result.actionPlan.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 font-medium leading-relaxed">
                      <span className="text-blue-900 font-bold">{idx + 1}.</span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Book Slot with WeHive Advisor */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-md space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className={`w-5 h-5 ${isNavy ? "text-blue-500" : "text-red-600"}`} />
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">Book Free Advisory Slot</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Choose your slot below to reserve a premium one-on-one session</p>
                </div>
              </div>

              {isBooked ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center space-y-2 animate-fade-in">
                  <UserCheck className="w-8 h-8 text-green-600 mx-auto" />
                  <h4 className="text-xs font-bold text-green-950">Consultation Scheduled!</h4>
                  <p className="text-[10px] text-green-800 leading-normal">
                    WeHive Senior Counselor has reserved your slot on <strong>{bookingDate}</strong> at <strong>{bookingTime}</strong>. A video session invite link has been pushed to your active inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBookConsultation} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Date</label>
                      <input 
                        type="date" 
                        required
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-blue-900 font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Time</label>
                      <select 
                        required
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-blue-900 font-medium text-slate-800"
                      >
                        <option value="">-- Choose Time --</option>
                        <option value="10:00 AM">10:00 AM IST</option>
                        <option value="12:00 PM">12:00 PM IST</option>
                        <option value="02:30 PM">02:30 PM IST</option>
                        <option value="04:00 PM">04:00 PM IST</option>
                        <option value="05:30 PM">05:30 PM IST</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Consultation Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBookingMode("Video")}
                        className={`py-2 text-[11px] font-bold rounded-xl border transition-colors cursor-pointer ${
                          bookingMode === "Video" 
                            ? isNavy ? "bg-blue-50 text-blue-600 border-blue-500" : "bg-red-50 text-red-600 border-red-500" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Video Interview
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode("Voice")}
                        className={`py-2 text-[11px] font-bold rounded-xl border transition-colors cursor-pointer ${
                          bookingMode === "Voice" 
                            ? isNavy ? "bg-blue-50 text-blue-600 border-blue-500" : "bg-red-50 text-red-600 border-red-500" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Voice Call
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full ${accentBgClass} text-white font-bold text-xs py-3 rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5`}
                  >
                    <span>Secure Booking Call</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Reset / Redo button */}
            <button
              onClick={handleReset}
              className="w-full bg-slate-200 text-slate-800 font-bold text-xs py-3.5 rounded-2xl hover:bg-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Analyze a Different Profile</span>
            </button>
          </div>
        ) : (
          /* Parameter Input Form view */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-md space-y-4">
            <div>
              <span className={`text-[9px] font-mono font-bold ${isNavy ? "text-blue-800 bg-blue-50" : "text-red-800 bg-red-50"} px-2 py-0.5 rounded-full uppercase`}>
                Admissions Engine v2
              </span>
              <h2 className="text-sm font-black text-slate-800 mt-1">Check study visa & college matching</h2>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Krishna Kanth"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className={`w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 ${outlineFocusClass} font-medium text-slate-800`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Country
                  </label>
                  <select
                    value={profile.targetCountry}
                    onChange={(e) => setProfile({ ...profile, targetCountry: e.target.value })}
                    className={`w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 ${outlineFocusClass} font-medium text-slate-800`}
                  >
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="Ireland">Ireland</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Degree
                  </label>
                  <select
                    value={profile.targetDegree}
                    onChange={(e) => setProfile({ ...profile, targetDegree: e.target.value })}
                    className={`w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 ${outlineFocusClass} font-medium text-slate-800`}
                  >
                    <option value="Bachelors">Bachelors Degree</option>
                    <option value="Masters">Masters (MS / MBA)</option>
                    <option value="PhD">PhD / Doctorate</option>
                    <option value="PG Diploma">PostGrad Diploma</option>
                  </select>
                </div>
              </div>

              {/* Added Field: Intended major / course selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Intended Major / Course
                </label>
                <select
                  value={profile.intendedMajor || "Computer Science & IT"}
                  onChange={(e) => setProfile({ ...profile, intendedMajor: e.target.value })}
                  className={`w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 ${outlineFocusClass} font-medium text-slate-800`}
                >
                  <option value="Computer Science & IT">Computer Science & IT</option>
                  <option value="Business, Finance & MBA">Business, Finance & MBA</option>
                  <option value="Engineering & Technology">Engineering & Technology</option>
                  <option value="Medicine & Health Sciences">Medicine & Health Sciences</option>
                  <option value="Data Science & Business Analytics">Data Science & Business Analytics</option>
                  <option value="Arts, Design & Humanities">Arts, Design & Humanities</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Academic Standing (GPA / CGPA / %)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8.2 CGPA or 78%"
                  value={profile.currentGPA}
                  onChange={(e) => setProfile({ ...profile, currentGPA: e.target.value })}
                  className={`w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 ${outlineFocusClass} font-medium text-slate-800`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    English Test (e.g. IELTS / PTE)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IELTS 7.5 or PTE 65"
                    value={profile.englishTest}
                    onChange={(e) => setProfile({ ...profile, englishTest: e.target.value })}
                    className={`w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 ${outlineFocusClass} font-medium text-slate-800`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Work Exp (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.5 Years in Finance"
                    value={profile.workExperience}
                    onChange={(e) => setProfile({ ...profile, workExperience: e.target.value })}
                    className={`w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 ${outlineFocusClass} font-medium text-slate-800`}
                  />
                </div>
              </div>

              {/* Added Field: Standardized tests status */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Standardized Test
                  </label>
                  <select
                    value={profile.standardizedTest || "Not planning to take"}
                    onChange={(e) => setProfile({ ...profile, standardizedTest: e.target.value })}
                    className={`w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 ${outlineFocusClass} font-medium text-slate-800`}
                  >
                    <option value="Not planning to take">None / Not required</option>
                    <option value="Planning to take GRE">Planning to take GRE</option>
                    <option value="Already taken GRE">Already taken GRE</option>
                    <option value="Planning to take GMAT">Planning to take GMAT</option>
                    <option value="Already taken GMAT">Already taken GMAT</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Estimated Tuition Budget
                  </label>
                  <select
                    value={profile.budget}
                    onChange={(e) => setProfile({ ...profile, budget: e.target.value })}
                    className={`w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 ${outlineFocusClass} font-medium text-slate-800`}
                  >
                    <option value="Under 10 Lakhs / Year">Budget-Friendly (Under 10L)</option>
                    <option value="10-20 Lakhs / Year">Standard (10-20 Lakhs)</option>
                    <option value="20-35 Lakhs / Year">Premium (20-35 Lakhs)</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className={`w-full ${accentBgClass} text-white font-bold text-xs py-3.5 rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 cursor-pointer`}
            >
              <span>Analyze My Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

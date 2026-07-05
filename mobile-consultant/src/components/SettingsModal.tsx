import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Lock, Shield, Fingerprint, ScanFace, 
  Settings, Check, Smartphone, Palette, ChevronRight,
  History, Trash2, Activity, RotateCw, Grid, Play, WifiOff, Wifi,
  Sun, Moon, Monitor, Phone, ShieldAlert, Plus, PhoneCall, UserPlus, Globe, Volume2, VolumeX,
  Coins, HeartHandshake, Calendar, Users
} from "lucide-react";
import { useColorScheme } from "../hooks/useColorScheme";
import { SecurityLog, BiometricAnimationStyle } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tabId: string) => void;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  biometricMethod: "system" | "face" | "fingerprint";
  setBiometricMethod: (method: "system" | "face" | "fingerprint") => void;
  onLockApp: () => void;
  platform: "ios" | "android";
  securityLogs?: SecurityLog[];
  onClearLogs?: () => void;
  biometricAnimationStyle: BiometricAnimationStyle;
  setBiometricAnimationStyle: (style: BiometricAnimationStyle) => void;
  offlineModeSimulated: boolean;
  setOfflineModeSimulated: (simulated: boolean) => void;
  offlineSyncEnabled: boolean;
  setOfflineSyncEnabled: (enabled: boolean) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onNavigate,
  biometricEnabled,
  setBiometricEnabled,
  biometricMethod,
  setBiometricMethod,
  onLockApp,
  platform,
  securityLogs = [],
  onClearLogs,
  biometricAnimationStyle,
  setBiometricAnimationStyle,
  offlineModeSimulated,
  setOfflineModeSimulated,
  offlineSyncEnabled,
  setOfflineSyncEnabled
}: SettingsModalProps) {
  const { colorScheme, setColorScheme, darkMode, setDarkMode, theme } = useColorScheme();
  const [previewState, setPreviewState] = React.useState<"idle" | "testing" | "success">("idle");
  const [previewProgress, setPreviewProgress] = React.useState(0);

  const renderToolIcon = (id: string) => {
    switch (id) {
      case "finance":
        return <Coins className="w-4.5 h-4.5" />;
      case "emergency":
        return <HeartHandshake className="w-4.5 h-4.5" />;
      case "calendar":
        return <Calendar className="w-4.5 h-4.5" />;
      case "agent":
        return <Users className="w-4.5 h-4.5" />;
      default:
        return null;
    }
  };
      default:
        return null;
    }
  };

  // Security Emergency contacts and Calling Simulation States
  const [securityActiveCountry, setSecurityActiveCountry] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem("wehive_dream_country_id");
      return saved || "germany";
    } catch {
      return "germany";
    }
  });

  const [customContacts, setCustomContacts] = React.useState<{ id: string; name: string; number: string; relationship: string; countryId: string }[]>(() => {
    try {
      const saved = localStorage.getItem("wehive_custom_emergency_contacts");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: "c1", name: "Host Family (Frau Becker)", number: "+49 176 9876 5432", relationship: "Host Family", countryId: "germany" },
      { id: "c2", name: "University Advisor Office", number: "+1 604 555 0122", relationship: "Academic Advisor", countryId: "canada" }
    ];
  });

  const [newContactName, setNewContactName] = React.useState("");
  const [newContactNumber, setNewContactNumber] = React.useState("");
  const [newContactRelationship, setNewContactRelationship] = React.useState("Guardian");

  const [activeDialContact, setActiveDialContact] = React.useState<{ name: string; number: string } | null>(null);
  const [callingDuration, setCallingDuration] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = React.useState(false);
  const [isCustomFormOpen, setIsCustomFormOpen] = React.useState(false);

  React.useEffect(() => {
    let callInterval: NodeJS.Timeout;
    if (activeDialContact) {
      setCallingDuration(0);
      callInterval = setInterval(() => {
        setCallingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(callInterval);
  }, [activeDialContact]);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactNumber.trim()) return;

    const newContact = {
      id: "cust-" + Date.now(),
      name: newContactName.trim(),
      number: newContactNumber.trim(),
      relationship: newContactRelationship,
      countryId: securityActiveCountry
    };

    const updated = [...customContacts, newContact];
    setCustomContacts(updated);
    try {
      localStorage.setItem("wehive_custom_emergency_contacts", JSON.stringify(updated));
    } catch {}

    setNewContactName("");
    setNewContactNumber("");
    setNewContactRelationship("Guardian");
    setIsCustomFormOpen(false);
  };

  const handleDeleteContact = (id: string) => {
    const updated = customContacts.filter(c => c.id !== id);
    setCustomContacts(updated);
    try {
      localStorage.setItem("wehive_custom_emergency_contacts", JSON.stringify(updated));
    } catch {}
  };

  const handleTriggerDial = (name: string, number: string) => {
    setActiveDialContact({ name, number });
    setIsMuted(false);
    setIsSpeakerOn(false);
  };

  const formatCallTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const OFFICIAL_CONTACTS: Record<string, { label: string; number: string; description: string }[]> = {
    canada: [
      { label: "Emergency Services", number: "911", description: "Police, Fire, and Ambulance (Toll-free)" },
      { label: "WeHive Student Support", number: "+1 800 361 5566", description: "International Student Care Helpline" },
      { label: "IRCC Immigration Support", number: "+1 888 242 2100", description: "Immigration & visa related issues" }
    ],
    usa: [
      { label: "Emergency Services", number: "911", description: "Police, Fire, and Ambulance (Toll-free)" },
      { label: "WeHive US Care Line", number: "+1 800 451 1054", description: "Emergency on-campus academic advice" },
      { label: "Embassy Student Helpline", number: "+1 855 332 5599", description: "International consular assistance" }
    ],
    ireland: [
      { label: "Emergency Services", number: "112 / 999", description: "Police (Garda), Ambulance, and Fire" },
      { label: "Garda Non-Emergency Office", number: "+353 1 666 0000", description: "Local municipal police advice" },
      { label: "Student Assistance Fund", number: "+353 1 700 5000", description: "Emergency financial/housing help" }
    ],
    uk: [
      { label: "Emergency Services", number: "999 / 112", description: "Police, Fire, and Ambulance" },
      { label: "NHS Health Advice", number: "111", description: "Urgent non-emergency medical queries" },
      { label: "UK Council for Students (UKCISA)", number: "+44 800 028 1420", description: "International student advisory" }
    ],
    germany: [
      { label: "Police (Polizei)", number: "110", description: "Direct law enforcement dispatch" },
      { label: "Ambulance & Fire (Rettungsdienst)", number: "112", description: "Medical emergency and fire dispatch" },
      { label: "Fintiba Blocked Account Line", number: "+49 800 181 2233", description: "Emergency fund/visa hold assistance" }
    ],
    australia: [
      { label: "Emergency Services", number: "000", description: "Police, Fire, and Ambulance (Toll-free)" },
      { label: "Overseas Student Health Cover", number: "+61 1800 814 861", description: "Allianz OSHC emergency medical line" },
      { label: "Student Crisis Support", number: "+61 1300 22 4636", description: "24/7 mental wellness & physical safety" }
    ]
  };

  const getCountryName = (id: string) => {
    const names: Record<string, string> = {
      canada: "Canada 🇨🇦",
      usa: "United States 🇺🇸",
      ireland: "Ireland 🇮🇪",
      uk: "United Kingdom 🇬🇧",
      germany: "Germany 🇩🇪",
      australia: "Australia 🇦🇺"
    };
    return names[id] || id;
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (previewState === "testing") {
      interval = setInterval(() => {
        setPreviewProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setPreviewState("success");
            setTimeout(() => {
              setPreviewState("idle");
              setPreviewProgress(0);
            }, 1800);
            return 100;
          }
          return prev + 5;
        });
      }, 70);
    } else if (previewState === "idle") {
      setPreviewProgress(0);
    }
    return () => clearInterval(interval);
  }, [previewState]);

  const formatLogTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' - ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-45 flex flex-col justify-end">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Settings Panel Bottom Sheet */}
        <motion.div
          id="settings-panel-modal"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl z-46 flex flex-col max-h-[90%] relative border-t border-slate-100 dark:border-slate-800"
        >
          {/* Handle bar for bottom sheet */}
          <div className="mx-auto w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-3 mb-1 shrink-0" />

          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${
                colorScheme === "forced-navy" ? "bg-blue-100 text-blue-900" : "bg-red-100 text-red-900"
              }`}>
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">App Settings</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">Config & Preferences</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-10">
            
            {/* 0. More Tools & Services */}
            <div className="space-y-2.5">
              <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono block px-1">
                More Tools & Services
              </span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "finance", label: "Finance Hub", desc: "Blocked accounts & budgets", icon: Coins, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" },
                  { id: "emergency", label: "Emergency Assist", desc: "Consulates & SOS helper", icon: HeartHandshake, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30" },
                  { id: "calendar", label: "Calendar", desc: "Deadlines & test dates", icon: Calendar, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
                  { id: "agent", label: "Sub-Agent Hub", desc: "Leads & commissions", icon: Users, color: "text-violet-500 bg-violet-50 dark:bg-violet-950/30" },
                ].map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        onClose();
                        onNavigate?.(tool.id);
                      }}
                      className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4.5 text-left hover:scale-102 transition-all cursor-pointer shadow-sm flex flex-col justify-between h-28"
                    >
                      <div className={`p-2 rounded-xl w-fit ${tool.color}`}>
                        {renderToolIcon(tool.id)}
                      </div>
                      <div className="mt-2.5">
                        <div className="text-[12px] font-extrabold text-slate-800 dark:text-slate-200">{tool.label}</div>
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{tool.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1. Biometric Security Settings */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <Shield className="w-4.5 h-4.5 text-blue-950 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Biometric Protection</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Lock application on startup or idle reload.</p>
                  </div>
                </div>
                {/* Switch Button */}
                <button
                  onClick={() => setBiometricEnabled(!biometricEnabled)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 focus:outline-none cursor-pointer ${
                    biometricEnabled 
                      ? colorScheme === "forced-navy" ? "bg-blue-600" : "bg-red-600"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    biometricEnabled ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Configure Preferred Biometric Method (only shown if biometrics enabled) */}
              {biometricEnabled && (
                <div className="pt-3 border-t border-slate-200/50 space-y-2.5 animate-fade-in">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider font-mono block px-1">
                    Preferred Biometric Method
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* System Default */}
                    <button
                      onClick={() => setBiometricMethod("system")}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        biometricMethod === "system"
                          ? colorScheme === "forced-navy"
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10"
                            : colorScheme === "forced-red"
                            ? "bg-red-600 border-red-600 text-white shadow-sm shadow-red-500/10"
                            : "bg-blue-950 border-blue-950 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span className="text-[9px] font-bold">Auto ({platform === "ios" ? "Face" : "Finger"})</span>
                    </button>

                    {/* Face ID */}
                    <button
                      onClick={() => setBiometricMethod("face")}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        biometricMethod === "face"
                          ? colorScheme === "forced-navy"
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10"
                            : colorScheme === "forced-red"
                            ? "bg-red-600 border-red-600 text-white shadow-sm shadow-red-500/10"
                            : "bg-blue-950 border-blue-950 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <ScanFace className="w-4 h-4" />
                      <span className="text-[9px] font-bold">Face ID</span>
                    </button>

                    {/* Fingerprint */}
                    <button
                      onClick={() => setBiometricMethod("fingerprint")}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        biometricMethod === "fingerprint"
                          ? colorScheme === "forced-navy"
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10"
                            : colorScheme === "forced-red"
                            ? "bg-red-600 border-red-600 text-white shadow-sm shadow-red-500/10"
                            : "bg-blue-950 border-blue-950 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span className="text-[9px] font-bold">Fingerprint</span>
                    </button>
                  </div>

                  {/* Interactive Biometric Animation Preview Tool */}
                  <div className="pt-3 border-t border-slate-200/50 space-y-2.5">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider font-mono block px-1">
                      Biometric Animation Style
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "pulse", label: "Minimalist Pulse", icon: Activity, desc: "Concentric expanding radar rings" },
                        { id: "scan", label: "Scanning Laser", icon: Shield, desc: "A sweeping vertical laser bar" },
                        { id: "radar", label: "Sonar Radar", icon: RotateCw, desc: "A clockwise sonar sweep" },
                        { id: "mesh", label: "Cyber Mesh", icon: Grid, desc: "Glowing matrix network nodes" }
                      ].map((style) => {
                        const Icon = style.icon;
                        const isSelected = biometricAnimationStyle === style.id;
                        return (
                          <button
                            key={style.id}
                            onClick={() => {
                              setBiometricAnimationStyle(style.id as any);
                              setPreviewState("testing");
                            }}
                            className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer relative ${
                              isSelected
                                ? colorScheme === "forced-navy"
                                  ? "bg-blue-50/70 border-blue-500 ring-1 ring-blue-500 text-blue-900 shadow-sm"
                                  : colorScheme === "forced-red"
                                  ? "bg-red-50/70 border-red-500 ring-1 ring-red-500 text-red-900 shadow-sm"
                                  : "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              <div className={`p-1 rounded-lg ${
                                isSelected 
                                  ? colorScheme === "forced-navy" ? "bg-blue-600 text-white" : colorScheme === "forced-red" ? "bg-red-600 text-white" : "bg-white/10 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold truncate">{style.label}</span>
                            </div>
                            <span className={`text-[8px] mt-0.5 leading-tight ${
                              isSelected 
                                ? colorScheme === "forced-navy" ? "text-blue-700/85" : colorScheme === "forced-red" ? "text-red-700/85" : "text-slate-300"
                                : "text-slate-400"
                            }`}>
                              {style.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Interactive Simulator Screen */}
                    <div className="relative h-32 bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center p-3 select-none shadow-inner shadow-black/40">
                      {/* Grid background effect */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:10px_10px] opacity-15" />

                      {/* Top indicator bar */}
                      <div className="absolute top-2 left-3 right-3 flex justify-between items-center z-10">
                        <span className="text-[7px] font-mono font-black tracking-widest text-blue-400/80 uppercase">
                          PREVIEW: {biometricAnimationStyle}
                        </span>
                        <span className="text-[7px] font-mono font-bold text-slate-500">
                          {previewState === "testing" ? `${previewProgress}%` : previewState === "success" ? "VERIFIED" : "IDLE"}
                        </span>
                      </div>

                      {/* Central Biometric Ring */}
                      <div className={`relative w-18 h-18 rounded-full border flex items-center justify-center transition-all duration-300 ${
                        previewState === "success"
                          ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                          : previewState === "testing"
                          ? "border-blue-500/40 bg-blue-500/5"
                          : "border-slate-800 bg-slate-900/30"
                      }`}>
                        
                        {/* 1. Pulse Animation Rings */}
                        {previewState === "testing" && biometricAnimationStyle === "pulse" && (
                          <>
                            {[...Array(2)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute rounded-full border border-blue-500/30"
                                initial={{ width: 44, height: 44, opacity: 0.8 }}
                                animate={{
                                  width: [44, 76, 88],
                                  height: [44, 76, 88],
                                  opacity: [0.8, 0.2, 0]
                                }}
                                transition={{
                                  duration: 1.4,
                                  repeat: Infinity,
                                  delay: i * 0.7,
                                  ease: "easeOut"
                                }}
                              />
                            ))}
                          </>
                        )}

                        {/* 2. Scanning Laser Line */}
                        {previewState === "testing" && biometricAnimationStyle === "scan" && (
                          <>
                            <motion.div
                              className="absolute left-1 right-1 h-0.5 bg-blue-500 shadow-[0_0_6px_#3b82f6] rounded-full z-10"
                              animate={{
                                top: ["10%", "90%", "10%"]
                              }}
                              transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                            <motion.div
                              className="absolute left-1 right-1 bg-gradient-to-b from-blue-500/10 to-transparent rounded-t-lg pointer-events-none"
                              animate={{
                                top: ["10%", "90%", "10%"],
                                height: ["2px", "16px", "2px"]
                              }}
                              transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          </>
                        )}

                        {/* 3. Sonar Radar Sweep */}
                        {previewState === "testing" && biometricAnimationStyle === "radar" && (
                          <motion.div
                            className="absolute w-14 h-14 rounded-full pointer-events-none opacity-50"
                            style={{
                              background: "conic-gradient(from 0deg, #3b82f6, transparent 60%)"
                            }}
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1.2, repeat: Infinity, ease: "linear"
                            }}
                          />
                        )}

                        {/* 4. Cyber Mesh Overlay */}
                        {previewState === "testing" && biometricAnimationStyle === "mesh" && (
                          <>
                            <div className="absolute inset-1 grid grid-cols-4 grid-rows-4 gap-0.5 opacity-20">
                              {[...Array(16)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-0.5 h-0.5 bg-blue-400 rounded-full mx-auto"
                                  animate={{
                                    scale: [1, 1.6, 1],
                                    opacity: [0.2, 1, 0.2]
                                  }}
                                  transition={{
                                    duration: 0.8 + Math.random() * 0.8,
                                    repeat: Infinity,
                                    delay: Math.random() * 1.5
                                  }}
                                />
                              ))}
                            </div>
                            <motion.div
                              className="absolute w-14 h-14 rounded-full border border-dashed border-blue-400/25"
                              animate={{ rotate: -360 }}
                              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            />
                          </>
                        )}

                        {/* Outer circular progress border */}
                        {previewState === "testing" && (
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="36" cy="36" r="34" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="2" fill="transparent" />
                            <motion.circle
                              cx="36"
                              cy="36"
                              r="34"
                              stroke="#3b82f6"
                              strokeWidth="2"
                              fill="transparent"
                              strokeDasharray="213"
                              strokeDashoffset={213 - (213 * previewProgress) / 100}
                              strokeLinecap="round"
                              transition={{ ease: "linear" }}
                            />
                          </svg>
                        )}

                        {/* Icon Display */}
                        <AnimatePresence mode="wait">
                          {previewState === "success" ? (
                            <motion.div
                              key="success"
                              initial={{ scale: 0, rotate: -30 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            >
                              <Check className="w-8 h-8 text-emerald-400" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="icon"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                            >
                              {biometricMethod === "face" || (biometricMethod === "system" && platform === "ios") ? (
                                <ScanFace className={`w-8 h-8 transition-colors ${previewState === "testing" ? "text-blue-400" : "text-slate-600"}`} />
                              ) : (
                                <Fingerprint className={`w-8 h-8 transition-colors ${previewState === "testing" ? "text-blue-400" : "text-slate-600"}`} />
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Trigger Sim Button */}
                      <button
                        onClick={() => setPreviewState("testing")}
                        disabled={previewState !== "idle"}
                        className="absolute bottom-2 right-2 px-2 py-1 bg-white/5 hover:bg-white/10 active:bg-white/20 disabled:opacity-40 rounded-lg text-[8px] font-bold text-slate-300 hover:text-white font-mono flex items-center gap-1 border border-white/5 transition-all cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 text-blue-400 fill-blue-400" />
                        SIMULATE
                      </button>

                      {/* Live feedback status message */}
                      <span className="absolute bottom-2 left-3 text-[8px] font-mono text-slate-500">
                        {previewState === "testing" 
                          ? previewProgress < 50 ? "Analyzing biometric features..." : "Validating secure token..."
                          : previewState === "success" ? "Authorized successfully!" : "Click simulate to test style"
                        }
                      </span>
                    </div>

                    {/* Immediate Test Action */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          onLockApp();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-slate-800 text-white font-mono text-[10px] font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-slate-950/10 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        TEST BIOMETRIC LOCK NOW
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* NEW: Emergency Security & One-Touch Dial Hub */}
            <div className="bg-rose-50/50 dark:bg-rose-950/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      Emergency Security Hub
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-[8px] font-mono font-bold tracking-widest uppercase">
                        Active Support
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-0.5">
                      Destination country first-response lines & customized speed dials.
                    </p>
                  </div>
                </div>
              </div>

              {/* Destination Country Speed Dial Selector */}
              <div className="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" />
                    Destination Helpline
                  </span>
                  <select
                    value={securityActiveCountry}
                    onChange={(e) => setSecurityActiveCountry(e.target.value)}
                    className="text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                  >
                    <option value="germany">Germany 🇩🇪</option>
                    <option value="canada">Canada 🇨🇦</option>
                    <option value="usa">United States 🇺🇸</option>
                    <option value="uk">United Kingdom 🇬🇧</option>
                    <option value="ireland">Ireland 🇮🇪</option>
                    <option value="australia">Australia 🇦🇺</option>
                  </select>
                </div>

                {/* Pre-seeded Contacts List for selected country */}
                <div className="space-y-1.5">
                  {(OFFICIAL_CONTACTS[securityActiveCountry] || []).map((contact, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-rose-50/20 dark:bg-rose-950/5 hover:bg-rose-50/45 dark:hover:bg-rose-950/10 rounded-xl border border-rose-100/40 dark:border-rose-900/20 transition-all group"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate">
                            {contact.label}
                          </span>
                          <span className="px-1.5 py-0.2 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-[8px] font-bold rounded">
                            {contact.number}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {contact.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleTriggerDial(contact.label, contact.number)}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 shadow-sm hover:shadow shadow-rose-500/15 cursor-pointer transition-all active:scale-95 shrink-0 animate-fade-in"
                        title={`One-Touch Speed Dial ${contact.label}`}
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>DIAL</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Student Personal Speed Dials */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono flex items-center gap-1">
                    <UserPlus className="w-3 h-3 text-slate-400" />
                    My Speed Dials ({customContacts.filter(c => c.countryId === securityActiveCountry).length})
                  </span>
                  
                  <button
                    onClick={() => setIsCustomFormOpen(!isCustomFormOpen)}
                    className="text-[9px] font-black text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    {isCustomFormOpen ? "CANCEL" : "ADD CONTACT"}
                  </button>
                </div>

                {/* Form to Add Custom Contact */}
                <AnimatePresence>
                  {isCustomFormOpen && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleAddContact}
                      className="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2.5 overflow-hidden"
                    >
                      <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 font-mono block">
                        Add New Speed Dial ({getCountryName(securityActiveCountry)})
                      </span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-500 dark:text-slate-400">CONTACT NAME</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Local Guardian"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            className="w-full text-[10px] bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-500 dark:text-slate-400">PHONE NUMBER</label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +49 152 123456"
                            value={newContactNumber}
                            onChange={(e) => setNewContactNumber(e.target.value)}
                            className="w-full text-[10px] bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 items-end pt-1">
                        <div className="flex-1 space-y-1">
                          <label className="text-[8px] font-bold text-slate-500 dark:text-slate-400">RELATIONSHIP TYPE</label>
                          <select
                            value={newContactRelationship}
                            onChange={(e) => setNewContactRelationship(e.target.value)}
                            className="w-full text-[10px] bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                          >
                            <option value="Guardian">Local Guardian</option>
                            <option value="Host Family">Host Family</option>
                            <option value="Academic Support">Academic Support</option>
                            <option value="Local Friend">Local Friend / Roommate</option>
                            <option value="Embassy/Consulate">Embassy/Consulate</option>
                            <option value="Medical Contact">Medical Contact</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-lg text-[10px] flex items-center gap-1 shrink-0 h-8 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Save Contact
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Custom Contacts for Selected Country */}
                <div className="space-y-1.5 animate-fade-in">
                  {customContacts.filter(c => c.countryId === securityActiveCountry).length === 0 ? (
                    <div className="text-center py-4 bg-white/40 dark:bg-slate-900/30 rounded-xl border border-slate-150 dark:border-slate-800/40 text-[9px] text-slate-400 font-medium">
                      No custom contacts added for {getCountryName(securityActiveCountry)} yet.
                    </div>
                  ) : (
                    customContacts.filter(c => c.countryId === securityActiveCountry).map((contact) => (
                      <div 
                        key={contact.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800/60 transition-all"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate">
                              {contact.name}
                            </span>
                            <span className="px-1 py-0.1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[7px] font-mono rounded">
                              {contact.relationship}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-mono tracking-tight mt-0.5">
                            {contact.number}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Speed dial */}
                          <button
                            onClick={() => handleTriggerDial(contact.name, contact.number)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-900/30 cursor-pointer active:scale-95 transition-transform"
                            title={`One-Touch dial ${contact.name}`}
                          >
                            <Phone className="w-3 h-3" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer transition-colors"
                            title="Delete speed dial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 2. Biometric Security Logs Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <History className="w-4.5 h-4.5 text-blue-950 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Security Audit Logs</h4>
                    <p className="text-[10px] text-slate-400 font-sans">Validation attempt timestamps & statuses.</p>
                  </div>
                </div>
                {securityLogs.length > 0 && onClearLogs && (
                  <button
                    onClick={onClearLogs}
                    className="text-[9px] font-black text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-mono transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    CLEAR LOGS
                  </button>
                )}
              </div>

              {/* Logs Content Scroll Container */}
              <div className="max-h-44 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                {securityLogs.length === 0 ? (
                  <div className="text-center py-6 px-4 bg-white rounded-xl border border-slate-200/40 text-slate-400">
                    <p className="text-[10px] font-bold">No security events logged.</p>
                    <p className="text-[8px] mt-0.5 leading-relaxed font-sans">Unlocking, failing validations, or manual bypass operations will register audit trails here.</p>
                  </div>
                ) : (
                  securityLogs.map((log) => {
                    const isSuccess = log.status === "success";
                    return (
                      <div 
                        key={log.id} 
                        className="p-2.5 bg-white rounded-xl border border-slate-100 flex flex-col gap-1 text-[10px] font-mono hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-red-500 shadow-sm shadow-red-500/50"}`} />
                            <span className={`font-black tracking-wide ${isSuccess ? "text-emerald-600" : "text-red-600"}`}>
                              {log.status.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[8px] font-medium">{formatLogTime(log.timestamp)}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-500 text-[9px] mt-0.5">
                          <span className="flex items-center gap-1 font-sans font-medium text-slate-500">
                            {log.method === "face" ? (
                              <ScanFace className="w-3 h-3 text-slate-400" />
                            ) : log.method === "fingerprint" ? (
                              <Fingerprint className="w-3 h-3 text-slate-400" />
                            ) : (
                              <Smartphone className="w-3 h-3 text-slate-400" />
                            )}
                            {log.method === "system" ? "Auto / System" : log.method === "face" ? "Face ID" : "Fingerprint"}
                          </span>
                          <span className="text-[9px] font-bold text-slate-600 font-sans truncate max-w-[140px]" title={log.failReason}>
                            {log.failReason || "Authorized Successfully"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. Color Theme Settings */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Palette className="w-4.5 h-4.5 text-blue-950 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Visual Theme Preference</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Choose the global accent colors & background feel.</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {/* System Theme */}
                  <button
                    onClick={() => setColorScheme("system")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                      colorScheme === "system"
                        ? "bg-white dark:bg-slate-800 border-blue-950 dark:border-slate-100 ring-2 ring-blue-950/20 dark:ring-white/20 text-slate-800 dark:text-slate-100 font-extrabold shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <div className="w-6 h-3 rounded bg-blue-950 dark:bg-blue-400" />
                    <span className="text-[10px]">System Blue</span>
                  </button>

                  {/* Navy Theme */}
                  <button
                    onClick={() => setColorScheme("forced-navy")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                      colorScheme === "forced-navy"
                        ? "bg-white dark:bg-slate-800 border-blue-600 ring-2 ring-blue-600/20 text-slate-800 dark:text-slate-100 font-extrabold shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <div className="w-6 h-3 rounded bg-blue-600" />
                    <span className="text-[10px]">Cool Navy</span>
                  </button>

                  {/* Red Theme */}
                  <button
                    onClick={() => setColorScheme("forced-red")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                      colorScheme === "forced-red"
                        ? "bg-white dark:bg-slate-800 border-red-600 ring-2 ring-red-600/20 text-slate-800 dark:text-slate-100 font-extrabold shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <div className="w-6 h-3 rounded bg-red-600" />
                    <span className="text-[10px]">Stone Red</span>
                  </button>
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/60 space-y-2.5">
                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider font-mono block px-1">
                  Dark Mode Theme
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {/* Light */}
                  <button
                    onClick={() => setDarkMode("light")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                      darkMode === "light"
                        ? "bg-white dark:bg-slate-800 border-amber-500 ring-2 ring-amber-500/20 text-slate-800 dark:text-slate-100 font-extrabold shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px]">Light</span>
                  </button>

                  {/* Dark */}
                  <button
                    onClick={() => setDarkMode("dark")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                      darkMode === "dark"
                        ? "bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 text-slate-800 dark:text-slate-100 font-extrabold shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px]">Dark</span>
                  </button>

                  {/* System */}
                  <button
                    onClick={() => setDarkMode("system")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                      darkMode === "system"
                        ? "bg-white dark:bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20 text-slate-800 dark:text-slate-100 font-extrabold shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    <Monitor className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px]">System</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Low Connectivity Simulation Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <WifiOff className="w-4.5 h-4.5 text-blue-950 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Low Connectivity Simulator</h4>
                    <p className="text-[10px] text-slate-400">Forces the app to load cached guides & evaluate profiles offline.</p>
                  </div>
                </div>
                {/* Switch Button */}
                <button
                  onClick={() => setOfflineModeSimulated(!offlineModeSimulated)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 focus:outline-none cursor-pointer shrink-0 ${
                    offlineModeSimulated 
                      ? colorScheme === "forced-navy" ? "bg-blue-600" : "bg-red-600"
                      : "bg-slate-300"
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    offlineModeSimulated ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>
            </div>

            {/* Offline Sync Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <Wifi className="w-4.5 h-4.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Auto Offline Sync</h4>
                    <p className="text-[10px] text-slate-400">Pushes cached local profile evaluations to WeHive cloud automatically when a stable connection returns.</p>
                  </div>
                </div>
                {/* Switch Button */}
                <button
                  onClick={() => setOfflineSyncEnabled(!offlineSyncEnabled)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 focus:outline-none cursor-pointer shrink-0 ${
                    offlineSyncEnabled 
                      ? colorScheme === "forced-navy" ? "bg-blue-600" : "bg-red-600"
                      : "bg-slate-300"
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    offlineSyncEnabled ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>
            </div>

            {/* 4. Safe Storage Audit & Status */}
            <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200/40 text-[10px] text-slate-500 font-mono space-y-1.5">
              <span className="font-bold text-slate-700 block text-[9px] uppercase tracking-wide">Client Environment Verification</span>
              <div className="flex justify-between">
                <span>Local Platform Sim:</span>
                <span className="text-slate-800 font-bold uppercase">{platform}</span>
              </div>
              <div className="flex justify-between">
                <span>Database Vault State:</span>
                <span className="text-emerald-600 font-bold">ACTIVE & LOCAL</span>
              </div>
              <div className="flex justify-between">
                <span>Offline Cache Status:</span>
                <span className={offlineModeSimulated || (typeof navigator !== "undefined" && !navigator.onLine) ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                  {offlineModeSimulated || (typeof navigator !== "undefined" && !navigator.onLine) ? "LOCAL CACHE SYSTEM ENGAGED" : "ONLINE SYNCHRONIZED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Session Expiry:</span>
                <span>Persistent localStorage</span>
              </div>
              <div className="flex justify-between">
                <span>Revision Level:</span>
                <span>v1.4.2-Prod</span>
              </div>
            </div>

          </div>

          {/* Simulated Calling Overlay */}
          <AnimatePresence>
            {activeDialContact && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col justify-between p-6 select-none rounded-t-[32px] overflow-hidden"
              >
                {/* Call Status & Country */}
                <div className="flex flex-col items-center mt-12 text-center space-y-1">
                  <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Secure Student Line Connected
                  </span>
                  
                  <h3 className="text-xl font-black text-white tracking-tight mt-4">
                    {activeDialContact.name}
                  </h3>
                  
                  <p className="text-xs text-slate-400 font-mono tracking-wide">
                    {activeDialContact.number}
                  </p>

                  <p className="text-[10px] text-rose-400 font-bold tracking-tight animate-pulse pt-2 uppercase">
                    SIMULATING ONE-TOUCH EMERGENCY CALL...
                  </p>
                </div>

                {/* Core visual waves */}
                <div className="relative flex items-center justify-center h-48">
                  {/* Expanding audio waves */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-24 h-24 rounded-full border border-rose-500/30"
                      animate={{
                        scale: [1, 1.8, 2.5],
                        opacity: [0.6, 0.2, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.65,
                        ease: "easeOut"
                      }}
                    />
                  ))}

                  {/* Main flashing call logo */}
                  <div className="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 border-2 border-white/20 z-10">
                    <Phone className="w-8 h-8 text-white animate-bounce" />
                  </div>
                </div>

                {/* Status details & actions */}
                <div className="flex flex-col items-center space-y-6 mb-10 w-full">
                  <div className="text-center">
                    <span className="text-2xl font-mono font-bold text-white tracking-widest">
                      {formatCallTime(callingDuration)}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-mono mt-1">
                      AUDIO SIMULATED CHANNELS READY
                    </span>
                  </div>

                  {/* Options row */}
                  <div className="flex justify-center gap-6 w-full max-w-xs">
                    {/* Mute button */}
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-3.5 rounded-full border transition-all flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer ${
                        isMuted ? "bg-slate-800 border-rose-500/50 text-rose-400" : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                      <span className="text-[7px] font-mono font-bold">MUTE</span>
                    </button>

                    {/* Speaker button */}
                    <button
                      onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                      className={`p-3.5 rounded-full border transition-all flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer ${
                        isSpeakerOn ? "bg-slate-800 border-emerald-500/50 text-emerald-400" : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <Volume2 className={`w-4 h-4 ${isSpeakerOn ? "text-emerald-400" : ""}`} />
                      <span className="text-[7px] font-mono font-bold">SPEAKER</span>
                    </button>

                    {/* Info button */}
                    <div className="p-3.5 rounded-full border bg-slate-900 border-slate-800 flex flex-col items-center gap-1 text-slate-400">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-[7px] font-mono font-bold">SECURE</span>
                    </div>
                  </div>

                  {/* Hanging up red button */}
                  <button
                    onClick={() => setActiveDialContact(null)}
                    className="w-14 h-14 bg-red-600 hover:bg-red-700 active:scale-95 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 transition-all cursor-pointer flex-shrink-0"
                    title="Hang Up"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

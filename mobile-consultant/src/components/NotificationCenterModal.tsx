import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, X, ShieldAlert, CheckCircle, Trophy, Calendar, MessageSquare, 
  Trash2, Volume2, VolumeX, Eye, EyeOff, Sparkles, ChevronRight, CheckCheck
} from "lucide-react";
import { useNotifications, PushNotification } from "./NotificationContext";
import { useColorScheme } from "../hooks/useColorScheme";

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
}

export default function NotificationCenterModal({ isOpen, onClose, onNavigate }: NotificationCenterModalProps) {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    clearAll, 
    simulateNotification,
    soundEnabled,
    setSoundEnabled,
    bannersEnabled,
    setBannersEnabled
  } = useNotifications();

  const { colorScheme, setColorScheme } = useColorScheme();

  if (!isOpen) return null;

  const handleNotifClick = (notif: PushNotification) => {
    markAsRead(notif.id);
    if (notif.actionTab) {
      onNavigate(notif.actionTab);
    }
    onClose();
  };

  const getIcon = (type: PushNotification["type"]) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case "milestone":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "status":
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case "consultation":
        return <Calendar className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-red-400" />;
    }
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n) => markAsRead(n.id));
  };

  return (
    <AnimatePresence>
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-45 flex flex-col justify-end">
        {/* Backdrop close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Container */}
        <motion.div
          id="notification-center-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="bg-white rounded-t-[32px] shadow-2xl z-46 flex flex-col max-h-[85%] relative border-t border-slate-100"
        >
          {/* Handle bar */}
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-3 mb-1 shrink-0" />

          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="w-5 h-5 text-blue-950" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-[9px] text-white font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Notification Center</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            
            {/* Simulation controls / Triggering dashboard */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider font-mono">
                  Simulation Console
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                WeHive simulated push engine. Trigger mock live system alerts or counselor feedback below to test real-time banners and custom audio dings:
              </p>

              {/* Grid of Simulation Triggers */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => simulateNotification("admission_update")}
                  className="bg-white hover:bg-slate-100 border border-slate-200 py-2.5 px-3 rounded-xl text-[10px] font-bold text-slate-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-left leading-tight"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>University Offer</span>
                </button>
                <button
                  onClick={() => simulateNotification("visa_milestone")}
                  className="bg-white hover:bg-slate-100 border border-slate-200 py-2.5 px-3 rounded-xl text-[10px] font-bold text-slate-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-left leading-tight"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Visa Stage Unlock</span>
                </button>
                <button
                  onClick={() => simulateNotification("hive_ai_message")}
                  className="bg-white hover:bg-slate-100 border border-slate-200 py-2.5 px-3 rounded-xl text-[10px] font-bold text-slate-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-left leading-tight"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Hive AI Counsel</span>
                </button>
                <button
                  onClick={() => simulateNotification("consultation_call")}
                  className="bg-white hover:bg-slate-100 border border-slate-200 py-2.5 px-3 rounded-xl text-[10px] font-bold text-slate-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-left leading-tight"
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>Expert Appointment</span>
                </button>
              </div>

              {/* Service Settings toggle buttons & Color Scheme Select */}
              <div className="pt-3 border-t border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  {/* Audio chime toggle */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                      soundEnabled 
                        ? "bg-blue-50 text-blue-950 border-blue-200" 
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-blue-900" />
                        <span>Sound ON</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Sound OFF</span>
                      </>
                    )}
                  </button>

                  {/* Banner display toggle */}
                  <button
                    onClick={() => setBannersEnabled(!bannersEnabled)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                      bannersEnabled 
                        ? "bg-blue-50 text-blue-950 border-blue-200" 
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {bannersEnabled ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-blue-900" />
                        <span>Banners ON</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Banners OFF</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Color Scheme Picker */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono block mb-1.5 px-1">
                    Color Scheme Preference
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setColorScheme("system")}
                      className={`py-1.5 px-2 rounded-lg text-[9px] font-bold transition-all border text-center cursor-pointer ${
                        colorScheme === "system"
                          ? "bg-blue-950 text-white border-blue-950 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      System
                    </button>
                    <button
                      onClick={() => setColorScheme("forced-navy")}
                      className={`py-1.5 px-2 rounded-lg text-[9px] font-bold transition-all border text-center cursor-pointer ${
                        colorScheme === "forced-navy"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Navy
                    </button>
                    <button
                      onClick={() => setColorScheme("forced-red")}
                      className={`py-1.5 px-2 rounded-lg text-[9px] font-bold transition-all border text-center cursor-pointer ${
                        colorScheme === "forced-red"
                          ? "bg-red-600 text-white border-red-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Red
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification logs list */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">
                  Live Stream Logs
                </h4>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear log</span>
                    </button>
                  </div>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                  <Bell className="w-8 h-8 opacity-40 mb-2 stroke-1" />
                  <p className="text-xs font-medium">No system notifications logged.</p>
                  <p className="text-[10px] mt-1 text-center">Use the simulator panel above to broadcast alerts!</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer hover:border-blue-200 text-left relative flex items-start gap-3 ${
                        notif.read 
                          ? "bg-white border-slate-100 text-slate-700 opacity-80" 
                          : "bg-blue-50/50 border-blue-100/80 text-slate-800 shadow-sm"
                      }`}
                    >
                      {/* Left category marker status */}
                      {!notif.read && (
                        <div className="absolute top-3.5 left-2 w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      )}

                      {/* Icon */}
                      <div className="shrink-0 mt-0.5 pl-1">{getIcon(notif.type)}</div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">
                            {notif.type}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">{notif.timestamp}</span>
                        </div>
                        <h5 className={`text-xs mt-0.5 truncate ${notif.read ? "font-semibold" : "font-extrabold"}`}>
                          {notif.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {notif.body}
                        </p>
                        {notif.actionTab && (
                          <div className="flex items-center gap-0.5 text-[9px] text-blue-600 font-bold mt-1.5 font-mono uppercase tracking-wide">
                            <span>Open destination: {notif.actionTab}</span>
                            <ChevronRight className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

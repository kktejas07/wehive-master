import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, CheckCircle, Trophy, Calendar, Bell, X, Compass, ChevronRight } from "lucide-react";
import { useNotifications, PushNotification } from "./NotificationContext";

interface NotificationBannerProps {
  onNavigate: (tabId: string) => void;
}

export default function NotificationBanner({ onNavigate }: NotificationBannerProps) {
  const { activeBanner, markAsRead } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [currentNotif, setCurrentNotif] = useState<PushNotification | null>(null);

  useEffect(() => {
    if (activeBanner) {
      setCurrentNotif(activeBanner);
      setVisible(true);

      // Auto-dismiss after 4.5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 4500);

      return () => clearTimeout(timer);
    }
  }, [activeBanner]);

  if (!currentNotif) return null;

  const getIcon = (type: PushNotification["type"]) => {
    switch (type) {
      case "message":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <MessageSquare className="w-4.5 h-4.5" />
          </div>
        );
      case "milestone":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-4.5 h-4.5" />
          </div>
        );
      case "status":
        return (
          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-4.5 h-4.5" />
          </div>
        );
      case "consultation":
        return (
          <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Calendar className="w-4.5 h-4.5" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Bell className="w-4.5 h-4.5" />
          </div>
        );
    }
  };

  const handleBannerClick = () => {
    if (currentNotif.actionTab) {
      onNavigate(currentNotif.actionTab);
    }
    markAsRead(currentNotif.id);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="push-notification-banner"
          initial={{ y: -100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -120, opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="absolute top-14 left-4 right-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-3.5 shadow-[0_15px_30px_rgba(0,0,0,0.5)] border border-white/10 z-55 cursor-pointer flex items-start gap-3 select-none active:scale-[0.98] transition-transform"
          onClick={handleBannerClick}
        >
          {/* Left Icon */}
          <div className="shrink-0">{getIcon(currentNotif.type)}</div>

          {/* Core Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                {currentNotif.type === "message" ? "Hive AI Agent" : "WeHive Push Alert"}
              </span>
              <span className="text-[9px] text-slate-500 font-medium font-mono">now</span>
            </div>
            <h4 className="text-xs font-bold text-white tracking-tight truncate">
              {currentNotif.title}
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-normal line-clamp-2">
              {currentNotif.body}
            </p>
            {currentNotif.actionTab && (
              <div className="flex items-center gap-1 text-[9px] text-blue-400 font-bold mt-1.5 uppercase tracking-wider font-mono">
                <span>View Details</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
          </div>

          {/* Close Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setVisible(false);
            }}
            className="p-1 text-slate-500 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

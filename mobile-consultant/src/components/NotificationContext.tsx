import React, { createContext, useContext, useState, useEffect } from "react";

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: "message" | "status" | "milestone" | "consultation" | "system";
  actionTab?: string;
  read: boolean;
}

interface NotificationContextProps {
  notifications: PushNotification[];
  unreadCount: number;
  activeBanner: PushNotification | null;
  triggerNotification: (
    title: string,
    body: string,
    type: PushNotification["type"],
    actionTab?: string
  ) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  simulateNotification: (preset: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  bannersEnabled: boolean;
  setBannersEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

// Play a high-fidelity synthetic device chime using Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Play a dual-tone warm electronic chime
    const now = ctx.currentTime;
    
    // Low bell note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // High sparkle note
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1046.50, now + 0.08); // C6
    
    gain2.gain.setValueAtTime(0.05, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.45);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn("Audio Context block or unsupported:", e);
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [activeBanner, setActiveBanner] = useState<PushNotification | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bannersEnabled, setBannersEnabled] = useState(true);

  // Initialize with dummy historic notifications
  useEffect(() => {
    setNotifications([
      {
        id: "hist-1",
        title: "Welcome to WeHive!",
        body: "Unlock premium global admissions consultation. Your profile is ready.",
        timestamp: "2 hours ago",
        type: "system",
        actionTab: "home",
        read: true
      },
      {
        id: "hist-2",
        title: "Hive AI: Germany SOP checklist",
        body: "I've drafted an SOP template tailored for TUM University. Check it out!",
        timestamp: "Yesterday",
        type: "message",
        actionTab: "chat",
        read: true
      }
    ]);
  }, []);

  const triggerNotification = (
    title: string,
    body: string,
    type: PushNotification["type"],
    actionTab?: string
  ) => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    
    const newNotif: PushNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      body,
      timestamp: formattedTime,
      type,
      actionTab,
      read: false
    };

    setNotifications((prev) => [newNotif, ...prev]);

    if (bannersEnabled) {
      setActiveBanner(newNotif);
    }

    if (soundEnabled) {
      playNotificationSound();
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
    setActiveBanner(null);
  };

  const simulateNotification = (preset: string) => {
    switch (preset) {
      case "hive_ai_message":
        triggerNotification(
          "Message from Hive AI",
          "I analyzed your work experience! Added 2 safety colleges in Canada to your shortlist.",
          "message",
          "chat"
        );
        break;
      case "visa_milestone":
        triggerNotification(
          "Visa Status Updated",
          "Stage 3 Unlocked: Blocked Account status updated to APPROVED. 🇩🇪",
          "milestone",
          "tracking"
        );
        break;
      case "admission_update":
        triggerNotification(
          "University Offer Received!",
          "Congratulations! TUM Germany issued an admission offer letter.",
          "status",
          "tracking"
        );
        break;
      case "consultation_call":
        triggerNotification(
          "Video Call starting in 10m",
          "WeHive Expert Lisa is ready for your SOP review session.",
          "consultation",
          "home"
        );
        break;
      default:
        triggerNotification(
          "WeHive Alert",
          "This is a test notification from the WeHive Push Service.",
          "system"
        );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeBanner,
        triggerNotification,
        markAsRead,
        clearAll,
        simulateNotification,
        soundEnabled,
        setSoundEnabled,
        bannersEnabled,
        setBannersEnabled
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

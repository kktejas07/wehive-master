import { useState, useEffect } from "react";
import { Home, Compass, MessageSquare, CheckSquare, Sparkles, Folder } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { syncOfflineEvaluations } from "./utils/offlineCache";

// Subcomponent imports
import DeviceFrame from "./components/DeviceFrame";
import HomeTab from "./components/HomeTab";
import ExploreTab from "./components/ExploreTab";
import ChatTab from "./components/ChatTab";
import TrackingTab from "./components/TrackingTab";
import EvaluatorTab from "./components/EvaluatorTab";
import VaultTab from "./components/VaultTab";
import FinanceTab from "./components/FinanceTab";
import EmergencyTab from "./components/EmergencyTab";
import CalendarTab from "./components/CalendarTab";
import AgentTab from "./components/AgentTab";
import BiometricAuth from "./components/BiometricAuth";
import MobileAuthScreen from "./components/MobileAuthScreen";

// Notification imports
import { NotificationProvider, useNotifications } from "./components/NotificationContext";
import NotificationBanner from "./components/NotificationBanner";
import NotificationCenterModal from "./components/NotificationCenterModal";
import SettingsModal from "./components/SettingsModal";

// Color scheme provider
import { ColorSchemeProvider, useColorScheme } from "./hooks/useColorScheme";

// Type imports
import { Consultation, SecurityLog, BiometricAnimationStyle } from "./types";

function AppContent() {
  const { colorScheme, theme } = useColorScheme();
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isCredentialAuthenticated, setIsCredentialAuthenticated] = useState<boolean>(false);
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [bookedSessions, setBookedSessions] = useState<Consultation[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("wehive-biometric-enabled");
      if (stored === "false") {
        return true; // Bypass lock on start if disabled
      }
    } catch {}
    return false; // Lock by default on start
  });
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [offlineModeSimulated, setOfflineModeSimulatedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("wehive-offline-simulation") === "true";
    } catch {
      return false;
    }
  });

  const setOfflineModeSimulated = (simulated: boolean) => {
    setOfflineModeSimulatedState(simulated);
    try {
      localStorage.setItem("wehive-offline-simulation", String(simulated));
    } catch {}
  };

  const [offlineSyncEnabled, setOfflineSyncEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("wehive-offline-sync") !== "false";
    } catch {
      return true;
    }
  });

  const setOfflineSyncEnabled = (enabled: boolean) => {
    setOfflineSyncEnabledState(enabled);
    try {
      localStorage.setItem("wehive-offline-sync", String(enabled));
    } catch {}
  };

  const { triggerNotification } = useNotifications();

  // Handle Online/Offline Status and Automatic Offline Syncing
  useEffect(() => {
    let isSyncing = false;
    
    const handleSyncIfPossible = async () => {
      if (isSyncing) return;
      
      const simulatedOffline = localStorage.getItem("wehive-offline-simulation") === "true";
      const isBrowserOnline = navigator.onLine;
      const isEffectiveOnline = !simulatedOffline && isBrowserOnline;
      const syncEnabled = localStorage.getItem("wehive-offline-sync") !== "false";
      
      if (isEffectiveOnline && syncEnabled) {
        try {
          const cached = localStorage.getItem("wehive-cached-evaluations");
          if (cached) {
            const evals = JSON.parse(cached);
            const unsyncedCount = evals.filter((e: any) => e.isOfflineComputed).length;
            
            if (unsyncedCount > 0) {
              isSyncing = true;
              triggerNotification(
                "Offline Sync Started",
                `Pushing ${unsyncedCount} cached offline profile evaluation${unsyncedCount > 1 ? "s" : ""} to WeHive Cloud...`,
                "system"
              );
              
              // Simulate small network latency to make it feel authentic
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const syncedCount = await syncOfflineEvaluations();
              
              if (syncedCount > 0) {
                triggerNotification(
                  "Offline Sync Successful",
                  `All ${syncedCount} offline reports have been safely synchronized with remote databases.`,
                  "system"
                );
              }
            }
          }
        } catch (e) {
          console.error("Auto sync failed", e);
        } finally {
          isSyncing = false;
        }
      }
    };

    // Listen to network status changes
    const handleOnline = () => {
      handleSyncIfPossible();
    };

    window.addEventListener("online", handleOnline);
    
    // Also trigger check when simulated offline state changes or sync gets toggled on
    handleSyncIfPossible();

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [offlineModeSimulated, offlineSyncEnabled]);

  const [biometricEnabled, setBiometricEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("wehive-biometric-enabled");
      return stored !== "false";
    } catch {
      return true;
    }
  });

  const [biometricMethod, setBiometricMethodState] = useState<"system" | "face" | "fingerprint">(() => {
    try {
      const stored = localStorage.getItem("wehive-biometric-method");
      if (stored === "face" || stored === "fingerprint" || stored === "system") {
        return stored as "system" | "face" | "fingerprint";
      }
    } catch {}
    return "system";
  });

  const [biometricAnimationStyle, setBiometricAnimationStyleState] = useState<BiometricAnimationStyle>(() => {
    try {
      const stored = localStorage.getItem("wehive-biometric-animation");
      if (stored === "pulse" || stored === "scan" || stored === "radar" || stored === "mesh") {
        return stored as BiometricAnimationStyle;
      }
    } catch {}
    return "pulse";
  });

  const setBiometricAnimationStyle = (style: BiometricAnimationStyle) => {
    setBiometricAnimationStyleState(style);
    try {
      localStorage.setItem("wehive-biometric-animation", style);
    } catch (e) {
      console.warn("localStorage error:", e);
    }
  };

  const [securityLogs, setSecurityLogsState] = useState<SecurityLog[]>(() => {
    try {
      const stored = localStorage.getItem("wehive-security-logs");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });

  const handleLogAttempt = (status: "success" | "failed", method: "system" | "face" | "fingerprint", failReason?: string) => {
    const newLog: SecurityLog = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      status,
      method,
      failReason,
      platform
    };
    setSecurityLogsState((prev) => {
      const updated = [newLog, ...prev];
      try {
        localStorage.setItem("wehive-security-logs", JSON.stringify(updated));
      } catch (e) {
        console.warn("localStorage error:", e);
      }
      return updated;
    });
  };

  const handleClearLogs = () => {
    setSecurityLogsState([]);
    try {
      localStorage.removeItem("wehive-security-logs");
    } catch (e) {
      console.warn("localStorage error:", e);
    }
  };

  const setBiometricEnabled = (enabled: boolean) => {
    setBiometricEnabledState(enabled);
    try {
      localStorage.setItem("wehive-biometric-enabled", String(enabled));
      if (!enabled) {
        setIsAuthenticated(true); // Instant unlock if disabled
      }
    } catch (e) {
      console.warn("localStorage error:", e);
    }
  };

  const setBiometricMethod = (method: "system" | "face" | "fingerprint") => {
    setBiometricMethodState(method);
    try {
      localStorage.setItem("wehive-biometric-method", method);
    } catch (e) {
      console.warn("localStorage error:", e);
    }
  };

  // Navigation handlers
  const handleNavigate = (tabId: string) => {
    setActiveTab(tabId);
  };

  const getTabClass = (tabId: string) => {
    const isActive = activeTab === tabId;
    if (!isActive) return "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200";
    
    if (colorScheme === "forced-red") {
      return "text-red-600 dark:text-red-400 font-extrabold";
    } else if (colorScheme === "forced-navy") {
      return "text-blue-600 dark:text-blue-400 font-extrabold";
    } else {
      return "text-blue-950 dark:text-blue-400 font-extrabold";
    }
  };

  const handleSelectCountry = (countryId: string) => {
    setSelectedCountryId(countryId);
    setActiveTab("explore");
  };

  const handleClearSelectedCountry = () => {
    setSelectedCountryId(null);
  };

  const handleBookSession = (newSession: Consultation) => {
    setBookedSessions((prev) => [...prev, newSession]);
  };

  // Render the current view inside the device shell
  const renderActiveScreen = () => {
    let screenElement;
    switch (activeTab) {
      case "home":
        screenElement = (
          <HomeTab
            onNavigate={handleNavigate}
            onSelectCountry={handleSelectCountry}
            bookedSessions={bookedSessions}
            onBookSession={handleBookSession}
            onLock={() => {
              setIsAuthenticated(false);
              setIsCredentialAuthenticated(false);
            }}
            onOpenNotifications={() => setIsNotifCenterOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        );
        break;
      case "explore":
        screenElement = (
          <ExploreTab
            selectedCountryId={selectedCountryId}
            onClearSelectedCountry={handleClearSelectedCountry}
            onSelectCountry={setSelectedCountryId}
            onNavigateToEvaluator={() => handleNavigate("evaluator")}
            onNavigateToChat={() => handleNavigate("chat")}
          />
        );
        break;
      case "chat":
        screenElement = <ChatTab />;
        break;
      case "vault":
        screenElement = (
          <VaultTab
            onTriggerNotification={triggerNotification}
            colorScheme={colorScheme}
          />
        );
        break;
      case "finance":
        screenElement = (
          <FinanceTab
            onTriggerNotification={triggerNotification}
            colorScheme={colorScheme}
          />
        );
        break;
      case "emergency":
        screenElement = (
          <EmergencyTab
            onTriggerNotification={triggerNotification}
            colorScheme={colorScheme}
          />
        );
        break;
      case "calendar":
        screenElement = (
          <CalendarTab
            onTriggerNotification={triggerNotification}
            colorScheme={colorScheme}
          />
        );
        break;
      case "agent":
        screenElement = (
          <AgentTab
            onTriggerNotification={triggerNotification}
            colorScheme={colorScheme}
          />
        );
        break;
      case "tracking":
        screenElement = <TrackingTab />;
        break;
      case "evaluator":
        screenElement = <EvaluatorTab />;
        break;
      default:
        screenElement = (
          <HomeTab
            onNavigate={handleNavigate}
            onSelectCountry={handleSelectCountry}
            bookedSessions={bookedSessions}
            onBookSession={handleBookSession}
            onLock={() => {
              setIsAuthenticated(false);
              setIsCredentialAuthenticated(false);
            }}
            onOpenNotifications={() => setIsNotifCenterOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {screenElement}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <DeviceFrame platform={platform} setPlatform={setPlatform}>
      {/* Screen Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!isCredentialAuthenticated ? (
            <MobileAuthScreen
              onSuccess={() => setIsCredentialAuthenticated(true)}
              colorScheme={colorScheme}
            />
          ) : !isAuthenticated && biometricEnabled ? (
            <BiometricAuth
              platform={platform}
              onSuccess={() => setIsAuthenticated(true)}
              biometricMethod={biometricMethod}
              onLogAttempt={handleLogAttempt}
              animationStyle={biometricAnimationStyle}
            />
          ) : null}
        </AnimatePresence>

        {/* Real-time Push Notification Banner */}
        <NotificationBanner onNavigate={handleNavigate} />

        {/* Interactive Notification History & Control Center Modal */}
        <NotificationCenterModal 
          isOpen={isNotifCenterOpen} 
          onClose={() => setIsNotifCenterOpen(false)} 
          onNavigate={handleNavigate} 
        />

        {/* Global Settings Control Panel Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onNavigate={handleNavigate}
          biometricEnabled={biometricEnabled}
          setBiometricEnabled={setBiometricEnabled}
          biometricMethod={biometricMethod}
          setBiometricMethod={setBiometricMethod}
          onLockApp={() => {
            setIsAuthenticated(false);
            setIsCredentialAuthenticated(false);
          }}
          platform={platform}
          securityLogs={securityLogs}
          onClearLogs={handleClearLogs}
          biometricAnimationStyle={biometricAnimationStyle}
          setBiometricAnimationStyle={setBiometricAnimationStyle}
          offlineModeSimulated={offlineModeSimulated}
          setOfflineModeSimulated={setOfflineModeSimulated}
          offlineSyncEnabled={offlineSyncEnabled}
          setOfflineSyncEnabled={setOfflineSyncEnabled}
        />

        <div className="flex-1 overflow-hidden relative flex flex-col">
          {renderActiveScreen()}
        </div>

        {/* Unified Bottom Tab Navigation bar */}
        <div className={`shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-4 flex justify-around items-center z-40 shadow-lg select-none transition-colors duration-300 ${
          platform === "ios" ? "h-20 pb-5" : "h-16"
        }`}>
          {/* Tab Button: Home */}
          <button
            onClick={() => handleNavigate("home")}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-200 cursor-pointer ${getTabClass("home")}`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-[9px] mt-1 font-mono tracking-wide">Home</span>
          </button>

          {/* Tab Button: Explore */}
          <button
            onClick={() => handleNavigate("explore")}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-200 cursor-pointer ${getTabClass("explore")}`}
          >
            <Compass className="w-5 h-5 shrink-0" />
            <span className="text-[9px] mt-1 font-mono tracking-wide">Explore</span>
          </button>

          {/* Tab Button: Vault */}
          <button
            onClick={() => handleNavigate("vault")}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-200 cursor-pointer ${getTabClass("vault")}`}
          >
            <Folder className="w-5 h-5 shrink-0" />
            <span className="text-[9px] mt-1 font-mono tracking-wide">Vault</span>
          </button>

          {/* Tab Button: Hive AI Chat */}
          <button
            onClick={() => handleNavigate("chat")}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-200 cursor-pointer ${getTabClass("chat")}`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 shrink-0" />
              <span className={`absolute -top-1 -right-1.5 w-2 h-2 rounded-full border border-white animate-pulse ${
                colorScheme === "forced-navy" ? "bg-blue-600" : "bg-red-600"
              }`} />
            </div>
            <span className="text-[9px] mt-1 font-mono tracking-wide">Hive AI</span>
          </button>

          {/* Tab Button: Journey Tracking */}
          <button
            onClick={() => handleNavigate("tracking")}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-200 cursor-pointer ${getTabClass("tracking")}`}
          >
            <CheckSquare className="w-5 h-5 shrink-0" />
            <span className="text-[9px] mt-1 font-mono tracking-wide">Journey</span>
          </button>
        </div>
      </div>
    </DeviceFrame>
  );
}

export default function App() {
  return (
    <ColorSchemeProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ColorSchemeProvider>
  );
}

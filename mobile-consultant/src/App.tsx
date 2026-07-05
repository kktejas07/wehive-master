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
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
              <g fill="currentColor" fillRule="evenodd">
                <path d="M12 2.75c-2.59 0-4.93 1.06-6.61 2.77 -.29.29-.77.3-1.07.01 -.3-.29-.31-.77-.02-1.07 1.95-1.99 4.66-3.23 7.67-3.23 5.93 0 10.75 4.81 10.75 10.75 0 5.93-4.82 10.75-10.75 10.75 -5.94 0-10.75-4.82-10.75-10.75 0-.74.07-1.46.21-2.15 .08-.41.47-.67.88-.59 .4.08.66.47.58.88 -.13.59-.19 1.21-.19 1.85 0 5.1 4.14 9.25 9.25 9.25 5.1 0 9.25-4.15 9.25-9.25 0-5.11-4.15-9.25-9.25-9.25Z"/>
                <path d="M1.75 15c0-.42.33-.75.75-.75h5c1.24 0 2.25 1 2.25 2.25 0 .41.33.75.75.75H12c1.51 0 2.75 1.23 2.75 2.75v1.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V20c0-.7-.56-1.25-1.25-1.25h-1.5c-1.25 0-2.25-1.01-2.25-2.25 0-.42-.34-.75-.75-.75h-5c-.42 0-.75-.34-.75-.75Z"/>
                <path d="M13.43 1.88c.33.23.42.2.18.54l-2.82 4.02c-.27.37-.3.86-.1 1.27l.98 1.96c.32.65 1.15.89 1.78.5l.37-.24c1.32-.83 3.07-.39 3.84.96l.39.68c.22.38.63.62 1.08.62h2.83c.41 0 .25.33.25.75 0 .41.16.75-.25.75h-2.84c-.99 0-1.9-.53-2.39-1.39l-.4-.69c-.36-.62-1.15-.82-1.75-.44l-.38.23c-1.38.85-3.2.34-3.92-1.11l-.99-1.97c-.46-.91-.38-1.99.2-2.81l2.81-4.03c.23-.34.7.07 1.04.31Z"/>
              </g>
            </svg>
            <span className="text-[9px] mt-1 font-mono tracking-wide">Explore</span>
          </button>

          {/* Tab Button: Vault */}
          <button
            onClick={() => handleNavigate("vault")}
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-200 cursor-pointer ${getTabClass("vault")}`}
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
              <g fill="currentColor" fillRule="evenodd">
                <path d="M1.25 4.34c0-1.18 1.13-2.02 2.25-1.68l8.71 2.61c.31.09.53.38.53.71v16c0 .23-.12.46-.31.6 -.2.14-.44.18-.67.11L2.47 19.9c-.75-.23-1.25-.91-1.25-1.68V4.3Zm1.82-.24c-.17-.05-.33.07-.33.23v13.91c0 .11.07.2.17.23l8.32 2.49V6.52L3.05 4.06Z"/>
                <path d="M22.75 4.34c0-1.18-1.13-2.02-2.26-1.68l-8.72 2.61c-.32.09-.54.38-.54.71v16c0 .23.11.46.3.6 .19.14.43.18.66.11l9.28-2.79c.74-.23 1.24-.91 1.24-1.68V8.96c0-.42-.34-.75-.75-.75 -.42 0-.75.33-.75.75v.256c0 .11-.08.2-.18.23l-8.33 2.49V6.5l8.17-2.46c.16-.05.32.07.32.23v.65c0 .41.33.75.75.75 .41 0 .75-.34.75-.75v-.66Z"/>
                <path d="M7 9.75c-.42 0-.75.33-.75.75 0 .41.33.75.75.75 .41 0 .75-.34.75-.75 0-.42-.34-.75-.75-.75Zm-2.25.75c0-1.25 1-2.25 2.25-2.25 1.24 0 2.25 1 2.25 2.25 0 1.24-1.01 2.25-2.25 2.25 -1.25 0-2.25-1.01-2.25-2.25Z"/>
                <path d="M7 14.75c-.97 0-1.75.78-1.75 1.75 0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75 0-1.8 1.45-3.25 3.25-3.25 1.79 0 3.25 1.45 3.25 3.25 0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75 0-.97-.79-1.75-1.75-1.75Z"/>
                <path d="M14.25 10c0-.42.33-.75.75-.75h4c.41 0 .75.33.75.75 0 .41-.34.75-.75.75h-4c-.42 0-.75-.34-.75-.75Z"/>
                <path d="M14.25 14c0-.42.33-.75.75-.75h4c.41 0 .75.33.75.75 0 .41-.34.75-.75.75h-4c-.42 0-.75-.34-.75-.75Z"/>
              </g>
            </svg>
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

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, ScanFace, Check, RefreshCw, Lock, ShieldCheck, HelpCircle } from "lucide-react";
import LottiePlayer from "./LottiePlayer";
import { BiometricAnimationStyle } from "../types";
import WeHiveLogo from "./WeHiveLogo";

interface BiometricAuthProps {
  platform: "ios" | "android";
  onSuccess: () => void;
  biometricMethod?: "system" | "face" | "fingerprint";
  onLogAttempt?: (status: "success" | "failed", method: "system" | "face" | "fingerprint", failReason?: string) => void;
  animationStyle?: BiometricAnimationStyle;
}

type AuthState = "idle" | "scanning" | "verifying" | "success" | "failed";

export default function BiometricAuth({ 
  platform, 
  onSuccess, 
  biometricMethod = "system", 
  onLogAttempt,
  animationStyle = "pulse"
}: BiometricAuthProps) {
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [progress, setProgress] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const hasTriggeredSuccess = useRef(false);

  // Auto start scanning on mount
  useEffect(() => {
    startScanning();
  }, [platform]);

  // Handle the scanning animation progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (authState === "scanning") {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          const next = prev + 4;
          if (next >= 100) {
            clearInterval(interval);
            // Defers completion out of the state updater function to avoid rendering side-effects
            setTimeout(() => {
              handleScanComplete();
            }, 0);
            return 100;
          }
          return next;
        });
      }, 80);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [authState]);

  const startScanning = () => {
    setProgress(0);
    setAuthState("scanning");
    hasTriggeredSuccess.current = false;
  };

  const handleScanComplete = () => {
    setAuthState("verifying");
    
    // Simulate high-security cloud and network signature check
    setTimeout(() => {
      setAuthState((current) => {
        if (current === "verifying") {
          return "success";
        }
        return current;
      });
    }, 1600);
  };

  // Trigger onSuccess and onLogAttempt when authentication is successful
  useEffect(() => {
    if (authState === "success" && !hasTriggeredSuccess.current) {
      hasTriggeredSuccess.current = true;
      if (onLogAttempt) {
        onLogAttempt("success", biometricMethod);
      }
      const timer = setTimeout(() => {
        onSuccess();
      }, 1200); // Wait for the success animation to be enjoyed
      return () => clearTimeout(timer);
    }
  }, [authState, onLogAttempt, biometricMethod, onSuccess]);

  const triggerManualFail = () => {
    setAuthState("failed");
    setFailCount((prev) => prev + 1);
    if (onLogAttempt) {
      onLogAttempt("failed", biometricMethod, "Biometric signature mismatched");
    }
  };

  const handleRetry = () => {
    startScanning();
  };

  const isFaceID = biometricMethod === "face" || (biometricMethod === "system" && platform === "ios");

  // Framer Motion Variants for smooth entries
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" as any }
    },
    exit: { 
      opacity: 0,
      scale: 1.05,
      filter: "blur(10px)",
      transition: { duration: 0.5, ease: "easeInOut" as any }
    }
  };

  const ringVariants = {
    idle: { scale: 1 },
    scanning: {
      scale: [1, 1.04, 1],
      transition: { repeat: Infinity, duration: 2, ease: "easeInOut" as any }
    },
    verifying: {
      scale: 1.02,
      borderColor: "#3b82f6",
      transition: { duration: 0.3 }
    },
    success: { 
      scale: 1.08,
      borderColor: "#22c55e",
      transition: { duration: 0.3 }
    },
    failed: {
      scale: [1, 0.95, 1.05, 1],
      borderColor: "#ef4444",
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.div
      id="biometric-auth-overlay"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col justify-between p-6 select-none"
    >
      {/* Top Brand Info */}
      <div className="flex flex-col items-center mt-8">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-3 bg-white/5 px-4 py-2 rounded-full border border-white/10"
        >
          <WeHiveLogo size="sm" theme="white" showTagline={false} />
          <span className="text-[10px] font-bold tracking-widest text-slate-300 font-mono border-l border-white/25 pl-2">SECURE</span>
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-bold text-white tracking-tight"
        >
          App Locked
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-xs text-slate-400 text-center mt-1 px-4"
        >
          {isFaceID 
            ? "Verify your identity using Face ID to access your WeHive profile and visa progress." 
            : "Confirm fingerprint sensor to unlock WeHive Mobile Consultant."}
        </motion.p>
      </div>

      {/* Center Scanner Area */}
      <div className="flex flex-col items-center justify-center flex-1 my-4">
        <motion.div
          variants={ringVariants}
          animate={authState}
          className={`relative w-36 h-36 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            authState === "success" 
              ? "border-green-500 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.3)]" 
              : authState === "failed"
              ? "border-red-500 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              : authState === "verifying"
              ? "border-blue-500 bg-blue-500/10 shadow-[0_0_25px_rgba(59,130,246,0.25)] animate-pulse"
              : "border-blue-500/30 bg-blue-950/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
          }`}
        >
          {/* Animated scanning circular border */}
          {authState === "scanning" && (
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="68"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="3"
                fill="transparent"
              />
              <motion.circle
                cx="72"
                cy="72"
                r="68"
                stroke="#3b82f6"
                strokeWidth="3"
                fill="transparent"
                strokeDasharray="427"
                strokeDashoffset={427 - (427 * progress) / 100}
                strokeLinecap="round"
                transition={{ ease: "linear" }}
              />
            </svg>
          )}

          {/* Custom Biometric Animation Overlays */}
          {authState === "scanning" && animationStyle === "pulse" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-blue-500/40"
                  initial={{ width: 144, height: 144, opacity: 0.8 }}
                  animate={{
                    width: [144, 240, 280],
                    height: [144, 240, 280],
                    opacity: [0.8, 0.3, 0],
                  }}
                  transition={{
                    duration: 2.0,
                    repeat: Infinity,
                    delay: i * 0.65,
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>
          )}

          {authState === "scanning" && animationStyle === "scan" && (
            <>
              <motion.div
                className="absolute left-3 right-3 h-0.5 bg-blue-500 shadow-[0_0_12px_#3b82f6] rounded-full z-10 pointer-events-none"
                animate={{
                  top: ["10%", "90%", "10%"]
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute left-3 right-3 bg-gradient-to-b from-blue-500/15 to-transparent rounded-t-xl pointer-events-none"
                animate={{
                  top: ["10%", "90%", "10%"],
                  height: ["4px", "40px", "4px"]
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </>
          )}

          {authState === "scanning" && animationStyle === "radar" && (
            <motion.div
              className="absolute w-28 h-28 rounded-full pointer-events-none opacity-40 z-10"
              style={{
                background: "conic-gradient(from 0deg, #3b82f6, transparent 65%)"
              }}
              animate={{ rotate: 360 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          )}

          {authState === "scanning" && animationStyle === "mesh" && (
            <>
              <div className="absolute inset-3 grid grid-cols-5 grid-rows-5 gap-1 opacity-25 pointer-events-none">
                {[...Array(25)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 bg-blue-400 rounded-full mx-auto"
                    animate={{
                      scale: [1, 1.8, 1],
                      opacity: [0.2, 1, 0.2]
                    }}
                    transition={{
                      duration: 1.0 + Math.random() * 1.5,
                      repeat: Infinity,
                      delay: Math.random() * 2
                    }}
                  />
                ))}
              </div>
              <motion.div
                className="absolute w-28 h-28 rounded-full border border-dashed border-blue-400/30 pointer-events-none"
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              />
            </>
          )}

          {/* Core Biometric Icon */}
          <AnimatePresence mode="wait">
            {authState === "success" ? (
              <motion.div
                key="success-icon"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Check className="w-16 h-16 text-green-400" />
              </motion.div>
            ) : authState === "verifying" ? (
              <motion.div
                key="verifying-icon"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center justify-center text-blue-400"
              >
                <RefreshCw className="w-12 h-12 text-blue-400 animate-spin" />
              </motion.div>
            ) : authState === "failed" ? (
              <motion.div
                key="fail-icon"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex flex-col items-center justify-center text-red-400"
              >
                <Lock className="w-12 h-12" />
              </motion.div>
            ) : (
              <motion.div
                key="scanner-icon"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative w-28 h-28 flex items-center justify-center overflow-hidden"
              >
                <LottiePlayer
                  url=""
                  loop={authState === "scanning"}
                  autoplay={authState === "scanning"}
                  className="w-full h-full"
                  fallbackIcon={
                    <div className="relative flex flex-col items-center justify-center">
                      {isFaceID ? (
                        <ScanFace className="w-16 h-16 text-blue-400" />
                      ) : (
                        <Fingerprint className="w-16 h-16 text-blue-400" />
                      )}

                      {/* Vertical Laser Scan Line */}
                      {authState === "scanning" && animationStyle === "scan" && (
                        <motion.div
                          initial={{ top: "0%" }}
                          animate={{ top: ["5%", "90%", "5%"] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_#3b82f6] rounded-full"
                        />
                      )}
                    </div>
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Dynamic Status Text */}
        <div className="mt-6 h-8 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={authState + "-" + progress}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`text-xs font-mono font-medium tracking-wide ${
                authState === "success"
                  ? "text-green-400"
                  : authState === "failed"
                  ? "text-red-400"
                  : authState === "verifying"
                  ? "text-blue-400 font-bold"
                  : "text-blue-300"
              }`}
            >
              {authState === "idle" && "Tap to start verification"}
              {authState === "scanning" && (
                progress < 40 ? "Initializing Secure Handshake..." :
                progress < 75 ? (isFaceID ? "Mapping Facial Landmarks..." : "Scanning Fingerprint Ridges...") :
                "Verifying Credentials..."
              )}
              {authState === "verifying" && "Exchanging Secure Keys with WeHive Node..."}
              {authState === "success" && "Identity Confirmed!"}
              {authState === "failed" && "Biometric Scan Rejected"}
            </motion.p>
          </AnimatePresence>
          {authState === "scanning" && (
            <span className="text-[10px] text-slate-500 font-mono">{progress}%</span>
          )}
        </div>
      </div>

      {/* Bottom Controls / Bypass */}
      <div className="flex flex-col gap-3 mb-6 w-full px-4 shrink-0">
        {authState === "failed" ? (
          <button
            onClick={handleRetry}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-mono transition-all border border-blue-700 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 animate-spin-reverse" />
            RETRY SECURE AUTHENTICATION
          </button>
        ) : (
          <button
            onClick={triggerManualFail}
            disabled={authState === "success" || authState === "verifying"}
            className="w-full bg-slate-900/40 hover:bg-red-950/20 text-slate-400 hover:text-red-300 font-medium py-2.5 px-4 rounded-xl border border-white/5 hover:border-red-500/20 text-[11px] font-mono transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            Simulate Authentication Failure
          </button>
        )}

        {/* Secure Skip Option */}
        <button
          onClick={() => {
            if (onLogAttempt) {
              onLogAttempt("success", biometricMethod, "Admin key bypass");
            }
            onSuccess();
          }}
          className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-4 rounded-xl text-xs font-mono transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          BYPASS WITH ADMIN KEY
        </button>

        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 mt-2 font-mono">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Need help? Contact WeHive Support</span>
        </div>
      </div>
    </motion.div>
  );
}

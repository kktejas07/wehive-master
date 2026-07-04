import React, { useState, useEffect } from "react";
import { Smartphone, Wifi, Battery, Signal, RefreshCw, RefreshCwOff } from "lucide-react";

interface DeviceFrameProps {
  children: React.ReactNode;
  platform: "ios" | "android";
  setPlatform: (p: "ios" | "android") => void;
}

export default function DeviceFrame({ children, platform, setPlatform }: DeviceFrameProps) {
  const [currentTime, setCurrentTime] = useState("");
  const [batteryLevel, setBatteryLevel] = useState(88);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    // Update top bar clock
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);

    // Responsive: check if screen is already phone-sized
    const checkSize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    checkSize();
    window.addEventListener("resize", checkSize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", checkSize);
    };
  }, []);

  if (isMobileScreen) {
    return (
      <div id="wehive-app-root" className="w-full h-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
        {/* Safe Area Status Bar with WeHive Branding */}
        <div className="bg-blue-950 text-white px-5 pt-3 pb-2.5 flex justify-between items-center select-none shrink-0 z-50">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center font-black text-white text-xs shadow-md">
              W
            </div>
            <span className="text-sm font-black tracking-wider text-blue-100 font-mono">WEHIVE</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-200 font-medium">
            <span>{currentTime}</span>
            <span className="opacity-40">|</span>
            <div className="flex items-center gap-1">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-radial from-slate-900 to-slate-950 p-6 flex flex-col justify-center items-center overflow-auto selection:bg-red-600 selection:text-white">
      {/* Platform Control Center */}
      <div className="mb-6 flex items-center justify-between w-full max-w-[420px] bg-slate-800/80 backdrop-blur-md border border-slate-700/60 p-3 rounded-2xl shadow-xl z-20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-slate-300 text-xs font-semibold tracking-wide uppercase font-mono">WeHive Multi-OS Simulator</span>
        </div>
        <div className="flex gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setPlatform("ios")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
              platform === "ios"
                ? "bg-blue-900 text-white shadow-lg shadow-blue-900/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
             iOS View
          </button>
          <button
            onClick={() => setPlatform("android")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
              platform === "android"
                ? "bg-blue-900 text-white shadow-lg shadow-blue-900/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🤖 Android View
          </button>
        </div>
      </div>

      {/* Physical Mobile Device Mockup */}
      <div
        id="phone-frame-container"
        className={`relative transition-all duration-500 w-[395px] h-[812px] bg-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border-slate-800 select-none ${
          platform === "ios"
            ? "rounded-[55px] border-[12px] ring-12 ring-slate-900 ring-offset-1 ring-offset-slate-950"
            : "rounded-[42px] border-[10px] ring-8 ring-slate-800 ring-offset-1 ring-offset-slate-950"
        } flex flex-col overflow-hidden`}
      >
        {/* iOS Notch / Dynamic Island */}
        {platform === "ios" && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50 flex items-center justify-center border border-slate-900/50 shadow-inner select-none">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900/90 ml-2 border border-slate-950" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-950/80 mr-4 self-center" />
          </div>
        )}

        {/* Android Punch Hole Camera */}
        {platform === "android" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-slate-950 rounded-full z-50 flex items-center justify-center border border-slate-900">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-950/80" />
          </div>
        )}

        {/* Operating System Status Bar */}
        <div
          className={`shrink-0 h-11 px-6 flex justify-between items-end pb-1.5 text-xs font-semibold select-none z-40 transition-colors duration-300 ${
            platform === "ios"
              ? "bg-blue-950 text-white rounded-t-[43px]"
              : "bg-blue-950 text-white rounded-t-[32px]"
          }`}
        >
          <div className="flex items-center gap-1.5 leading-none">
            <div className="w-4 h-4 rounded bg-red-600 flex items-center justify-center font-black text-white text-[10px] shadow-sm">
              W
            </div>
            <span className="text-[10px] font-black tracking-wider text-blue-100 font-mono">WEHIVE</span>
          </div>
          <span className="text-[11px] leading-none select-none tracking-tight">{currentTime}</span>
          <div className="flex items-center gap-1.5 leading-none">
            <Signal className="w-3 h-3 text-slate-200" />
            <Wifi className="w-3.5 h-3.5 text-slate-200" />
            <div className="flex items-center gap-0.5 ml-0.5">
              <span className="text-[10px] font-medium leading-none">{batteryLevel}%</span>
              <Battery className="w-4 h-3.5 text-red-400 fill-red-400" />
            </div>
          </div>
        </div>

        {/* Simulated Mobile screen Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
          {children}
        </div>

        {/* iOS Home Indicator Bar */}
        {platform === "ios" && (
          <div className="absolute bottom-1 w-full flex justify-center pb-2 pt-1 bg-transparent pointer-events-none z-50">
            <div className="w-32 h-1 bg-slate-400/85 rounded-full" />
          </div>
        )}

        {/* Android Native Navigation Buttons */}
        {platform === "android" && (
          <div className="h-12 bg-blue-950 border-t border-blue-900 flex justify-around items-center px-8 z-40 select-none shrink-0 rounded-b-[32px]">
            {/* Back Button */}
            <button className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {/* Home Button */}
            <button className="text-slate-400 hover:text-white transition-colors">
              <div className="w-4 h-4 rounded-md border-2 border-slate-400 hover:border-white" />
            </button>
            {/* Recent Apps Button */}
            <button className="text-slate-400 hover:text-white transition-colors">
              <div className="w-3.5 h-3.5 rounded-sm bg-slate-400 hover:bg-white" />
            </button>
          </div>
        )}
      </div>

      {/* Simulation Helper Note */}
      <span className="mt-4 text-[11px] text-slate-500 font-mono text-center max-w-[395px]">
        Desktop mode centers the viewport in a mobile mockup frame. Resize browser under 768px for true full-screen mobile experience.
      </span>
    </div>
  );
}

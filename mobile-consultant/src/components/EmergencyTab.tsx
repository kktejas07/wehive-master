import React, { useState, useEffect } from "react";
import { 
  HeartHandshake, AlertOctagon, Phone, ShieldAlert, MapPin, 
  Clock, CheckCircle, FileText, Send, User, ChevronRight 
} from "lucide-react";

interface EmergencyTabProps {
  onTriggerNotification: (title: string, body: string, type?: any, actionTab?: string) => void;
  colorScheme: any;
}

export default function EmergencyTab({ onTriggerNotification, colorScheme }: EmergencyTabProps) {
  const [targetCity, setTargetCity] = useState("Munich");
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);

  // Health Card States
  const [policyNum, setPolicyNum] = useState("DE-SHI-88201-992");
  const [insurer, setInsurer] = useState("Techniker Krankenkasse (TK)");
  
  useEffect(() => {
    let timer: any = null;
    if (sosCountdown !== null && sosCountdown > 0) {
      timer = setTimeout(() => {
        setSosCountdown(sosCountdown - 1);
      }, 1000);
    } else if (sosCountdown === 0) {
      setSosCountdown(null);
      onTriggerNotification(
        "Emergency SOS Sent",
        `GPS Coordinates [48.1351° N, 11.5820° E] dispatched to your primary emergency contact.`
      );
    }
    return () => clearTimeout(timer);
  }, [sosCountdown, onTriggerNotification]);

  const triggerSos = () => {
    setSosCountdown(5);
  };

  const cancelSos = () => {
    setSosCountdown(null);
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 font-sans select-none" style={{ fontFamily: "system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* Header */}
      <div className="mb-6">
        <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider font-mono flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M18.25 8c0-1.25 1-2.25 2.25-2.25 1.24 0 2.25 1 2.25 2.25v1c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V8c0-.42-.34-.75-.75-.75 -.42 0-.75.33-.75.75v5.5c0 .19-.08.38-.22.53l-2 2c-.3.29-.77.29-1.07 0 -.3-.3-.3-.77 0-1.07l1.78-1.79V7.98ZM22 12.25c.41 0 .75.33.75.75v2.08c0 .46-.19.9-.52 1.23l-4.49 4.48v1.68c0 .41-.34.75-.75.75h-5c-.42 0-.75-.34-.75-.75v-6c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v5.25h3.5v-1.25c0-.2.07-.39.21-.54l4.7-4.71c.04-.05.07-.12.07-.18v-2.09c0-.42.33-.75.75-.75Z"/>
              <path d="M5.75 8c0-1.25-1.01-2.25-2.25-2.25 -1.25 0-2.25 1-2.25 2.25v7.08c0 .46.18.9.51 1.23l4.48 4.48v1.68c0 .41.33.75.75.75h5c.41 0 .75-.34.75-.75v-6c0-.42-.34-.75-.75-.75 -.42 0-.75.33-.75.75v5.25h-3.5v-1.25c0-.2-.08-.39-.22-.54l-4.71-4.71c-.05-.05-.08-.12-.08-.18V7.95c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v5.5c0 .19.07.38.21.53l2 2c.29.29.76.29 1.06 0 .29-.3.29-.77 0-1.07l-1.79-1.79V7.93Z"/>
            </g>
          </svg> Secure & Support
        </span>
        <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">Emergency Assist</h2>
      </div>

      {/* SOS Button Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm text-center space-y-4 mb-6">
        {sosCountdown !== null ? (
          <div className="space-y-3 py-2 animate-pulse">
            <div className="text-4xl font-black text-rose-600 font-mono">{sosCountdown}s</div>
            <div className="text-xs font-bold text-slate-800">Dispatching SOS in {sosCountdown} seconds...</div>
            <button
              onClick={cancelSos}
              className="px-6 h-9 rounded-full bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
            >
              Cancel SOS
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={triggerSos}
              className="h-20 w-20 rounded-full bg-rose-600 text-white inline-flex items-center justify-center shadow-lg shadow-rose-600/30 hover:bg-rose-700 transition cursor-pointer"
            >
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
                <g fill="currentColor" fillRule="evenodd">
                  <path d="M5 2.25c.41 0 .75.33.75.75v2c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V3c0-.42.33-.75.75-.75Z"/>
                  <path d="M5.5 11.25c.41 0 .75.33.75.75v8c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-8c0-.42.33-.75.75-.75Z"/>
                  <path d="M1.25 6c0-.97.78-1.75 1.75-1.75h5c.96 0 1.75.78 1.75 1.75v5c0 .96-.79 1.75-1.75 1.75H3c-.97 0-1.75-.79-1.75-1.75v-.5c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v.5c0 .13.11.25.25.25h5c.13 0 .25-.12.25-.25V6c0-.14-.12-.25-.25-.25H3c-.14 0-.25.11-.25.25v.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V6Z"/>
                  <path d="M8.25 6.5c0-.42.33-.75.75-.75h11c1.51 0 2.75 1.23 2.75 2.75 0 1.51-1.24 2.75-2.75 2.75H9c-.42 0-.75-.34-.75-.75v-4Zm1.5.75v2.5H20c.69 0 1.25-.56 1.25-1.25 0-.7-.56-1.25-1.25-1.25H9.75Z"/>
                  <path d="M2.25 20c0-.42.33-.75.75-.75h5c.41 0 .75.33.75.75 0 .41-.34.75-.75.75H3c-.42 0-.75-.34-.75-.75Z"/>
                </g>
              </svg>
            </button>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800">One-Tap Crisis SOS</h3>
              <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto mt-1 leading-normal">
                Pressing sends your exact GPS coordinates to your registered emergency contact and local coordinator.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Embassy Hotline Finder */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <svg className="w-4.5 h-4.5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M12 2.75c-2.59 0-4.93 1.06-6.61 2.77 -.29.29-.77.3-1.07.01 -.3-.29-.31-.77-.02-1.07 1.95-1.99 4.66-3.23 7.67-3.23 5.93 0 10.75 4.81 10.75 10.75 0 5.93-4.82 10.75-10.75 10.75 -5.94 0-10.75-4.82-10.75-10.75 0-.74.07-1.46.21-2.15 .08-.41.47-.67.88-.59 .4.08.66.47.58.88 -.13.59-.19 1.21-.19 1.85 0 5.1 4.14 9.25 9.25 9.25 5.1 0 9.25-4.15 9.25-9.25 0-5.11-4.15-9.25-9.25-9.25Z"/>
              <path d="M1.75 15c0-.42.33-.75.75-.75h5c1.24 0 2.25 1 2.25 2.25 0 .41.33.75.75.75H12c1.51 0 2.75 1.23 2.75 2.75v1.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V20c0-.7-.56-1.25-1.25-1.25h-1.5c-1.25 0-2.25-1.01-2.25-2.25 0-.42-.34-.75-.75-.75h-5c-.42 0-.75-.34-.75-.75Z"/>
            </g>
          </svg>
          <h3 className="text-xs font-extrabold text-slate-800">Embassy & Consulate Directory</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target City</label>
            <input
              type="text"
              value={targetCity}
              onChange={(e) => setTargetCity(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-800">Indian Consulate in {targetCity}</span>
              <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono">Open</span>
            </div>
            
            <div className="space-y-1.5 text-[10.5px] text-slate-600">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href="tel:+4989210449" className="font-bold hover:underline">+49 89 2104 490</a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>Widenmayerstraße 15, 80538 Munich, Germany</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insurance Card Wallet */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <svg className="w-4.5 h-4.5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M18.25 8c0-1.25 1-2.25 2.25-2.25 1.24 0 2.25 1 2.25 2.25v1c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V8c0-.42-.34-.75-.75-.75 -.42 0-.75.33-.75.75v5.5c0 .19-.08.38-.22.53l-2 2c-.3.29-.77.29-1.07 0 -.3.3-.3-.77 0-1.07l1.78-1.79V7.98ZM22 12.25c.41 0 .75.33.75.75v2.08c0 .46-.19.9-.52 1.23l-4.49 4.48v1.68c0 .41-.34.75-.75.75h-5c-.42 0-.75-.34-.75-.75v-6c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v5.25h3.5v-1.25c0-.2.07-.39.21-.54l4.7-4.71c.04-.05.07-.12.07-.18v-2.09c0-.42.33-.75.75-.75Z"/>
              <path d="M5.75 8c0-1.25-1.01-2.25-2.25-2.25 -1.25 0-2.25 1-2.25 2.25v7.08c0 .46.18.9.51 1.23l4.48 4.48v1.68c0 .41.33.75.75.75h5c.41 0 .75-.34.75-.75v-6c0-.42-.34-.75-.75-.75 -.42 0-.75.33-.75.75v5.25h-3.5v-1.25c0-.2-.08-.39-.22-.54l-4.71-4.71c-.05-.05-.08-.12-.08-.18V7.95c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v5.5c0 .19.07.38.21.53l2 2c.29.29.76.29 1.06 0 .29-.3.29-.77 0-1.07l-1.79-1.79V7.93Z"/>
            </g>
          </svg>
          <h3 className="text-xs font-extrabold text-slate-800">Health Insurance Card Wallet</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Insurance Provider</label>
            <input
              type="text"
              value={insurer}
              onChange={(e) => setInsurer(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Insurance Policy Number</label>
            <input
              type="text"
              value={policyNum}
              onChange={(e) => setPolicyNum(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

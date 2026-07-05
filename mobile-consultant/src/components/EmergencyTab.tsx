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
    fetch("/api/emergency/insurance").then(r => r.json()).then(data => {
      if (data.policy) setPolicyNum(data.policy);
      if (data.insurer) setInsurer(data.insurer);
    }).catch(() => {});
  }, []);
  
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
          <HeartHandshake className="w-3 h-3" /> Secure & Support
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
              <HeartHandshake className="w-10 h-10 text-white" />
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
          <ShieldAlert className="w-4.5 h-4.5 text-blue-900" />
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
          <HeartHandshake className="w-4.5 h-4.5 text-blue-900" />
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

import React, { useState } from "react";
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, Info, Bell, 
  ArrowRight, BookOpen, Star, RefreshCw 
} from "lucide-react";

interface CalendarTabProps {
  onTriggerNotification: (title: string, body: string, type?: any, actionTab?: string) => void;
  colorScheme: any;
}

const DEADLINES = [
  { id: "dl-1", country: "Canada 🇨🇦", school: "University of Toronto", date: "August 15, 2026", details: "Fall 2026 Master's Admissions" },
  { id: "dl-2", country: "Germany 🇩🇪", school: "TU Munich (TUM)", date: "July 15, 2026", details: "Winter Semester Admissions" },
  { id: "dl-3", country: "United Kingdom 🇬🇧", school: "Imperial College", date: "September 1, 2026", details: "Fall 2026 Admission Intake" },
];

export default function CalendarTab({ onTriggerNotification, colorScheme }: CalendarTabProps) {
  // Test Prep Countdown
  const [ieltsDate, setIeltsDate] = useState("2026-07-20");
  
  // Notification preference toggles
  const [notify30, setNotify30] = useState(true);
  const [notify15, setNotify15] = useState(true);
  const [notify7, setNotify7] = useState(false);

  const calculateDaysLeft = (targetDateStr: string) => {
    try {
      const target = new Date(targetDateStr);
      const diff = target.getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 ? `${days} Days Left` : "Passed";
    } catch {
      return "N/A";
    }
  };

  const handleUpdateIelts = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerNotification(
      "IELTS Date Updated",
      `Test countdown set for ${ieltsDate}. We will send you mock prep reminders.`
    );
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 font-sans select-none" style={{ fontFamily: "system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* Header */}
      <div className="mb-6">
        <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider font-mono flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M1.25 6c0-1.52 1.23-2.75 2.75-2.75h16c1.51 0 2.75 1.23 2.75 2.75v4c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V6c0-.7-.56-1.25-1.25-1.25H4c-.7 0-1.25.55-1.25 1.25v14.5c0 .69.55 1.25 1.25 1.25h16c.69 0 1.25-.56 1.25-1.25V14c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v6.5c0 1.51-1.24 2.75-2.75 2.75H4c-1.52 0-2.75-1.24-2.75-2.75V6Z"/>
              <path d="M7.25 15c0-.97.78-1.75 1.75-1.75h6c.96 0 1.75.78 1.75 1.75v4c0 .96-.79 1.75-1.75 1.75H9c-.97 0-1.75-.79-1.75-1.75v-4ZM9 14.75c-.14 0-.25.11-.25.25v4c0 .13.11.25.25.25h6c.13 0 .25-.12.25-.25v-4c0-.14-.12-.25-.25-.25H9Z"/>
              <path d="M1.25 6c0-1.52 1.23-2.75 2.75-2.75h16c1.51 0 2.75 1.23 2.75 2.75v3c0 .41-.34.75-.75.75H2c-.42 0-.75-.34-.75-.75V6ZM4 4.75c-.7 0-1.25.55-1.25 1.25v2.25h18.5V6c0-.7-.56-1.25-1.25-1.25H4Z"/>
              <path d="M5 1.25c.41 0 .75.33.75.75v3.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V2c0-.42.33-.75.75-.75Z"/>
              <path d="M12 1.25c.41 0 .75.33.75.75v3.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V2c0-.42.33-.75.75-.75Z"/>
              <path d="M19 1.25c.41 0 .75.33.75.75v3.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V2c0-.42.33-.75.75-.75Z"/>
            </g>
          </svg> Admission Calendar
        </span>
        <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">Intake & Deadlines</h2>
      </div>

      {/* Global Intake Deadlines */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <svg className="w-4.5 h-4.5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M1.25 6c0-1.52 1.23-2.75 2.75-2.75h16c1.51 0 2.75 1.23 2.75 2.75v4c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V6c0-.7-.56-1.25-1.25-1.25H4c-.7 0-1.25.55-1.25 1.25v14.5c0 .69.55 1.25 1.25 1.25h16c.69 0 1.25-.56 1.25-1.25V14c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v6.5c0 1.51-1.24 2.75-2.75 2.75H4c-1.52 0-2.75-1.24-2.75-2.75V6Z"/>
              <path d="M7.25 15c0-.97.78-1.75 1.75-1.75h6c.96 0 1.75.78 1.75 1.75v4c0 .96-.79 1.75-1.75 1.75H9c-.97 0-1.75-.79-1.75-1.75v-4ZM9 14.75c-.14 0-.25.11-.25.25v4c0 .13.11.25.25.25h6c.13 0 .25-.12.25-.25v-4c0-.14-.12-.25-.25-.25H9Z"/>
              <path d="M1.25 6c0-1.52 1.23-2.75 2.75-2.75h16c1.51 0 2.75 1.23 2.75 2.75v3c0 .41-.34.75-.75.75H2c-.42 0-.75-.34-.75-.75V6ZM4 4.75c-.7 0-1.25.55-1.25 1.25v2.25h18.5V6c0-.7-.56-1.25-1.25-1.25H4Z"/>
              <path d="M5 1.25c.41 0 .75.33.75.75v3.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V2c0-.42.33-.75.75-.75Z"/>
              <path d="M12 1.25c.41 0 .75.33.75.75v3.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V2c0-.42.33-.75.75-.75Z"/>
              <path d="M19 1.25c.41 0 .75.33.75.75v3.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V2c0-.42.33-.75.75-.75Z"/>
            </g>
          </svg>
          <h3 className="text-xs font-extrabold text-slate-800">Target University Deadlines</h3>
        </div>

        <div className="space-y-3">
          {DEADLINES.map((dl) => (
            <div key={dl.id} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl flex justify-between items-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{dl.country}</div>
                <h4 className="text-xs font-extrabold text-slate-800 mt-0.5">{dl.school}</h4>
                <p className="text-[9.5px] text-slate-500">{dl.details} • {dl.date}</p>
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-mono shrink-0">
                {calculateDaysLeft(dl.date)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Test Prep Countdown Tracker */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Clock className="w-4.5 h-4.5 text-blue-900" />
          <h3 className="text-xs font-extrabold text-slate-800">Test Prep Tracker</h3>
        </div>

        <form onSubmit={handleUpdateIelts} className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">IELTS / GRE Booking Date</label>
            <div className="flex gap-2">
              <input
                required
                type="date"
                value={ieltsDate}
                onChange={(e) => setIeltsDate(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:border-slate-400 focus:outline-none"
              />
              <button 
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold px-4 h-10 hover:bg-slate-800 transition"
              >
                Track
              </button>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex justify-between items-center">
            <div>
              <div className="text-[9px] font-bold text-emerald-900/60 uppercase tracking-wider">Days to Test</div>
              <div className="text-md font-black text-emerald-950 mt-0.5">
                {calculateDaysLeft(ieltsDate)}
              </div>
            </div>
            <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
          </div>
        </form>
      </div>

      {/* Deadline reminders config toggles */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Bell className="w-4.5 h-4.5 text-blue-900" />
          <h3 className="text-xs font-extrabold text-slate-800">Intake Reminders Config</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">30 days before deadline</span>
            <input
              type="checkbox"
              checked={notify30}
              onChange={(e) => setNotify30(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">15 days before deadline</span>
            <input
              type="checkbox"
              checked={notify15}
              onChange={(e) => setNotify15(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">7 days before deadline</span>
            <input
              type="checkbox"
              checked={notify7}
              onChange={(e) => setNotify7(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

import React, { useState } from "react";
import { 
  Users, Gift, Landmark, CreditCard, ChevronRight, CheckCircle2, 
  Send, RefreshCw, Sparkles, UserPlus, FileText, ArrowUpRight 
} from "lucide-react";

interface AgentTabProps {
  onTriggerNotification: (title: string, body: string, type?: any, actionTab?: string) => void;
  colorScheme: any;
}

export default function AgentTab({ onTriggerNotification, colorScheme }: AgentTabProps) {
  const [leads, setLeads] = useState([
    { id: "lead-1", name: "Aman Gupta", email: "aman@example.com", country: "Canada", status: "applied" },
    { id: "lead-2", name: "Neha Sen", email: "neha@example.com", country: "Germany", status: "completed" },
  ]);

  // Lead Form States
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadCountry, setNewLeadCountry] = useState("Canada");
  const [addingLead, setAddingLead] = useState(false);

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    setAddingLead(true);
    setTimeout(() => {
      const newLead = {
        id: `lead-${Date.now()}`,
        name: newLeadName,
        email: newLeadEmail,
        country: newLeadCountry,
        status: "applied",
      };
      setLeads(prev => [newLead, ...prev]);
      setNewLeadName("");
      setNewLeadEmail("");
      setAddingLead(false);
      onTriggerNotification(
        "Student Lead Added",
        `"${newLead.name}" has been registered under your agent profile. Commission tracking active.`
      );
    }, 1200);
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 font-sans select-none" style={{ fontFamily: "system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* Header */}
      <div className="mb-6">
        <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider font-mono flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M5.25 19c0-2.63 2.12-4.75 4.75-4.75h4c2.62 0 4.75 2.12 4.75 4.75v3c0 .41-.34.75-.75.75h-7c-.42 0-.75-.34-.75-.75 0-.42.33-.75.75-.75h6.25V19c0-1.8-1.46-3.25-3.25-3.25h-4c-1.8 0-3.25 1.45-3.25 3.25v2.25H7c.41 0 .75.33.75.75 0 .41-.34.75-.75.75H6c-.42 0-.75-.34-.75-.75v-3Z"/>
              <path d="M7.75 8c0-2.08 1.67-3.75 3.75-3.75h1c2.07 0 3.75 1.67 3.75 3.75v2c0 2.07-1.68 3.75-3.75 3.75h-1c-2.08 0-3.75-1.68-3.75-3.75V8Zm3.75-2.25c-1.25 0-2.25 1-2.25 2.25v2c0 1.24 1 2.25 2.25 2.25h1c1.24 0 2.25-1.01 2.25-2.25V8c0-1.25-1.01-2.25-2.25-2.25h-1Z"/>
              <path d="M14.75 8c0-.42.33-.75.75-.75H18c.41 0 .75.33.75.75v3c0 .41-.34.75-.75.75h-2.5c-.42 0-.75-.34-.75-.75V8Zm1.5.75v1.5h1v-1.5h-1Z"/>
              <path d="M5.25 8c0-.42.33-.75.75-.75h2.5c.41 0 .75.33.75.75v3c0 .41-.34.75-.75.75H6c-.42 0-.75-.34-.75-.75V8Zm1.5.75v1.5h1v-1.5h-1Z"/>
              <path d="M5.25 7c0-3.18 2.57-5.75 5.75-5.75h2c3.17 0 5.75 2.57 5.75 5.75v3c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V7c0-2.35-1.91-4.25-4.25-4.25h-2c-2.35 0-4.25 1.9-4.25 4.25v3c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V7Z"/>
              <path d="M12 14.25c.41 0 .75.33.75.75v7c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-7c0-.42.33-.75.75-.75Z"/>
            </g>
          </svg> Agent Hub
        </span>
        <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">Sub-Agent Console</h2>
      </div>

      {/* Referral & Rewards Dashboard */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <svg className="w-4.5 h-4.5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M17.5 2.75c-2.08 0-3.75 1.67-3.75 3.75 0 2.07 1.67 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-2.08-1.68-3.75-3.75-3.75ZM12.25 6.5c0-2.9 2.35-5.25 5.25-5.25 2.89 0 5.25 2.35 5.25 5.25 0 2.89-2.36 5.25-5.25 5.25 -2.9 0-5.25-2.36-5.25-5.25Z"/>
              <path d="M6.5 13.75c-2.08 0-3.75 1.67-3.75 3.75 0 2.07 1.67 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-.42.33-.75.75-.75 .41 0 .75.33.75.75 0 2.89-2.36 5.25-5.25 5.25 -2.9 0-5.25-2.36-5.25-5.25 0-2.9 2.35-5.25 5.25-5.25 1.07 0 2.08.32 2.91.88 .34.23.43.69.2 1.04 -.24.34-.7.43-1.05.2 -.6-.4-1.32-.64-2.09-.64Z"/>
            </g>
          </svg>
          <h3 className="text-xs font-extrabold text-slate-800">Referral Commissions</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Commission Earned</div>
            <div className="text-md font-black text-slate-800 mt-0.5">₹15,500</div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Pending Approval</div>
            <div className="text-md font-black text-slate-800 mt-0.5">₹5,000</div>
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex justify-between items-center text-xs">
          <div>
            <div className="font-bold text-blue-950">Next Payout Scheduled</div>
            <p className="text-[10px] text-blue-900/60 mt-0.5">Scheduled direct transfer: July 10, 2026</p>
          </div>
          <CreditCard className="w-4.5 h-4.5 text-blue-700 shrink-0" />
        </div>
      </div>

      {/* Lead Board Registration */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <svg className="w-4.5 h-4.5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M5.25 19c0-2.63 2.12-4.75 4.75-4.75h4c2.62 0 4.75 2.12 4.75 4.75v3c0 .41-.34.75-.75.75h-7c-.42 0-.75-.34-.75-.75 0-.42.33-.75.75-.75h6.25V19c0-1.8-1.46-3.25-3.25-3.25h-4c-1.8 0-3.25 1.45-3.25 3.25v2.25H7c.41 0 .75.33.75.75 0 .41-.34.75-.75.75H6c-.42 0-.75-.34-.75-.75v-3Z"/>
              <path d="M7.75 8c0-2.08 1.67-3.75 3.75-3.75h1c2.07 0 3.75 1.67 3.75 3.75v2c0 2.07-1.68 3.75-3.75 3.75h-1c-2.08 0-3.75-1.68-3.75-3.75V8Zm3.75-2.25c-1.25 0-2.25 1-2.25 2.25v2c0 1.24 1 2.25 2.25 2.25h1c1.24 0 2.25-1.01 2.25-2.25V8c0-1.25-1.01-2.25-2.25-2.25h-1Z"/>
              <path d="M14.75 8c0-.42.33-.75.75-.75H18c.41 0 .75.33.75.75v3c0 .41-.34.75-.75.75h-2.5c-.42 0-.75-.34-.75-.75V8Zm1.5.75v1.5h1v-1.5h-1Z"/>
              <path d="M5.25 8c0-.42.33-.75.75-.75h2.5c.41 0 .75.33.75.75v3c0 .41-.34.75-.75.75H6c-.42 0-.75-.34-.75-.75V8Zm1.5.75v1.5h1v-1.5h-1Z"/>
              <path d="M5.25 7c0-3.18 2.57-5.75 5.75-5.75h2c3.17 0 5.75 2.57 5.75 5.75v3c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V7c0-2.35-1.91-4.25-4.25-4.25h-2c-2.35 0-4.25 1.9-4.25 4.25v3c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V7Z"/>
              <path d="M12 14.25c.41 0 .75.33.75.75v7c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-7c0-.42.33-.75.75-.75Z"/>
            </g>
          </svg>
          <h3 className="text-xs font-extrabold text-slate-800">Register New Student Lead</h3>
        </div>

        <form onSubmit={handleAddLead} className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Aman Gupta"
              value={newLeadName}
              onChange={(e) => setNewLeadName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Email</label>
            <input
              required
              type="email"
              placeholder="e.g. student@example.com"
              value={newLeadEmail}
              onChange={(e) => setNewLeadEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Study Destination</label>
            <select
              value={newLeadCountry}
              onChange={(e) => setNewLeadCountry(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:border-slate-400 focus:outline-none"
            >
              <option value="Canada">Canada</option>
              <option value="Germany">Germany</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United States">United States</option>
              <option value="Australia">Australia</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={addingLead || !newLeadName || !newLeadEmail}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--accent))] text-white text-xs font-bold h-10 hover:opacity-90 disabled:opacity-50 transition"
          >
            {addingLead ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Submit Student Registration</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Active Leads List */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4">
        <h3 className="text-xs font-extrabold text-slate-800 pb-2 border-b border-slate-100">My Students Leads</h3>
        <div className="space-y-2">
          {leads.map((l) => (
            <div key={l.id} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl flex justify-between items-center text-xs">
              <div>
                <div className="font-bold text-slate-800">{l.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{l.email} • {l.country}</div>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                l.status === "completed" 
                  ? "text-emerald-600 bg-emerald-50 border border-emerald-100" 
                  : "text-blue-600 bg-blue-50 border border-blue-100"
              }`}>
                {l.status}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

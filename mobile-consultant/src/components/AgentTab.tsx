import React, { useState, useEffect } from "react";
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
  const [commissions, setCommissions] = useState({ earned: 15500, pending: 5000, nextPayout: "July 10, 2026" });

  // Lead Form States
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadCountry, setNewLeadCountry] = useState("Canada");
  const [addingLead, setAddingLead] = useState(false);

  useEffect(() => {
    fetch("/api/leads").then(r => r.json()).then(data => {
      if (data.leads) setLeads(data.leads);
    }).catch(() => {});
    fetch("/api/agent/commissions").then(r => r.json()).then(data => {
      if (data.earned) setCommissions({ earned: data.earned, pending: data.pending, nextPayout: data.nextPayout });
    }).catch(() => {});
  }, []);

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    setAddingLead(true);
    fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newLeadName, email: newLeadEmail, country: newLeadCountry }) })
      .then(r => r.json())
      .then(data => {
        if (data.lead) {
          setLeads(prev => [data.lead, ...prev]);
        }
        setNewLeadName("");
        setNewLeadEmail("");
        setAddingLead(false);
        onTriggerNotification("Student Lead Added", data.message || `"${newLeadName}" has been registered.`);
      })
      .catch(() => {
        const newLead = { id: `lead-${Date.now()}`, name: newLeadName, email: newLeadEmail, country: newLeadCountry, status: "new" };
        setLeads(prev => [newLead, ...prev]);
        setNewLeadName("");
        setNewLeadEmail("");
        setAddingLead(false);
        onTriggerNotification("Student Lead Added", `"${newLead.name}" has been registered.`);
      });
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 font-sans select-none" style={{ fontFamily: "system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* Header */}
      <div className="mb-6">
        <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider font-mono flex items-center gap-1">
          <Users className="w-3 h-3" /> Agent Hub
        </span>
        <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">Sub-Agent Console</h2>
      </div>

      {/* Referral & Rewards Dashboard */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Coins className="w-4.5 h-4.5 text-blue-900" />
          <h3 className="text-xs font-extrabold text-slate-800">Referral Commissions</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Commission Earned</div>
            <div className="text-md font-black text-slate-800 mt-0.5">₹{commissions.earned.toLocaleString()}</div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Pending Approval</div>
            <div className="text-md font-black text-slate-800 mt-0.5">₹{commissions.pending.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex justify-between items-center text-xs">
          <div>
            <div className="font-bold text-blue-950">Next Payout Scheduled</div>
            <p className="text-[10px] text-blue-900/60 mt-0.5">Scheduled direct transfer: {commissions.nextPayout}</p>
          </div>
          <CreditCard className="w-4.5 h-4.5 text-blue-700 shrink-0" />
        </div>
      </div>

      {/* Lead Board Registration */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Users className="w-4.5 h-4.5 text-blue-900" />
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

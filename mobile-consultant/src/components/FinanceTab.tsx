import React, { useState } from "react";
import { 
  Coins, Wallet, Landmark, ArrowRight, CheckCircle2, AlertCircle, 
  HelpCircle, Calculator, Building, ArrowUpRight, TrendingUp, Info 
} from "lucide-react";

interface FinanceTabProps {
  onTriggerNotification: (title: string, body: string, type?: any, actionTab?: string) => void;
  colorScheme: any;
}

const COST_DATA = {
  ca: { country: "Canada", currency: "CAD", rent: 850, food: 300, transport: 120, insurance: 80, gic: "$20,635 CAD" },
  de: { country: "Germany", currency: "EUR", rent: 450, food: 250, transport: 80, insurance: 110, gic: "€11,208 EUR" },
  us: { country: "United States", currency: "USD", rent: 1100, food: 350, transport: 150, insurance: 180, gic: "N/A" },
  gb: { country: "United Kingdom", currency: "GBP", rent: 750, food: 280, transport: 100, insurance: 70, gic: "N/A" },
  au: { country: "Australia", currency: "AUD", rent: 950, food: 320, transport: 130, insurance: 90, gic: "N/A" },
};

export default function FinanceTab({ onTriggerNotification, colorScheme }: FinanceTabProps) {
  const [selectedCountry, setSelectedCountry] = useState<keyof typeof COST_DATA>("de");
  const [customRent, setCustomRent] = useState<string>("");
  
  // Loan application states
  const [loanAmount, setLoanAmount] = useState("₹15,00,000");
  const [loanStatus, setLoanStatus] = useState<"not_applied" | "submitting" | "applied">("not_applied");

  const currentCost = COST_DATA[selectedCountry];
  const activeRent = customRent ? parseFloat(customRent) || 0 : currentCost.rent;
  const totalMonthlyCost = activeRent + currentCost.food + currentCost.transport + currentCost.insurance;

  const handleApplyLoan = (e: React.FormEvent) => {
    e.preventDefault();
    setLoanStatus("submitting");
    setTimeout(() => {
      setLoanStatus("applied");
      onTriggerNotification(
        "Loan Application Received",
        `Your request for ${loanAmount} has been forwarded to HDFC & Auxilo for priority processing.`
      );
    }, 1500);
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 font-sans select-none" style={{ fontFamily: "system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* Header */}
      <div className="mb-6">
        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider font-mono flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M17.5 2.75c-2.08 0-3.75 1.67-3.75 3.75 0 2.07 1.67 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-2.08-1.68-3.75-3.75-3.75ZM12.25 6.5c0-2.9 2.35-5.25 5.25-5.25 2.89 0 5.25 2.35 5.25 5.25 0 2.89-2.36 5.25-5.25 5.25 -2.9 0-5.25-2.36-5.25-5.25Z"/>
              <path d="M6.5 13.75c-2.08 0-3.75 1.67-3.75 3.75 0 2.07 1.67 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-.42.33-.75.75-.75 .41 0 .75.33.75.75 0 2.89-2.36 5.25-5.25 5.25 -2.9 0-5.25-2.36-5.25-5.25 0-2.9 2.35-5.25 5.25-5.25 1.07 0 2.08.32 2.91.88 .34.23.43.69.2 1.04 -.24.34-.7.43-1.05.2 -.6-.4-1.32-.64-2.09-.64Z"/>
            </g>
          </svg> Financial Hub
        </span>
        <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">Finance & Budgets</h2>
      </div>

      {/* Cost-of-Living Calculator Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <svg className="w-4.5 h-4.5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M17.5 2.75c-2.08 0-3.75 1.67-3.75 3.75 0 2.07 1.67 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-2.08-1.68-3.75-3.75-3.75ZM12.25 6.5c0-2.9 2.35-5.25 5.25-5.25 2.89 0 5.25 2.35 5.25 5.25 0 2.89-2.36 5.25-5.25 5.25 -2.9 0-5.25-2.36-5.25-5.25Z"/>
              <path d="M6.5 13.75c-2.08 0-3.75 1.67-3.75 3.75 0 2.07 1.67 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-.42.33-.75.75-.75 .41 0 .75.33.75.75 0 2.89-2.36 5.25-5.25 5.25 -2.9 0-5.25-2.36-5.25-5.25 0-2.9 2.35-5.25 5.25-5.25 1.07 0 2.08.32 2.91.88 .34.23.43.69.2 1.04 -.24.34-.7.43-1.05.2 -.6-.4-1.32-.64-2.09-.64Z"/>
            </g>
          </svg>
          <h3 className="text-xs font-extrabold text-slate-800">Cost-of-Living Calculator</h3>
        </div>

        <div className="space-y-3">
          {/* Country Selection */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Country</label>
            <div className="grid grid-cols-5 gap-1.5">
              {Object.keys(COST_DATA).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setSelectedCountry(k as any);
                    setCustomRent("");
                  }}
                  className={`py-1.5 rounded-lg text-[10.5px] font-bold border transition ${
                    selectedCountry === k
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  {COST_DATA[k as keyof typeof COST_DATA].country.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Rent / Lodging</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-sm font-bold text-slate-800">{currentCost.currency}</span>
                <input
                  type="number"
                  placeholder={currentCost.rent.toString()}
                  value={customRent}
                  onChange={(e) => setCustomRent(e.target.value)}
                  className="w-16 bg-transparent font-black text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Food / Groceries</div>
              <div className="mt-1 text-sm font-bold text-slate-800">
                {currentCost.currency} {currentCost.food}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Local Transit</div>
              <div className="mt-1 text-sm font-bold text-slate-800">
                {currentCost.currency} {currentCost.transport}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Health Insurance</div>
              <div className="mt-1 text-sm font-bold text-slate-800">
                {currentCost.currency} {currentCost.insurance}
              </div>
            </div>
          </div>

          {/* Sum Banner */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex justify-between items-center mt-2">
            <div>
              <div className="text-[10px] font-bold text-blue-900/60 uppercase tracking-wider">Estimated Monthly Budget</div>
              <div className="text-lg font-black text-blue-950 mt-0.5">
                {currentCost.currency} {totalMonthlyCost.toLocaleString()}
              </div>
            </div>
            <Info className="w-4 h-4 text-blue-700 shrink-0" />
          </div>
        </div>
      </div>

      {/* GIC / Block Account Setup Progress */}
      {currentCost.gic !== "N/A" && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <svg className="w-4.5 h-4.5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
              <g fill="currentColor" fillRule="evenodd">
                <path d="M18 7.25c-.42 0-.75.33-.75.75v11c0 .41.33.75.75.75h3c.41 0 .75-.34.75-.75V8c0-.42-.34-.75-.75-.75h-3Z"/>
                <path d="M10.5 7.25c-.42 0-.75.33-.75.75v11c0 .41.33.75.75.75h3c.41 0 .75-.34.75-.75V8c0-.42-.34-.75-.75-.75h-3Z"/>
                <path d="M3 7.25c-.42 0-.75.33-.75.75v11c0 .41.33.75.75.75h3c.41 0 .75-.34.75-.75V8c0-.42-.34-.75-.75-.75H3Z"/>
                <path d="M12.24 1.29c-.17-.06-.34-.06-.5 0l-10 3.5c-.31.1-.51.38-.51.7v2.5c0 .41.33.75.75.75h20c.41 0 .75-.34.75-.75v-2.5c0-.32-.21-.61-.51-.71l-10-3.5Z"/>
                <path d="M2 18.25c-.42 0-.75.33-.75.75v3c0 .41.33.75.75.75h20c.41 0 .75-.34.75-.75v-3c0-.42-.34-.75-.75-.75H2Z"/>
              </g>
            </svg>
            <h3 className="text-xs font-extrabold text-slate-800">Mandatory Blocked Account</h3>
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Required Funds</div>
              <div className="text-md font-extrabold text-slate-800 mt-0.5">{currentCost.gic}</div>
            </div>
            <button 
              onClick={() => alert("Redirecting to Fintiba secure portal...")}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold px-3 h-8 hover:bg-slate-800 transition"
            >
              <span>Setup Portal</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Student Loan Application Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <svg className="w-4.5 h-4.5 text-blue-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M18 7.25c-.42 0-.75.33-.75.75v11c0 .41.33.75.75.75h3c.41 0 .75-.34.75-.75V8c0-.42-.34-.75-.75-.75h-3Z"/>
              <path d="M10.5 7.25c-.42 0-.75.33-.75.75v11c0 .41.33.75.75.75h3c.41 0 .75-.34.75-.75V8c0-.42-.34-.75-.75-.75h-3Z"/>
              <path d="M3 7.25c-.42 0-.75.33-.75.75v11c0 .41.33.75.75.75h3c.41 0 .75-.34.75-.75V8c0-.42-.34-.75-.75-.75H3Z"/>
              <path d="M12.24 1.29c-.17-.06-.34-.06-.5 0l-10 3.5c-.31.1-.51.38-.51.7v2.5c0 .41.33.75.75.75h20c.41 0 .75-.34.75-.75v-2.5c0-.32-.21-.61-.51-.71l-10-3.5Z"/>
              <path d="M2 18.25c-.42 0-.75.33-.75.75v3c0 .41.33.75.75.75h20c.41 0 .75-.34.75-.75v-3c0-.42-.34-.75-.75-.75H2Z"/>
            </g>
          </svg>
          <h3 className="text-xs font-extrabold text-slate-800">Education Loan Desk</h3>
        </div>

        {loanStatus === "applied" ? (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-xs font-extrabold text-emerald-800">Loan Application Submitted</h4>
            <p className="text-[10.5px] text-emerald-700 leading-relaxed">
              We have dispatched your portfolio to Auxiliary & HDFC bank managers. You will receive contact inside 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleApplyLoan} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Loan Amount</label>
              <input
                required
                type="text"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:border-slate-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loanStatus === "submitting"}
              className="w-full inline-flex items-center justify-center gap-1 bg-[hsl(var(--accent))] text-white text-xs font-bold h-10 rounded-xl hover:opacity-90 disabled:opacity-50 transition"
            >
              {loanStatus === "submitting" ? "Submitting..." : "Request Priority Application"}
            </button>
          </form>
        )}
      </div>

    </div>
  );
}

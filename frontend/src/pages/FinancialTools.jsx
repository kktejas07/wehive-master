import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calculator, TrendingUp, CreditCard, ChevronRight, Globe, Check, Bot, RefreshCw, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';
import { API } from '../context/AuthContext';

// ── Proof of Funds Estimator ──────────────────────────────────────────────────

const POF_SCHEMES = {
  Canada: { name: 'GIC (Guaranteed Investment Certificate)', amount: 10200, currency: 'CAD', notes: 'Required for first-year living expenses.' },
  USA: { name: 'I-20 Proof of Funds', amount: 35000, currency: 'USD', notes: 'Typical estimate for 1 year tuition + living. Varies by university.' },
  UK: { name: 'Tier 4 Maintenance Funds', amount: 12006, currency: 'GBP', notes: '£1,334/month for 9 months (London). £1,023/month outside London.' },
  Germany: { name: 'Blocked Account (Sperrkonto)', amount: 11208, currency: 'EUR', notes: '€934/month for 12 months.' },
};

function ProofOfFundsCalculator() {
  const [country, setCountry] = useState('Canada');
  const scheme = POF_SCHEMES[country];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(POF_SCHEMES).map(c => (
          <button key={c} onClick={() => setCountry(c)}
            className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${country === c ? 'bg-[hsl(var(--accent))] text-white' : 'bg-white border border-black/10 text-[hsl(var(--blue-900))]/70 hover:bg-black/5'}`}>
            {c}
          </button>
        ))}
      </div>
      
      <div className="rounded-xl bg-white border border-black/10 p-5">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-1">{scheme.name}</div>
        <div className="text-[32px] font-extrabold text-[hsl(var(--blue-900))] mb-2">
          {scheme.amount.toLocaleString()} <span className="text-[16px] text-[hsl(var(--blue-900))]/50">{scheme.currency}</span>
        </div>
        <p className="text-[13px] text-[hsl(var(--blue-900))]/70 leading-relaxed">{scheme.notes}</p>
      </div>

      {country === 'Canada' && (
        <div className="space-y-2 mt-6">
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-2">Popular GIC Banks (Estimated Rates)</div>
          {[
            { name: 'CIBC', rate: 4.15, fee: 150 },
            { name: 'ICICI Bank Canada', rate: 4.50, fee: 0 },
            { name: 'SBI Canada', rate: 4.30, fee: 50 },
          ].map(b => (
             <div key={b.name} className="flex items-center justify-between gap-4 rounded-xl bg-[hsl(var(--soft-bg))] border border-black/5 px-4 py-3">
               <div>
                 <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{b.name}</div>
                 <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55">{b.rate}% p.a. · {b.fee === 0 ? 'No fee' : `$${b.fee} fee`}</div>
               </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Live Currency Converter ───────────────────────────────────────────────────

function LiveCurrencyConverter() {
  const [amount, setAmount] = useState(1000);
  const [base, setBase] = useState('USD');
  const [target, setTarget] = useState('INR');
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRate = async () => {
    if (base === target) return setRate(1);
    setLoading(true);
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${base}&to=${target}`);
      const data = await res.json();
      setRate(data.rates[target]);
    } catch (e) {
      console.error("Exchange API Error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRate();
  }, [amount, base, target]); // eslint-disable-line react-hooks/exhaustive-deps

  const currencies = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'INR'];

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-[hsl(var(--blue-900))]/60 mb-2">Live rates provided by European Central Bank.</p>
      
      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
        <div className="space-y-3">
          <select value={base} onChange={e => setBase(e.target.value)} className="w-full h-11 rounded-xl bg-white border border-black/10 px-4 text-[14px] font-bold">
            {currencies.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="number" value={amount} onChange={e => setAmount(+e.target.value)} className="w-full h-11 rounded-xl bg-white border border-black/10 px-4 text-[15px] font-bold text-right outline-none" />
        </div>
        
        <button onClick={fetchRate} className="w-10 h-10 rounded-full bg-[hsl(var(--soft-bg))] flex items-center justify-center hover:bg-black/5 transition">
          <RefreshCw className={`w-4 h-4 text-[hsl(var(--blue-900))]/50 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <div className="space-y-3">
          <select value={target} onChange={e => setTarget(e.target.value)} className="w-full h-11 rounded-xl bg-[hsl(var(--soft-bg))] border border-black/5 px-4 text-[14px] font-bold">
            {currencies.map(c => <option key={c}>{c}</option>)}
          </select>
          <div className="w-full h-11 rounded-xl bg-[hsl(var(--soft-bg))] border border-black/5 px-4 flex items-center justify-end text-[15px] font-bold text-[hsl(var(--blue-900))]">
            {rate ? rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Financial Advisor ──────────────────────────────────────────────────────

function AIFinancialAdvisor() {
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMsg = query;
    setChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuery('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/financials/insights`, { query: userMsg });
      setChat(prev => [...prev, { role: 'ai', content: res.data.insight }]);
    } catch (e) {
      setChat(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't fetch an answer right now. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {chat.length === 0 && (
          <div className="text-center text-[hsl(var(--blue-900))]/50 text-[13px] mt-10">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Ask me anything about student loans, living expenses, or budgeting abroad!
          </div>
        )}
        {chat.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
              msg.role === 'user' ? 'bg-[hsl(var(--accent))] text-white' : 'bg-white border border-black/10 text-[hsl(var(--blue-900))]'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex justify-start">
             <div className="bg-white border border-black/10 rounded-2xl px-4 py-3 text-[13.5px] text-[hsl(var(--blue-900))]/50">Thinking...</div>
           </div>
        )}
      </div>
      
      <form onSubmit={handleAsk} className="relative">
        <input 
          type="text" 
          value={query} 
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask a financial question..."
          className="w-full h-12 rounded-xl bg-white border border-black/10 pl-4 pr-12 text-[14px] outline-none focus:border-[hsl(var(--accent))]/50"
        />
        <button type="submit" disabled={loading} className="absolute right-2 top-2 w-8 h-8 rounded-lg bg-[hsl(var(--accent))] text-white flex items-center justify-center disabled:opacity-50">
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}


// ── Budget Planner ────────────────────────────────────────────────────────────

const CITY_COSTS = [
  { city: 'Toronto', country: 'Canada', flag: '🇨🇦', rent: 1600, food: 400, transport: 150, misc: 200 },
  { city: 'Vancouver', country: 'Canada', flag: '🇨🇦', rent: 1800, food: 420, transport: 100, misc: 220 },
  { city: 'London', country: 'UK', flag: '🇬🇧', rent: 1400, food: 350, transport: 160, misc: 180 },
  { city: 'Manchester', country: 'UK', flag: '🇬🇧', rent: 900, food: 300, transport: 80, misc: 150 },
  { city: 'Sydney', country: 'Australia', flag: '🇦🇺', rent: 1500, food: 400, transport: 180, misc: 200 },
  { city: 'Melbourne', country: 'Australia', flag: '🇦🇺', rent: 1300, food: 380, transport: 160, misc: 180 },
  { city: 'Berlin', country: 'Germany', flag: '🇩🇪', rent: 900, food: 300, transport: 100, misc: 150 },
  { city: 'Munich', country: 'Germany', flag: '🇩🇪', rent: 1200, food: 320, transport: 100, misc: 160 },
  { city: 'Dublin', country: 'Ireland', flag: '🇮🇪', rent: 1500, food: 380, transport: 130, misc: 200 },
  { city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱', rent: 1300, food: 350, transport: 110, misc: 170 },
];

function BudgetPlanner() {
  const [selected, setSelected] = useState(['Toronto', 'London']);

  const toggle = (city) => {
    setSelected(prev =>
      prev.includes(city)
        ? prev.filter(c => c !== city)
        : prev.length < 3 ? [...prev, city] : prev
    );
  };

  const comparison = CITY_COSTS.filter(c => selected.includes(c.city));

  return (
    <div className="space-y-5">
      <div className="text-[12px] text-[hsl(var(--blue-900))]/55">Select up to 3 cities to compare monthly expenses (all amounts in USD ~):</div>
      <div className="flex flex-wrap gap-2">
        {CITY_COSTS.map(c => (
          <button key={c.city} onClick={() => toggle(c.city)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${selected.includes(c.city) ? 'bg-[hsl(var(--accent))] text-white' : 'bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/70 hover:bg-black/5'}`}>
                  {c.flag || <Globe className="w-4 h-4 inline" />} {c.city}
          </button>
        ))}
      </div>

      {comparison.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-black/10">
                <th className="text-left text-[hsl(var(--blue-900))]/55 font-bold text-[10.5px] uppercase tracking-[0.12em] py-2 pr-4">Expense</th>
                {comparison.map(c => (
                  <th key={c.city} className="text-right text-[hsl(var(--blue-900))] font-bold py-2 px-3">
            {c.flag || <Globe className="w-4 h-4 inline" />} {c.city}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[['Rent', 'rent'], ['Food', 'food'], ['Transport', 'transport'], ['Misc', 'misc']].map(([label, key]) => (
                <tr key={key} className="border-b border-black/5">
                  <td className="text-[hsl(var(--blue-900))]/70 py-2.5 pr-4 font-bold">{label}</td>
                  {comparison.map(c => <td key={c.city} className="text-right text-[hsl(var(--blue-900))]/80 py-2.5 px-3">${c[key]}</td>)}
                </tr>
              ))}
              <tr className="bg-[hsl(var(--soft-bg))]">
                <td className="text-[hsl(var(--blue-900))] font-bold py-3 pr-4 rounded-l-lg pl-2">Total / month</td>
                {comparison.map(c => (
                  <td key={c.city} className="text-right font-bold text-[15px] text-[hsl(var(--blue-900))] py-3 px-3 rounded-r-lg">
                    ${c.rent + c.food + c.transport + c.misc}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-[hsl(var(--blue-900))]/50 text-[11px] py-2 pr-4">Annual total</td>
                {comparison.map(c => (
                  <td key={c.city} className="text-right text-[hsl(var(--blue-900))]/55 text-[12px] py-2 px-3">
                    ${((c.rent + c.food + c.transport + c.misc) * 12).toLocaleString()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Loan Eligibility ──────────────────────────────────────────────────────────

const LOAN_SCHEMES = [
  { name: 'SBI Student Loan', bank: 'State Bank of India', max_inr: 7500000, rate: 9.65, collateral: false, notes: 'Up to ₹75L. No collateral for top-ranked universities.' },
  { name: 'Axis Bank Global Edge', bank: 'Axis Bank', max_inr: 7500000, rate: 10.5, collateral: false, notes: 'Covers GIC, tuition, and living costs.' },
  { name: 'HDFC Credila', bank: 'HDFC Credila', max_inr: 15000000, rate: 11.0, collateral: false, notes: 'No margin, covers 100% expenses. Co-borrower required.' },
  { name: 'Prodigy Finance', bank: 'Prodigy Finance (UK)', max_inr: null, rate: null, collateral: false, notes: 'No co-signer required. For select programs at top-50 universities worldwide.' },
  { name: 'MPOWER Financing', bank: 'MPOWER (US/Canada)', max_inr: null, rate: null, collateral: false, notes: 'For students in US/Canada. No collateral or co-signer.' },
];

function LoanEligibility() {
  const [gpa, setGpa] = useState('');
  const [admission, setAdmission] = useState(false);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55 mb-1.5">GPA / Percentage</span>
          <input type="text" value={gpa} onChange={e => setGpa(e.target.value)} placeholder="e.g. 3.5 or 75%"
            className="w-full h-11 rounded-xl bg-white border border-black/10 px-4 text-[14px] text-[hsl(var(--blue-900))] outline-none focus:border-[hsl(var(--blue-700))]/30 focus:shadow-sm" />
        </label>
        <label className="flex items-center gap-3 rounded-xl bg-white border border-black/10 px-4 py-3 cursor-pointer hover:border-black/20 transition">
          <input type="checkbox" checked={admission} onChange={e => setAdmission(e.target.checked)} className="accent-[hsl(var(--accent))] w-4 h-4" />
          <span className="text-[13.5px] font-bold text-[hsl(var(--blue-900))]">I have an admission letter</span>
        </label>
      </div>

      <div className="space-y-3">
        {LOAN_SCHEMES.map(l => (
          <div key={l.name} className={`rounded-xl border px-4 py-4 ${admission ? 'bg-emerald-50 border-emerald-200' : 'bg-[hsl(var(--soft-bg))] border-black/5'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{l.name}</div>
                <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55 mt-0.5">{l.bank}</div>
              </div>
              {l.max_inr && (
                <div className="text-right">
                  <div className="font-bold text-[13px] text-[hsl(var(--blue-900))]">₹{(l.max_inr / 100000).toFixed(0)}L max</div>
                  <div className="text-[11px] text-[hsl(var(--blue-900))]/55">{l.rate}% p.a.</div>
                </div>
              )}
            </div>
            <p className="mt-2 text-[12.5px] text-[hsl(var(--blue-900))]/70 leading-relaxed">{l.notes}</p>
            {admission && (
              <div className="mt-2 text-[11.5px] font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> You may be eligible — contact the bank with your admission letter
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page Shell ────────────────────────────────────────────────────────────────

const TOOLS = [
  { id: 'pof', label: 'Proof of Funds Estimator', Icon: TrendingUp, color: '#f59e0b', desc: 'Estimate required funds for visa across countries', Component: ProofOfFundsCalculator },
  { id: 'currency', label: 'Live Currency Exchange', Icon: Globe, color: '#3b82f6', desc: 'Real-time conversion for major global currencies', Component: LiveCurrencyConverter },
  { id: 'budget', label: 'Budget Planner', Icon: Calculator, color: '#10b981', desc: 'Monthly living cost comparison across study cities', Component: BudgetPlanner },
  { id: 'loan', label: 'Loan Eligibility', Icon: CreditCard, color: '#6366f1', desc: 'Education loan schemes for international students', Component: LoanEligibility },
  { id: 'advisor', label: 'AI Financial Advisor', Icon: Bot, color: '#8b5cf6', desc: 'Ask any financial question about studying abroad', Component: AIFinancialAdvisor },
];

export default function FinancialTools() {
  const [active, setActive] = useState(null);
  const current = TOOLS.find(t => t.id === active);

  return (
    <div className="min-h-screen bg-white text-[hsl(var(--blue-900))]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-5 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] mb-3 flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5" /> Financial Planning
          </div>
          <h1 className="font-display font-extrabold text-[38px] sm:text-[52px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Financial Tools
          </h1>
          <p className="mt-4 text-[16px] text-[hsl(var(--blue-900))]/60 max-w-xl">
            Plan your study abroad finances — Live exchange rates, visa funds, budgets, and AI-powered advice.
          </p>
        </motion.div>

        {!active && (
          <div className="grid sm:grid-cols-3 gap-4">
            {TOOLS.map((t, i) => {
              const Icon = t.Icon;
              return (
                <motion.button key={t.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  onClick={() => setActive(t.id)}
                  className="group text-left rounded-2xl bg-white border border-black/5 p-6 hover:border-[hsl(var(--blue-700))]/20 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${t.color}18` }}>
                    <Icon className="w-6 h-6" style={{ color: t.color }} />
                  </div>
                  <div className="font-bold text-[17px] text-[hsl(var(--blue-900))] mb-1.5">{t.label}</div>
                  <div className="text-[13px] text-[hsl(var(--blue-900))]/60 leading-relaxed">{t.desc}</div>
                  <div className="mt-5 flex items-center gap-1 text-[12px] font-bold" style={{ color: t.color }}>
                    Open <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {active && current && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setActive(null)} className="text-[13px] font-bold text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-900))]">
                ← All Tools
              </button>
              <span className="text-[hsl(var(--blue-900))]/30">/</span>
              <span className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{current.label}</span>
            </div>
            <div className="rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 p-6">
              <current.Component />
            </div>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
}

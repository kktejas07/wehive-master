import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, DollarSign, Home, Utensils, Bus, GraduationCap, Plus, Info } from 'lucide-react';

const CITY_LIVING_COSTS = {
  'Cambridge, Massachusetts': { rent: 1800, food: 600, transport: 120, tuition_factor: 1.0 },
  'Stanford, California': { rent: 2200, food: 700, transport: 150, tuition_factor: 1.0 },
  'Cambridge, England': { rent: 1200, food: 500, transport: 150, tuition_factor: 1.0 },
  'Oxford, England': { rent: 1100, food: 480, transport: 130, tuition_factor: 1.0 },
  'London, England': { rent: 1500, food: 550, transport: 200, tuition_factor: 1.0 },
  'Munich, Bavaria': { rent: 800, food: 400, transport: 80, tuition_factor: 1.0 },
  'Milan, Lombardy': { rent: 700, food: 350, transport: 60, tuition_factor: 1.0 },
  'Bologna, Emilia-Romagna': { rent: 550, food: 300, transport: 50, tuition_factor: 1.0 },
  'Warsaw, Masovian': { rent: 500, food: 250, transport: 40, tuition_factor: 1.0 },
  'Krakow, Lesser Poland': { rent: 450, food: 230, transport: 35, tuition_factor: 1.0 },
  'Vienna': { rent: 750, food: 380, transport: 60, tuition_factor: 1.0 },
  'Lisbon': { rent: 650, food: 300, transport: 50, tuition_factor: 1.0 },
  'Athens': { rent: 450, food: 250, transport: 40, tuition_factor: 1.0 },
  'Zagreb': { rent: 400, food: 220, transport: 35, tuition_factor: 1.0 },
};

const DEFAULT_COST = { rent: 1000, food: 400, transport: 80, tuition_factor: 1.0 };

function BreakdownRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[hsl(var(--border))] last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${color || 'bg-[hsl(var(--blue-50))]'} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color ? 'text-white' : 'text-[hsl(var(--blue-700))]'}`} />
        </div>
        <span className="text-[13px] text-muted-foreground">{label}</span>
      </div>
      <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">${value.toLocaleString()}/yr</span>
    </div>
  );
}

export default function CostOfLivingCalculator({ university }) {
  const [city, setCity] = useState(university?.location || '');
  const [tuition, setTuition] = useState(university?.tuition_usd || 20000);
  const [currency, setCurrency] = useState('USD');

  const costData = CITY_LIVING_COSTS[city] || DEFAULT_COST;
  const rentYear = costData.rent * 12;
  const foodYear = costData.food * 12;
  const transportYear = costData.transport * 12;
  const totalLiving = rentYear + foodYear + transportYear;
  const total = tuition * costData.tuition_factor + totalLiving;

  const convert = (usd) => {
    if (currency === 'INR') return Math.round(usd * 83);
    if (currency === 'EUR') return Math.round(usd * 0.92);
    if (currency === 'GBP') return Math.round(usd * 0.79);
    return usd;
  };

  const sym = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '£';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6 sm:p-8"
    >
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-700))] mb-4">
        <Calculator className="w-3.5 h-3.5" /> Cost of Living Calculator
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="costoflivingcalculator-city" className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground block mb-1">City</label>
          <select id="costoflivingcalculator-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-11 rounded-xl border border-[hsl(var(--border))] focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[14px] text-[hsl(var(--blue-900))] bg-white"
          >
            <option value="">Select a city</option>
            {Object.keys(CITY_LIVING_COSTS).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label id="costoflivingcalculator-currency" className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground block mb-1">Currency</label>
          <div role="group" aria-labelledby="costoflivingcalculator-currency" className="inline-flex rounded-full bg-[hsl(var(--soft-bg))] p-1">
            {['USD', 'INR', 'EUR', 'GBP'].map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition ${
                  currency === c ? 'bg-white text-[hsl(var(--blue-900))] shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="costoflivingcalculator-tuition-per-year" className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground block mb-1">Tuition (per year)</label>
          <input id="costoflivingcalculator-tuition-per-year"
            type="number"
            value={tuition}
            onChange={(e) => setTuition(Number(e.target.value))}
            className="w-full h-11 rounded-xl border border-[hsl(var(--border))] focus:border-[hsl(var(--blue-700))] outline-none px-3 text-[14px] text-[hsl(var(--blue-900))]"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-[hsl(var(--soft-bg))] p-5">
        <BreakdownRow icon={GraduationCap} label="Tuition" value={convert(tuition)} />
        <BreakdownRow icon={Home} label="Rent / Housing" value={convert(rentYear)} />
        <BreakdownRow icon={Utensils} label="Food & Groceries" value={convert(foodYear)} />
        <BreakdownRow icon={Bus} label="Transport" value={convert(transportYear)} />
      </div>

      <div className="mt-4 rounded-2xl bg-[hsl(var(--blue-900))] text-white p-5 flex items-center justify-between">
        <div>
          <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-white/70">Total per year</div>
          <div className="text-[28px] font-display font-bold tracking-[-0.02em]">
            {sym}{convert(total).toLocaleString()}
          </div>
        </div>
        <Info className="w-5 h-5 text-white/50" />
      </div>
      <div className="mt-3 text-[12px] text-muted-foreground">
        Estimates based on average student living costs. Actual expenses vary by lifestyle.
      </div>
    </motion.div>
  );
}

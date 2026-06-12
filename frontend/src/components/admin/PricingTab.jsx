import { useEffect, useState } from 'react';
import { Loader2, Save, RotateCcw, Percent, Banknote } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const VISA_TYPES = ['Tourist', 'Business', 'Student', 'Work', 'Transit', 'Medical'];

export default function PricingTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await adminClient(token).get('/pricing');
    setData(r.data);
    setDraft({
      base_fees: { ...r.data.base_fees },
      surcharge_inr: r.data.surcharge_inr,
      gst_rate: r.data.gst_rate,
      currency: r.data.currency,
    });
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || !draft) {
    return (
      <>
        <AdminHeader title="Pricing" />
        <Panel><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--accent))]" /></Panel>
      </>
    );
  }

  const save = async () => {
    setBusy(true);
    try {
      const cleanBase = {};
      Object.entries(draft.base_fees || {}).forEach(([k, v]) => {
        cleanBase[k] = Number(v) || 0;
      });
      await adminClient(token).patch('/pricing', {
        base_fees: cleanBase,
        surcharge_inr: Number(draft.surcharge_inr) || 0,
        gst_rate: Number(draft.gst_rate) || 0,
        currency: draft.currency || 'INR',
      });
      toast({ title: 'Pricing saved', description: 'Live for all new applications.' });
      await load();
    } catch (e) {
      toast({ title: 'Could not save', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  const resetDefaults = () => {
    setDraft({
      base_fees: { ...data.defaults.base_fees },
      surcharge_inr: data.defaults.surcharge_inr,
      gst_rate: data.defaults.gst_rate,
      currency: 'INR',
    });
  };

  // Preview calc for Tourist visa, 1 applicant, no govt fee
  const sampleBase = Number(draft.base_fees?.Tourist) || 0;
  const sampleSur = Number(draft.surcharge_inr) || 0;
  const sampleGstRate = Number(draft.gst_rate) || 0;
  const sampleTaxable = sampleBase + sampleSur;
  const sampleGst = Math.round(sampleTaxable * sampleGstRate);
  const sampleTotal = sampleBase + sampleSur + sampleGst;

  return (
    <div data-testid="admin-pricing-tab">
      <AdminHeader
        title="Pricing & fees"
        subtitle="Edit the global We Hive service fees. Changes apply to every new application immediately and are reflected on the public site."
      />

      <Panel className="mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2">
            <span className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-white"><Banknote className="w-4 h-4" /></span>
            <div>
              <div className="text-[13px] font-bold text-white">Base service fees (per applicant)</div>
              <div className="text-[11.5px] text-slate-400">Charged on top of the embassy/govt fee.</div>
            </div>
          </div>
          <button
            onClick={resetDefaults}
            data-testid="pricing-reset-btn"
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-slate-200"
          >
            <RotateCcw className="w-3 h-3" /> Reset to defaults
          </button>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VISA_TYPES.map((vt) => (
            <label key={vt} className="block">
              <span className="block text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 mb-1.5">{vt}</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[13px]">₹</span>
                <input
                  data-testid={`pricing-base-${vt}`}
                  type="number"
                  value={draft.base_fees[vt] ?? 0}
                  onChange={(e) => setDraft({ ...draft, base_fees: { ...draft.base_fees, [vt]: e.target.value } })}
                  className="w-full h-10 pl-7 pr-3 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--accent))] text-[14px] text-white outline-none"
                />
              </div>
            </label>
          ))}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel>
          <div className="text-[13px] font-bold text-white inline-flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[hsl(var(--accent))]" /> Surcharge
          </div>
          <p className="mt-1 text-[12px] text-slate-400">Folded into GST taxable base.</p>
          <div className="mt-3 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[13px]">{draft.currency === 'INR' ? '₹' : draft.currency === 'USD' ? '$' : draft.currency === 'EUR' ? '€' : '₹'}</span>
            <input
              data-testid="pricing-surcharge"
              type="number"
              value={draft.surcharge_inr ?? 0}
              onChange={(e) => setDraft({ ...draft, surcharge_inr: e.target.value })}
              className="w-full h-11 pl-7 pr-3 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--accent))] text-[14px] text-white outline-none"
            />
          </div>
        </Panel>

        <Panel>
          <div className="text-[13px] font-bold text-white inline-flex items-center gap-2">
            <Percent className="w-4 h-4 text-[hsl(var(--accent))]" /> GST rate
          </div>
          <p className="mt-1 text-[12px] text-slate-400">Decimal between 0 and 1 (0.18 = 18%).</p>
          <div className="mt-3">
            <input
              data-testid="pricing-gst"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={draft.gst_rate ?? 0}
              onChange={(e) => setDraft({ ...draft, gst_rate: e.target.value })}
              className="w-full h-11 px-3 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--accent))] text-[14px] text-white outline-none"
            />
            <div className="mt-1.5 text-[11.5px] text-slate-500">
              = {(Number(draft.gst_rate || 0) * 100).toFixed(1)}%
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="text-[13px] font-bold text-white inline-flex items-center gap-2">
            <Globe className="w-4 h-4 text-[hsl(var(--accent))]" /> Currency
          </div>
          <p className="mt-1 text-[12px] text-slate-400">Default currency for all fee displays.</p>
          <div className="mt-3">
            <select
              value={draft.currency || 'INR'}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
              className="w-full h-11 px-3 rounded-xl bg-black/30 border border-white/10 focus:border-[hsl(var(--accent))] text-[14px] text-white outline-none appearance-none"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </Panel>
      </div>

      {/* Live preview */}
      <Panel className="mt-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Live preview</div>
            <h3 className="mt-1 font-display font-extrabold text-[20px] text-white">Tourist visa · 1 applicant · no embassy fee</h3>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-bold">Total</div>
            <div className="text-[28px] font-display font-extrabold text-[hsl(var(--accent))]" data-testid="pricing-preview-total">{inr(sampleTotal)}</div>
          </div>
        </div>
        <div className="mt-4 grid sm:grid-cols-4 gap-2 text-[12.5px]">
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-slate-500">Base</span><div className="font-bold text-white">{inr(sampleBase)}</div></div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-slate-500">Surcharge</span><div className="font-bold text-white">{inr(sampleSur)}</div></div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-slate-500">GST taxable</span><div className="font-bold text-white">{inr(sampleTaxable)}</div></div>
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-slate-500">GST ({(sampleGstRate * 100).toFixed(0)}%)</span><div className="font-bold text-white">{inr(sampleGst)}</div></div>
        </div>
      </Panel>

      <div className="mt-5 flex justify-end gap-2">
        <button
          data-testid="pricing-save-btn"
          disabled={busy}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white px-5 py-2.5 text-[13.5px] font-bold"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save pricing</>}
        </button>
      </div>

      {data.updated_at && (
        <p className="mt-3 text-right text-[11.5px] text-slate-500">
          Last updated: {new Date(data.updated_at).toLocaleString('en-IN')}
        </p>
      )}
    </div>
  );
}

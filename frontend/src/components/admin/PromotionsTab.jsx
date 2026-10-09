import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight, X, Save, Tag } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';
import Pagination from './Pagination';

// Promo codes — backend: routes_promotions.py (CreatePromoRequest).
const EMPTY_FORM = {
  code: '',
  description: '',
  discount_percent: 10,
  max_uses: 100,
  expires_at: '',
  season: 'all',
  min_cart_value: 0,
};

const SEASON_OPTIONS = ['all', 'summer', 'fall', 'winter', 'spring', 'student_intake', 'holiday'];

function Field({ label, value, onChange, placeholder = '', type = 'text', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none focus:border-[hsl(var(--accent))]/50 placeholder:text-slate-600"
      />
    </label>
  );
}

function PromoForm({ onSave, onCancel, busy }) {
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Code *" value={form.code} onChange={(v) => set('code')(v.toUpperCase())} placeholder="SUMMER25" />
        <Field label="Discount % *" value={String(form.discount_percent)} onChange={(v) => set('discount_percent')(parseInt(v, 10) || 0)} type="number" />
        <Field label="Description *" value={form.description} onChange={set('description')} placeholder="25% off summer visas" className="sm:col-span-2" />
        <Field label="Max uses" value={String(form.max_uses)} onChange={(v) => set('max_uses')(parseInt(v, 10) || 0)} type="number" />
        <Field label="Min cart value" value={String(form.min_cart_value)} onChange={(v) => set('min_cart_value')(parseFloat(v) || 0)} type="number" />
        <div>
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Season</span>
          <select
            value={form.season}
            onChange={(e) => set('season')(e.target.value)}
            className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none focus:border-[hsl(var(--accent))]/50"
          >
            {SEASON_OPTIONS.map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
          </select>
        </div>
        <Field label="Expires at *" value={form.expires_at} onChange={set('expires_at')} type="datetime-local" />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 px-5 py-2 text-[13px] font-bold text-slate-300 transition disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={busy || !form.code.trim() || !form.description.trim() || !form.expires_at}
          className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--accent))] hover:opacity-90 px-5 py-2 text-[13px] font-bold text-white transition disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save promo code
        </button>
      </div>
    </div>
  );
}

export default function PromotionsTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(() => {
    axios.get(`${API}/promotions`, { headers, params: { limit: pageSize, skip } })
      .then((r) => {
        setItems(r.data.items || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => setItems([]));
  }, [token, skip]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const create = async (form) => {
    setBusy(true);
    try {
      await axios.post(`${API}/promotions/create`, form, { headers });
      toast({ title: 'Promo code created' });
      setCreating(false);
      load();
    } catch (e) {
      toast({ title: 'Error', description: e?.response?.data?.detail || 'Could not create.' });
    } finally { setBusy(false); }
  };

  const remove = async (code) => {
    if (!window.confirm(`Delete promo code ${code}?`)) return;
    try {
      await axios.delete(`${API}/promotions/${encodeURIComponent(code)}`, { headers });
      toast({ title: 'Deleted' });
      load();
    } catch { toast({ title: 'Could not delete.' }); }
  };

  const toggle = async (promo) => {
    try {
      await axios.put(`${API}/promotions/${encodeURIComponent(promo.code)}/toggle`, {}, { headers });
      load();
    } catch { toast({ title: 'Could not toggle.' }); }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Promotions"
        subtitle="Manage discount promo codes users can redeem at checkout."
        right={
          !creating && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:opacity-90 px-5 py-2.5 text-[13px] font-bold text-white transition"
            >
              <Plus className="w-4 h-4" /> New Promo Code
            </button>
          )
        }
      />

      {creating && (
        <Panel>
          <div className="text-[14px] font-bold text-white mb-5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-[hsl(var(--accent))]" /> New Promo Code
          </div>
          <PromoForm onSave={create} onCancel={() => setCreating(false)} busy={busy} />
        </Panel>
      )}

      <Panel>
        {!items && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}

        {items && items.length === 0 && !creating && (
          <div className="py-12 text-center text-slate-400">
            No promo codes yet. Create one above.
          </div>
        )}

        {items && items.length > 0 && (
          <div className="divide-y divide-white/5">
            {items.map((promo) => (
              <div key={promo.code} className="py-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold font-mono text-white">{promo.code}</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] font-bold rounded-full px-2 py-0.5 bg-white/8 text-slate-400">
                      {promo.discount_percent}% off · {promo.season || 'all'}
                    </span>
                    <span className={`text-[10px] uppercase tracking-[0.12em] font-bold rounded-full px-2 py-0.5 ${promo.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-500'}`}>
                      {promo.active ? 'Live' : 'Off'}
                    </span>
                  </div>
                  <div className="text-[12px] text-slate-400 mt-0.5 truncate">
                    {promo.description} · {promo.used_count || 0}/{promo.max_uses} used
                    {promo.expires_at ? ` · expires ${new Date(promo.expires_at).toLocaleDateString()}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggle(promo)}
                    className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition"
                    title={promo.active ? 'Deactivate' : 'Activate'}
                  >
                    {promo.active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => remove(promo.code)}
                    className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {items && items.length > 0 && <div className="mt-4"><Pagination skip={skip} limit={pageSize} total={total} onPageChange={setSkip} /></div>}
      </Panel>
    </div>
  );
}

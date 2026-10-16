import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Plus, X, Save, Tag, Copy, Check, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import Pagination from './Pagination';

const SEASONS = [
  { id: 'all', label: 'All Seasons' },
  { id: 'summer', label: 'Summer (May-Jul)' },
  { id: 'fall', label: 'Fall (Aug-Oct)' },
  { id: 'winter', label: 'Winter (Nov-Jan)' },
  { id: 'spring', label: 'Spring (Feb-Apr)' },
  { id: 'student_intake', label: 'Student Intake (Aug-Sep)' },
  { id: 'holiday', label: 'Holiday Season (Dec)' },
];

const VISA_TYPES = ['Tourist', 'Business', 'Student', 'Work', 'Transit', 'Medical'];

export default function PromoCodesTab() {
  const { token: adminToken } = useAdminAuth();
  const { toast } = useToast();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({
    code: '', description: '', discount_percent: 10, discount_fixed: 0,
    max_uses: 100, expires_at: '', season: 'all',
    min_cart_value: 0, applicable_visa_types: ['Tourist', 'Business', 'Student', 'Work'],
  });

  const load = async () => {
    try {
      const r = await axios.get(`${API}/promotions`, { headers: { Authorization: `Bearer ${adminToken}` }, params: { limit: pageSize, skip } });
      setPromos(r.data.items || []);
      setTotal(r.data.total || (r.data.items || []).length);
    } catch {} finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load is recreated each render; re-run only when the listed inputs change
  useEffect(() => { load(); }, [skip]);

  const handleCreate = async () => {
    try {
      await axios.post(`${API}/promotions/create`, {
        ...form, expires_at: new Date(form.expires_at).toISOString(),
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      toast({ title: 'Promo code created' });
      setShowForm(false);
      setForm({ code: '', description: '', discount_percent: 10, discount_fixed: 0, max_uses: 100, expires_at: '', season: 'all', min_cart_value: 0, applicable_visa_types: ['Tourist', 'Business', 'Student', 'Work'] });
      load();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.detail || 'Could not create' });
    }
  };

  const handleToggle = async (code) => {
    try {
      await axios.put(`${API}/promotions/${encodeURIComponent(code)}/toggle`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
      load();
    } catch (err) {
      toast({ title: 'Could not toggle', description: err.response?.data?.detail || err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`Delete promo code ${code}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/promotions/${encodeURIComponent(code)}`, { headers: { Authorization: `Bearer ${adminToken}` } });
      toast({ title: 'Promo code deleted' });
      load();
    } catch (err) {
      toast({ title: 'Could not delete', description: err.response?.data?.detail || err.message, variant: 'destructive' });
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copied!' });
  };

  const generateCode = () => {
    const prefix = form.season === 'all' ? 'WELCOME' : form.season.toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    setForm(p => ({ ...p, code: `${prefix}${suffix}` }));
  };

  const toggleVisaType = (t) => {
    setForm(p => ({
      ...p,
      applicable_visa_types: p.applicable_visa_types.includes(t)
        ? p.applicable_visa_types.filter(x => x !== t)
        : [...p.applicable_visa_types, t],
    }));
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div>
      <AdminHeader title="Promo Codes" subtitle="Create and manage seasonal promo codes" />

      <Panel>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[13px] text-white/60">{promos.length} promo codes</div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 bg-[hsl(var(--blue-700))] text-white h-10 px-4 rounded-lg text-[12px] font-semibold hover:bg-[hsl(var(--blue-700))]/90 transition">
            <Plus className="w-3.5 h-3.5" /> New Promo Code
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-[15px]">Create Promo Code</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-white/50" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="promocodestab-code" className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/40 block mb-1">Code</label>
                <div className="flex gap-2">
                  <input id="promocodestab-code" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="flex-1 h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none focus:border-[hsl(var(--blue-700))]/50 font-mono uppercase" placeholder="SUMMER2025" />
                  <button onClick={generateCode} className="h-10 px-3 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition" title="Generate"><RefreshCw className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/40 block mb-1">Season</label>
                <select value={form.season} onChange={e => setForm(p => ({ ...p, season: e.target.value }))} className="w-full h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none">
                  {SEASONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="promocodestab-discount" className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/40 block mb-1">Discount %</label>
                <input id="promocodestab-discount" type="number" value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: Number(e.target.value) }))} className="w-full h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" min="0" max="100" />
              </div>
              <div>
                <label htmlFor="promocodestab-fixed-discount" className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/40 block mb-1">Fixed Discount (₹)</label>
                <input id="promocodestab-fixed-discount" type="number" value={form.discount_fixed} onChange={e => setForm(p => ({ ...p, discount_fixed: Number(e.target.value) }))} className="w-full h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" min="0" />
              </div>
              <div>
                <label htmlFor="promocodestab-max-uses" className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/40 block mb-1">Max Uses</label>
                <input id="promocodestab-max-uses" type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: Number(e.target.value) }))} className="w-full h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" min="1" />
              </div>
              <div>
                <label htmlFor="promocodestab-min-cart-value" className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/40 block mb-1">Min Cart Value (₹)</label>
                <input id="promocodestab-min-cart-value" type="number" value={form.min_cart_value} onChange={e => setForm(p => ({ ...p, min_cart_value: Number(e.target.value) }))} className="w-full h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" min="0" />
              </div>
              <div>
                <label htmlFor="promocodestab-expires-at" className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/40 block mb-1">Expires At</label>
                <input id="promocodestab-expires-at" type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className="w-full h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" />
              </div>
              <div>
                <label htmlFor="promocodestab-description" className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/40 block mb-1">Description</label>
                <input id="promocodestab-description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none" placeholder="Summer discount 2025" />
              </div>
            </div>
            <div>
              <label id="promocodestab-applicable-visa-types" className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/40 block mb-2">Applicable Visa Types</label>
              <div role="group" aria-labelledby="promocodestab-applicable-visa-types" className="flex flex-wrap gap-2">
                {VISA_TYPES.map(t => (
                  <button key={t} onClick={() => toggleVisaType(t)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${form.applicable_visa_types.includes(t) ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{t}</button>
                ))}
              </div>
            </div>
            <button onClick={handleCreate} className="inline-flex items-center gap-1.5 bg-[hsl(var(--blue-700))] text-white h-10 px-5 rounded-lg text-[13px] font-semibold hover:bg-[hsl(var(--blue-700))]/90 transition">
              <Save className="w-4 h-4" /> Create Promo Code
            </button>
          </div>
        )}

        {promos.length === 0 ? (
          <div className="text-center py-16 text-white/60">
            <Tag className="w-12 h-12 mx-auto mb-3" />
            <p>No promo codes yet. Create your first seasonal promo code above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-[0.14em] text-white/40 font-bold">Code</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-[0.14em] text-white/40 font-bold">Season</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-[0.14em] text-white/40 font-bold">Discount</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-[0.14em] text-white/40 font-bold">Uses</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-[0.14em] text-white/40 font-bold">Expires</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-[0.14em] text-white/40 font-bold">Status</th>
                  <th className="text-right py-3 px-4 text-[11px] uppercase tracking-[0.14em] text-white/40 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(p => (
                  <tr key={p._id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-3 px-4">
                      <button onClick={() => handleCopy(p.code)} className="font-mono font-bold text-white hover:text-blue-300 transition inline-flex items-center gap-1.5">
                        {p.code} {copied === p.code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white/30" />}
                      </button>
                      <div className="text-[11px] text-white/60">{p.description}</div>
                    </td>
                    <td className="py-3 px-4 text-white/60 capitalize">{p.season}</td>
                    <td className="py-3 px-4">
                      {p.discount_percent > 0 && <span className="text-emerald-400 font-bold">{p.discount_percent}%</span>}
                      {p.discount_fixed > 0 && <span className="text-amber-400 font-bold ml-1">+ ₹{p.discount_fixed}</span>}
                    </td>
                    <td className="py-3 px-4 text-white/60">{p.used_count || 0}/{p.max_uses}</td>
                    <td className="py-3 px-4 text-white/60">{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleToggle(p.code)} className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${p.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleDelete(p.code)} className="text-red-400/60 hover:text-red-400 transition p-1" title="Delete">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {promos.length > 0 && <div className="mt-4"><Pagination skip={skip} limit={pageSize} total={total} onPageChange={setSkip} /></div>}
          </div>
        )}
      </Panel>
    </div>
  );
}

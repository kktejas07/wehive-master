import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Save, Tag } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';
import axios from 'axios';
import Pagination from './Pagination';

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  badge: '',
  cta_text: '',
  cta_link: '',
  image_url: '',
  bg_color: '#0a2c8a',
  accent_color: '#e1212c',
  promo_type: 'both',
  active: true,
  position: 0,
  expires_at: '',
};

const TYPE_LABELS = { banner: 'Banner only', card: 'Card only', both: 'Banner + Card' };

function ColorSwatch({ value, onChange, label }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-white/10 cursor-pointer bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-[12px] font-mono text-white outline-none focus:border-[hsl(var(--accent))]/50"
        />
      </div>
    </label>
  );
}

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

function PromoForm({ initial, onSave, onCancel, busy }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Title *" value={form.title} onChange={set('title')} placeholder="Exciting offer title" className="sm:col-span-2" />
        <Field label="Subtitle" value={form.subtitle} onChange={set('subtitle')} placeholder="Short supporting text" className="sm:col-span-2" />
        <Field label="Badge label" value={form.badge} onChange={set('badge')} placeholder="e.g. Limited Offer" />
        <div>
          <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1">Type</span>
          <select
            value={form.promo_type}
            onChange={(e) => set('promo_type')(e.target.value)}
            className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-[13px] text-white outline-none focus:border-[hsl(var(--accent))]/50"
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <Field label="CTA button text" value={form.cta_text} onChange={set('cta_text')} placeholder="Apply Now" />
        <Field label="CTA link / route" value={form.cta_link} onChange={set('cta_link')} placeholder="/universities or https://…" />
        <Field label="Image URL (optional)" value={form.image_url} onChange={set('image_url')} placeholder="https://images.unsplash.com/…" className="sm:col-span-2" />
        <ColorSwatch label="Background colour" value={form.bg_color} onChange={set('bg_color')} />
        <ColorSwatch label="Accent colour" value={form.accent_color} onChange={set('accent_color')} />
        <Field label="Position (lower = higher priority)" value={String(form.position)} onChange={(v) => set('position')(parseInt(v, 10) || 0)} type="number" />
        <Field label="Expires at (optional)" value={form.expires_at} onChange={set('expires_at')} type="datetime-local" />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <div
          onClick={() => set('active')(!form.active)}
          className={`w-10 h-5 rounded-full transition relative ${form.active ? 'bg-emerald-500' : 'bg-white/10'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-[13px] text-slate-300">{form.active ? 'Active (visible)' : 'Inactive (hidden)'}</span>
      </label>

      {/* Live preview */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">Preview</div>
        <div
          className="relative rounded-xl overflow-hidden px-5 py-4 flex items-center gap-4 flex-wrap"
          style={{ background: form.bg_color }}
        >
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20" style={{ background: form.accent_color }} />
          {form.badge && (
            <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: form.accent_color, color: '#fff' }}>
              {form.badge}
            </span>
          )}
          <div className="flex-1">
            <div className="text-[14px] font-bold text-white">{form.title || 'Your title here'}</div>
            {form.subtitle && <div className="text-[11.5px] text-white/65">{form.subtitle}</div>}
          </div>
          {form.cta_text && (
            <span className="shrink-0 rounded-full bg-white/20 px-4 py-1.5 text-[12px] font-bold text-white">
              {form.cta_text}
            </span>
          )}
        </div>
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
          disabled={busy || !form.title.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--accent))] hover:opacity-90 px-5 py-2 text-[13px] font-bold text-white transition disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save promotion
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
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(() => {
    axios.get(`${API}/admin/promotions`, { headers, params: { limit: pageSize, skip } })
      .then((r) => {
        setItems(r.data.items || r.data);
        setTotal(r.data.total || (r.data.items || r.data || []).length);
      })
      .catch(() => setItems([]));
  }, [token, skip]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const create = async (form) => {
    setBusy(true);
    try {
      const payload = { ...form, position: parseInt(form.position, 10) || 0, expires_at: form.expires_at || null };
      await axios.post(`${API}/admin/promotions`, payload, { headers });
      toast({ title: 'Promotion created' });
      setCreating(false);
      load();
    } catch (e) {
      toast({ title: 'Error', description: e?.response?.data?.detail || 'Could not create.' });
    } finally { setBusy(false); }
  };

  const update = async (id, form) => {
    setBusy(true);
    try {
      const payload = { ...form, position: parseInt(form.position, 10) || 0, expires_at: form.expires_at || null };
      await axios.put(`${API}/admin/promotions/${id}`, payload, { headers });
      toast({ title: 'Promotion updated' });
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: 'Error', description: e?.response?.data?.detail || 'Could not update.' });
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this promotion?')) return;
    try {
      await axios.delete(`${API}/admin/promotions/${id}`, { headers });
      toast({ title: 'Deleted' });
      load();
    } catch { toast({ title: 'Could not delete.' }); }
  };

  const toggle = async (promo) => {
    try {
      await axios.put(`${API}/admin/promotions/${promo.id}`, { ...promo, active: !promo.active }, { headers });
      load();
    } catch { toast({ title: 'Could not toggle.' }); }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Promotions"
        subtitle="Manage banners and promotional cards shown to users on the homepage and account page."
        right={
          !creating && !editing && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:opacity-90 px-5 py-2.5 text-[13px] font-bold text-white transition"
            >
              <Plus className="w-4 h-4" /> New Promotion
            </button>
          )
        }
      />

      {creating && (
        <Panel>
          <div className="text-[14px] font-bold text-white mb-5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-[hsl(var(--accent))]" /> New Promotion
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
            No promotions yet. Create one above to display it to users.
          </div>
        )}

        {items && items.length > 0 && (
          <div className="divide-y divide-white/5">
            {items.map((promo) => (
              <div key={promo.id}>
                {editing === promo.id ? (
                  <div className="py-5">
                    <PromoForm
                      initial={{ ...promo, expires_at: promo.expires_at ? promo.expires_at.slice(0, 16) : '' }}
                      onSave={(form) => update(promo.id, form)}
                      onCancel={() => setEditing(null)}
                      busy={busy}
                    />
                  </div>
                ) : (
                  <div className="py-4 flex items-center gap-4 flex-wrap">
                    {/* Color dot */}
                    <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: promo.bg_color }} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-white">{promo.title}</span>
                        <span className="text-[10px] uppercase tracking-[0.12em] font-bold rounded-full px-2 py-0.5 bg-white/8 text-slate-400">
                          {TYPE_LABELS[promo.promo_type] || promo.promo_type}
                        </span>
                        <span className={`text-[10px] uppercase tracking-[0.12em] font-bold rounded-full px-2 py-0.5 ${promo.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-500'}`}>
                          {promo.active ? 'Live' : 'Off'}
                        </span>
                      </div>
                      {promo.subtitle && <div className="text-[12px] text-slate-400 mt-0.5 truncate">{promo.subtitle}</div>}
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
                        onClick={() => setEditing(promo.id)}
                        className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove(promo.id)}
                        className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {items && items.length > 0 && <div className="mt-4"><Pagination skip={skip} limit={pageSize} total={total} onPageChange={setSkip} /></div>}
      </Panel>
    </div>
  );
}

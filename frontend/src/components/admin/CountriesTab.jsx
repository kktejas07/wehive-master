import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, Save, X, Pencil, Plus, Trash2, Globe } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient, inr } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import Pagination from './Pagination';

const VISA_TYPES = ['Tourist', 'Business', 'Student', 'Work', 'Transit', 'Medical'];

function CategoryEditor({ visaType, cat, onChange, onDelete }) {
  const update = (patch) => onChange({ ...cat, ...patch });
  const docsText = (cat.documents || []).join('\n');
  const setDocs = (txt) => update({ documents: txt.split('\n').map((s) => s.trim()).filter(Boolean) });

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3" data-testid={`category-editor-${visaType}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-300">{visaType}</div>
        <button
          type="button"
          onClick={onDelete}
          data-testid={`delete-category-${visaType}`}
          className="inline-flex items-center gap-1 rounded-md bg-red-500/10 hover:bg-red-500/20 px-2 py-1 text-[10.5px] font-bold text-red-300"
        >
          <Trash2 className="w-3 h-3" /> Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-slate-500">
          Display name
          <input value={cat.name || ''} onChange={(e) => update({ name: e.target.value })}
            className="mt-0.5 w-full h-8 px-2 rounded bg-black/30 border border-white/10 text-[12.5px] text-white" />
        </label>
        <label className="text-[11px] text-slate-500">
          Validity
          <input value={cat.validity || ''} onChange={(e) => update({ validity: e.target.value })}
            placeholder="e.g. 90 DAYS"
            className="mt-0.5 w-full h-8 px-2 rounded bg-black/30 border border-white/10 text-[12.5px] text-white" />
        </label>
        <label className="text-[11px] text-slate-500">
          Govt fees (INR)
          <input type="number" value={cat.fees_inr ?? 0} onChange={(e) => update({ fees_inr: Number(e.target.value) })}
            className="mt-0.5 w-full h-8 px-2 rounded bg-black/30 border border-white/10 text-[12.5px] text-white" />
        </label>
        <label className="text-[11px] text-slate-500">
          Govt fees (USD)
          <input type="number" value={cat.fees_usd ?? 0} onChange={(e) => update({ fees_usd: Number(e.target.value) })}
            className="mt-0.5 w-full h-8 px-2 rounded bg-black/30 border border-white/10 text-[12.5px] text-white" />
        </label>
        <label className="text-[11px] text-slate-500">
          Processing days
          <input type="number" value={cat.processing_days ?? 0} onChange={(e) => update({ processing_days: Number(e.target.value) })}
            className="mt-0.5 w-full h-8 px-2 rounded bg-black/30 border border-white/10 text-[12.5px] text-white" />
        </label>
        <label className="text-[11px] text-slate-500 inline-flex items-end gap-2">
          <input type="checkbox" checked={!!cat.multi_entry} onChange={(e) => update({ multi_entry: e.target.checked })} />
          <span className="text-[12px] text-slate-300 font-bold">Multi-entry</span>
        </label>
        <label className="text-[11px] text-slate-500 col-span-2">
          Required documents (one per line)
          <textarea
            value={docsText}
            onChange={(e) => setDocs(e.target.value)}
            rows={4}
            placeholder={'Passport (6mo validity)\nTwo recent photos\nFinancial proof'}
            className="mt-0.5 w-full px-2 py-1.5 rounded bg-black/30 border border-white/10 text-[12.5px] text-white resize-y"
          />
        </label>
      </div>
    </div>
  );
}

function AddCategoryButton({ existing, onAdd }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState('');
  const [custom, setCustom] = useState('');
  const available = VISA_TYPES.filter((v) => !existing[v]);

  const add = () => {
    const key = (picked || custom).trim();
    if (!key) return;
    onAdd(key, {
      name: `${key} Visa`,
      fees_inr: 0,
      fees_usd: 0,
      processing_days: 7,
      validity: '90 DAYS',
      multi_entry: false,
      documents: ['Passport (6mo validity)'],
    });
    setOpen(false);
    setPicked('');
    setCustom('');
  };

  if (!open) {
    return (
      <button
        type="button"
        data-testid="add-category-btn"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-white/15 hover:border-[hsl(var(--accent))]/50 hover:bg-white/5 p-3 text-[12.5px] font-bold text-slate-300 inline-flex items-center justify-center gap-2 w-full"
      >
        <Plus className="w-3.5 h-3.5" /> Add visa type
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 mb-2">Add visa type</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {available.map((v) => (
          <button
            key={v}
            type="button"
            data-testid={`pick-category-${v}`}
            onClick={() => { setPicked(v); setCustom(''); }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold border ${
              picked === v
                ? 'bg-[hsl(var(--accent))] text-white border-[hsl(var(--accent))]'
                : 'border-white/15 text-slate-300 hover:border-[hsl(var(--accent))]/50'
            }`}
          >{v}</button>
        ))}
      </div>
      <input
        data-testid="add-category-custom"
        value={custom}
        onChange={(e) => { setCustom(e.target.value); setPicked(''); }}
        placeholder="Or custom type (e.g. Digital Nomad)"
        className="w-full h-8 px-2 rounded bg-black/30 border border-white/10 text-[12.5px] text-white"
      />
      <div className="flex gap-2 mt-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2.5 py-1 text-[11.5px] font-bold text-slate-300 hover:bg-white/5">Cancel</button>
        <button
          type="button"
          data-testid="add-category-confirm"
          onClick={add}
          disabled={!picked && !custom}
          className="rounded-md bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-50 px-3 py-1 text-[11.5px] font-bold text-white"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function CountryRow({ c, onSaved }) {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(c);

  const save = async () => {
    setBusy(true);
    try {
      const visaTypes = Object.keys(draft.categories || {});
      await adminClient(token).patch(`/countries/${c.id}`, {
        no_visa: !!draft.no_visa,
        requires_appointment: !!draft.requires_appointment,
        appointment_fee_inr: Number(draft.appointment_fee_inr) || 0,
        delivery: {
          standard_days: Number(draft.delivery?.standard_days) || 0,
          rush_days: Number(draft.delivery?.rush_days) || 0,
          same_day: !!draft.delivery?.same_day,
        },
        categories: draft.categories,
      });
      toast({ title: 'Country saved', description: `${visaTypes.length} visa type${visaTypes.length === 1 ? '' : 's'} active` });
      setEditing(false);
      onSaved?.();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  const addCategory = (key, def) => {
    setDraft({ ...draft, categories: { ...(draft.categories || {}), [key]: def } });
  };

  const updateCategory = (key, val) => {
    setDraft({ ...draft, categories: { ...(draft.categories || {}), [key]: val } });
  };

  const deleteCategory = (key) => {
    if (!window.confirm(`Remove the ${key} visa type from ${c.name}?`)) return;
    const next = { ...(draft.categories || {}) };
    delete next[key];
    setDraft({ ...draft, categories: next });
  };

  return (
    <>
      <tr data-testid={`admin-country-row-${c.id}`} className="border-t border-white/5 hover:bg-white/5">
        <td className="px-5 py-3">
          <div className="font-bold text-white inline-flex items-center gap-1.5">
            <span>{c.flag || <Globe className="w-4 h-4 text-slate-400" />}</span> {c.name}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">{c.iso2} · {c.id}</div>
        </td>
        <td className="px-5 py-3 text-slate-300 text-[12.5px]">{c.region || '—'}</td>
        <td className="px-5 py-3">
          {c.no_visa
            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10.5px] uppercase tracking-[0.12em] font-bold">Visa-free</span>
            : (
              <span className="text-[12.5px] text-slate-400">
                {c.delivery?.standard_days ?? '—'}d · rush {c.delivery?.rush_days ?? '—'}d {c.delivery?.same_day ? '· same-day' : ''}
              </span>
            )}
        </td>
        <td className="px-5 py-3">
          <div className="flex flex-wrap gap-1">
            {Object.keys(c.categories || {}).map((k) => (
              <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-200 text-[10.5px] font-bold">{k}</span>
            ))}
            {Object.keys(c.categories || {}).length === 0 && <span className="text-[11.5px] text-slate-500">—</span>}
          </div>
        </td>
        <td className="px-5 py-3 text-slate-300 text-[12.5px]">
          {c.requires_appointment ? `Yes · ${inr(c.appointment_fee_inr)}` : 'No'}
        </td>
        <td className="px-5 py-3 text-right">
          {!editing ? (
            <button
              data-testid={`edit-country-${c.id}`}
              onClick={() => { setDraft(c); setEditing(true); }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-slate-200"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          ) : (
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11.5px] font-bold text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
              <button
                data-testid={`save-country-${c.id}`}
                disabled={busy}
                onClick={save}
                className="inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--accent))] hover:brightness-110 px-2.5 py-1.5 text-[11.5px] font-bold text-white"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3" /> Save</>}
              </button>
            </div>
          )}
        </td>
      </tr>
      {editing && (
        <tr className="border-t border-white/5 bg-black/30">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <label className="text-[11px] text-slate-500">
                Standard days
                <input type="number" value={draft.delivery?.standard_days ?? 0}
                  onChange={(e) => setDraft({ ...draft, delivery: { ...(draft.delivery || {}), standard_days: Number(e.target.value) } })}
                  className="mt-0.5 w-full h-9 px-2 rounded bg-black/30 border border-white/10 text-[13px] text-white" />
              </label>
              <label className="text-[11px] text-slate-500">
                Rush days
                <input type="number" value={draft.delivery?.rush_days ?? 0}
                  onChange={(e) => setDraft({ ...draft, delivery: { ...(draft.delivery || {}), rush_days: Number(e.target.value) } })}
                  className="mt-0.5 w-full h-9 px-2 rounded bg-black/30 border border-white/10 text-[13px] text-white" />
              </label>
              <label className="text-[11px] text-slate-500 inline-flex items-center gap-2 mt-5">
                <input type="checkbox" checked={!!draft.delivery?.same_day}
                  onChange={(e) => setDraft({ ...draft, delivery: { ...(draft.delivery || {}), same_day: e.target.checked } })} />
                <span className="text-[12.5px] text-slate-300 font-bold">Same-day delivery</span>
              </label>
              <label className="text-[11px] text-slate-500 inline-flex items-center gap-2">
                <input type="checkbox" checked={!!draft.requires_appointment}
                  onChange={(e) => setDraft({ ...draft, requires_appointment: e.target.checked })} />
                <span className="text-[12.5px] text-slate-300 font-bold">Requires appointment</span>
              </label>
              <label className="text-[11px] text-slate-500 col-span-2">
                Appointment fee (INR)
                <input type="number" value={draft.appointment_fee_inr ?? 0}
                  onChange={(e) => setDraft({ ...draft, appointment_fee_inr: Number(e.target.value) })}
                  disabled={!draft.requires_appointment}
                  className="mt-0.5 w-full h-9 px-2 rounded bg-black/30 border border-white/10 text-[13px] text-white disabled:opacity-50" />
              </label>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500 mb-2 flex items-center justify-between">
                <span>Visa categories · pricing · documents</span>
                <span className="text-slate-600 normal-case tracking-normal text-[11px] font-normal">Add / remove types, edit fees, validity, delivery and checklists.</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(draft.categories || {}).map(([k, v]) => (
                  <CategoryEditor
                    key={k}
                    visaType={k}
                    cat={v}
                    onChange={(nv) => updateCategory(k, nv)}
                    onDelete={() => deleteCategory(k)}
                  />
                ))}
                <AddCategoryButton existing={draft.categories || {}} onAdd={addCategory} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function CountriesTab() {
  const { token } = useAdminAuth();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const load = useCallback(async () => {
    setItems(null);
    const r = await adminClient(token).get('/countries', { params: { q: q || undefined, limit: pageSize, skip } });
    setItems(r.data.items);
    setTotal(r.data.total || r.data.items.length);
  }, [token, q, skip]);

  useEffect(() => { load(); }, [load]);

  return (
    <div data-testid="admin-countries-tab">
      <AdminHeader
        title="Countries"
        subtitle={`${items?.length ?? '—'} countries. Add / edit visa types, fees, validity, delivery times and document checklists.`}
      />
      <Panel>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            data-testid="admin-countries-search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setSkip(0); }}
            placeholder="Search by country name or ISO-2…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 focus:border-[hsl(var(--accent))] text-[13.5px] text-white placeholder:text-slate-500 outline-none"
          />
        </div>
      </Panel>

      <Panel className="mt-4 overflow-x-auto p-0">
        <table className="min-w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500 bg-white/5">
              <th className="px-5 py-3">Country</th>
              <th className="px-5 py-3">Region</th>
              <th className="px-5 py-3">Delivery</th>
              <th className="px-5 py-3">Visa types</th>
              <th className="px-5 py-3">Appointment</th>
              <th className="px-5 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline text-[hsl(var(--accent))]" /></td></tr>
            )}
            {items?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No countries match.</td></tr>
            )}
            {items?.map((c) => (
              <CountryRow key={c.id} c={c} onSaved={load} />
            ))}
          </tbody>
        </table>
        {items && items.length > 0 && <div className="px-5 py-3"><Pagination skip={skip} limit={pageSize} total={total} onPageChange={setSkip} /></div>}
      </Panel>
    </div>
  );
}

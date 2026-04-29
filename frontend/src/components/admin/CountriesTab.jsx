import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, Save, X, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminClient, inr } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

function CategoryEditor({ visaType, cat, onChange }) {
  const update = (patch) => onChange({ ...cat, ...patch });
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-400 mb-2">{visaType}</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-slate-500">
          Govt fees (INR)
          <input type="number" value={cat.fees_inr ?? ''} onChange={(e) => update({ fees_inr: Number(e.target.value) })}
            className="mt-0.5 w-full h-8 px-2 rounded bg-black/30 border border-white/10 text-[12.5px] text-white" />
        </label>
        <label className="text-[11px] text-slate-500">
          Processing days
          <input type="number" value={cat.processing_days ?? ''} onChange={(e) => update({ processing_days: Number(e.target.value) })}
            className="mt-0.5 w-full h-8 px-2 rounded bg-black/30 border border-white/10 text-[12.5px] text-white" />
        </label>
        <label className="text-[11px] text-slate-500 col-span-2">
          Validity
          <input value={cat.validity || ''} onChange={(e) => update({ validity: e.target.value })}
            className="mt-0.5 w-full h-8 px-2 rounded bg-black/30 border border-white/10 text-[12.5px] text-white" />
        </label>
      </div>
    </div>
  );
}

function CountryRow({ c, onSaved }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(c);

  const save = async () => {
    setBusy(true);
    try {
      await adminClient(token).patch(`/countries/${c.id}`, {
        requires_appointment: !!draft.requires_appointment,
        appointment_fee_inr: Number(draft.appointment_fee_inr) || 0,
        delivery: {
          standard_days: Number(draft.delivery?.standard_days) || 0,
          rush_days: Number(draft.delivery?.rush_days) || 0,
          same_day: !!draft.delivery?.same_day,
        },
        categories: draft.categories,
      });
      toast({ title: 'Country updated' });
      setEditing(false);
      onSaved?.();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <tr data-testid={`admin-country-row-${c.id}`} className="border-t border-white/5 hover:bg-white/5">
        <td className="px-5 py-3">
          <div className="font-bold text-white inline-flex items-center gap-1.5">
            <span>{c.flag || '🌐'}</span> {c.name}
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
          <td colSpan={5} className="px-5 py-4">
            <div className="grid sm:grid-cols-3 gap-3 mb-3">
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
            {draft.categories && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500 mb-2">Visa categories & pricing</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(draft.categories).map(([k, v]) => (
                    <CategoryEditor
                      key={k}
                      visaType={k}
                      cat={v}
                      onChange={(nv) => setDraft({ ...draft, categories: { ...draft.categories, [k]: nv } })}
                    />
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function CountriesTab() {
  const { token } = useAuth();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setItems(null);
    const r = await adminClient(token).get('/countries', { params: { q: q || undefined, limit: 500 } });
    setItems(r.data.items);
  }, [token, q]);

  useEffect(() => { load(); }, [load]);

  return (
    <div data-testid="admin-countries-tab">
      <AdminHeader
        title="Countries"
        subtitle={`${items?.length ?? '—'} countries. Edit delivery times, appointment fees and category pricing.`}
      />
      <Panel>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            data-testid="admin-countries-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
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
              <th className="px-5 py-3">Appointment</th>
              <th className="px-5 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline text-[hsl(var(--accent))]" /></td></tr>
            )}
            {items?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No countries match.</td></tr>
            )}
            {items?.map((c) => (
              <CountryRow key={c.id} c={c} onSaved={load} />
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

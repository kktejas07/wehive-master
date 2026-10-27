import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2, Save, X, Calendar, Tag, Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import Pagination from './Pagination';

const EMPTY = {
  title: '',
  subtitle: '',
  description: '',
  country_id: '',
  visa_type: '',
  cta_label: 'Explore',
  cta_url: '',
  image_url: '',
  accent_color: '#E10600',
  tag: 'tourist',
  is_published: true,
  sort_order: 0,
};

const TAGS = ['all', 'tourist', 'student', 'work', 'business', 'holiday', 'promo'];

function EventForm({ value, onChange, onCancel, onSave, busy, isNew }) {
  const v = value;
  const set = (k, val) => onChange({ ...v, [k]: val });
  return (
    <div className="rounded-2xl bg-[var(--glass)] border border-[var(--glass-border)] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--text-secondary)] mb-3">
        {isNew ? 'New event' : 'Edit event'}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-[11px] text-[var(--text-secondary)]">
          Title
          <input data-testid="event-form-title" value={v.title} onChange={(e) => set('title', e.target.value)}
            placeholder="Schengen summer sale"
            className="mt-0.5 w-full h-10 px-3 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)]" />
        </label>
        <label className="text-[11px] text-[var(--text-secondary)]">
          Subtitle
          <input data-testid="event-form-subtitle" value={v.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)}
            placeholder="Save up to ₹2,000 till Aug 31"
            className="mt-0.5 w-full h-10 px-3 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)]" />
        </label>
        <label className="text-[11px] text-[var(--text-secondary)] sm:col-span-2">
          Description
          <textarea data-testid="event-form-description" value={v.description || ''} onChange={(e) => set('description', e.target.value)}
            rows={2}
            className="mt-0.5 w-full px-3 py-2 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)] resize-y" />
        </label>
        <label className="text-[11px] text-[var(--text-secondary)]">
          Tag
          <select data-testid="event-form-tag" value={v.tag || 'tourist'} onChange={(e) => set('tag', e.target.value)}
            className="mt-0.5 w-full h-10 px-3 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)]">
            {TAGS.filter((t) => t !== 'all').map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-[var(--text-secondary)]">
          Country code (e.g. fr)
          <input data-testid="event-form-country" value={v.country_id || ''} onChange={(e) => set('country_id', e.target.value)}
            className="mt-0.5 w-full h-10 px-3 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)]" />
        </label>
        <label className="text-[11px] text-[var(--text-secondary)]">
          CTA label
          <input data-testid="event-form-cta-label" value={v.cta_label || ''} onChange={(e) => set('cta_label', e.target.value)}
            className="mt-0.5 w-full h-10 px-3 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)]" />
        </label>
        <label className="text-[11px] text-[var(--text-secondary)]">
          CTA URL
          <input data-testid="event-form-cta-url" value={v.cta_url || ''} onChange={(e) => set('cta_url', e.target.value)}
            placeholder="/visa/fr"
            className="mt-0.5 w-full h-10 px-3 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)]" />
        </label>
        <label className="text-[11px] text-[var(--text-secondary)] sm:col-span-2">
          Image URL
          <input data-testid="event-form-image" value={v.image_url || ''} onChange={(e) => set('image_url', e.target.value)}
            placeholder="https://..."
            className="mt-0.5 w-full h-10 px-3 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)]" />
        </label>
        <label className="text-[11px] text-[var(--text-secondary)]">
          Accent color
          <div className="mt-0.5 flex gap-2">
            <input type="color" value={v.accent_color || '#E10600'} onChange={(e) => set('accent_color', e.target.value)}
              className="h-10 w-12 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)]" />
            <input value={v.accent_color || ''} onChange={(e) => set('accent_color', e.target.value)}
              className="flex-1 h-10 px-3 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)] font-mono" />
          </div>
        </label>
        <label className="text-[11px] text-[var(--text-secondary)]">
          Sort order (lower = first)
          <input data-testid="event-form-sort" type="number" value={v.sort_order ?? 0} onChange={(e) => set('sort_order', Number(e.target.value))}
            className="mt-0.5 w-full h-10 px-3 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] text-[13.5px] text-[var(--text-primary)]" />
        </label>
        <label className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-2 mt-5">
          <input type="checkbox" checked={!!v.is_published} onChange={(e) => set('is_published', e.target.checked)} />
          <span className="text-[12.5px] text-[var(--text-secondary)] font-bold">Published (visible on site)</span>
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-3 py-2 text-[12.5px] font-bold text-[var(--text-secondary)] hover:bg-[var(--glass-hover)]"><X className="w-3.5 h-3.5 inline mr-1" />Cancel</button>
        <button
          data-testid="event-form-save"
          disabled={busy || !v.title.trim()}
          onClick={onSave}
          className="rounded-lg bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] disabled:opacity-50 px-4 py-2 text-[12.5px] font-bold text-white inline-flex items-center gap-1"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save event</>}
        </button>
      </div>
    </div>
  );
}

export default function EventsTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const load = useCallback(async () => {
    setItems(null);
    const r = await adminClient(token).get('/events', { params: { tag: filter === 'all' ? undefined : filter, limit: pageSize, skip } });
    setItems(r.data.items);
    setTotal(r.data.total || r.data.items.length);
  }, [token, filter, skip]);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setDraft(EMPTY);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (ev) => {
    setDraft({ ...EMPTY, ...ev });
    setCreating(false);
    setEditing(ev.id);
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setDraft(EMPTY);
  };

  const save = async () => {
    setBusy(true);
    try {
      if (creating) {
        await adminClient(token).post('/events', draft);
        toast({ title: 'Event created' });
      } else if (editing) {
        await adminClient(token).patch(`/events/${editing}`, draft);
        toast({ title: 'Event updated' });
      }
      cancel();
      await load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  const del = async (ev) => {
    if (!window.confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    try {
      await adminClient(token).delete(`/events/${ev.id}`);
      toast({ title: 'Event deleted' });
      await load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    }
  };

  const togglePub = async (ev) => {
    try {
      await adminClient(token).patch(`/events/${ev.id}`, { is_published: !ev.is_published });
      await load();
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || e.message });
    }
  };

  return (
    <div data-testid="admin-events-tab">
      <AdminHeader
        title="Events & promotions"
        subtitle="Create promotional banners, tourist offers, holiday picks and seasonal deals shown on the public site."
        right={
          <button
            data-testid="event-new-btn"
            onClick={startCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white px-4 py-2.5 text-[13px] font-bold"
          >
            <Plus className="w-4 h-4" /> New event
          </button>
        }
      />

      <Panel className="mb-4">
        <div className="inline-flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <button
              key={t}
              data-testid={`events-filter-${t}`}
              onClick={() => { setFilter(t); setSkip(0); }}
              className={`rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.12em] border transition ${
                filter === t
                  ? 'bg-[hsl(var(--blue-700))] text-white border-[hsl(var(--blue-700))]'
                  : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[hsl(var(--blue-700))]/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Panel>

      {(creating || editing) && (
        <div className="mb-4">
          <EventForm value={draft} onChange={setDraft} onSave={save} onCancel={cancel} busy={busy} isNew={creating} />
        </div>
      )}

      {items === null && (
        <Panel><Loader2 className="w-5 h-5 animate-spin text-blue-300" /></Panel>
      )}

      {items?.length === 0 && !creating && (
        <Panel>
          <div className="py-8 text-center text-[var(--text-secondary)] text-[13px]">
            No events yet — click "New event" to create your first promotional banner.
          </div>
        </Panel>
      )}

      {items && items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((ev) => (
            <article
              key={ev.id}
              data-testid={`event-card-${ev.id}`}
              className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--glass-border)] overflow-hidden hover:border-white/15 transition"
            >
              <div
                className="aspect-[16/9] relative overflow-hidden"
                style={{ background: ev.accent_color || 'hsl(var(--blue-700))' }}
              >
                {ev.image_url && (
                  <img loading="lazy" decoding="async" src={ev.image_url} alt={ev.title} className="absolute inset-0 h-full w-full object-cover opacity-70" />
                )}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  {!ev.is_published && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black/60 text-[var(--text-secondary)] text-[11px] uppercase tracking-[0.12em] font-bold">
                      Hidden
                    </span>
                  )}
                  {ev.tag && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black/60 text-[var(--text-primary)] text-[11px] uppercase tracking-[0.12em] font-bold">
                      <Tag className="w-2.5 h-2.5 mr-1" /> {ev.tag}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-[var(--text-primary)]">
                  <div className="text-[15.5px] font-display font-bold tracking-[-0.02em] leading-tight">{ev.title}</div>
                  {ev.subtitle && <div className="text-[12.5px] text-[var(--text-primary)]/85 mt-0.5">{ev.subtitle}</div>}
                </div>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(ev.updated_at || ev.created_at).toLocaleDateString('en-IN')}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    data-testid={`event-toggle-${ev.id}`}
                    onClick={() => togglePub(ev)}
                    className="inline-flex items-center gap-1 rounded-md bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] px-2 py-1 text-[11px] font-bold text-[var(--text-primary)]"
                  >
                    {ev.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    data-testid={`event-edit-${ev.id}`}
                    onClick={() => startEdit(ev)}
                    className="inline-flex items-center gap-1 rounded-md bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] px-2 py-1 text-[11px] font-bold text-[var(--text-primary)]"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    data-testid={`event-delete-${ev.id}`}
                    onClick={() => del(ev)}
                    className="inline-flex items-center gap-1 rounded-md bg-red-500/10 hover:bg-red-500/20 px-2 py-1 text-[11px] font-bold text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {items && items.length > 0 && (
        <div className="mt-4"><Pagination skip={skip} limit={pageSize} total={total} onPageChange={setSkip} /></div>
      )}
    </div>
  );
}

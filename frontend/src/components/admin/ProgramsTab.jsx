import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Pencil, Trash2, X, Save, Search, GraduationCap } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminClient } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { useDialogA11y } from '../../hooks/use-dialog-a11y';

const DEGREE_TYPES = ['bachelor', 'master', 'phd', 'diploma'];
const EMPTY_FORM = {
  university_id: '', name: '', degree_type: 'master', duration_years: 1,
  tuition_usd: 0, application_fee_usd: 0, ielts_min: '', toefl_min: '',
  gre_required: false, gmat_required: false, intake_months: ['Sep', 'Jan'],
  entry_requirements: '', description: '', language: 'English', campus: '', url: '',
};

export default function ProgramsTab() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const dialogProps = useDialogA11y(showForm, () => setShowForm(false));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q = query) => {
    const params = { limit: 200 };
    if (q.trim()) params.university_id = q.trim();
    try {
      const { data } = await adminClient(token).get('/programs', { params });
      setItems(data.items);
      setTotal(data.total);
    } catch { toast({ title: 'Failed to load programs' }); }
  }, [token, query, toast]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load is recreated each render; re-run only when the listed inputs change
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({
      university_id: item.university_id || '',
      name: item.name || '',
      degree_type: item.degree_type || 'master',
      duration_years: item.duration_years || 1,
      tuition_usd: item.tuition_usd || 0,
      application_fee_usd: item.application_fee_usd || 0,
      ielts_min: item.ielts_min ?? '',
      toefl_min: item.toefl_min ?? '',
      gre_required: item.gre_required || false,
      gmat_required: item.gmat_required || false,
      intake_months: item.intake_months || ['Sep', 'Jan'],
      entry_requirements: item.entry_requirements || '',
      description: item.description || '',
      language: item.language || 'English',
      campus: item.campus || '',
      url: item.url || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.university_id || !form.name) { toast({ title: 'University ID and name are required' }); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        ielts_min: form.ielts_min === '' ? null : Number(form.ielts_min),
        toefl_min: form.toefl_min === '' ? null : Number(form.toefl_min),
        duration_years: Number(form.duration_years),
        tuition_usd: Number(form.tuition_usd),
        application_fee_usd: Number(form.application_fee_usd),
      };
      if (editing) {
        await adminClient(token).patch(`/programs/${editing}`, body);
        toast({ title: 'Program updated' });
      } else {
        await adminClient(token).post('/programs', body);
        toast({ title: 'Program created' });
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.detail || e.message });
    }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete program "${name}"?`)) return;
    try {
      await adminClient(token).delete(`/programs/${id}`);
      toast({ title: 'Deleted' });
      load();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.response?.data?.detail || e.message });
    }
  };

  const toggleIntake = (m) => {
    setForm(f => ({
      ...f,
      intake_months: f.intake_months.includes(m)
        ? f.intake_months.filter(x => x !== m)
        : [...f.intake_months, m].sort(),
    }));
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div data-testid="admin-programs-tab">
      <AdminHeader title="Programs" subtitle="Manage per-university program/course details." />

      <div className="flex items-center gap-3 mb-4">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by university ID..." className="flex-1 h-10 px-4 rounded-xl bg-[var(--panel-bg)] border border-[var(--glass-border)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[#011CB5] max-w-sm" />
        <button onClick={() => load()} className="h-10 px-4 rounded-xl bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[var(--text-primary)] text-[13px] font-bold">Filter</button>
        <button onClick={openCreate} className="h-10 px-4 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-[var(--text-primary)] text-[13px] font-bold flex items-center gap-1.5 ml-auto"><Plus className="w-4 h-4" /> New Program</button>
      </div>

      <Panel className="overflow-hidden">
        {items === null ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)] text-[14px]">No programs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--glass-border)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                  <th className="text-left py-2.5 px-2">University</th>
                  <th className="text-left py-2.5 px-2">Program</th>
                  <th className="text-left py-2.5 px-2">Degree</th>
                  <th className="text-right py-2.5 px-2">Tuition</th>
                  <th className="text-center py-2.5 px-2">IELTS</th>
                  <th className="text-center py-2.5 px-2">Yrs</th>
                  <th className="text-right py-2.5 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.id} className="border-b border-[var(--glass-border)] hover:bg-[var(--glass-hover)] transition">
                    <td className="py-2.5 px-2 text-[var(--text-secondary)] font-mono text-[11px]">{p.university_id?.slice(0, 30)}</td>
                    <td className="py-2.5 px-2 text-[var(--text-primary)] font-semibold">{p.name}</td>
                    <td className="py-2.5 px-2"><span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--glass-hover)] text-[var(--text-secondary)]">{p.degree_type}</span></td>
                    <td className="py-2.5 px-2 text-right text-[var(--text-secondary)]">${(p.tuition_usd || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-center text-[var(--text-secondary)]">{p.ielts_min || '—'}</td>
                    <td className="py-2.5 px-2 text-center text-[var(--text-secondary)]">{p.duration_years}</td>
                    <td className="py-2.5 px-2 text-right">
                      <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[var(--text-secondary)] px-2 py-1.5 text-[11px] font-bold mr-1"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1.5 text-[11px] font-bold"><Trash2 className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 text-[11px] text-[var(--text-secondary)]">{total} total programs</div>
      </Panel>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div {...dialogProps} className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--glass-border)] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--panel-bg)] flex items-center justify-between p-5 border-b border-[var(--glass-border)]">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">{editing ? 'Edit Program' : 'New Program'}</h3>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-lg bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] flex items-center justify-center"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label htmlFor="programstab-university-id" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">University ID *</label>
                <input id="programstab-university-id" value={form.university_id} onChange={e => setForm(f => ({ ...f, university_id: e.target.value }))} placeholder="e.g. us-massachusetts-institute-of-technology" className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
              <div className="col-span-2">
                <label htmlFor="programstab-program-name" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Program Name *</label>
                <input id="programstab-program-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Master of Science in Computer Science" className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
              <div>
                <label htmlFor="programstab-degree-type" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Degree Type</label>
                <select id="programstab-degree-type" value={form.degree_type} onChange={e => setForm(f => ({ ...f, degree_type: e.target.value }))} className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none">
                  {DEGREE_TYPES.map(dt => <option key={dt} value={dt}>{dt.charAt(0).toUpperCase() + dt.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="programstab-duration-years" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Duration (years)</label>
                <input id="programstab-duration-years" type="number" step="0.5" min="0.5" max="8" value={form.duration_years} onChange={e => setForm(f => ({ ...f, duration_years: e.target.value }))} className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
              <div>
                <label htmlFor="programstab-tuition-usd-yr" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Tuition (USD/yr)</label>
                <input id="programstab-tuition-usd-yr" type="number" min="0" value={form.tuition_usd} onChange={e => setForm(f => ({ ...f, tuition_usd: e.target.value }))} className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
              <div>
                <label htmlFor="programstab-application-fee-usd" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Application Fee (USD)</label>
                <input id="programstab-application-fee-usd" type="number" min="0" value={form.application_fee_usd} onChange={e => setForm(f => ({ ...f, application_fee_usd: e.target.value }))} className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
              <div>
                <label htmlFor="programstab-ielts-min" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">IELTS Min</label>
                <input id="programstab-ielts-min" type="number" step="0.5" min="0" max="9" value={form.ielts_min} onChange={e => setForm(f => ({ ...f, ielts_min: e.target.value }))} className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
              <div>
                <label htmlFor="programstab-toefl-min" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">TOEFL Min</label>
                <input id="programstab-toefl-min" type="number" min="0" max="120" value={form.toefl_min} onChange={e => setForm(f => ({ ...f, toefl_min: e.target.value }))} className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
              <div className="flex items-center gap-4 pt-5">
                <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]"><input type="checkbox" checked={form.gre_required} onChange={e => setForm(f => ({ ...f, gre_required: e.target.checked }))} className="accent-[hsl(var(--blue-700))]" /> GRE Required</label>
                <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]"><input type="checkbox" checked={form.gmat_required} onChange={e => setForm(f => ({ ...f, gmat_required: e.target.checked }))} className="accent-[hsl(var(--blue-700))]" /> GMAT Required</label>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Language</label>
                <input value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
              <div>
                <label htmlFor="programstab-campus" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Campus</label>
                <input id="programstab-campus" value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))} placeholder="Main campus" className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
              <div className="col-span-2">
                <label id="programstab-intake-months" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Intake Months</label>
                <div role="group" aria-labelledby="programstab-intake-months" className="flex flex-wrap gap-1.5">
                  {MONTHS.map(m => (
                    <button key={m} onClick={() => toggleIntake(m)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${form.intake_months.includes(m) ? 'bg-emerald-600 text-[var(--text-primary)]' : 'bg-[var(--glass-hover)] text-[var(--text-secondary)] hover:bg-[var(--glass-hover)]'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label htmlFor="programstab-entry-requirements" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Entry Requirements</label>
                <textarea id="programstab-entry-requirements" value={form.entry_requirements} onChange={e => setForm(f => ({ ...f, entry_requirements: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5] resize-none" />
              </div>
              <div className="col-span-2">
                <label htmlFor="programstab-description" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Description</label>
                <textarea id="programstab-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5] resize-none" />
              </div>
              <div className="col-span-2">
                <label htmlFor="programstab-program-url" className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Program URL</label>
                <input id="programstab-program-url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="w-full h-9 px-3 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] outline-none focus:border-[#011CB5]" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-[var(--panel-bg)] flex justify-end gap-2 p-5 border-t border-[var(--glass-border)]">
              <button onClick={() => setShowForm(false)} className="h-10 px-5 rounded-xl bg-[var(--glass-hover)] hover:bg-[var(--glass-hover)] text-[var(--text-primary)] text-[13px] font-bold">Cancel</button>
              <button disabled={saving} onClick={handleSave} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] disabled:opacity-50 text-[var(--text-primary)] text-[13px] font-bold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

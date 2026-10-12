import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Pencil, Save, X, Loader2, BadgeCheck, AlertCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

/**
 * Drives the AI-autofilled / manually-edited application form_data.
 *
 * `value` comes from `application.form_data` returned by the backend.
 * On Save we PATCH /api/users/me/applications/{id}/form which merges
 * the new fields into Mongo and bumps `form_updated_at`.
 */

const FIELDS = [
  { key: 'full_name',         label: 'Full name',         placeholder: 'As on passport' },
  { key: 'passport_number',   label: 'Passport number',   placeholder: 'Z1234567' },
  { key: 'date_of_birth',     label: 'Date of birth',     placeholder: 'YYYY-MM-DD', type: 'date' },
  { key: 'gender',            label: 'Gender',            placeholder: 'M / F / X' },
  { key: 'nationality',       label: 'Nationality',       placeholder: 'Indian' },
  { key: 'place_of_birth',    label: 'Place of birth',    placeholder: 'Mumbai' },
  { key: 'issue_date',        label: 'Issue date',        placeholder: 'YYYY-MM-DD', type: 'date' },
  { key: 'expiry_date',       label: 'Expiry date',       placeholder: 'YYYY-MM-DD', type: 'date' },
  { key: 'issuing_country',   label: 'Issuing country',   placeholder: 'India' },
  { key: 'issuing_authority', label: 'Issuing authority', placeholder: 'PSK Mumbai' },
  { key: 'address',           label: 'Address',           placeholder: 'Flat / Street / City', wide: true },
  { key: 'email',             label: 'Email',             placeholder: 'you@example.com', type: 'email' },
  { key: 'phone',             label: 'Mobile',            placeholder: '+91 9XXXX XXXXX', type: 'tel' },
];

const filledCount = (data) => FIELDS.reduce(
  (n, f) => (data && data[f.key] ? n + 1 : n), 0,
);

export default function ApplicationFormCard({ application, onUpdated }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(application?.form_data || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(application?.form_data || {});
  }, [application?.form_data]);

  const data = application?.form_data || {};
  const total = FIELDS.length;
  const filled = filledCount(data);
  const isEmpty = filled === 0;

  const onSave = async () => {
    setSaving(true);
    try {
      const r = await axios.patch(
        `${API}/users/me/applications/${application.id}/form`,
        { form_data: draft },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onUpdated?.(r.data?.form_data || {});
      toast({ title: 'Saved', description: 'Application form updated.' });
      setEditing(false);
    } catch (e) {
      toast({
        title: 'Could not save',
        description: e?.response?.data?.detail || 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setDraft(application?.form_data || {});
    setEditing(false);
  };

  const onChange = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <section className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden" data-testid="application-form-card">
      <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--blue-50))] shrink-0">
            <Sparkles className="w-4 h-4 text-[hsl(var(--blue-700))]" />
          </span>
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--blue-700))]">
              {isEmpty ? 'Application form' : 'AI auto-filled'}
            </div>
            <div className="text-[13px] text-muted-foreground truncate">
              {isEmpty
                ? 'Scan your passport or fill these fields manually.'
                : `${filled} of ${total} fields ready · saved to your draft.`}
            </div>
          </div>
        </div>
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            data-testid="form-edit-btn"
            className="rounded-xl h-10 px-4 font-semibold border-slate-300 hover:border-[hsl(var(--blue-700))]/30"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            {isEmpty ? 'Fill in' : 'Edit'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={saving}
              data-testid="form-cancel-btn"
              className="rounded-xl h-10 px-4 font-semibold border-slate-300"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button variant="accent"
              size="sm"
              onClick={onSave}
              disabled={saving}
              data-testid="form-save-btn"
              className="rounded-xl h-10 px-4 font-semibold text-white"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                <span className="inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</span>
              )}
            </Button>
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="px-5 sm:px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {FIELDS.map((f) => (
              <label
                key={f.key}
                className={`block ${f.wide ? 'sm:col-span-2' : ''} rounded-2xl bg-[hsl(var(--soft-bg))] border border-border px-4 py-2.5 hover:border-[hsl(var(--blue-700))]/25 focus-within:border-[hsl(var(--blue-700))]/35 transition`}
              >
                <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground">
                  {f.label}
                </div>
                <input
                  data-testid={`form-input-${f.key}`}
                  type={f.type || 'text'}
                  value={draft[f.key] || ''}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-transparent border-0 outline-none focus:outline-none placeholder:text-[hsl(var(--blue-900))]/35 text-[14px] font-bold text-[hsl(var(--blue-900))]"
                />
              </label>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {isEmpty ? (
              <div className="px-5 sm:px-6 py-8 text-center text-[13px] text-muted-foreground flex flex-col items-center gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <p className="max-w-sm">
                  Nothing here yet. Click <strong className="text-[hsl(var(--blue-900))]">Scan with AI</strong> at the top to
                  lift fields from your passport, or use <strong className="text-[hsl(var(--blue-900))]">Fill in</strong>.
                </p>
              </div>
            ) : (
              <dl className="px-5 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[13.5px]">
                {FIELDS.filter((f) => data[f.key]).map((f) => (
                  <div key={f.key} className="flex justify-between gap-3 border-b border-border py-1.5">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="font-bold text-[hsl(var(--blue-900))] truncate">{data[f.key]}</dd>
                  </div>
                ))}
              </dl>
            )}
            {!isEmpty && (
              <div className="px-5 sm:px-6 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-2 text-[12px] text-emerald-800">
                <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                Saved to your draft. These values will prefill your visa form on submission.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

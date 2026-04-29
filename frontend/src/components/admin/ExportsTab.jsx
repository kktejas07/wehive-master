import { useState } from 'react';
import { Download, Loader2, Users, FileStack, Globe, Banknote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadCsv } from '../../lib/admin';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';

const EXPORTS = [
  { id: 'users',        title: 'Users',        sub: 'All registered accounts, roles and premium flags.', Icon: Users,     accent: 'text-indigo-300' },
  { id: 'applications', title: 'Applications', sub: 'Every visa application with customer + revenue.',   Icon: FileStack, accent: 'text-amber-300' },
  { id: 'countries',    title: 'Countries',    sub: 'All 250 countries, delivery & appointment rules.',  Icon: Globe,     accent: 'text-sky-300' },
  { id: 'revenue',      title: 'Revenue',      sub: 'Billable apps only (submitted + review + approved).', Icon: Banknote, accent: 'text-emerald-300' },
];

export default function ExportsTab() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(null);

  const run = async (kind) => {
    setBusy(kind);
    try {
      await downloadCsv(token, kind);
      toast({ title: `Downloaded ${kind}.csv` });
    } catch (e) {
      toast({ title: 'Export failed', description: e?.message || 'Try again' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-testid="admin-exports-tab">
      <AdminHeader
        title="CSV exports"
        subtitle="One-click downloads for bookkeeping, BI tools and board reports."
      />
      <div className="grid sm:grid-cols-2 gap-4">
        {EXPORTS.map((x) => {
          const Icon = x.Icon;
          const isBusy = busy === x.id;
          return (
            <Panel key={x.id}>
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-3">
                  <span className={`h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white/5 ${x.accent}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="text-[15px] font-display font-extrabold text-white">{x.title}</div>
                    <div className="text-[12.5px] text-slate-400 max-w-[260px]">{x.sub}</div>
                  </div>
                </div>
                <button
                  data-testid={`export-${x.id}-btn`}
                  disabled={isBusy}
                  onClick={() => run(x.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--accent))] hover:brightness-110 disabled:opacity-60 text-white px-3.5 py-2 text-[13px] font-bold"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> Export</>}
                </button>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

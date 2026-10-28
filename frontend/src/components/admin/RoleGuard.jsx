import { useAdminAuth } from '../../context/AdminAuthContext';
import { canWrite, adminRole } from '../../lib/admin';
import { Panel } from './AdminShell';
import { ShieldAlert } from 'lucide-react';

export default function RoleGuard({ allowed, area, readOnly, children }) {
  const { admin } = useAdminAuth();
  const role = adminRole(admin);

  if (!role) return null;

  if (allowed && !allowed.includes(role) && role !== 'super_admin' && role !== 'manager') {
    return (
      <div data-testid="admin-role-guard-blocked">
        <Panel className="max-w-lg">
          <div className="flex items-center gap-3 text-slate-300 text-[14px]">
            <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
            Your role does not have access to this section.
          </div>
        </Panel>
      </div>
    );
  }

  if (area && !canWrite(admin, area)) {
    if (readOnly) return children;
    return (
      <div data-testid="admin-role-guard-readonly">
        <Panel className="max-w-lg">
          <div className="flex items-center gap-3 text-slate-300 text-[14px]">
            <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
            You have read-only access to this section.
          </div>
        </Panel>
      </div>
    );
  }

  return children;
}

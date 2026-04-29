import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminShell from '../components/admin/AdminShell';
import OverviewTab from '../components/admin/OverviewTab';
import UsersTab from '../components/admin/UsersTab';
import ApplicationsTab from '../components/admin/ApplicationsTab';
import CountriesTab from '../components/admin/CountriesTab';
import StaffTab from '../components/admin/StaffTab';
import IntegrationsTab from '../components/admin/IntegrationsTab';
import ExportsTab from '../components/admin/ExportsTab';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function Admin() {
  const { user, loading, isAuthed, openAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthed) {
      openAuth('login');
      navigate('/', { replace: true });
    }
  }, [loading, isAuthed, openAuth, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0b1020] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent))]" />
      </div>
    );
  }

  if (!user.is_admin) {
    return (
      <div className="min-h-screen bg-[#0b1020] flex items-center justify-center px-6" data-testid="admin-forbidden">
        <div className="max-w-md text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-300 mb-4">
            <ShieldAlert className="w-6 h-6" />
          </span>
          <h1 className="font-display font-extrabold text-[28px] text-white tracking-[-0.02em]">Admin access required</h1>
          <p className="mt-2 text-[14px] text-slate-400">
            Your account ({user.email || user.phone}) is not on the admin allow-list. Ask a super admin
            to add your email to <code className="text-slate-300">ADMIN_EMAILS</code> in <code className="text-slate-300">backend/.env</code>.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 rounded-full btn-accent text-white h-10 px-5 font-bold text-[13.5px]"
            data-testid="admin-back-home"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminShell>
      <Routes>
        <Route index element={<OverviewTab />} />
        <Route path="users" element={<UsersTab />} />
        <Route path="applications" element={<ApplicationsTab />} />
        <Route path="countries" element={<CountriesTab />} />
        <Route path="staff" element={<StaffTab />} />
        <Route path="integrations" element={<IntegrationsTab />} />
        <Route path="exports" element={<ExportsTab />} />
        <Route path="*" element={<OverviewTab />} />
      </Routes>
    </AdminShell>
  );
}

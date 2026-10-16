import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext';
import AdminShell, { Panel } from '../components/admin/AdminShell';
import OverviewTab from '../components/admin/OverviewTab';
import UsersTab from '../components/admin/UsersTab';
import ApplicationsTab from '../components/admin/ApplicationsTab';
import ApplicationCase from '../components/admin/ApplicationCase';
import CountriesTab from '../components/admin/CountriesTab';
import StaffTab from '../components/admin/StaffTab';
import AdminsTab from '../components/admin/AdminsTab';
import NewsletterTab from '../components/admin/NewsletterTab';
import IntegrationsTab from '../components/admin/IntegrationsTab';
import ExportsTab from '../components/admin/ExportsTab';
import UniversitiesTab from '../components/admin/UniversitiesTab';
import ProgramsTab from '../components/admin/ProgramsTab';
import PricingTab from '../components/admin/PricingTab';
import EventsTab from '../components/admin/EventsTab';
import GlobalEventsTab from '../components/admin/GlobalEventsTab';
import ContentModerationTab from '../components/admin/ContentModerationTab';
import SettingsTab from '../components/admin/SettingsTab';
import DestinationsTab from '../components/admin/DestinationsTab';
import RequestsTab from '../components/admin/RequestsTab';
import PromotionsTab from '../components/admin/PromotionsTab';
import PromoCodesTab from '../components/admin/PromoCodesTab';
import AgentsTab from '../components/admin/AgentsTab';
import RAGTab from '../components/admin/RAGTab';
import PromptsTab from '../components/admin/PromptsTab';
import AgentsV2Tab from '../components/admin/AgentsV2Tab';
import HiveLearningTab from '../components/admin/HiveLearningTab';
import LeadsTab from '../components/admin/LeadsTab';
import PaymentsTab from '../components/admin/PaymentsTab';
import AuditTab from '../components/admin/AuditTab';
import AdminLogin from './AdminLogin';
import AdminSignup from './AdminSignup';
import AdminForgotPassword from './AdminForgotPassword';
import AdminResetPassword from './AdminResetPassword';
import { Loader2, ShieldAlert } from 'lucide-react';

function ProtectedAdmin({ children }) {
  const { admin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !admin) {
      const next = location.pathname + location.search;
      navigate(`/admin/login?next=${encodeURIComponent(next)}`, { replace: true, state: { from: location.pathname } });
    }
  }, [loading, admin, navigate, location.pathname, location.search]);

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-[#0b1020] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
      </div>
    );
  }
  return children;
}

function SuperOnly({ children }) {
  const { admin } = useAdminAuth();
  if (admin?.is_super_admin) return children;
  return (
    <div data-testid="admin-super-only">
      <Panel className="max-w-lg">
        <div className="flex items-center gap-3 text-slate-300 text-[14px]">
          <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
          Only a super admin can access this.
        </div>
      </Panel>
    </div>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="signup" element={<AdminSignup />} />
      <Route path="forgot-password" element={<AdminForgotPassword />} />
      <Route path="reset-password" element={<AdminResetPassword />} />
      <Route
        path="*"
        element={
          <ProtectedAdmin>
            <AdminShell>
              <Routes>
                <Route index element={<OverviewTab />} />
                <Route path="users" element={<UsersTab />} />
                <Route path="applications" element={<ApplicationsTab />} />
                <Route path="applications/:id" element={<ApplicationCase />} />
                <Route path="countries" element={<CountriesTab />} />
                <Route path="pricing" element={<PricingTab />} />
                <Route path="events" element={<EventsTab />} />
                <Route path="global-events" element={<GlobalEventsTab />} />
                <Route path="moderation" element={<ContentModerationTab />} />
                <Route path="requests" element={<RequestsTab />} />
                <Route path="promotions" element={<PromotionsTab />} />
                <Route path="promocodes" element={<PromoCodesTab />} />
                <Route path="agents" element={<AgentsTab />} />
                <Route path="staff" element={<StaffTab />} />
                <Route path="admins" element={<SuperOnly><AdminsTab /></SuperOnly>} />
                <Route path="newsletter" element={<NewsletterTab />} />
                <Route path="integrations" element={<SuperOnly><IntegrationsTab /></SuperOnly>} />
                <Route path="exports" element={<ExportsTab />} />
                <Route path="leads" element={<LeadsTab />} />
                <Route path="payments" element={<PaymentsTab />} />
                <Route path="audit" element={<AuditTab />} />
                <Route path="universities" element={<UniversitiesTab />} />
                <Route path="programs" element={<ProgramsTab />} />
                <Route path="settings" element={<SuperOnly><SettingsTab /></SuperOnly>} />
                <Route path="rag" element={<RAGTab />} />
                <Route path="prompts" element={<PromptsTab />} />
                <Route path="agents-v2" element={<AgentsV2Tab />} />
                <Route path="hive-learning" element={<HiveLearningTab />} />
                <Route path="destinations" element={<DestinationsTab />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </AdminShell>
          </ProtectedAdmin>
        }
      />
    </Routes>
  );
}

export default function Admin() {
  return (
    <AdminAuthProvider>
      <AdminRoutes />
    </AdminAuthProvider>
  );
}

import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext';
import AdminShell from '../components/admin/AdminShell';
import OverviewTab from '../components/admin/OverviewTab';
import UsersTab from '../components/admin/UsersTab';
import ApplicationsTab from '../components/admin/ApplicationsTab';
import CountriesTab from '../components/admin/CountriesTab';
import StaffTab from '../components/admin/StaffTab';
import IntegrationsTab from '../components/admin/IntegrationsTab';
import ExportsTab from '../components/admin/ExportsTab';
import UniversitiesTab from '../components/admin/UniversitiesTab';
import ProgramsTab from '../components/admin/ProgramsTab';
import PricingTab from '../components/admin/PricingTab';
import EventsTab from '../components/admin/EventsTab';
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
import AdminLogin from './AdminLogin';
import AdminSignup from './AdminSignup';
import AdminForgotPassword from './AdminForgotPassword';
import AdminResetPassword from './AdminResetPassword';
import { Loader2 } from 'lucide-react';

function ProtectedAdmin({ children }) {
  const { admin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login', { replace: true, state: { from: location.pathname } });
    }
  }, [loading, admin, navigate, location.pathname]);

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-[#0b1020] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent))]" />
      </div>
    );
  }
  return children;
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
                <Route path="countries" element={<CountriesTab />} />
                <Route path="pricing" element={<PricingTab />} />
                <Route path="events" element={<EventsTab />} />
                <Route path="requests" element={<RequestsTab />} />
                <Route path="promotions" element={<PromotionsTab />} />
                <Route path="promocodes" element={<PromoCodesTab />} />
                <Route path="agents" element={<AgentsTab />} />
                <Route path="staff" element={<StaffTab />} />
                <Route path="integrations" element={<IntegrationsTab />} />
                <Route path="exports" element={<ExportsTab />} />
                <Route path="universities" element={<UniversitiesTab />} />
                <Route path="programs" element={<ProgramsTab />} />
                <Route path="settings" element={<SettingsTab />} />
                <Route path="rag" element={<RAGTab />} />
                <Route path="prompts" element={<PromptsTab />} />
                <Route path="agents-v2" element={<AgentsV2Tab />} />
                <Route path="hive-learning" element={<HiveLearningTab />} />
                <Route path="destinations" element={<DestinationsTab />} />
                <Route path="*" element={<OverviewTab />} />
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

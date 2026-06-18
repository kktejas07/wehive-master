import { useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, API } from './context/AuthContext';
import { FirebaseAuthProvider } from './context/FirebaseAuthContext';
import { I18nProvider } from './context/I18nContext';
import { ThemeProvider } from './components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import ChatbotWidget from './components/ChatbotWidget';
import PageTransition from './components/PageTransition';
import PrivateRoute from './components/PrivateRoute';
import RouteFallback from './components/RouteFallback';
import { Toaster } from './components/ui/toaster';
import { setPricing } from './components/FeeBreakdown';
import { setCurrency } from './lib/utils';

// Lazy-loaded route components — each becomes its own JS chunk so the
// landing page boots fast and other pages stream in only when visited.
const Home = lazy(() => import('./pages/Home'));
const VisaDetail = lazy(() => import('./pages/VisaDetail'));
const About = lazy(() => import('./pages/About'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Account = lazy(() => import('./pages/Account'));
const Admin = lazy(() => import('./pages/Admin'));
const HolidayPlanner = lazy(() => import('./pages/HolidayPlanner'));
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail'));
const TrackStatus = lazy(() => import('./pages/TrackStatus'));
const Help = lazy(() => import('./pages/Help'));
const Contact = lazy(() => import('./pages/Contact'));
const StudentVisa = lazy(() => import('./pages/StudentVisa'));
const VisaInterview = lazy(() => import('./pages/VisaInterview'));
const UniversityDetail = lazy(() => import('./pages/UniversityDetail'));
const ProgramList = lazy(() => import('./pages/ProgramList'));
const MapView = lazy(() => import('./pages/MapView'));
const AgentLogin = lazy(() => import('./pages/AgentLogin'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const AgentApplications = lazy(() => import('./pages/AgentApplications'));
const AgentStudents = lazy(() => import('./pages/AgentStudents'));
const VisaScheduling = lazy(() => import('./pages/VisaScheduling'));
const AgentPortal = lazy(() => import('./pages/AgentPortal'));
const StudentResources = lazy(() => import('./pages/StudentResources'));
const IntakeCalendar = lazy(() => import('./pages/IntakeCalendar'));
const SharedShortlist = lazy(() => import('./pages/SharedShortlist'));
const EmailVerification = lazy(() => import('./pages/EmailVerification'));
const FinancialTools = lazy(() => import('./pages/FinancialTools'));
const AgentTraining = lazy(() => import('./pages/AgentTraining'));
const EmergencyCare = lazy(() => import('./pages/EmergencyCare'));
const VisaChecker = lazy(() => import('./pages/VisaChecker'));
const Hive = lazy(() => import('./pages/Hive'));

function PricingLoader() {
  useEffect(() => {
    const timer = setTimeout(() => {
      axios.get(`${API}/public/pricing`).then((r) => {
        setPricing(r.data);
        if (r.data.currency) setCurrency(r.data.currency);
      }).catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/visa/:id" element={<PageTransition><VisaDetail /></PageTransition>} />
          <Route path="/holiday/:id" element={<PageTransition><HolidayPlanner /></PageTransition>} />
          <Route path="/about" element={<PageTransition><About /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
          <Route path="/__/auth/action" element={<EmailVerification />} />
          <Route path="/account" element={<PrivateRoute><PageTransition><Account /></PageTransition></PrivateRoute>} />
          <Route path="/account/applications/:id" element={<PrivateRoute><PageTransition><ApplicationDetail /></PageTransition></PrivateRoute>} />
          <Route path="/track/:id" element={<PageTransition><TrackStatus /></PageTransition>} />
          <Route path="/help" element={<PageTransition><Help /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/student-visa" element={<PageTransition><StudentVisa /></PageTransition>} />
          <Route path="/visa-interview" element={<PageTransition><VisaInterview /></PageTransition>} />
          <Route path="/universities" element={<Navigate to="/student-visa" replace />} />
          <Route path="/university/:id" element={<PageTransition><UniversityDetail /></PageTransition>} />
          <Route path="/programs/:universityId" element={<PageTransition><ProgramList /></PageTransition>} />
          <Route path="/map" element={<PageTransition><MapView /></PageTransition>} />
          <Route path="/resources" element={<PageTransition><StudentResources /></PageTransition>} />
          <Route path="/intake-calendar" element={<PageTransition><IntakeCalendar /></PageTransition>} />
          <Route path="/shared/:token" element={<PageTransition><SharedShortlist /></PageTransition>} />
          <Route path="/financial-tools" element={<PageTransition><FinancialTools /></PageTransition>} />
          <Route path="/agent-training" element={<PageTransition><AgentTraining /></PageTransition>} />
          <Route path="/emergency" element={<PageTransition><EmergencyCare /></PageTransition>} />
          <Route path="/visa-scheduling" element={<PageTransition><VisaScheduling /></PageTransition>} />
          <Route path="/visa-checker" element={<PageTransition><VisaChecker /></PageTransition>} />
          <Route path="/hive" element={<PageTransition><Hive /></PageTransition>} />
          <Route path="/agent-portal/login" element={<PageTransition><AgentLogin /></PageTransition>} />
          <Route path="/agent/*" element={<PageTransition><AgentPortal /></PageTransition>} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<PageTransition><Home /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <FirebaseAuthProvider>
                <PricingLoader />
                <ScrollToTop />
                <ErrorBoundary>
                  <AnimatedRoutes />
                </ErrorBoundary>
                <ChatbotWidget />
                <Toaster />
              </FirebaseAuthProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;

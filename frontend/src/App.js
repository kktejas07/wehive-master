import { useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, API } from './context/AuthContext';
import { FirebaseAuthProvider } from './context/FirebaseAuthContext';
import { I18nProvider } from './context/I18nContext';
import { ThemeProvider } from './components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import AuthModal from './components/AuthModal';
import ChatbotWidget from './components/ChatbotWidget';
import PageTransition from './components/PageTransition';
import RouteFallback from './components/RouteFallback';
import { Toaster } from './components/ui/toaster';
import { setPricing } from './components/FeeBreakdown';

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
const UniversityComparison = lazy(() => import('./pages/UniversityComparison'));
const UniversityDetail = lazy(() => import('./pages/UniversityDetail'));
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
const FinancialTools = lazy(() => import('./pages/FinancialTools'));
const AgentTraining = lazy(() => import('./pages/AgentTraining'));

function PricingLoader() {
  useEffect(() => {
    const timer = setTimeout(() => {
      axios.get(`${API}/public/pricing`).then((r) => setPricing(r.data)).catch(() => {});
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
          <Route path="/account" element={<PageTransition><Account /></PageTransition>} />
          <Route path="/account/applications/:id" element={<PageTransition><ApplicationDetail /></PageTransition>} />
          <Route path="/track/:id" element={<PageTransition><TrackStatus /></PageTransition>} />
          <Route path="/help" element={<PageTransition><Help /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/student-visa" element={<PageTransition><StudentVisa /></PageTransition>} />
          <Route path="/visa-interview" element={<PageTransition><VisaInterview /></PageTransition>} />
          <Route path="/universities" element={<PageTransition><UniversityComparison /></PageTransition>} />
          <Route path="/university/:id" element={<PageTransition><UniversityDetail /></PageTransition>} />
          <Route path="/map" element={<PageTransition><MapView /></PageTransition>} />
          <Route path="/resources" element={<PageTransition><StudentResources /></PageTransition>} />
          <Route path="/intake-calendar" element={<PageTransition><IntakeCalendar /></PageTransition>} />
          <Route path="/shared/:token" element={<PageTransition><SharedShortlist /></PageTransition>} />
          <Route path="/financial-tools" element={<PageTransition><FinancialTools /></PageTransition>} />
          <Route path="/agent-training" element={<PageTransition><AgentTraining /></PageTransition>} />
          <Route path="/visa-scheduling" element={<PageTransition><VisaScheduling /></PageTransition>} />
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
                <AuthModal />
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

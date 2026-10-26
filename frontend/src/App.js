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
import { getPageTitle } from './lib/pageTitles';
import { AnalyticsRoot } from './analytics/components/AnalyticsRoot';
import { trackScreen } from './analytics';

// Lazy-loaded route components — each becomes its own JS chunk so the
// landing page boots fast and other pages stream in only when visited.
const Home = lazy(() => import('./pages/Home'));
const NotFound = lazy(() => import('./pages/NotFound'));
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
const VisaAssessment = lazy(() => import('./pages/VisaAssessment'));
const CountryHub = lazy(() => import('./pages/CountryHub'));
const TrackPortal = lazy(() => import('./pages/TrackPortal'));
const Help = lazy(() => import('./pages/Help'));
const Contact = lazy(() => import('./pages/Contact'));
const NewsletterStatus = lazy(() => import('./pages/NewsletterStatus'));
const StudentVisa = lazy(() => import('./pages/StudentVisa'));
const VisaInterview = lazy(() => import('./pages/VisaInterview'));
const VisaInterviewSandbox = lazy(() => import('./pages/VisaInterviewSandbox'));
const UniversityDetail = lazy(() => import('./pages/UniversityDetail'));
const ProgramList = lazy(() => import('./pages/ProgramList'));
const MapView = lazy(() => import('./pages/MapView'));
const AgentLogin = lazy(() => import('./pages/AgentLogin'));
const VisaScheduling = lazy(() => import('./pages/VisaScheduling'));
const AgentPortal = lazy(() => import('./pages/AgentPortal'));
const StudentResources = lazy(() => import('./pages/StudentResources'));
const IntakeCalendar = lazy(() => import('./pages/IntakeCalendar'));
const SharedShortlist = lazy(() => import('./pages/SharedShortlist'));
const EmailVerification = lazy(() => import('./pages/EmailVerification'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const FinancialTools = lazy(() => import('./pages/FinancialTools'));
const AgentTraining = lazy(() => import('./pages/AgentTraining'));
const EmergencyCare = lazy(() => import('./pages/EmergencyCare'));
const VisaChecker = lazy(() => import('./pages/VisaChecker'));
const FreeConsultation = lazy(() => import('./pages/FreeConsultation'));
const Hive = lazy(() => import('./pages/Hive'));
const USVisaSlots = lazy(() => import('./pages/USVisaSlots'));
const UniversityApply = lazy(() => import('./pages/UniversityApply'));
const GlobalEvents = lazy(() => import('./pages/GlobalEvents'));
const Blog = lazy(() => import('./pages/Blog'));
const Community = lazy(() => import('./pages/Community'));
const News = lazy(() => import('./pages/News'));
const ApplicantFlow = lazy(() => import('./pages/ApplicantFlow'));
const SOPBuilder = lazy(() => import('./pages/SOPBuilder'));

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

// Resets the error boundary on navigation so one crashed page doesn't stick.
function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

function AnimatedRoutes() {
  const location = useLocation();

  useEffect(() => {
    document.title = getPageTitle(location.pathname);
    trackScreen(location.pathname.replace('/', '') || 'home', { path: location.pathname });
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        {/* Keyed by top-level section so sub-navigation (e.g. /admin/*) doesn't remount the section */}
        <Routes location={location} key={location.pathname.split('/')[1]}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/visa/:id" element={<PageTransition><VisaDetail /></PageTransition>} />
          <Route path="/holiday/:id" element={<PageTransition><HolidayPlanner /></PageTransition>} />
          <Route path="/about" element={<PageTransition><About /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/tools/visa-checker" element={<Navigate to="/visa-checker" replace />} />
          <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
          <Route path="/__/auth/action" element={<EmailVerification />} />
          <Route path="/verify-email" element={<PageTransition><VerifyEmail /></PageTransition>} />
          <Route path="/account" element={<PrivateRoute><PageTransition><Account /></PageTransition></PrivateRoute>} />
          <Route path="/account/applications/:id" element={<PrivateRoute><PageTransition><ApplicationDetail /></PageTransition></PrivateRoute>} />
          <Route path="/track/:id" element={<PageTransition><TrackStatus /></PageTransition>} />
          <Route path="/track" element={<PageTransition><TrackPortal /></PageTransition>} />
          <Route path="/assessment" element={<PrivateRoute><PageTransition><VisaAssessment /></PageTransition></PrivateRoute>} />
          <Route path="/destinations/:countryId" element={<PageTransition><CountryHub /></PageTransition>} />
          <Route path="/visa-interview-sandbox" element={<PrivateRoute><PageTransition><VisaInterviewSandbox /></PageTransition></PrivateRoute>} />
          <Route path="/help" element={<PageTransition><Help /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/newsletter/:action" element={<PageTransition><NewsletterStatus /></PageTransition>} />
          <Route path="/student-visa" element={<PageTransition><StudentVisa /></PageTransition>} />
          <Route path="/visa-interview" element={<PrivateRoute><PageTransition><VisaInterview /></PageTransition></PrivateRoute>} />
          <Route path="/universities" element={<Navigate to="/student-visa" replace />} />
          {/* Bug 5: /signin was returning 404 — redirect to the real login route */}
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          {/* Bug 6: /tools/visa-checker was returning 404 — redirect to the real route */}
          <Route path="/tools/visa-checker" element={<Navigate to="/visa-checker" replace />} />
          <Route path="/tools/:tool" element={<Navigate to="/visa-checker" replace />} />
          <Route path="/university/:id" element={<PageTransition><UniversityDetail /></PageTransition>} />
          <Route path="/programs/:universityId" element={<PageTransition><ProgramList /></PageTransition>} />
          <Route path="/apply/universities" element={<PageTransition><UniversityApply /></PageTransition>} />
          <Route path="/map" element={<PageTransition><MapView /></PageTransition>} />
          <Route path="/resources" element={<PageTransition><StudentResources /></PageTransition>} />
          <Route path="/intake-calendar" element={<PageTransition><IntakeCalendar /></PageTransition>} />
          <Route path="/shared/:token" element={<PageTransition><SharedShortlist /></PageTransition>} />
          <Route path="/financial-tools" element={<PrivateRoute><PageTransition><FinancialTools /></PageTransition></PrivateRoute>} />
          <Route path="/agent-training" element={<PageTransition><AgentTraining /></PageTransition>} />
          <Route path="/emergency" element={<PageTransition><EmergencyCare /></PageTransition>} />
          <Route path="/visa-scheduling" element={<PrivateRoute><PageTransition><VisaScheduling /></PageTransition></PrivateRoute>} />
          <Route path="/visa-checker" element={<PageTransition><VisaChecker /></PageTransition>} />
          <Route path="/free-consultation" element={<PageTransition><FreeConsultation /></PageTransition>} />
          <Route path="/apply" element={<PrivateRoute><PageTransition><ApplicantFlow /></PageTransition></PrivateRoute>} />
          <Route path="/sop-builder" element={<PrivateRoute><PageTransition><SOPBuilder /></PageTransition></PrivateRoute>} />
          <Route path="/events" element={<PageTransition><GlobalEvents /></PageTransition>} />
          <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
          <Route path="/news" element={<PageTransition><News /></PageTransition>} />
          <Route path="/community" element={<PageTransition><Community /></PageTransition>} />
          <Route path="/hive" element={<PageTransition><Hive /></PageTransition>} />
          <Route path="/us-visa-slots" element={<PrivateRoute><PageTransition><USVisaSlots /></PageTransition></PrivateRoute>} />
          <Route path="/agent-portal/login" element={<PageTransition><AgentLogin /></PageTransition>} />
          <Route path="/agent/login" element={<PageTransition><AgentLogin /></PageTransition>} />
          <Route path="/agent/*" element={<PageTransition><AgentPortal /></PageTransition>} />
          <Route path="/admin/*" element={<Admin />} />
          {/* Legacy URL redirects */}
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/tools/visa-checker" element={<Navigate to="/visa-checker" replace />} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AnalyticsRoot>
      <div className="App">
        <BrowserRouter>
          <ThemeProvider>
            <I18nProvider>
              <AuthProvider>
                <FirebaseAuthProvider>
                  <PricingLoader />
                  <ScrollToTop />
                  <RouteErrorBoundary>
                    <AnimatedRoutes />
                  </RouteErrorBoundary>
                  <ErrorBoundary fallback={null}>
                    <ChatbotWidget />
                  </ErrorBoundary>
                  <Toaster />
                </FirebaseAuthProvider>
              </AuthProvider>
            </I18nProvider>
          </ThemeProvider>
        </BrowserRouter>
      </div>
    </AnalyticsRoot>
  );
}

export default App;

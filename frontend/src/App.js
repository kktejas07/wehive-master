import { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import VisaDetail from './pages/VisaDetail';
import About from './pages/About';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Account from './pages/Account';
import HolidayPlanner from './pages/HolidayPlanner';
import ApplicationDetail from './pages/ApplicationDetail';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import AuthModal from './components/AuthModal';
import ChatbotWidget from './components/ChatbotWidget';
import PageTransition from './components/PageTransition';
import { Toaster } from './components/ui/toaster';

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
        <Route path="*" element={<PageTransition><Home /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <ScrollToTop />
            <AnimatedRoutes />
            <AuthModal />
            <ChatbotWidget />
            <Toaster />
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;

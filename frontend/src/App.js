import { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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
import AuthModal from './components/AuthModal';
import { Toaster } from './components/ui/toaster';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/visa/:id" element={<VisaDetail />} />
            <Route path="/holiday/:id" element={<HolidayPlanner />} />
            <Route path="/about" element={<About />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/applications/:id" element={<ApplicationDetail />} />
            <Route path="*" element={<Home />} />
          </Routes>
          <AuthModal />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;

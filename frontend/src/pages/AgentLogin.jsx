import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import {
  LogIn, UserPlus, Loader2, Shield, Eye, EyeOff,
} from 'lucide-react';

export default function AgentLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agency, setAgency] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? `${API}/agent/login` : `${API}/agent/signup`;
      const payload = mode === 'login' ? { email, password } : { name, email, phone, password, agency_name: agency };
      const r = await axios.post(endpoint, payload);
      localStorage.setItem('agent_token', r.data.token);
      localStorage.setItem('agent_data', JSON.stringify(r.data.agent));
      navigate('/agent');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--blue-900))] to-[hsl(var(--blue-700))] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-white/10 items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[28px] font-display font-extrabold text-white">Agent Portal</h1>
          <p className="text-white/60 mt-1">{mode === 'login' ? 'Sign in to manage your students' : 'Create your agent account'}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
          <div className="flex mb-6 bg-[hsl(var(--soft-bg))] rounded-full p-1">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 rounded-full text-[13px] font-bold transition ${mode === 'login' ? 'bg-white text-[hsl(var(--blue-900))] shadow-sm' : 'text-[hsl(var(--blue-900))]/50'}`}
            >
              <LogIn className="w-4 h-4 inline mr-1.5" /> Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2.5 rounded-full text-[13px] font-bold transition ${mode === 'signup' ? 'bg-white text-[hsl(var(--blue-900))] shadow-sm' : 'text-[hsl(var(--blue-900))]/50'}`}
            >
              <UserPlus className="w-4 h-4 inline mr-1.5" /> Register
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-[13px] text-red-700 text-center">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} required className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px]" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} required className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px]" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Agency Name (Optional)</label>
                  <input value={agency} onChange={e => setAgency(e.target.value)} className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px]" placeholder="Your agency" />
                </div>
              </>
            )}
            <div>
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px]" placeholder="agent@example.com" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-1">Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className="w-full h-12 rounded-xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 pr-12 text-[14px]" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--blue-900))]/40">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full btn-accent text-white font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-[13px] text-[hsl(var(--blue-700))] hover:underline font-bold">
              Back to WeHive
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

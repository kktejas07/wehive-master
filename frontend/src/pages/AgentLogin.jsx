import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react';

// Agent accounts are created by WeHive admins (Admin → Agents); there is no
// public registration, so customers' applications only reach vetted agents.

export default function AgentLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await axios.post(`${API}/agent/login`, { email, password });
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
    <div className="min-h-screen bg-[hsl(var(--soft-bg))] flex items-center justify-center px-4 py-10 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-[hsl(var(--blue-50))] items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-[hsl(var(--blue-700))]" />
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-display font-bold tracking-[-0.02em] text-[hsl(var(--blue-900))]">Agent Portal</h1>
          <p className="text-muted-foreground mt-1 text-[15px]">Sign in to manage your students</p>
        </div>

        <div className="rounded-2xl bg-white border border-border p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-[13px] text-red-700 text-center">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="agentlogin-email" className="text-[13px] font-semibold text-[hsl(var(--blue-900))] block mb-1.5">Email</label>
              <input id="agentlogin-email" data-testid="agent-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-12 rounded-xl border border-slate-300 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px]" placeholder="agent@example.com" />
            </div>
            <div>
              <label htmlFor="agentlogin-password" className="text-[13px] font-semibold text-[hsl(var(--blue-900))] block mb-1.5">Password</label>
              <div className="relative">
                <input id="agentlogin-password" data-testid="agent-password" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className="w-full h-12 rounded-xl border border-slate-300 focus:border-[hsl(var(--blue-700))] outline-none px-4 pr-12 text-[14px]" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Hide password' : 'Show password'} className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-[hsl(var(--blue-900))]">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button variant="accent" type="submit" data-testid="agent-submit" disabled={loading} className="w-full h-12 rounded-xl text-white font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            Agent accounts are created by WeHive. Want to partner with us? Write to{' '}
            <a href="mailto:info@wehive.co.in" className="text-[hsl(var(--blue-700))] font-semibold hover:underline">info@wehive.co.in</a>.
          </p>
          <div className="mt-4 text-center">
            <Link to="/" className="text-[14px] text-[hsl(var(--blue-700))] hover:underline font-semibold">
              Back to WeHive
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

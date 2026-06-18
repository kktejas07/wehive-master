import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import {
  Bot, Loader2, Play, Clock, CheckCircle, AlertTriangle, Info,
  XCircle, Bell, ExternalLink, RefreshCw, Shield,
} from 'lucide-react';

const SEVERITY_ICONS = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const SEVERITY_COLORS = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-amber-600 bg-amber-50 border-amber-200',
  info: 'text-blue-600 bg-blue-50 border-blue-200',
  success: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

export default function AIAgentsTab() {
  const { token } = useAuth();
  const { toast } = useToast();
  const headers = { Authorization: `Bearer ${token}` };
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [lastResults, setLastResults] = useState(null);

  const fetchStatus = async () => {
    try {
      const r = await axios.get(`${API}/agents/status`, { headers });
      setStatus(r.data);
      setLastResults(r.data.last_results);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, [token]);

  const runAgents = async () => {
    setRunning(true);
    try {
      const r = await axios.post(`${API}/agents/run`, {}, { headers });
      toast({ title: `Agents complete — ${r.data.total_alerts} alerts generated` });
      setLastResults(r.data.agents);
      await fetchStatus();
    } catch (e) {
      toast({ title: 'Failed to run agents', variant: 'destructive' });
    } finally { setRunning(false); }
  };

  if (loading) return (
    <div className="flex items-center gap-2 text-[hsl(var(--blue-900))]/60 py-8">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading AI Agents...
    </div>
  );

  const agents = status?.available_agents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-[26px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            🤖 AI Agents
          </h2>
          <p className="mt-1 text-[13.5px] text-[hsl(var(--blue-900))]/55">
            Proactive agents that monitor your applications, documents, and deadlines.
          </p>
        </div>
        <button
          onClick={runAgents} disabled={running}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[hsl(var(--blue-700))] text-white text-[13px] font-bold hover:bg-[hsl(var(--blue-800))] disabled:opacity-50 transition"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Running...' : 'Run All Agents'}
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 text-[12px] text-[hsl(var(--blue-900))]/60">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last run: {status?.last_run ? new Date(status.last_run).toLocaleString() : 'Never'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Bell className="w-3 h-3" />
          Scheduler: {status?.scheduler_active ? (
            <span className="text-emerald-600 font-bold">Active (hourly)</span>
          ) : (
            <span className="text-amber-600">Inactive</span>
          )}
        </span>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {agents.map((agent) => {
          const last = lastResults?.[agent.id];
          const count = last?.alerts_count ?? 0;
          const isExpanded = expandedAgent === agent.id;
          return (
            <div
              key={agent.id}
              className="rounded-2xl border border-black/5 bg-white p-4 hover:border-[hsl(var(--blue-700))]/20 transition cursor-pointer"
              onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-[hsl(var(--blue-700))]" />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{agent.name}</div>
                    <div className="text-[11px] text-[hsl(var(--blue-900))]/50 mt-0.5">{agent.description}</div>
                  </div>
                </div>
                {count > 0 && (
                  <span className="text-[11px] font-bold text-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))] px-2.5 py-1 rounded-full">
                    {count} alert{count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Last results summary */}
      {lastResults && Object.keys(lastResults).length > 0 && (
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--blue-900))]/60 mb-3">
            Last Run Summary
          </h3>
          <div className="space-y-2">
            {Object.entries(lastResults).map(([agentId, data]) => (
              <div key={agentId} className="rounded-xl border border-black/5 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{data.name}</span>
                  <span className="text-[12px] text-[hsl(var(--blue-900))]/60">{data.alerts_count} alerts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[hsl(var(--blue-700))] mt-0.5" />
          <div>
            <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">How AI Agents Work</div>
            <div className="mt-1 text-[12px] text-[hsl(var(--blue-900))]/65 space-y-1">
              <p>• Agents run automatically every hour and check for issues</p>
              <p>• Alerts appear in your <strong>notification bell</strong> (🔔 top-right)</p>
              <p>• Click <strong>"Run All Agents"</strong> to trigger an immediate check</p>
              <p>• Each alert includes a severity level and actionable message</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Bot, Send, Loader2, Zap } from 'lucide-react';
import { adminClient } from '../../lib/admin';
import { Panel } from './AdminShell';

const AGENTS = [
  { id: 'hive', label: 'Hive AI', endpoint: '/agentic/hive/ask', placeholder: 'Ask Hive AI anything…' },
  { id: 'stark', label: 'Stark Research', endpoint: '/agentic/stark/search', placeholder: 'Search query…' },
  { id: 'workflow', label: 'Workflow', endpoint: '/agentic/workflow', placeholder: 'Describe the workflow task…' },
];

export default function AgenticTab() {
  const [agent, setAgent] = useState(AGENTS[0]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState(null);

  async function fetchStatus() {
    try {
      const data = await adminClient('/agentic/status');
      setStatus(data);
    } catch { setStatus(null); }
  }

  useState(() => { fetchStatus(); }, []);

  async function handleRun(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setErr(''); setResult(null);
    try {
      const data = await adminClient(agent.endpoint, {
        method: 'POST',
        body: JSON.stringify({ query: query.trim(), message: query.trim() }),
      });
      setResult(data);
    } catch (ex) {
      setErr(ex?.response?.data?.detail || ex.message || 'Request failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="w-6 h-6 text-[var(--admin-blue)]" />
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Agentic AI</h2>
          <p className="text-[13px] text-[var(--text-muted)]">LangGraph / CrewAI orchestration — Hive, Stark, workflow agents</p>
        </div>
        {status && (
          <span className={`ml-auto text-[12px] font-medium px-2 py-0.5 rounded-full ${status.healthy ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {status.healthy ? 'Healthy' : 'Degraded'}
          </span>
        )}
      </div>

      <Panel>
        <div className="flex gap-2 mb-4">
          {AGENTS.map(a => (
            <button
              key={a.id}
              onClick={() => { setAgent(a); setResult(null); setErr(''); }}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                agent.id === a.id
                  ? 'bg-[var(--admin-blue)] text-white'
                  : 'bg-[var(--glass-hover)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)]'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleRun} className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={agent.placeholder}
            className="flex-1 h-10 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--admin-blue)]"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 h-10 rounded-lg bg-[var(--admin-blue)] text-white text-[13px] font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Run
          </button>
        </form>
        {err && <p className="mt-3 text-[13px] text-[var(--admin-red)]">{err}</p>}
        {result && (
          <pre className="mt-4 p-3 rounded-lg bg-[var(--glass-hover)] border border-[var(--glass-border)] text-[12px] text-[var(--text-primary)] whitespace-pre-wrap overflow-auto max-h-96">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        )}
      </Panel>

      <Panel>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[var(--admin-amber)]" />
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Available endpoints</h3>
        </div>
        <div className="space-y-1 text-[13px] text-[var(--text-secondary)]">
          {[
            ['POST', '/api/agentic/hive/ask', 'Hive AI chat — general assistant'],
            ['POST', '/api/agentic/stark/search', 'Stark semantic search'],
            ['POST', '/api/agentic/stark/research', 'Stark deep research'],
            ['GET',  '/api/agentic/stark/context', 'Stark context retrieval'],
            ['POST', '/api/agentic/workflow', 'Trigger agentic workflow'],
            ['GET',  '/api/agentic/status', 'Agent health status'],
          ].map(([method, path, desc]) => (
            <div key={path} className="flex items-center gap-3 py-1">
              <span className={`w-12 text-center text-[11px] font-bold rounded px-1 py-0.5 ${method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{method}</span>
              <code className="font-mono text-[12px] text-[var(--admin-blue)]">{path}</code>
              <span className="text-[var(--text-muted)]">{desc}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

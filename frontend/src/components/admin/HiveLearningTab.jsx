import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Brain, Loader2, RefreshCw, Sparkles, Wrench, FileText, BarChart3,
  CheckCircle2, XCircle, Clock, Cpu, Database, MessageSquare, ListChecks,
  AlertCircle, BookOpen, Plus, ArrowRight, RotateCcw,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminHeader, Panel } from './AdminShell';
import { useToast } from '../../hooks/use-toast';
import { API } from '../../context/AuthContext';

const AGENT_OPTIONS = [
  { id: 'hive_visa',         label: 'Visa assistant' },
  { id: 'hive_travel',       label: 'Travel planner' },
  { id: 'hive_documents',    label: 'Documents' },
  { id: 'hive_study_abroad', label: 'Study abroad' },
];

function StatCard({ label, value, hint, Icon }) {
  return (
    <div className="rounded-2xl bg-[#111632] border border-white/5 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">
        {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
        {label}
      </div>
      <div className="mt-2 text-[26px] font-extrabold text-white tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-[11.5px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-white/5 text-slate-300 border-white/10',
    navy: 'bg-blue-500/10 text-blue-300 border-blue-400/20',
    red: 'bg-red-500/10 text-red-300 border-red-400/20',
    green: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-400/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function ActionButton({ onClick, loading, children, Icon, tone = 'navy', disabled }) {
  const tones = {
    navy: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500',
    red: 'bg-red-600 hover:bg-red-500 text-white border-red-500',
    green: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500',
    slate: 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition disabled:opacity-50 ${tones[tone]}`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : Icon ? <Icon className="w-3.5 h-3.5" /> : null}
      {children}
    </button>
  );
}

export default function HiveLearningTab() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const token = admin?.token || admin?.access_token;

  const [days, setDays] = useState(7);
  const [stats, setStats] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [config, setConfig] = useState(null);

  const [mineResult, setMineResult] = useState(null);
  const [mining, setMining] = useState(false);

  const [proposeAgent, setProposeAgent] = useState('hive_visa');
  const [proposeResult, setProposeResult] = useState(null);
  const [proposing, setProposing] = useState(false);
  const [applying, setApplying] = useState(false);

  const [cardsResult, setCardsResult] = useState(null);
  const [cardsLoading, setCardsLoading] = useState(false);

  const [toolsResult, setToolsResult] = useState(null);
  const [toolsLoading, setToolsLoading] = useState(false);

  const [autoApplying, setAutoApplying] = useState(false);
  const [autoApplyResult, setAutoApplyResult] = useState(null);

  const auth = useCallback(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    try {
      const [s, p, f, c] = await Promise.all([
        axios.get(`${API}/hive/learning/stats?days=${days}`, auth()),
        axios.get(`${API}/hive/learning/proposals?limit=30`, auth()),
        axios.get(`${API}/hive/learning/feeds?days=${days}&limit=20`, auth()),
        axios.get(`${API}/hive/learning/config`, auth()),
      ]);
      setStats(s.data || null);
      setProposals(p.data?.items || []);
      setFeeds(f.data?.items || []);
      setConfig(c.data || null);
    } catch (e) {
      toast({
        title: 'Could not load Hive learning data',
        description: e?.response?.data?.detail || e.message,
        variant: 'destructive',
      });
    }
  }, [token, days, auth, toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Actions ──────────────────────────────────────────────────────────

  const runMine = async () => {
    setMining(true);
    try {
      const r = await axios.post(`${API}/hive/learning/mine`, { days, max_feeds: 250 }, auth());
      setMineResult(r.data);
      toast({ title: 'Mined recent feeds', description: `${r.data?.feeds_count || 0} feeds · ${(r.data?.intents || []).length} intents` });
    } catch (e) {
      toast({ title: 'Mining failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setMining(false);
    }
  };

  const runPropose = async () => {
    setProposing(true);
    setProposeResult(null);
    try {
      const r = await axios.post(`${API}/hive/learning/propose/prompts`, { agent_id: proposeAgent, days }, auth());
      setProposeResult(r.data);
    } catch (e) {
      toast({ title: 'Proposal failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setProposing(false);
    }
  };

  const applyProposal = async () => {
    if (!proposeResult?.ok) return;
    setApplying(true);
    try {
      const r = await axios.post(`${API}/hive/learning/apply`, {
        agent_id: proposeAgent,
        new_system: proposeResult.new_system,
        proposed_version: proposeResult.proposed_version,
        changes: proposeResult.changes,
      }, auth());
      toast({
        title: 'Prompt updated in real time',
        description: `Saved ${r.data?.prompt?.id} v${r.data?.prompt?.version}`,
      });
      setProposeResult(null);
      loadAll();
    } catch (e) {
      toast({ title: 'Apply failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  const runProposeCards = async () => {
    setCardsLoading(true);
    try {
      const r = await axios.post(`${API}/hive/learning/propose/cards`, { days, top_n: 4 }, auth());
      setCardsResult(r.data);
    } catch (e) {
      toast({ title: 'Card proposal failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setCardsLoading(false);
    }
  };

  const runProposeTools = async () => {
    setToolsLoading(true);
    try {
      const r = await axios.post(`${API}/hive/learning/propose/tools`, { days }, auth());
      setToolsResult(r.data);
    } catch (e) {
      toast({ title: 'Tool proposal failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setToolsLoading(false);
    }
  };

  const runAutoApply = async () => {
    setAutoApplying(true);
    setAutoApplyResult(null);
    try {
      const r = await axios.post(`${API}/hive/learning/auto-apply`, {
        days, min_delta: 0.12, min_feeds: 8, force: false,
      }, auth());
      setAutoApplyResult(r.data);
      toast({
        title: 'Auto-apply finished',
        description: `Applied ${(r.data?.applied || []).length} · Skipped ${(r.data?.skipped || []).length}`,
      });
      loadAll();
    } catch (e) {
      toast({ title: 'Auto-apply failed', description: e?.response?.data?.detail || e.message, variant: 'destructive' });
    } finally {
      setAutoApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Hive Learning"
        subtitle="Grep recent feeds, ask the model to learn, and rewrite the system prompts in real time."
        right={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10) || 7)}
              className="h-9 rounded-full bg-[#111632] border border-white/10 px-3 text-[12px] text-slate-200 outline-none"
            >
              {[1, 3, 7, 14, 30].map(d => <option key={d} value={d}>Last {d} day{d > 1 ? 's' : ''}</option>)}
            </select>
            <ActionButton onClick={loadAll} Icon={RefreshCw} tone="slate">Refresh</ActionButton>
          </div>
        }
      />

      {/* ── Stats grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total feeds" value={stats?.total ?? '—'} hint={`last ${days} days`} Icon={MessageSquare} />
        <StatCard
          label="Top agent"
          value={stats?.by_agent?.[0]?.agent_id || '—'}
          hint={stats?.by_agent?.[0] ? `${stats.by_agent[0].count} runs` : 'no data'}
          Icon={Cpu}
        />
        <StatCard
          label="Errors"
          value={stats?.by_agent?.reduce((a, b) => a + (b.errors || 0), 0) ?? 0}
          hint="in the window"
          Icon={AlertCircle}
        />
        <StatCard
          label="Top tool"
          value={stats?.by_tool?.[0]?.tool || '—'}
          hint={stats?.by_tool?.[0] ? `${stats.by_tool[0].count} calls` : '—'}
          Icon={Wrench}
        />
      </div>

      {/* ── Self-learn config + auto-apply ─────────────────────────── */}
      <Panel>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-bold text-white">
              <Brain className="w-4 h-4 text-emerald-400" />
              Real-time self-learning
            </div>
            <p className="text-[12.5px] text-slate-400 mt-1 max-w-2xl">
              On every server boot, Hive greps the most recent feeds and asks the model to improve
              the 4 system prompts. New versions are saved to Mongo and picked up on the next run —
              no restart. Use the controls below to mine, propose, or auto-apply on demand.
            </p>
            {config && (
              <div className="mt-3 flex flex-wrap gap-2 text-[11.5px]">
                <Pill tone={config.enabled ? 'green' : 'red'}>
                  {config.enabled ? 'Enabled' : 'Disabled'} · HIVE_SELF_LEARN={config.enabled ? '1' : '0'}
                </Pill>
                <Pill tone="slate">days={config.days}</Pill>
                <Pill tone="slate">min_feeds={config.min_feeds}</Pill>
                <Pill tone="slate">min_delta={config.min_delta}</Pill>
                <Pill tone={config.force ? 'amber' : 'slate'}>force={String(config.force)}</Pill>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={runAutoApply} loading={autoApplying} Icon={Sparkles} tone="green">
              Auto-apply all 4 agents
            </ActionButton>
          </div>
        </div>

        {autoApplyResult && (
          <div className="mt-4 rounded-xl bg-black/30 border border-white/10 p-4 text-[12.5px] text-slate-200">
            <div className="flex items-center gap-2 mb-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-bold">Auto-apply result</span>
            </div>
            <div className="text-slate-300 mb-2">
              Feeds seen: {autoApplyResult.feeds_seen} · Force: {String(autoApplyResult.force)} · min_delta: {autoApplyResult.min_delta}
            </div>
            {autoApplyResult.note && <div className="text-amber-300 mb-2">{autoApplyResult.note}</div>}
            {autoApplyResult.applied?.length > 0 && (
              <div className="mb-2">
                <div className="font-bold text-white mb-1">Applied</div>
                <ul className="space-y-1">
                  {autoApplyResult.applied.map((a) => (
                    <li key={a.agent_id} className="flex items-center gap-2">
                      <Pill tone="green">v{a.version}</Pill>
                      <span className="font-mono text-slate-300">{a.agent_id}</span>
                      <span className="text-slate-500">delta={a.delta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {autoApplyResult.skipped?.length > 0 && (
              <div>
                <div className="font-bold text-white mb-1">Skipped</div>
                <ul className="space-y-1">
                  {autoApplyResult.skipped.map((s, i) => (
                    <li key={i} className="text-slate-400">
                      <span className="font-mono text-slate-300">{s.agent_id || '—'}</span> · {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {autoApplyResult.errors?.length > 0 && (
              <div className="mt-2 text-red-300">
                {autoApplyResult.errors.map((e, i) => <div key={i}>{e.agent_id}: {e.error}</div>)}
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* ── Two columns: Mine + Propose ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mine */}
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-white">
              <ListChecks className="w-4 h-4 text-blue-300" />
              Mine recent feeds
            </div>
            <ActionButton onClick={runMine} loading={mining} Icon={Brain}>Grep &amp; cluster</ActionButton>
          </div>
          {!mineResult && (
            <p className="text-[12.5px] text-slate-400">
              Click <span className="text-white font-bold">Grep &amp; cluster</span> to send the last {days}-day
              feed window to the model. It returns top intents, weak-answer gaps, and missing tools.
            </p>
          )}
          {mineResult && (
            <div className="space-y-3 text-[12.5px] text-slate-200">
              <div className="text-slate-400">Feeds in window: <span className="text-white font-bold">{mineResult.feeds_count}</span></div>
              {mineResult.note && <div className="text-amber-300">{mineResult.note}</div>}
              {(mineResult.intents || []).length > 0 && (
                <div>
                  <div className="font-bold text-white mb-1">Top intents</div>
                  <ul className="space-y-1">
                    {mineResult.intents.map((it, i) => (
                      <li key={i} className="rounded-lg bg-white/5 border border-white/10 p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Pill tone="navy">{it.label}</Pill>
                          {it.agents?.map(a => <Pill key={a} tone="slate">{a}</Pill>)}
                        </div>
                        {it.phrasings?.length > 0 && (
                          <ul className="list-disc pl-4 text-slate-300">
                            {it.phrasings.slice(0, 3).map((p, j) => <li key={j}>{p}</li>)}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(mineResult.gaps || []).length > 0 && (
                <div>
                  <div className="font-bold text-white mb-1">Gaps (weak answers)</div>
                  <ul className="space-y-1">
                    {mineResult.gaps.map((g, i) => (
                      <li key={i} className="rounded-lg bg-red-500/5 border border-red-400/20 p-2">
                        <div className="font-bold text-red-200">{g.label}</div>
                        <div className="text-slate-300">{g.why_weak}</div>
                        {g.evidence && <div className="text-slate-500 text-[11px]">{g.evidence}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(mineResult.tool_gaps || []).length > 0 && (
                <div>
                  <div className="font-bold text-white mb-1">Missing tools</div>
                  <ul className="space-y-1">
                    {mineResult.tool_gaps.map((t, i) => (
                      <li key={i} className="rounded-lg bg-amber-500/5 border border-amber-400/20 p-2">
                        <div className="font-bold text-amber-200">{t.label}</div>
                        <div className="text-slate-300">{t.description}</div>
                        {t.suggested_tool && <div className="text-slate-500 text-[11px]">→ {t.suggested_tool}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Propose prompt edits */}
        <Panel>
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-[13px] font-bold text-white">
              <FileText className="w-4 h-4 text-emerald-300" />
              Propose prompt edit
            </div>
            <div className="flex items-center gap-2">
              <select
                value={proposeAgent}
                onChange={(e) => setProposeAgent(e.target.value)}
                className="h-9 rounded-full bg-[#0a0e1e] border border-white/10 px-3 text-[12px] text-slate-200 outline-none"
              >
                {AGENT_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <ActionButton onClick={runPropose} loading={proposing} Icon={Sparkles}>Propose</ActionButton>
            </div>
          </div>
          {!proposeResult && (
            <p className="text-[12.5px] text-slate-400">
              The model reads the agent's <span className="text-white font-mono">{proposeAgent}</span> feeds
              and rewrites the system prompt. Review the diff, then click Apply to save a new version
              (real-time — no restart).
            </p>
          )}
          {proposeResult && !proposeResult.ok && (
            <div className="text-amber-300 text-[12.5px]">{proposeResult.note || 'No proposal returned.'}</div>
          )}
          {proposeResult?.ok && (
            <div className="space-y-3 text-[12px] text-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="navy">{proposeResult.prompt_id}</Pill>
                <Pill tone="slate">v{proposeResult.current_version} → v{proposeResult.proposed_version}</Pill>
                {proposeResult.delta != null && <Pill tone={proposeResult.delta >= 0.12 ? 'green' : 'amber'}>Δ={proposeResult.delta}</Pill>}
              </div>
              <details className="rounded-lg bg-black/30 border border-white/10 p-2" open>
                <summary className="cursor-pointer text-white font-bold text-[12px]">Current system prompt</summary>
                <pre className="mt-2 text-[11.5px] whitespace-pre-wrap text-slate-300">{proposeResult.current_system}</pre>
              </details>
              <details className="rounded-lg bg-emerald-500/5 border border-emerald-400/20 p-2" open>
                <summary className="cursor-pointer text-emerald-200 font-bold text-[12px]">Proposed new system prompt</summary>
                <pre className="mt-2 text-[11.5px] whitespace-pre-wrap text-slate-200">{proposeResult.new_system}</pre>
              </details>
              {(proposeResult.changes || []).length > 0 && (
                <div>
                  <div className="font-bold text-white mb-1">What changed</div>
                  <ul className="space-y-1">
                    {proposeResult.changes.map((c, i) => (
                      <li key={i} className="rounded-lg bg-white/5 border border-white/10 p-2 text-[11.5px]">
                        <div className="text-white font-bold">{c.intent}</div>
                        <div className="text-slate-400"><span className="line-through">{c.before}</span> → <span className="text-emerald-200">{c.after}</span></div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <ActionButton onClick={applyProposal} loading={applying} Icon={CheckCircle2} tone="green">
                  Apply (save v{proposeResult.proposed_version})
                </ActionButton>
                <ActionButton onClick={() => setProposeResult(null)} Icon={XCircle} tone="slate">Discard</ActionButton>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Prompt-kit cards + tool proposals ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-white">
              <BookOpen className="w-4 h-4 text-blue-300" />
              Propose new prompt-kit cards
            </div>
            <ActionButton onClick={runProposeCards} loading={cardsLoading} Icon={Plus}>Generate</ActionButton>
          </div>
          {cardsResult?.prompts?.length > 0 ? (
            <ul className="space-y-2 text-[12.5px]">
              {cardsResult.prompts.map((p, i) => (
                <li key={i} className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill tone="navy">{p.title}</Pill>
                    {p.target_agent && <Pill tone="slate">{p.target_agent}</Pill>}
                  </div>
                  <div className="text-slate-300">{p.sub}</div>
                  <div className="text-slate-400 italic mt-1">"{p.sample_question}"</div>
                  {p.rationale && <div className="text-slate-500 text-[11px] mt-1">{p.rationale}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-slate-400">No suggestions yet — generate from recent feeds.</p>
          )}
        </Panel>

        <Panel>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-white">
              <Wrench className="w-4 h-4 text-amber-300" />
              Propose new tools
            </div>
            <ActionButton onClick={runProposeTools} loading={toolsLoading} Icon={Wrench}>Generate</ActionButton>
          </div>
          {toolsResult?.tools?.length > 0 ? (
            <ul className="space-y-2 text-[12.5px]">
              {toolsResult.tools.map((t, i) => (
                <li key={i} className="rounded-lg bg-amber-500/5 border border-amber-400/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill tone="amber">{t.name}</Pill>
                    {t.target_agent && <Pill tone="slate">{t.target_agent}</Pill>}
                  </div>
                  <div className="text-slate-200">{t.description}</div>
                  {t.when_to_call && <div className="text-slate-400 text-[11.5px] mt-1">When: {t.when_to_call}</div>}
                  {t.parameters && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] text-slate-400">Schema</summary>
                      <pre className="mt-1 text-[11px] whitespace-pre-wrap text-slate-300">{JSON.stringify(t.parameters, null, 2)}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-slate-400">No suggestions yet — generate from recent feeds.</p>
          )}
        </Panel>
      </div>

      {/* ── Recent feeds + proposal history ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-white">
              <Database className="w-4 h-4 text-slate-300" />
              Recent feeds ({feeds.length})
            </div>
          </div>
          {feeds.length === 0 ? (
            <p className="text-[12.5px] text-slate-400">No feeds yet. Have a few conversations with Hive.</p>
          ) : (
            <ul className="space-y-2 text-[12px] max-h-[420px] overflow-y-auto pr-1">
              {feeds.map((f) => (
                <li key={f.ts + (f.user_input || '')} className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Pill tone="navy">{f.agent_id}</Pill>
                    {f.tool_calls?.map(t => <Pill key={t} tone="slate">{t}</Pill>)}
                    {f.error && <Pill tone="red">error</Pill>}
                    <span className="ml-auto text-[10.5px] text-slate-500 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />{new Date(f.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-200"><span className="text-slate-400">U:</span> {f.user_input}</div>
                  {f.answer && <div className="text-slate-300 mt-0.5 line-clamp-2"><span className="text-slate-400">A:</span> {f.answer}</div>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-white">
              <BarChart3 className="w-4 h-4 text-slate-300" />
              Proposal history
            </div>
          </div>
          {proposals.length === 0 ? (
            <p className="text-[12.5px] text-slate-400">No proposals yet.</p>
          ) : (
            <ul className="space-y-2 text-[12px] max-h-[420px] overflow-y-auto pr-1">
              {proposals.map((p, i) => (
                <li key={i} className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Pill tone={p.payload?.applied ? 'green' : 'slate'}>{p.kind}</Pill>
                    {p.payload?.agent_id && <Pill tone="navy">{p.payload.agent_id}</Pill>}
                    {p.payload?.version != null && <Pill tone="slate">v{p.payload.version}</Pill>}
                    <span className="ml-auto text-[10.5px] text-slate-500 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />{new Date(p.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {p.payload?.new_system && (
                    <details>
                      <summary className="cursor-pointer text-[11px] text-slate-400">View system text</summary>
                      <pre className="mt-1 text-[11px] whitespace-pre-wrap text-slate-300">{p.payload.new_system}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

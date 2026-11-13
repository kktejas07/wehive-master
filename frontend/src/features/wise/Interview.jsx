/**
 * Interview — AI-powered visa interview practice screen.
 *
 * Flow:
 *   Setup → (start session) → Q&A loop → Report
 */
import { useState, useCallback } from 'react';
import axios from 'axios';
import { Mic, CheckCircle2, AlertCircle, BarChart2, ArrowRight, Loader2, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../lib/apiBase';

const COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'IE', 'NZ', 'SG', 'JP', 'SE'];
const VISA_TYPES = ['F-1', 'J-1', 'H-1B', 'Student', 'Study Permit', '500', 'Schengen', 'Work'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function ScoreBadge({ score }) {
  const color = score >= 7 ? '#10b981' : score >= 4 ? '#f59e0b' : '#ef4444';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        fontWeight: 700,
        fontSize: 14,
        flexShrink: 0,
      }}
    >
      {score}
    </span>
  );
}

function SetupView({ onStart, loading }) {
  const [country, setCountry] = useState('US');
  const [visaType, setVisaType] = useState('F-1');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);

  const sel = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    background: '#fff',
    width: '100%',
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎤</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Visa Interview Practice</h2>
        <p style={{ margin: '8px 0 0', opacity: 0.6, fontSize: 14 }}>
          Practice common visa interview questions with AI coaching
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>
          Country
          <select value={country} onChange={e => setCountry(e.target.value)} style={sel}>
            {COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>
          Visa Type
          <select value={visaType} onChange={e => setVisaType(e.target.value)} style={sel}>
            {VISA_TYPES.map(v => <option key={v}>{v}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>
          Difficulty
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={sel}>
            {DIFFICULTIES.map(d => <option key={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>
          Number of Questions
          <input
            type="number"
            min={1}
            max={15}
            value={numQuestions}
            onChange={e => setNumQuestions(Number(e.target.value))}
            style={{ ...sel }}
          />
        </label>

        <button
          onClick={() => onStart({ country, visa_type: visaType, difficulty, num_questions: numQuestions })}
          disabled={loading}
          style={{
            padding: '12px',
            borderRadius: 10,
            border: 'none',
            background: loading ? '#d1d5db' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 8,
          }}
        >
          {loading ? <Loader2 size={18} /> : <ArrowRight size={18} />}
          Start Interview
        </button>
      </div>
    </div>
  );
}

function QuestionView({ question, onAnswer, loading, current, total }) {
  const [answer, setAnswer] = useState('');

  const submit = () => {
    if (!answer.trim() || loading) return;
    onAnswer(answer.trim());
    setAnswer('');
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 16, fontSize: 13, opacity: 0.5, fontWeight: 500 }}>
        Question {current} of {total}
      </div>

      <div
        style={{
          background: 'linear-gradient(135deg, #6366f115, #8b5cf615)',
          border: '1px solid #6366f130',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.5,
        }}
      >
        {question.question}
      </div>

      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={5}
        placeholder="Type your answer here…"
        style={{
          width: '100%',
          borderRadius: 10,
          border: '1px solid #d1d5db',
          padding: '12px',
          fontSize: 14,
          lineHeight: 1.6,
          resize: 'vertical',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />

      <button
        onClick={submit}
        disabled={loading || !answer.trim()}
        style={{
          marginTop: 12,
          padding: '10px 24px',
          borderRadius: 10,
          border: 'none',
          background: loading || !answer.trim()
            ? '#d1d5db'
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          cursor: loading || !answer.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          float: 'right',
        }}
      >
        {loading ? <Loader2 size={16} /> : <ArrowRight size={16} />}
        Submit Answer
      </button>
      <div style={{ clear: 'both' }} />
    </div>
  );
}

function FeedbackView({ feedback, onNext, isLast }) {
  const isGood = feedback.score >= 7;
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <div
        style={{
          border: `1px solid ${isGood ? '#10b98130' : '#f59e0b30'}`,
          background: isGood ? '#10b98108' : '#f59e0b08',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <ScoreBadge score={feedback.score} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Score: {feedback.score}/10
            </div>
            <div style={{ fontSize: 13, opacity: 0.6 }}>
              {isGood ? 'Strong answer!' : 'Needs improvement'}
            </div>
          </div>
        </div>

        {feedback.feedback && (
          <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.6 }}>
            {feedback.feedback}
          </p>
        )}

        {feedback.model_answer && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Model Answer
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>
              {feedback.model_answer}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        style={{
          padding: '10px 24px',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          float: 'right',
        }}
      >
        {isLast ? <><BarChart2 size={16} /> See Report</> : <><ArrowRight size={16} /> Next Question</>}
      </button>
      <div style={{ clear: 'both' }} />
    </div>
  );
}

function ReportView({ report, onRestart }) {
  const avg = report.average_score?.toFixed(1) || '—';
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Interview Report</h2>
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: '#6366f1' }}>
          {avg}/10
        </div>
        <div style={{ fontSize: 14, opacity: 0.6 }}>Average Score</div>
      </div>

      {report.summary && (
        <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8, marginBottom: 24 }}>
          {report.summary}
        </p>
      )}

      {(report.answers || []).map((a, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div
          key={i}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <ScoreBadge score={a.score} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Q{i + 1}: {a.question}</div>
          </div>
          {a.feedback && (
            <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>{a.feedback}</div>
          )}
        </div>
      ))}

      <button
        onClick={onRestart}
        style={{
          marginTop: 16,
          padding: '10px 24px',
          borderRadius: 10,
          border: '1px solid #6366f1',
          background: 'transparent',
          color: '#6366f1',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <RotateCcw size={16} /> Practice Again
      </button>
    </div>
  );
}

export default function Interview() {
  const { token } = useAuth();
  const [phase, setPhase] = useState('setup'); // setup | question | feedback | report
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [report, setReport] = useState(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const startInterview = useCallback(async (params) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/wise/interview/start`, params, { headers });
      setSessionId(data.session_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setPhase('question');
    } catch {
      // stay on setup
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submitAnswer = useCallback(async (answer) => {
    const q = questions[currentIdx];
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/wise/interview/answer`, {
        session_id: sessionId,
        question_id: q.id,
        answer,
      }, { headers });
      setLastFeedback({ ...data, question: q.question, model_answer: q.model_answer });
      setPhase('feedback');
    } catch {
      // stay on question
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, currentIdx, sessionId, token]);

  const nextQuestion = useCallback(async () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      // Finish session
      setLoading(true);
      try {
        const { data } = await axios.post(`${API}/wise/interview/finish/${sessionId}`, {}, { headers });
        setReport(data);
        setPhase('report');
      } catch {
        setPhase('setup');
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentIdx(nextIdx);
      setPhase('question');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, questions.length, sessionId, token]);

  const restart = () => {
    setPhase('setup');
    setSessionId(null);
    setQuestions([]);
    setCurrentIdx(0);
    setLastFeedback(null);
    setReport(null);
  };

  return (
    <div style={{ minHeight: 400, fontFamily: 'inherit' }}>
      {phase === 'setup' && <SetupView onStart={startInterview} loading={loading} />}
      {phase === 'question' && questions[currentIdx] && (
        <QuestionView
          question={questions[currentIdx]}
          onAnswer={submitAnswer}
          loading={loading}
          current={currentIdx + 1}
          total={questions.length}
        />
      )}
      {phase === 'feedback' && lastFeedback && (
        <FeedbackView
          feedback={lastFeedback}
          onNext={nextQuestion}
          isLast={currentIdx + 1 >= questions.length}
        />
      )}
      {phase === 'report' && report && <ReportView report={report} onRestart={restart} />}
    </div>
  );
}

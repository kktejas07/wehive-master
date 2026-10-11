import { useState } from 'react';
import { MessageCircle, Send, Loader2, Sparkles, Bot, User } from 'lucide-react';
import { useAuth, API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';

export default function AIUniversityQA({ universityId, universityName }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);

  const ask = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion('');
    setHistory(prev => [...prev, { role: 'user', text: q }]);
    setBusy(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.post(
        `${API}/ai/universities/${universityId}/ask`,
        { question: q },
        { headers }
      );
      setHistory(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch (e) {
      toast({ title: 'AI Q&A failed', description: e.response?.data?.detail || e.message });
      setHistory(prev => [...prev, { role: 'assistant', text: 'Sorry, I couldn\'t answer that right now.' }]);
    }
    setBusy(false);
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-700))] transition"
      >
        <Sparkles className="w-4 h-4" />
        {open ? 'Hide AI Assistant' : `Ask AI about ${universityName || 'this university'}`}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-200))] overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--blue-200))] flex items-center gap-2">
            <Bot className="w-4 h-4 text-[hsl(var(--blue-700))]" />
            <span className="font-bold text-[13px] text-[hsl(var(--blue-800))]">AI University Assistant</span>
            <span className="text-[12px] text-[hsl(var(--blue-700))] ml-auto">Powered by AI</span>
          </div>

          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {history.length === 0 && (
              <div className="text-center py-6 text-[13px] text-[hsl(var(--blue-700))]">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Ask anything about this university — admissions, programs, costs, or student life.
              </div>
            )}
            {history.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && <Bot className="w-5 h-5 text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />}
                <div className={`rounded-xl px-3.5 py-2 text-[13px] max-w-[85%] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[hsl(var(--blue-700))] text-white rounded-br-sm'
                    : 'bg-white border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-900))] rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
                {msg.role === 'user' && <User className="w-5 h-5 text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />}
              </div>
            ))}
            {busy && (
              <div className="flex gap-2">
                <Bot className="w-5 h-5 text-[hsl(var(--blue-700))] shrink-0 mt-0.5" />
                <div className="rounded-xl bg-white border border-[hsl(var(--blue-100))] px-3.5 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--blue-700))]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[hsl(var(--blue-200))] flex gap-2 bg-white">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !busy && ask()}
              placeholder="Ask a question..."
              className="flex-1 h-10 px-4 rounded-xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-200))] text-[13px] text-[hsl(var(--blue-900))] placeholder:text-[hsl(var(--blue-200))] outline-none focus:border-[hsl(var(--blue-700))]"
            />
            <button aria-label="Ask question" onClick={ask} disabled={busy || !question.trim()}
              className="h-10 w-10 rounded-xl bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-700))] disabled:opacity-50 flex items-center justify-center"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

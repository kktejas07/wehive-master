import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Loader2, Send, MessageSquare, Trash2 } from 'lucide-react';
import { useAuth, API } from '../context/AuthContext';

const SUGGESTIONS = [
  'What documents do I need for a US tourist visa?',
  'How long does a Schengen visa take?',
  'Can I travel to Japan with an Indian passport?',
  'What is the success rate for UK visitor visa?',
  'Do I need travel insurance for Europe?',
  'How to track my visa application status?',
];

const KEY_OPENAI = 'wehive_openai_history';

function Bubble({ m, onDelete }) {
  const me = m.role === 'user';
  return (
    <div className={`flex ${me ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm relative ${
          me
            ? 'bg-[hsl(var(--blue-700))] text-white rounded-br-sm'
            : 'bg-[hsl(var(--soft-bg))] border border-black/8 text-[hsl(var(--blue-900))] rounded-bl-sm'
        }`}
      >
        <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{m.text}</div>
        <div className={`flex items-center justify-between gap-3 mt-1.5 ${me ? 'text-white/60' : 'text-[hsl(var(--blue-900))]/40'}`}>
          <span className="text-[10.5px]">{new Date(m.at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {me && (
            <button onClick={() => onDelete(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OpenMarketAI({ onClose }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY_OPENAI) || '[]'); } catch { return []; }
  });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scroller = useRef(null);

  useEffect(() => {
    localStorage.setItem(KEY_OPENAI, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, sending]);

  const onSend = async (overrideText) => {
    const q = (overrideText ?? text).trim();
    if (!q || sending) return;
    setSending(true);
    setText('');
    const userMsg = { id: 'u-' + Date.now(), role: 'user', text: q, at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await axios.post(
        `${API}/chatbot/sessions`,
        { title: 'Open AI' },
        { headers }
      );
      const sid = r.data.session_id;
      const ar = await axios.post(
        `${API}/chatbot/sessions/${sid}/messages`,
        { text: q },
        { headers }
      );
      const assistantMsg = { id: 'a-' + Date.now(), role: 'assistant', text: ar.data.assistant_message?.text || 'I\'m sorry, I couldn\'t generate a response. Please try again.', at: new Date().toISOString() };
      setMessages((m) => [...m.filter(x => x.id !== userMsg.id), userMsg, assistantMsg]);
    } catch {
      const errMsg = { id: 'e-' + Date.now(), role: 'assistant', text: 'I\'m having trouble connecting right now. Please try again or contact support@wehive.in.', at: new Date().toISOString() };
      setMessages((m) => [...m.filter(x => x.id !== userMsg.id), userMsg, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const onDelete = (id) => {
    setMessages((m) => m.filter((x) => x.id !== id));
  };

  const onClear = () => {
    setMessages([]);
    localStorage.removeItem(KEY_OPENAI);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-extrabold text-[26px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
            Open Market AI
          </h2>
          <p className="mt-1 text-[13.5px] text-[hsl(var(--blue-900))]/55">
            Ask anything about visas, travel, or documentation — Eva is here to help.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-full text-[12px] font-bold text-[hsl(var(--blue-900))]/50 hover:text-red-500 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear chat
          </button>
        )}
      </div>

      {messages.length === 0 && (
        <div className="bg-[hsl(var(--soft-bg))] rounded-2xl border border-black/8 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[hsl(var(--accent))]" />
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--accent))]">Try asking</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => onSend(q)}
                className="text-[12.5px] font-semibold text-[hsl(var(--blue-700))] bg-white hover:bg-[hsl(var(--blue-50))] rounded-full px-3.5 py-2 border border-black/8 transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div ref={scroller} className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {messages.map((m) => (
            <Bubble key={m.id} m={m} onDelete={onDelete} />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-[hsl(var(--soft-bg))] border border-black/8 rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--blue-700))]" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
          placeholder="Ask Eva anything about visas, travel, or documents…"
          className="flex-1 h-11 rounded-full border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-5 text-[14px] text-[hsl(var(--blue-900))] transition"
        />
        <button
          onClick={() => onSend()}
          disabled={!text.trim() || sending}
          className="h-11 w-11 rounded-full bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center disabled:opacity-50 hover:bg-[hsl(var(--blue-800))] transition"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--blue-900))]/40">
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Eva is an AI assistant — for critical decisions, please verify with official sources or consult our team at info@wehive.in</span>
      </div>
    </div>
  );
}
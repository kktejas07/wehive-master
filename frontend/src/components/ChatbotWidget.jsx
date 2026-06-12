import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { API, useAuth } from '../context/AuthContext';
import { BRAND } from '../data/mock';
import { useI18n } from '../context/I18nContext';

const KEY_SESSION = 'wehive_chat_session';

function Bubble({ m }) {
  const me = m.role === 'user';
  return (
    <div className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
          me
            ? 'bg-[hsl(var(--blue-700))] text-white rounded-br-sm'
            : 'bg-white border border-black/5 text-[hsl(var(--blue-900))] rounded-bl-sm'
        }`}
      >
        <div className="text-[14px] leading-snug whitespace-pre-wrap">{m.text}</div>
      </div>
    </div>
  );
}

function Suggestions({ onPick }) {
  const items = [
    'How long does a US B1/B2 take?',
    'Best time to visit Japan?',
    'Documents for Schengen visa?',
    'Cheapest visa for an Indian passport?',
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="text-[12.5px] font-semibold text-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))] hover:bg-[hsl(var(--blue-100))] rounded-full px-3 py-1.5 transition"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

export default function ChatbotWidget() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(KEY_SESSION));
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scroller = useRef(null);

  useEffect(() => {
    if (!open || !sessionId) return;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios
      .get(`${API}/chatbot/sessions/${sessionId}/messages`, { headers })
      .then((r) => setMessages(r.data || []))
      .catch(() => setMessages([]));
  }, [open, sessionId, token]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-chatbot', handler);
    return () => window.removeEventListener('open-chatbot', handler);
  }, []);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await axios.post(`${API}/chatbot/sessions`, { title: 'New chat' }, { headers });
    const sid = r.data.session_id;
    localStorage.setItem(KEY_SESSION, sid);
    setSessionId(sid);
    return sid;
  };

  const onSend = async (override) => {
    const q = (override ?? text).trim();
    if (!q || sending) return;
    setSending(true);
    setText('');
    // optimistic
    setMessages((m) => [...m, { id: 'u-' + Date.now(), role: 'user', text: q }]);
    try {
      const sid = await ensureSession();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await axios.post(
        `${API}/chatbot/sessions/${sid}/messages`,
        { text: q },
        { headers }
      );
      setMessages((m) => [
        ...m.filter((x) => x.id !== 'u-' + Date.now()),
        r.data.user_message,
        r.data.assistant_message,
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          text: `Hmm, I could not reply. Please try again or reach our team at ${BRAND.phone}.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[80] inline-flex items-center justify-center h-14 w-14 rounded-full text-white shadow-[0_15px_40px_-10px_rgba(10,44,138,0.55)]"
        style={{ background: 'linear-gradient(135deg, hsl(var(--blue-700)) 0%, hsl(var(--accent)) 130%)' }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open chatbot"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }}>
              <X className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-24 right-5 z-[80] w-[calc(100vw-2.5rem)] sm:w-[400px] h-[560px] rounded-3xl overflow-hidden flex flex-col backdrop-blur-2xl bg-white/85 border border-white/40 shadow-[0_30px_70px_-20px_rgba(10,44,138,0.45)]"
          >
            <header className="px-5 py-4 flex items-center gap-3 border-b border-black/5 bg-white/60">
              <span className="h-9 w-9 rounded-full bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-[hsl(var(--blue-900))] truncate">{t('chatbot.title')}</div>
                <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55 inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  AI powered
                </div>
              </div>
            </header>

            <div ref={scroller} className="flex-1 p-4 space-y-3 overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-center py-6 space-y-4">
                  <div className="font-display font-extrabold text-[20px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                    {t('chatbot.start')}
                  </div>
                  <p className="text-[13px] text-[hsl(var(--blue-900))]/65">
                    Ask me about visa types, fees, holiday plans for any country.
                  </p>
                  <Suggestions onPick={(q) => onSend(q)} />
                </div>
              )}
              {messages.map((m) => (
                <Bubble key={m.id} m={m} />
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-white border border-black/5 px-3.5 py-2.5 inline-flex items-center gap-2 text-[hsl(var(--blue-900))]/65">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[13px]">{t('chatbot.thinking')}</span>
                  </div>
                </div>
              )}
            </div>

            <footer className="p-3 border-t border-black/5 bg-white/60">
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  placeholder={t('chatbot.placeholder')}
                  className="flex-1 h-11 rounded-full border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] text-[hsl(var(--blue-900))] bg-white/85 transition"
                />
                <button
                  onClick={() => onSend()}
                  disabled={sending || !text.trim()}
                  className="h-11 w-11 rounded-full text-white inline-flex items-center justify-center disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--blue-700)) 0%, hsl(var(--accent)) 130%)' }}
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

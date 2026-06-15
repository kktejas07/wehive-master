import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader2, Send, Search, ChevronDown, Plus, Minus, MessageCircle, Rocket, FileText, CreditCard, ClipboardList, RefreshCw, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { FAQS } from '../data/mock';

const CATEGORIES = [
  { id: 'getting-started', label: 'Getting started', icon: Rocket },
  { id: 'documents', label: 'Documents & uploads', icon: FileText },
  { id: 'payments', label: 'Payments & pricing', icon: CreditCard },
  { id: 'application', label: 'Application status', icon: ClipboardList },
  { id: 'refunds', label: 'Refunds & guarantees', icon: RefreshCw },
  { id: 'technical', label: 'Account & tech', icon: Lock },
];

const CATEGORY_FAQS = {
  'getting-started': ['q1', 'q4'],
  'documents': ['q2'],
  'payments': ['q5'],
  'application': ['q1', 'q6'],
  'refunds': ['q1', 'q6'],
  'technical': ['q3'],
};

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left py-5 flex items-start gap-4 border-b border-black/5 hover:bg-[hsl(var(--soft-bg))]/50 transition"
    >
      <span className="mt-0.5 shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] text-[12px]">
        {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
      </span>
      <div className="flex-1">
        <div className="text-[15px] font-bold text-[hsl(var(--blue-900))]">{item.q}</div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <p className="mt-2 text-[14px] leading-relaxed text-[hsl(var(--blue-900))]/60">{item.a}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}

function EvaChat({ token }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    axios.post(`${API}/chatbot/start`, { title: 'Help center chat' }, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setSessionId(r.data.session_id))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async () => {
    if (!input.trim() || !sessionId || loading) return;
    const text = input.trim();
    setInput('');
    setLoading(true);
    setMessages((m) => [...m, { role: 'user', text }]);
    try {
      const r = await axios.post(`${API}/chatbot/chat`, { session_id: sessionId, text }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages((m) => [...m, { role: 'assistant', text: r.data.assistant_message.content }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, I ran into a glitch. Please try again or contact us at +91 91132 56726.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
      <div className="bg-[hsl(var(--blue-900))] px-5 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white text-[13px] font-bold">
          Eva
        </div>
        <div>
          <div className="text-[13px] font-bold text-white">Ask Eva — visa assistant</div>
          <div className="text-[11px] text-white/60">Powered by AI · We Hive</div>
        </div>
      </div>
      <div className="h-72 overflow-y-auto p-4 space-y-3 bg-[hsl(var(--soft-bg))]">
        {messages.length === 0 && (
          <div className="text-center py-6 text-[13px] text-[hsl(var(--blue-900))]/50">
            <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Ask me anything about visas, documents, or your application.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-[hsl(var(--blue-700))] text-white rounded-br-md'
                : 'bg-white border border-black/10 text-[hsl(var(--blue-900))] rounded-bl-md'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white border border-black/10 rounded-2xl rounded-bl-md px-4 py-2.5 text-[13px] text-[hsl(var(--blue-900))]/50">
              Eva is typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-black/10 bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about visas, documents, fees…"
          className="flex-1 h-10 rounded-full border border-black/10 px-4 text-[13px] outline-none focus:border-[hsl(var(--blue-700))]"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="h-10 w-10 rounded-full bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center disabled:opacity-40 hover:bg-[hsl(var(--blue-800))] transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function Help() {
  const { user, token } = useAuth();
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = FAQS.filter((f) =>
    f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleFaqs = searchQuery
    ? filteredFaqs
    : FAQS.filter((f) => CATEGORY_FAQS[activeCategory]?.includes(f.id));

  return (
    <div className="bg-white">
      <Navbar />
      <div className="min-h-[calc(100vh-72px)] pt-28 pb-20 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
              Help center
            </div>
            <h1 className="mt-3 font-display font-extrabold text-[38px] sm:text-[52px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              How can we help you?
            </h1>
            <div className="mt-5 max-w-lg mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--blue-900))]/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs…"
                className="w-full h-12 rounded-full border border-black/10 bg-white pl-11 pr-5 text-[14px] outline-none focus:border-[hsl(var(--blue-700))]"
              />
            </div>
          </div>

          {!searchQuery && (
            <div className="flex flex-wrap gap-2 mb-8">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition ${
                    activeCategory === cat.id
                      ? 'bg-[hsl(var(--blue-900))] text-white'
                      : 'bg-white border border-black/10 text-[hsl(var(--blue-900))]/70 hover:border-[hsl(var(--blue-700))]/40'
                  }`}
                >
                  <cat.icon className="w-4 h-4" /> {cat.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-0 bg-white rounded-2xl border border-black/10 overflow-hidden">
              {visibleFaqs.map((item) => (
                <FaqItem
                  key={item.id}
                  item={item}
                  isOpen={false}
                  onToggle={() => {}}
                />
              ))}
              {visibleFaqs.length === 0 && (
                <div className="p-8 text-center text-[14px] text-[hsl(var(--blue-900))]/50">
                  No results for "{searchQuery}"
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl bg-[hsl(var(--blue-900))] p-5 text-white">
                <h3 className="font-display font-extrabold text-[18px]">Couldn't find answer?</h3>
                <p className="mt-2 text-[13px] text-white/65">Chat with Eva, our AI visa assistant, available 24/7.</p>
                <div className="mt-4 flex gap-3">
                  <a
                    href="https://wa.me/919113256726"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-[12px] font-bold transition"
                  >
                    WhatsApp
                  </a>
                  <a
                    href="tel:+919113256726"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 px-4 py-2 text-[12px] font-bold transition"
                  >
                    Call us
                  </a>
                </div>
              </div>

              {user && token && (
                <EvaChat token={token} />
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
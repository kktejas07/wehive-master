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
  const panelId = `faq-panel-${item.id}`;
  return (
    <div className="border-b border-[hsl(var(--border))] last:border-b-0">
      <h3 className="text-[16px] font-sans">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="w-full text-left px-5 sm:px-6 py-5 flex items-start gap-4 hover:bg-[hsl(var(--soft-bg))] transition-colors duration-200"
        >
          <span className="flex-1 font-semibold text-[hsl(var(--blue-900))]">{item.q}</span>
          <span aria-hidden="true" className="mt-0.5 shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]">
            {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="px-5 sm:px-6 pb-5 -mt-1 text-[15px] leading-relaxed text-muted-foreground">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HiveChat({ token }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    axios.post(`${API}/chatbot/sessions`, { title: 'Help center chat' }, { headers: { Authorization: `Bearer ${token}` } })
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
      const r = await axios.post(`${API}/chatbot/sessions/${sessionId}/messages`, { text }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages((m) => [...m, { role: 'assistant', text: r.data.assistant_message?.text || '' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, I ran into a glitch. Please try again or contact us at +91 91132 56726.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-white overflow-hidden shadow-sm">
      <div className="border-b border-[hsl(var(--border))] px-5 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[hsl(var(--blue-50))] flex items-center justify-center text-[hsl(var(--blue-700))] text-[14px] font-bold">
          H
        </div>
        <div>
          <div className="text-[14px] font-semibold text-[hsl(var(--blue-900))]">Ask Hive — visa assistant</div>
          <div className="text-[12px] text-muted-foreground">Powered by AI · We Hive</div>
        </div>
      </div>
      <div className="h-72 overflow-y-auto p-4 space-y-3 bg-[hsl(var(--soft-bg))]">
        {messages.length === 0 && (
          <div className="text-center py-6 text-[14px] text-muted-foreground">
            <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Ask me anything about visas, documents, or your application.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-[hsl(var(--blue-700))] text-white rounded-br-md'
                : 'bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] rounded-bl-md'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white border border-[hsl(var(--border))] rounded-2xl rounded-bl-md px-4 py-2.5 text-[13px] text-muted-foreground">
              Hive is typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-[hsl(var(--border))] bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about visas, documents, fees…"
          aria-label="Message Hive"
          className="flex-1 min-w-0 h-11 rounded-xl border border-[hsl(var(--border))] px-4 text-[15px] outline-none focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20 transition-colors duration-200"
        />
        <button aria-label="Send message"
          onClick={send}
          disabled={loading || !input.trim()}
          className="h-11 w-11 shrink-0 rounded-xl bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center disabled:opacity-50 hover:bg-[hsl(var(--blue-800))] transition-colors duration-200"
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
  const [openFaq, setOpenFaq] = useState(null);

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
      <main className="min-h-[calc(100vh-72px)] pt-28 md:pt-36 pb-16 md:pb-24 bg-[hsl(var(--soft-bg))]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-12">
            <div className="eyebrow">Help center</div>
            <h1 className="h-display mt-4">How can we help you?</h1>
            <div className="mt-6 max-w-lg mx-auto relative">
              <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs…"
                aria-label="Search FAQs"
                type="search"
                className="w-full h-12 rounded-xl border border-[hsl(var(--border))] bg-white pl-11 pr-5 text-[16px] shadow-sm outline-none hover:border-[hsl(var(--blue-200))] focus:border-[hsl(var(--blue-700))] focus:ring-[3px] focus:ring-[hsl(var(--blue-700))]/20 transition-colors duration-200"
              />
            </div>
          </div>

          {!searchQuery && (
            <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setActiveCategory(cat.id); setOpenFaq(null); }}
                  aria-pressed={activeCategory === cat.id}
                  className={`snap-start shrink-0 inline-flex items-center gap-2 rounded-full h-10 px-4 text-[14px] font-semibold border transition-colors duration-200 ${
                    activeCategory === cat.id
                      ? 'bg-[hsl(var(--blue-50))] border-[hsl(var(--blue-700))] text-[hsl(var(--blue-700))]'
                      : 'bg-white border-[hsl(var(--border))] text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-200))]'
                  }`}
                >
                  <cat.icon className="w-4 h-4" aria-hidden="true" /> {cat.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
              {visibleFaqs.map((item) => (
                <FaqItem
                  key={item.id}
                  item={item}
                  isOpen={openFaq === item.id}
                  onToggle={() => setOpenFaq(openFaq === item.id ? null : item.id)}
                />
              ))}
              {visibleFaqs.length === 0 && (
                <div className="p-8 text-center text-[15px] text-muted-foreground">
                  No results for "{searchQuery}"
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="card-surface p-6">
                <h2 className="h-card">Couldn't find an answer?</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Chat with Hive, our AI visa assistant, available 24/7 — or reach a counsellor directly.</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <a
                    href="https://wa.me/919113256726"
                    className="inline-flex items-center justify-center gap-2 rounded-xl h-11 px-4 btn-accent text-[14px] font-semibold"
                  >
                    WhatsApp
                  </a>
                  <a
                    href="tel:+919113256726"
                    className="inline-flex items-center justify-center gap-2 rounded-xl h-11 px-4 btn-outline text-[14px] font-semibold"
                  >
                    Call us
                  </a>
                </div>
              </div>

              {user && token && (
                <HiveChat token={token} />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
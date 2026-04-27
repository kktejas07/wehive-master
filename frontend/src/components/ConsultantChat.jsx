import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { API } from '../context/AuthContext';

export default function ConsultantChat({ applicationId, token }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scroller = useRef(null);

  const scrollDown = () => {
    setTimeout(() => {
      if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    }, 50);
  };

  const refresh = async () => {
    try {
      const r = await axios.get(`${API}/users/me/applications/${applicationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(r.data || []);
      scrollDown();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId && token) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, token]);

  const onSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await axios.post(
        `${API}/users/me/applications/${applicationId}/messages`,
        { text: text.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setText('');
      await refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white border border-black/5 overflow-hidden flex flex-col h-[480px]">
      <header className="flex items-center gap-3 p-5 border-b border-black/5">
        <span className="h-10 w-10 rounded-full bg-[hsl(var(--blue-700))] text-white inline-flex items-center justify-center font-bold">K</span>
        <div className="flex-1">
          <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">Kiran · Senior consultant</div>
          <div className="text-[11.5px] text-[hsl(var(--blue-900))]/55 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online · replies within 4 hours
          </div>
        </div>
        <MessageCircle className="w-4 h-4 text-[hsl(var(--blue-900))]/35" />
      </header>

      <div ref={scroller} className="flex-1 p-5 space-y-3 overflow-y-auto bg-[hsl(var(--soft-bg))]">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />
        ) : messages.length === 0 ? (
          <div className="text-[13.5px] text-[hsl(var(--blue-900))]/55 text-center py-8">
            Say hi to start the conversation.
          </div>
        ) : (
          messages.map((m) => {
            const me = m.from === 'user';
            return (
              <div key={m.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    me
                      ? 'bg-[hsl(var(--blue-700))] text-white rounded-br-sm'
                      : 'bg-white border border-black/5 text-[hsl(var(--blue-900))] rounded-bl-sm'
                  }`}
                >
                  {!me && m.name && (
                    <div className="text-[11px] font-bold text-[hsl(var(--accent))] mb-0.5">{m.name}</div>
                  )}
                  <div className="text-[14px] leading-snug">{m.text}</div>
                  <div className={`text-[10.5px] mt-1 ${me ? 'text-white/65' : 'text-[hsl(var(--blue-900))]/45'}`}>
                    {new Date(m.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer className="p-3 border-t border-black/5 bg-white">
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
            placeholder="Type your question…"
            className="flex-1 h-11 rounded-full border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none px-4 text-[14px] text-[hsl(var(--blue-900))] transition"
          />
          <button
            onClick={onSend}
            disabled={sending || !text.trim()}
            className="h-11 w-11 rounded-full btn-accent text-white inline-flex items-center justify-center disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </footer>
    </section>
  );
}

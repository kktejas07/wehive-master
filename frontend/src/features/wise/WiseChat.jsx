/**
 * WiseChat — SSE-streaming AI visa guidance chatbot.
 *
 * Usage:
 *   <WiseChat />                      // standalone page
 *   <WiseChat packId="us_student_visa" />  // pre-scoped to a pack
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../lib/apiBase';
import PackSelector from './PackSelector';
import ModelSelector from './ModelSelector';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! I'm **Wise**, your AI visa guidance assistant. I can help you understand visa requirements, prepare for interviews, and navigate the application process. What would you like to know?",
};

function renderMarkdown(text) {
  // Minimal inline markdown: bold, newlines
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
            flexShrink: 0,
            fontSize: 14,
          }}
        >
          ✨
        </div>
      )}
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'var(--wise-bubble-bg, #f3f4f6)',
          color: isUser ? '#fff' : 'var(--wise-bubble-fg, #111)',
          fontSize: 14,
          lineHeight: 1.5,
        }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
      />
    </div>
  );
}

function TypingBubble({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 12 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
          flexShrink: 0,
          fontSize: 14,
        }}
      >
        ✨
      </div>
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          borderRadius: '18px 18px 18px 4px',
          background: 'var(--wise-bubble-bg, #f3f4f6)',
          color: 'var(--wise-bubble-fg, #111)',
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text || (
          <span style={{ opacity: 0.5 }}>
            <Loader2 size={14} style={{ display: 'inline', animation: 'spin 1s linear infinite' }} />
            {' '}Thinking…
          </span>
        )}
      </div>
    </div>
  );
}

export default function WiseChat({ packId: initialPackId }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [packId, setPackId] = useState(initialPackId || null);
  const [modelProfile, setModelProfile] = useState('balanced');
  const [showSettings, setShowSettings] = useState(false);
  const [country, setCountry] = useState('');
  const [visaType, setVisaType] = useState('');

  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  const scrollDown = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 30);
  }, []);

  useEffect(() => {
    scrollDown();
  }, [messages, streamBuffer, scrollDown]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setStreaming(true);
    setStreamBuffer('');

    const body = JSON.stringify({
      message: text,
      session_id: sessionId,
      country: country || undefined,
      visa_type: visaType || undefined,
      pack_id: packId || undefined,
      model_profile: modelProfile,
    });

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const resp = await fetch(`${API}/wise/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
        signal: ctrl.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let newSession = sessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.token) {
              accumulated += payload.token;
              setStreamBuffer(accumulated);
            }
            if (payload.session_id) newSession = payload.session_id;
            if (payload.done) break;
            if (payload.error) throw new Error(payload.error);
          } catch {
            // malformed SSE chunk — skip
          }
        }
      }

      setSessionId(newSession);
      setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I ran into an issue. Please try again.',
          },
        ]);
      }
    } finally {
      setStreaming(false);
      setStreamBuffer('');
      abortRef.current = null;
    }
  }, [input, streaming, sessionId, country, visaType, packId, modelProfile, token]);

  const onKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 500,
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--wise-border, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>✨</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Wise</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>AI Visa Guidance</div>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          style={{
            background: 'none',
            border: '1px solid var(--wise-border, #e5e7eb)',
            borderRadius: 8,
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Settings <ChevronDown size={12} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--wise-border, #e5e7eb)',
            background: 'var(--wise-settings-bg, #f9fafb)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <PackSelector value={packId} onChange={setPackId} token={token} />
          <ModelSelector value={modelProfile} onChange={setModelProfile} token={token} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Country
            <input
              value={country}
              onChange={e => setCountry(e.target.value)}
              placeholder="e.g. US"
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: 80 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Visa Type
            <input
              value={visaType}
              onChange={e => setVisaType(e.target.value)}
              placeholder="e.g. F-1"
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: 80 }}
            />
          </label>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {messages.map((m, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <ChatBubble key={i} message={m} />
        ))}
        {streaming && <TypingBubble text={streamBuffer} />}
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--wise-border, #e5e7eb)',
          display: 'flex',
          gap: 8,
        }}
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about visas, documents, interview prep…"
          rows={1}
          disabled={streaming}
          style={{
            flex: 1,
            resize: 'none',
            borderRadius: 10,
            border: '1px solid var(--wise-border, #e5e7eb)',
            padding: '8px 12px',
            fontSize: 14,
            lineHeight: 1.5,
            outline: 'none',
            fontFamily: 'inherit',
            background: 'var(--wise-input-bg, #fff)',
            color: 'var(--wise-input-fg, #111)',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: streaming || !input.trim()
              ? 'var(--wise-border, #e5e7eb)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none',
            cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {streaming
            ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            : <Send size={18} />
          }
        </button>
      </div>
    </div>
  );
}

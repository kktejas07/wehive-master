import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Bell, Check, CheckCheck, X, Loader2 } from 'lucide-react';
import { API, useAuth } from '../context/AuthContext';

const ICONS = {
  'application': '📋',
  'payment': '💳',
  'status': '📬',
  'document': '📄',
  'ai': '🤖',
  'system': '🔔',
};

function NotifItem({ n, onMarkRead, onDelete }) {
  return (
    <div className={`flex items-start gap-3 p-4 border-b border-black/5 last:border-0 ${n.read ? 'opacity-60' : ''}`}>
      <span className="text-xl shrink-0 mt-0.5">{ICONS[n.type] || '🔔'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-[hsl(var(--blue-900))]">{n.title}</div>
        {n.body && <div className="text-[12.5px] text-[hsl(var(--blue-900))]/55 mt-0.5 line-clamp-2">{n.body}</div>}
        <div className="text-[11px] text-[hsl(var(--blue-900))]/40 mt-1">
          {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!n.read && (
          <button onClick={() => onMarkRead(n.id)} className="p-1.5 rounded-full hover:bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))]" title="Mark as read">
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => onDelete(n.id)} className="p-1.5 rounded-full hover:bg-red-50 text-[hsl(var(--blue-900))]/40 hover:text-red-500" title="Remove">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { token, isAuthed } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (!isAuthed || !token) return;
    let retryDelay = 5000;
    let active = true;

    const connect = () => {
      if (!active) return;
      esRef.current = new EventSource(`${API}/notifications/stream?token=${token}`, {
      });
      esRef.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'keepalive') return;
          if (data.type === 'auth_required') {
            esRef.current?.close();
            return;
          }
          if (data.new_count !== undefined) {
            setUnread(data.new_count);
          }
          if (data.notif) {
            setNotifs((prev) => [data.notif, ...prev.slice(0, 49)]);
            if (!data.notif.read) setUnread((u) => u + 1);
          }
        } catch {}
      };
      esRef.current.onerror = () => {
        esRef.current?.close();
        if (active) setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      };
      esRef.current.onopen = () => {
        retryDelay = 5000;
      };
    };

    connect();
    return () => {
      active = false;
      esRef.current?.close();
    };
  }, [isAuthed, token]);

  useEffect(() => {
    if (!open || !isAuthed) return;
    setLoading(true);
    axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        setNotifs(r.data.items || []);
        setUnread(r.data.unread || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, isAuthed, token]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id) => {
    await axios.post(`${API}/notifications/mark-read?notif_id=${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await axios.post(`${API}/notifications/mark-all-read`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  const deleteNotif = async (id) => {
    await axios.delete(`${API}/notifications/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const removed = notifs.find((x) => x.id === id);
    setNotifs((n) => n.filter((x) => x.id !== id));
    if (removed && !removed.read) setUnread((u) => Math.max(0, u - 1));
  };

  if (!isAuthed) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-900))]/75 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-[hsl(var(--accent))] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-black/10 shadow-[0_20px_60px_-15px_rgba(10,44,138,0.25)] overflow-hidden z-[100]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
            <span className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="inline-flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--accent))] hover:underline">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blue-700))]" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-[hsl(var(--blue-900))]/45">
                No notifications yet
              </div>
            ) : (
              notifs.map((n) => (
                <NotifItem key={n.id} n={n} onMarkRead={markRead} onDelete={deleteNotif} />
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-black/5 bg-[hsl(var(--soft-bg))]">
            <Link
              to="/account?tab=aitools"
              onClick={() => setOpen(false)}
              className="text-[12px] font-bold text-[hsl(var(--accent))] hover:underline"
            >
              View all activity
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
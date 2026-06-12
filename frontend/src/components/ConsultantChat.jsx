import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Send, Loader2, MessageCircle, Calendar, Clock, Video, CheckCircle2, X } from 'lucide-react';
import { API } from '../context/AuthContext';
import { Button } from './ui/button';

const TIME_SLOTS = [
  { day: 'Mon, Jun 15', slots: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'] },
  { day: 'Tue, Jun 16', slots: ['10:00 AM', '1:00 PM', '3:00 PM', '5:00 PM'] },
  { day: 'Wed, Jun 17', slots: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'] },
  { day: 'Thu, Jun 18', slots: ['10:00 AM', '12:00 PM', '3:00 PM', '5:00 PM'] },
  { day: 'Fri, Jun 19', slots: ['9:00 AM', '11:00 AM', '2:00 PM'] },
];

export default function ConsultantChat({ applicationId, token }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowBooking(!showBooking); setBookingConfirmed(false); }}
            className={`h-9 px-3 rounded-full text-[12px] font-bold transition flex items-center gap-1.5 ${
              showBooking ? 'bg-[hsl(var(--blue-700))] text-white' : 'bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/70 hover:bg-[hsl(var(--blue-50))]'
            }`}
          >
            <Video className="w-3.5 h-3.5" /> Book call
          </button>
          <MessageCircle className="w-4 h-4 text-[hsl(var(--blue-900))]/35" />
        </div>
      </header>

      {showBooking && (
        <div className="border-b border-black/5 p-5 bg-gradient-to-r from-[hsl(var(--blue-50))] to-white">
          {bookingConfirmed ? (
            <div className="text-center py-4">
              <div className="inline-flex h-12 w-12 rounded-full bg-emerald-100 items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-[15px] text-[hsl(var(--blue-900))]">Call booked!</h3>
              <p className="text-[13px] text-[hsl(var(--blue-900))]/60 mt-1">
                {selectedDay} at {selectedSlot}
              </p>
              <p className="text-[12px] text-[hsl(var(--blue-900))]/45 mt-1">
                A calendar invite has been sent. We&apos;ll send a Google Meet link 15 min before.
              </p>
              <button
                onClick={() => { setShowBooking(false); setBookingConfirmed(false); }}
                className="mt-3 text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Book a 1:1 video call</div>
                  <div className="text-[12px] text-[hsl(var(--blue-900))]/60">Free for application holders</div>
                </div>
                <button onClick={() => setShowBooking(false)} className="p-1 hover:bg-black/5 rounded-full">
                  <X className="w-4 h-4 text-[hsl(var(--blue-900))]/50" />
                </button>
              </div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {TIME_SLOTS.map(day => (
                  <div key={day.day}>
                    <div className="text-[12px] font-bold text-[hsl(var(--blue-900))]/60 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {day.day}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {day.slots.map(slot => {
                        const isSelected = selectedDay === day.day && selectedSlot === slot;
                        return (
                          <button
                            key={slot}
                            onClick={() => { setSelectedDay(day.day); setSelectedSlot(slot); }}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition ${
                              isSelected
                                ? 'bg-[hsl(var(--blue-700))] text-white'
                                : 'bg-white border border-black/10 text-[hsl(var(--blue-900))]/70 hover:border-[hsl(var(--blue-700))]/30'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => { if (selectedDay && selectedSlot) setBookingConfirmed(true); }}
                disabled={!selectedDay || !selectedSlot}
                className="mt-3 w-full h-10 rounded-full btn-accent text-white font-bold text-[13px]"
              >
                <Video className="w-4 h-4 mr-1.5" /> Confirm booking
              </Button>
            </>
          )}
        </div>
      )}

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

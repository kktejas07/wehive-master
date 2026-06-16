import { useState, useEffect } from 'react';
import { Star, MessageCircle, ThumbsUp, Loader2, User, Clock } from 'lucide-react';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

export default function ReviewsCard({ universityId }) {
  const { token, isAuthed, openAuth } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ rating: 5, title: '', review_text: '', pros: '', cons: '', program_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const fetchReviews = () => {
    setLoading(true);
    axios.get(`${API}/reviews/${universityId}`)
      .then(r => setData(r.data))
      .catch(() => setData({ total: 0, average_rating: 0, items: [] }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReviews(); }, [universityId]);
  const handleSubmit = async () => {
    if (!isAuthed) { openAuth('signup'); return; }
    if (!form.review_text.trim()) { toast({ title: 'Please write a review' }); return; }
    setSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/reviews`, { ...form, university_id: universityId }, { headers });
      toast({ title: 'Review submitted!' });
      setShowForm(false);
      setForm({ rating: 5, title: '', review_text: '', pros: '', cons: '', program_name: '' });
      fetchReviews();
    } catch (e) {
      toast({ title: 'Failed to submit', description: e.response?.data?.detail || e.message });
    }
    setSubmitting(false);
  };

  const items = data?.items || [];
  const displayed = showAll ? items : items.slice(0, 3);

  return (
    <div className="rounded-2xl bg-white border border-black/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))]">
          <MessageCircle className="w-4 h-4 inline mr-1.5 text-[hsl(var(--accent))]" />
          Reviews
          {data && data.total > 0 && (
            <span className="ml-2 text-[13px] font-bold text-[hsl(var(--blue-900))]/50">({data.total})</span>
          )}
        </h3>
        {data && data.average_rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{data.average_rating}</span>
            <span className="text-[12px] text-[hsl(var(--blue-900))]/50">/ 5</span>
          </div>
        )}
      </div>

      <button onClick={() => { if (!isAuthed) openAuth('signup'); else setShowForm(!showForm); }}
        className="w-full h-10 rounded-xl bg-[hsl(var(--blue-50))] hover:bg-[hsl(var(--blue-100))] text-[13px] font-bold text-[hsl(var(--blue-900))] transition mb-4">
        {showForm ? 'Cancel' : 'Write a review'}
      </button>

      {showForm && (
        <div className="mb-4 p-4 rounded-xl bg-[hsl(var(--blue-50))] space-y-3">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))}>
                <Star className={`w-5 h-5 ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Review title" className="w-full h-9 px-3 rounded-lg bg-white border border-black/10 text-[13px] outline-none focus:border-[hsl(var(--blue-700))]" />
          <textarea value={form.review_text} onChange={e => setForm(f => ({ ...f, review_text: e.target.value }))} placeholder="Your review..." rows={3} className="w-full px-3 py-2 rounded-lg bg-white border border-black/10 text-[13px] outline-none focus:border-[hsl(var(--blue-700))] resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={form.pros} onChange={e => setForm(f => ({ ...f, pros: e.target.value }))} placeholder="Pros" className="h-9 px-3 rounded-lg bg-white border border-black/10 text-[13px] outline-none focus:border-[hsl(var(--blue-700))]" />
            <input type="text" value={form.cons} onChange={e => setForm(f => ({ ...f, cons: e.target.value }))} placeholder="Cons" className="h-9 px-3 rounded-lg bg-white border border-black/10 text-[13px] outline-none focus:border-[hsl(var(--blue-700))]" />
          </div>
          <input type="text" value={form.program_name} onChange={e => setForm(f => ({ ...f, program_name: e.target.value }))} placeholder="Program (optional)" className="w-full h-9 px-3 rounded-lg bg-white border border-black/10 text-[13px] outline-none focus:border-[hsl(var(--blue-700))]" />
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full h-10 rounded-xl bg-[hsl(var(--blue-700))] hover:brightness-110 disabled:opacity-50 text-white font-bold text-[13px]">
            {submitting ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-center py-6 text-[13px] text-[hsl(var(--blue-900))]/50">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {displayed.map(r => (
            <div key={r.id} className="rounded-xl bg-[hsl(var(--blue-50))] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--blue-700))] flex items-center justify-center text-white text-[11px] font-bold overflow-hidden">
                    {r.user_avatar ? <img src={r.user_avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-[13px] text-[hsl(var(--blue-900))]">{r.user_name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--blue-900))]/50">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                {r.verified && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Verified</span>}
              </div>
              {r.title && <div className="mt-2 font-bold text-[13px] text-[hsl(var(--blue-900))]">{r.title}</div>}
              <p className="mt-1 text-[12.5px] text-[hsl(var(--blue-900))]/70 leading-relaxed">{r.review_text}</p>
              {(r.pros || r.cons) && (
                <div className="mt-2 flex gap-4 text-[11px]">
                  {r.pros && <span className="text-emerald-600"><ThumbsUp className="w-3 h-3 inline mr-0.5" /> {r.pros}</span>}
                  {r.cons && <span className="text-red-500"><ThumbsUp className="w-3 h-3 inline mr-0.5 rotate-180" /> {r.cons}</span>}
                </div>
              )}
              <div className="mt-1 text-[10px] text-[hsl(var(--blue-900))]/40 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {new Date(r.created_at).toLocaleDateString()}
                {r.program_name && <span>· {r.program_name}</span>}
              </div>
            </div>
          ))}
          {items.length > 3 && (
            <button onClick={() => setShowAll(!showAll)} className="w-full text-center text-[12px] font-bold text-[hsl(var(--blue-700))] hover:underline py-2">
              {showAll ? 'Show less' : `View all ${items.length} reviews`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

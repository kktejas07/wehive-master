import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { Loader2, GraduationCap, CheckCircle, XCircle, Clock, Send, ExternalLink, ArrowRight, FileText, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  under_review: 'bg-amber-100 text-amber-700 border-amber-200',
  offered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  enrolled: 'bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))]/20',
};

export default function UniversityAppsTab({ token }) {
  const { toast } = useToast();
  const [apps, setApps] = useState(null);
  const [visaApps, setVisaApps] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/users/me/applications/universities`, { headers }),
      axios.get(`${API}/users/me/visa-from-university`, { headers }),
    ]).then(([aRes, vRes]) => {
      setApps(aRes.data || []);
      setVisaApps(vRes.data || []);
    }).catch(() => setApps([]));
  }, [token]);

  const updateStatus = async (appId, universityId, status) => {
    setUpdating(`${appId}-${universityId}`);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API}/users/me/applications/universities/${appId}/university-status`,
        { university_id: universityId, status }, { headers });
      toast({ title: `Status updated to ${status}` });
      const { data } = await axios.get(`${API}/users/me/applications/universities`, { headers });
      setApps(data || []);
    } catch (e) {
      toast({ title: 'Update failed', description: e.response?.data?.detail || e.message });
    }
    setUpdating(null);
  };

  const linkedVisaIds = new Set(visaApps.map(v => v.university_app_id));

  if (apps === null) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div>
      <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] text-[hsl(var(--blue-900))] mb-1">University Applications</h2>
      <p className="text-[13px] text-muted-foreground mb-6">Track your university applications, offers, and acceptances.</p>

      {apps.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="w-12 h-12 mx-auto text-[hsl(var(--blue-900))]/20 mb-3" />
          <p className="text-[14px] text-muted-foreground">No university applications yet.</p>
          <Link to="/student-visa" className="mt-3 inline-flex items-center gap-1.5 rounded-xl btn-primary text-white h-11 px-5 text-[14px] font-semibold">
            Browse universities <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map(app => {
            const selections = app.university_selections || [];
            return (
              <div key={app._id} className="rounded-2xl border border-border overflow-hidden">
                <button onClick={() => setExpanded(expanded === app._id ? null : app._id)}
                  className="w-full flex items-center justify-between p-4 bg-[hsl(var(--blue-50))] hover:bg-[hsl(var(--blue-100))] transition">
                  <div className="flex items-center gap-3 text-left">
                    <FileText className="w-5 h-5 text-[hsl(var(--blue-700))]" />
                    <div>
                      <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">
                        {app.university_count} universit{app.university_count === 1 ? 'y' : 'ies'}
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        Created {new Date(app.created_at).toLocaleDateString()}
                        {linkedVisaIds.has(app._id) && ' · Visa app ready'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-600'}`}>
                      {app.status}
                    </span>
                    {expanded === app._id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {expanded === app._id && (
                  <div className="p-4 space-y-3 border-t border-border">
                    {selections.map(sel => {
                      const uni = sel.university || {};
                      const program = sel.program || {};
                      const isUpdating = updating === `${app._id}-${sel.university_id}`;
                      return (
                        <div key={sel.university_id} className="rounded-xl bg-white border border-border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{uni.flag}</span>
                                <Link to={`/university/${sel.university_id}`} className="font-bold text-[14px] text-[hsl(var(--blue-900))] hover:text-[hsl(var(--blue-700))] truncate">{uni.name}</Link>
                              </div>
                              <div className="mt-1 text-[12px] text-muted-foreground">
                                {uni.country_name} · Rank #{uni.rank || 'N/A'}
                                {program.name && <span> · {program.name}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`text-[12px] font-bold px-2.5 py-1 rounded-full border inline-block ${STATUS_COLORS[sel.status] || 'bg-slate-100 text-slate-600'}`}>
                                {sel.status?.replace(/_/g, ' ')}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {(sel.status === 'draft' || sel.status === 'submitted') && (
                              <button onClick={() => updateStatus(app._id, sel.university_id, 'submitted')} disabled={isUpdating}
                                className="inline-flex items-center gap-1.5 rounded-lg h-10 px-3.5 text-[13px] font-semibold disabled:opacity-50 transition-colors bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white">
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Mark submitted
                              </button>
                            )}
                            {sel.status === 'under_review' && (
                              <button onClick={() => updateStatus(app._id, sel.university_id, 'offered')} disabled={isUpdating}
                                className="inline-flex items-center gap-1.5 rounded-lg h-10 px-3.5 text-[13px] font-semibold disabled:opacity-50 transition-colors bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white">
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Got offer
                              </button>
                            )}
                            {(sel.status === 'offered') && (
                              <>
                                <button onClick={() => updateStatus(app._id, sel.university_id, 'accepted')} disabled={isUpdating}
                                  className="inline-flex items-center gap-1.5 rounded-lg h-10 px-3.5 text-[13px] font-semibold disabled:opacity-50 transition-colors btn-accent text-white">
                                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Accept offer
                                </button>
                                <button onClick={() => updateStatus(app._id, sel.university_id, 'rejected')} disabled={isUpdating}
                                  className="inline-flex items-center gap-1.5 rounded-lg h-10 px-3.5 text-[13px] font-semibold disabled:opacity-50 transition-colors bg-white border border-red-200 text-red-700 hover:bg-red-50">
                                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Decline
                                </button>
                              </>
                            )}
                            {sel.status === 'accepted' && (
                              <button onClick={() => updateStatus(app._id, sel.university_id, 'enrolled')} disabled={isUpdating}
                                className="inline-flex items-center gap-1.5 rounded-lg h-10 px-3.5 text-[13px] font-semibold disabled:opacity-50 transition-colors bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white">
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <GraduationCap className="w-3 h-3" />} Confirm enrollment
                              </button>
                            )}
                          </div>

                          {sel.status === 'accepted' && (
                            <div className="mt-2 p-2.5 rounded-lg bg-green-50 border border-green-200">
                              <div className="flex items-center gap-1.5 text-[12px] text-green-700">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Offer accepted! {linkedVisaIds.has(app._id)
                                  ? <span>Visa application ready. <Link to="/account?tab=applications" className="font-bold underline">View visa apps</Link></span>
                                  : <span>Proceed to <Link to={`/student-visa?university=${sel.university_id}`} className="font-bold underline">visa application</Link></span>}
                              </div>
                            </div>
                          )}
                          {sel.status === 'rejected' && (
                            <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                              <div className="flex items-center gap-1.5 text-[12px] text-red-700">
                                <AlertCircle className="w-3.5 h-3.5" /> Offer declined.
                              </div>
                            </div>
                          )}
                          {sel.deadline && (
                            <div className="mt-2 text-[12px] text-amber-700 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Deadline: {new Date(sel.deadline).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {visaApps.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))] mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[hsl(var(--blue-700))]" /> Visa Applications from University Acceptances
          </h3>
          <div className="space-y-2">
            {visaApps.map(v => (
              <div key={v._id} className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-emerald-800">{v.university_name || 'Student visa'}</div>
                  <div className="text-[12px] text-emerald-700">{v.status} · Created {new Date(v.created_at).toLocaleDateString()}</div>
                </div>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-700">{v.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

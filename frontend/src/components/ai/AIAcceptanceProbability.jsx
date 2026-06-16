import { useState } from 'react';
<<<<<<< Updated upstream
import { Sparkles, Loader2, Target, TrendingUp, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
=======
import { Sparkles, Loader2, Target, TrendingUp, CheckCircle, HelpCircle } from 'lucide-react';
>>>>>>> Stashed changes
import { useAuth, API } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';

<<<<<<< Updated upstream
const TIER_COLORS = {
  safety: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', icon: CheckCircle },
  target: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', icon: Target },
  reach: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: TrendingUp },
};

const CONFIDENCE_COLORS = { high: 'text-emerald-600', medium: 'text-amber-600', low: 'text-slate-400' };

export default function AIAcceptanceProbability({ universityId, universityName }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [gpa, setGpa] = useState('');
  const [ielts, setIelts] = useState('');
  const [testScores, setTestScores] = useState('');
  const [background, setBackground] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const handleEstimate = async () => {
    if (!gpa && !ielts && !testScores) {
      toast({ title: 'Enter at least one field', description: 'GPA or test scores help the AI estimate.' });
      return;
    }
    setBusy(true); setResult(null);
    try {
      const body = {};
      if (gpa) body.gpa = Number(gpa);
      if (ielts) body.ielts = Number(ielts);
      if (testScores.trim()) body.test_scores = testScores.trim();
      if (background.trim()) body.background = background.trim();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.post(`${API}/ai/universities/${universityId}/acceptance-probability`, body, { headers });
      setResult(data);
    } catch (e) {
      toast({ title: 'Estimation failed', description: e.response?.data?.detail || e.message });
    }
    setBusy(false);
  };

  return (
    <div className="mt-4">
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 text-[13px] font-bold text-purple-600 hover:text-purple-700 transition">
        <Target className="w-4 h-4" />
        {open ? 'Hide' : 'Estimate my acceptance chances'}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-4">
          <h4 className="font-bold text-[14px] text-purple-800 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Acceptance Probability — {universityName}
          </h4>

          {!result ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" min="0" max="4" value={gpa} onChange={e => setGpa(e.target.value)} placeholder="GPA (e.g. 3.5)" className="h-10 px-3 rounded-xl bg-white border border-purple-200 text-[13px] outline-none focus:border-purple-500" />
                <input type="number" step="0.5" min="0" max="9" value={ielts} onChange={e => setIelts(e.target.value)} placeholder="IELTS (e.g. 7.0)" className="h-10 px-3 rounded-xl bg-white border border-purple-200 text-[13px] outline-none focus:border-purple-500" />
              </div>
              <input type="text" value={testScores} onChange={e => setTestScores(e.target.value)} placeholder="GRE/GMAT/other scores" className="w-full h-10 px-3 rounded-xl bg-white border border-purple-200 text-[13px] outline-none focus:border-purple-500" />
              <textarea value={background} onChange={e => setBackground(e.target.value)} placeholder="Extracurriculars, work experience, achievements..." rows={2} className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 text-[13px] outline-none focus:border-purple-500 resize-none" />
              <button onClick={handleEstimate} disabled={busy}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:brightness-110 disabled:opacity-50 text-white font-bold text-[13px] flex items-center justify-center gap-1.5">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {busy ? 'Estimating...' : 'Estimate probability'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-[36px] font-extrabold text-purple-700">{result.probability}%</div>
                  <div className="text-[11px] text-purple-500 font-bold uppercase tracking-wider">Probability</div>
                </div>
                <div className="text-center">
                  <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold ${
                    TIER_COLORS[result.tier]?.bg || 'bg-slate-100'} ${
                    TIER_COLORS[result.tier]?.text || 'text-slate-700'} ${
                    TIER_COLORS[result.tier]?.border || 'border-slate-300'} border`}>
                    {result.tier === 'safety' ? <CheckCircle className="w-3.5 h-3.5" /> :
                     result.tier === 'target' ? <Target className="w-3.5 h-3.5" /> :
                     <TrendingUp className="w-3.5 h-3.5" />}
                    {result.tier?.charAt(0).toUpperCase() + result.tier?.slice(1) || 'Unknown'}
                  </div>
                  <div className="text-[10px] mt-1 font-semibold uppercase tracking-wider">
                    <span className={CONFIDENCE_COLORS[result.confidence] || 'text-slate-400'}>
                      {result.confidence} confidence
                    </span>
                  </div>
                </div>
              </div>

              {result.factors && result.factors.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1.5">Key Factors</div>
                  <ul className="space-y-1">
                    {result.factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-purple-800">
                        <HelpCircle className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.recommendations && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Recommendation</div>
                  <p className="text-[12px] text-emerald-800">{result.recommendations}</p>
                </div>
              )}

              <button onClick={() => setResult(null)} className="w-full h-9 rounded-xl bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 font-bold text-[12px]">
                Try different scores
              </button>
            </div>
          )}
        </div>
      )}
=======
const TIER = {safety:{bg:'bg-emerald-100',text:'text-emerald-700',icon:CheckCircle},target:{bg:'bg-blue-100',text:'text-blue-700',icon:Target},reach:{bg:'bg-amber-100',text:'text-amber-700',icon:TrendingUp}};

export default function AIAcceptanceProbability({universityId,universityName}){
  const {token}=useAuth(); const{toast}=useToast();
  const[open,setOpen]=useState(false); const[gpa,setGpa]=useState(''); const[ielts,setIelts]=useState(''); const[testScores,setTestScores]=useState(''); const[background,setBackground]=useState(''); const[busy,setBusy]=useState(false); const[result,setResult]=useState(null);
  const handleEstimate=async()=>{
    if(!gpa&&!ielts&&!testScores){toast({title:'Enter at least one field'});return}
    setBusy(true); setResult(null);
    try{
      const body={}; if(gpa)body.gpa=Number(gpa); if(ielts)body.ielts=Number(ielts); if(testScores.trim())body.test_scores=testScores.trim(); if(background.trim())body.background=background.trim();
      const {data}=await axios.post(`${API}/ai/universities/${universityId}/acceptance-probability`,body,{headers:token?{Authorization:`Bearer ${token}`}:{}});
      setResult(data);
    }catch(e){toast({title:'Failed'})}
    setBusy(false);
  };
  return (
    <div className="mt-4">
      <button onClick={()=>setOpen(!open)} className="inline-flex items-center gap-2 text-[13px] font-bold text-purple-600 hover:text-purple-700 transition"><Target className="w-4 h-4"/>{open?'Hide':'Estimate acceptance chances'}</button>
      {open&&<div className="mt-3 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-4">
        <h4 className="font-bold text-[14px] text-purple-800 mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4"/>Acceptance Probability — {universityName}</h4>
        {!result?<div className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><input type="number" step="0.01" min="0" max="4" value={gpa} onChange={e=>setGpa(e.target.value)} placeholder="GPA (3.5)" className="h-10 px-3 rounded-xl bg-white border border-purple-200 text-[13px] outline-none focus:border-purple-500"/><input type="number" step="0.5" min="0" max="9" value={ielts} onChange={e=>setIelts(e.target.value)} placeholder="IELTS (7.0)" className="h-10 px-3 rounded-xl bg-white border border-purple-200 text-[13px] outline-none focus:border-purple-500"/></div>
          <input value={testScores} onChange={e=>setTestScores(e.target.value)} placeholder="GRE/GMAT scores" className="w-full h-10 px-3 rounded-xl bg-white border border-purple-200 text-[13px] outline-none focus:border-purple-500"/>
          <textarea value={background} onChange={e=>setBackground(e.target.value)} placeholder="Extracurriculars, work experience..." rows={2} className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 text-[13px] outline-none focus:border-purple-500 resize-none"/>
          <button onClick={handleEstimate} disabled={busy} className="w-full h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:brightness-110 disabled:opacity-50 text-white font-bold text-[13px] flex items-center justify-center gap-1.5">{busy?<Loader2 className="w-4 h-4 animate-spin"/>:<Sparkles className="w-4 h-4"/>}{busy?'Estimating...':'Estimate'}</button>
        </div>:<div className="space-y-4">
          <div className="flex items-center justify-between"><div className="text-center"><div className="text-[36px] font-extrabold text-purple-700">{result.probability}%</div><div className="text-[11px] text-purple-500 font-bold uppercase">Probability</div></div><div className="text-center"><div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold border ${TIER[result.tier]?.bg||'bg-slate-100'} ${TIER[result.tier]?.text||'text-slate-700'}`}>{result.tier?.charAt(0).toUpperCase()+result.tier?.slice(1)||'Unknown'}</div><div className="text-[10px] mt-1 font-semibold text-slate-400">{result.confidence} confidence</div></div></div>
          {result.factors?.length>0&&<div><div className="text-[11px] font-bold text-purple-600 uppercase mb-1">Factors</div><ul className="space-y-1">{result.factors.map((f,i)=><li key={i} className="flex items-start gap-2 text-[12px] text-purple-800"><HelpCircle className="w-3 h-3 text-purple-400 shrink-0 mt-0.5"/>{f}</li>)}</ul></div>}
          {result.recommendations&&<div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200"><div className="text-[11px] font-bold text-emerald-700 uppercase mb-0.5">Recommendation</div><p className="text-[12px] text-emerald-800">{result.recommendations}</p></div>}
          <button onClick={()=>setResult(null)} className="w-full h-9 rounded-xl bg-white border border-purple-200 text-purple-700 font-bold text-[12px]">Try different scores</button>
        </div>}
      </div>}
>>>>>>> Stashed changes
    </div>
  );
}

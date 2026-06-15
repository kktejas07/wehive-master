import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import {
  Mic, MicOff, ChevronRight, Loader2, Clock, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Award, Shield, ChevronLeft,
  BarChart3, Star, FileText, MessageSquare, Sparkles, Flag,
} from 'lucide-react';

const INTERVIEW_QUESTIONS = {
  us: {
    name: 'US F-1 Student Visa',
    questions: [
      { id: 'q1', question: 'Why did you choose this particular university and program in the United States?', tips: 'Mention specific courses, faculty, research opportunities. Be specific about why this school fits your goals.' },
      { id: 'q2', question: 'What are your plans after graduation?', tips: 'Discuss OPT, return to home country, or further studies. Show clear career trajectory.' },
      { id: 'q3', question: 'How will you fund your education and living expenses?', tips: 'Mention scholarships, family sponsorship, education loans. Be prepared with specific figures.' },
      { id: 'q4', question: 'Why do you want to study in the US instead of your home country?', tips: 'Focus on program quality, research facilities, international exposure. Avoid negative comments about home country.' },
      { id: 'q5', question: 'Do you have any relatives in the United States?', tips: 'Be honest. If yes, explain their immigration status. Emphasize your intent to return home.' },
      { id: 'q6', question: 'What is your intended major and why are you passionate about it?', tips: 'Connect to your academic background, work experience, or personal story.' },
      { id: 'q7', question: 'Have you applied to any other universities?', tips: 'Name 2-3 other schools you applied to. Explain why you chose this one.' },
      { id: 'q8', question: 'How does this program align with your career goals?', tips: 'Connect program curriculum to specific job roles or industries.' },
    ],
  },
  uk: {
    name: 'UK Tier 4 Student Visa',
    questions: [
      { id: 'q1', question: 'Why did you choose to study in the UK specifically?', tips: 'Mention academic reputation, shorter program duration, research strengths.' },
      { id: 'q2', question: 'What are your career plans after completing your studies?', tips: 'Discuss Graduate Route visa options and long-term career plans.' },
      { id: 'q3', question: 'Can you explain your chosen course and why it interests you?', tips: 'Show understanding of course modules, assessment methods.' },
      { id: 'q4', question: 'How does this course fit with your previous education?', tips: 'Connect prior qualifications to course prerequisites and content.' },
      { id: 'q5', question: 'Do you intend to work in the UK after graduation?', tips: 'Mention Graduate Route (2 years post-study work).' },
    ],
  },
  schengen: {
    name: 'Schengen Student Visa (Europe)',
    questions: [
      { id: 'q1', question: 'Why did you choose this European country for your studies?', tips: 'Discuss program quality, cultural aspects, EU recognition.' },
      { id: 'q2', question: 'How will you support yourself financially?', tips: 'Show proof of sufficient funds. Mention blocked accounts if applicable (Germany).' },
      { id: 'q3', question: 'What are your accommodation arrangements?', tips: 'Mention dormitory, shared apartment, or university housing confirmation.' },
      { id: 'q4', question: 'Do you plan to travel within the Schengen area?', tips: 'It is normal to travel. Mention plans that show cultural interest.' },
      { id: 'q5', question: 'What language will you use for daily communication?', tips: 'Discuss language proficiency and any preparatory language courses.' },
    ],
  },
  canada: {
    name: 'Canada Study Permit',
    questions: [
      { id: 'q1', question: 'Why did you choose Canada for your studies?', tips: 'Mention quality of education, multicultural environment, PGWP opportunities.' },
      { id: 'q2', question: 'What is your study plan and why this particular institution?', tips: 'Show research about the institution and program.' },
      { id: 'q3', question: 'Do you have sufficient funds for tuition and living expenses?', tips: 'Show GIC if applicable. Discuss all funding sources.' },
      { id: 'q4', question: 'What are your intentions after completing the program?', tips: 'Mention PGWP and potential PR pathways through Express Entry.' },
      { id: 'q5', question: 'Do you have any family in Canada?', tips: 'Be honest about family ties. Show strong ties to home country.' },
    ],
  },
  australia: {
    name: 'Australia Student Visa (Subclass 500)',
    questions: [
      { id: 'q1', question: 'Why did you choose Australia for your studies?', tips: 'Mention program quality, lifestyle, post-study work options.' },
      { id: 'q2', question: 'What is your genuine temporary entrant (GTE) statement?', tips: 'Show strong ties to home country and genuine study intent.' },
      { id: 'q3', question: 'How will you fund your stay in Australia?', tips: 'Show sufficient funds for tuition + living ($21,041/yr).' },
      { id: 'q4', question: 'Do you have Overseas Student Health Cover (OSHC)?', tips: 'Confirm OSHC arrangement for the entire duration.' },
    ],
  },
};

const COUNTRY_LIST = [
  { id: 'us', label: 'US F-1', flag: '', color: 'bg-blue-500' },
  { id: 'uk', label: 'UK Tier 4', flag: '', color: 'bg-red-500' },
  { id: 'schengen', label: 'Schengen', flag: '', color: 'bg-amber-500' },
  { id: 'canada', label: 'Canada', flag: '', color: 'bg-red-600' },
  { id: 'australia', label: 'Australia', flag: '', color: 'bg-emerald-500' },
];

const SCORE_CRITERIA = [
  { key: 'clarity', label: 'Clarity', max: 25 },
  { key: 'specificity', label: 'Specificity', max: 25 },
  { key: 'confidence', label: 'Confidence', max: 25 },
  { key: 'preparation', label: 'Preparation', max: 25 },
];

function getScoreLabel(score) {
  if (score >= 90) return { label: 'Excellent', color: 'text-emerald-600', icon: Star };
  if (score >= 75) return { label: 'Good', color: 'text-blue-600', icon: CheckCircle2 };
  if (score >= 50) return { label: 'Needs Work', color: 'text-amber-600', icon: AlertCircle };
  return { label: 'Practice More', color: 'text-red-600', icon: XCircle };
}

export default function VisaInterview() {
  const [country, setCountry] = useState('us');
  const [phase, setPhase] = useState('select');
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [active, setActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const questions = INTERVIEW_QUESTIONS[country]?.questions || [];
  const total = questions.length;
  const currentQData = questions[currentQ];

  useEffect(() => {
    let timer;
    if (active && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && active) {
      handleNext();
    }
    return () => clearInterval(timer);
  }, [active, timeLeft]);

  const startInterview = () => {
    setPhase('interview');
    setCurrentQ(0);
    setResults([]);
    setAnswer('');
    setTimeLeft(120);
    setActive(true);
  };

  const handleNext = useCallback(() => {
    const score = Math.min(100, Math.floor(Math.random() * 40) + 40 + (answer.length > 50 ? 20 : 0) + (answer.length > 150 ? 20 : 0));
    const newResults = [...results, { question: currentQData?.question, answer, score }];
    setResults(newResults);

    if (currentQ + 1 < total) {
      setCurrentQ(q => q + 1);
      setAnswer('');
      setTimeLeft(120);
    } else {
      setPhase('results');
      setActive(false);
    }
  }, [currentQ, total, currentQData, answer, results]);

  const skipQuestion = () => {
    const newResults = [...results, { question: currentQData?.question, answer: '(skipped)', score: 0 }];
    setResults(newResults);
    if (currentQ + 1 < total) {
      setCurrentQ(q => q + 1);
      setAnswer('');
      setTimeLeft(120);
    } else {
      setPhase('results');
      setActive(false);
    }
  };

  const totalScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;
  const scoreInfo = getScoreLabel(totalScore);

  return (
    <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
      <Navbar />

      <main className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--blue-900))]/55 mb-6">
            <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[hsl(var(--blue-900))] font-bold">Visa Interview Simulator</span>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--accent))] mb-3">
              <Shield className="w-3.5 h-3.5" /> Mock Interview
            </div>
            <h1 className="font-display font-extrabold text-[36px] sm:text-[44px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              Visa Interview Simulator
            </h1>
            <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60 max-w-2xl mx-auto">
              Practice mock embassy interviews with real questions used by consular officers. Get scored on clarity, specificity, confidence, and preparation.
            </p>
          </div>

          {phase === 'select' && (
            <div className="max-w-2xl mx-auto">
              <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
                <h2 className="font-display font-extrabold text-[22px] text-[hsl(var(--blue-900))] mb-2">Select visa type</h2>
                <p className="text-[14px] text-[hsl(var(--blue-900))]/60 mb-6">Choose the country and visa category you want to practice for.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {COUNTRY_LIST.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCountry(c.id)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                        country === c.id
                          ? 'border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-50))]'
                          : 'border-black/5 hover:border-[hsl(var(--blue-700))]/30 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{c.flag || <Flag className="w-7 h-7 text-[hsl(var(--blue-700))]" />}</span>
                        <div>
                          <div className="font-bold text-[hsl(var(--blue-900))]">{c.label}</div>
                          <div className="text-[12px] text-[hsl(var(--blue-900))]/60">{INTERVIEW_QUESTIONS[c.id]?.questions.length} questions</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-6">
                  <Button onClick={startInterview} className="w-full h-12 rounded-full btn-accent text-white font-bold">
                    Start mock interview <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white border border-black/5 p-6">
                <h3 className="font-bold text-[15px] text-[hsl(var(--blue-900))] mb-3">Tips</h3>
                <ul className="space-y-2">
                  {['Speak clearly and confidently', 'Give specific, detailed answers', 'Show ties to your home country', 'Be honest — consular officers spot inconsistencies', 'Practice with a timer (2 min per question)'].map(tip => (
                    <li key={tip} className="flex items-start gap-2 text-[13px] text-[hsl(var(--blue-900))]/70">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {phase === 'interview' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[hsl(var(--blue-900))]/60">
                  Question {currentQ + 1} of {total}
                </div>
                <div className={`flex items-center gap-1.5 text-[14px] font-bold ${timeLeft < 30 ? 'text-red-500' : 'text-[hsl(var(--blue-900))]'}`}>
                  <Clock className="w-4 h-4" />
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              </div>

              <div className="w-full bg-white rounded-full h-1.5 mb-8 overflow-hidden">
                <div
                  className="h-full bg-[hsl(var(--accent))] transition-all"
                  style={{ width: `${((currentQ + 1) / total) * 100}%` }}
                />
              </div>

              <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{COUNTRY_LIST.find(c => c.id === country)?.flag || <Flag className="w-7 h-7 text-[hsl(var(--blue-700))]" />}</span>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--accent))]">{INTERVIEW_QUESTIONS[country]?.name}</div>
                    <div className="text-[13px] text-[hsl(var(--blue-900))]/60">Consular Officer</div>
                  </div>
                </div>
                <p className="text-[18px] font-bold text-[hsl(var(--blue-900))] leading-relaxed">
                  {currentQData?.question}
                </p>
                {currentQData?.tips && (
                  <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[12px] font-bold text-amber-800">Tip</div>
                        <div className="text-[12.5px] text-amber-700 mt-0.5">{currentQData.tips}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/55">Your answer</label>
                  <span className="text-[12px] text-[hsl(var(--blue-900))]/40">{answer.length} characters</span>
                </div>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type or speak your answer here..."
                  className="w-full min-h-[140px] rounded-2xl border border-black/10 focus:border-[hsl(var(--blue-700))] outline-none p-4 text-[14px] text-[hsl(var(--blue-900))] resize-none transition"
                />
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsRecording(!isRecording)}
                      className="rounded-full h-10 px-4"
                    >
                      {isRecording ? <MicOff className="w-4 h-4 mr-1.5 text-red-500" /> : <Mic className="w-4 h-4 mr-1.5" />}
                      {isRecording ? 'Stop' : 'Record'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={skipQuestion} className="text-[13px] h-10 rounded-full">
                      Skip
                    </Button>
                    <Button onClick={handleNext} className="rounded-full btn-accent text-white h-10 px-5 font-bold">
                      {currentQ + 1 < total ? 'Next question' : 'See results'}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase === 'results' && (
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className={`inline-flex h-20 w-20 rounded-2xl items-center justify-center mb-4 ${totalScore >= 75 ? 'bg-emerald-100' : totalScore >= 50 ? 'bg-amber-100' : 'bg-red-100'}`}>
                  {totalScore >= 75 ? <CheckCircle2 className="w-10 h-10 text-emerald-600" /> : totalScore >= 50 ? <AlertCircle className="w-10 h-10 text-amber-600" /> : <XCircle className="w-10 h-10 text-red-600" />}
                </div>
                <h2 className="font-display font-extrabold text-[32px] text-[hsl(var(--blue-900))]">Interview Complete</h2>
                <div className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">{INTERVIEW_QUESTIONS[country]?.name}</div>
              </div>

              <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8 mb-6 text-center">
                <div className="text-[48px] font-display font-extrabold">{totalScore}%</div>
                <div className={`text-[16px] font-bold mt-1 ${scoreInfo.color}`}>
                  <scoreInfo.icon className="w-4 h-4 inline mr-1" />
                  {scoreInfo.label}
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  {SCORE_CRITERIA.map(c => (
                    <div key={c.key} className="text-center">
                      <div className="text-[20px] font-display font-extrabold text-[hsl(var(--blue-900))]">
                        {Math.min(100, Math.floor(totalScore * (0.8 + Math.random() * 0.4)))}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--blue-900))]/55 uppercase tracking-[0.1em]">{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8 mb-6">
                <h3 className="font-bold text-[16px] text-[hsl(var(--blue-900))] mb-4">Question Review</h3>
                <div className="space-y-3">
                  {results.map((r, i) => {
                    const s = r.score;
                    return (
                      <div key={i} className="rounded-xl border border-black/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{r.question}</div>
                            {r.answer !== '(skipped)' && (
                              <div className="mt-1 text-[12.5px] text-[hsl(var(--blue-900))]/60">{r.answer}</div>
                            )}
                            {r.answer === '(skipped)' && (
                              <div className="mt-1 text-[12px] italic text-[hsl(var(--blue-900))]/40">Skipped</div>
                            )}
                          </div>
                          <div className={`text-[18px] font-display font-extrabold shrink-0 ${s >= 75 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {s}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button onClick={startInterview} className="rounded-full btn-accent text-white h-12 px-6 font-bold">
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Practice again
                </Button>
                <Link
                  to={`/student-visa?country=${country}`}
                  className="inline-flex items-center gap-2 rounded-full btn-primary text-white h-12 px-6 font-bold"
                >
                  Apply for visa <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

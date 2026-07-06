import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Award, Mic, MicOff, Volume2, ArrowRight, Play, RotateCcw, AlertTriangle, CheckCircle, Sparkles, BookOpen, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import VoiceWaveform from '../components/VoiceWaveform';

const QUESTIONS = [
  { id: 1, text: 'Why did you choose this specific university in the United States?', category: 'Intent' },
  { id: 2, text: 'Who is sponsoring your education, and what is their source of income?', category: 'Finance' },
  { id: 3, text: 'What are your plans after completing your degree?', category: 'Ties to Home Country' },
  { id: 4, text: 'Have you traveled internationally before, or do you have relatives in the target country?', category: 'Background' },
];

export default function VisaInterviewSandbox() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [scores, setScores] = useState(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [history, setHistory] = useState([]);

  const currentQuestion = QUESTIONS[currentIdx];

  // Speak the interviewer question
  const handleSpeakQuestion = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(currentQuestion.text);
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [currentQuestion]);

  useEffect(() => {
    // Automatically read question on load/change
    handleSpeakQuestion();
  }, [currentIdx, handleSpeakQuestion]);

  // Speech recognition for user answer
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech Recognition not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };
    rec.onresult = (e) => {
      const resultText = e.results[0][0].transcript;
      setTranscript(resultText);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  const stopListening = () => {
    setIsListening(false);
  };

  // Evaluate user answer
  const handleEvaluate = () => {
    if (!transcript.trim()) return;
    setLoadingScore(true);
    
    // Simulate AI feedback assessment
    setTimeout(() => {
      // Basic heuristic score calculation
      const wordCount = transcript.split(' ').length;
      const relevance = transcript.toLowerCase().includes('learn') || transcript.toLowerCase().includes('study') || transcript.toLowerCase().includes('career') ? 90 : 65;
      const clarity = wordCount > 15 ? 85 : 60;
      const delivery = wordCount > 8 && wordCount < 35 ? 90 : 70;
      const overall = Math.round((relevance + clarity + delivery) / 3);

      const advice = overall > 80 
        ? 'Great response! Clear intent and concise delivery. Make sure to maintain direct eye contact during the live interview.'
        : 'Your answer is a bit brief. Explain *why* the course curriculum matches your career goals and name 1-2 specific modules to show deep research.';

      const result = {
        overall,
        relevance,
        clarity,
        delivery,
        advice,
      };

      setScores(result);
      setHistory(prev => [...prev, { q: currentQuestion.text, a: transcript, score: overall }]);
      setLoadingScore(false);
    }, 1500);
  };

  const handleNext = () => {
    setScores(null);
    setTranscript('');
    setCurrentIdx((prev) => (prev + 1) % QUESTIONS.length);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-4xl mx-auto px-5">
          
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] mb-3">
              <Award className="w-3.5 h-3.5" /> Interview Sandbox
            </span>
            <h1 className="font-display font-extrabold text-[36px] sm:text-[48px] tracking-[-0.03em] text-[hsl(var(--blue-900))] leading-tight">
              Mock Visa Interview Sandbox
            </h1>
            <p className="mt-2.5 text-[15px] text-[hsl(var(--blue-900))]/65 max-w-lg mx-auto">
              Practice answering tough embassy questions, record your answers, and receive instant AI performance scorecards.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-start">
            
            {/* Left side - Question and voice response panel */}
            <div className="md:col-span-8 bg-white border border-black/5 rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-900/5 space-y-6">
              
              {/* Question Header */}
              <div className="flex justify-between items-center pb-4 border-b border-black/5">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/40">
                  Question {currentIdx + 1} of {QUESTIONS.length} ({currentQuestion.category})
                </span>
                
                <button
                  onClick={handleSpeakQuestion}
                  disabled={isSpeaking}
                  className="p-2 rounded-full bg-[hsl(var(--soft-bg))] hover:bg-black/5 text-[hsl(var(--blue-700))] transition"
                  title="Hear question"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Question Box */}
              <div className="min-h-[80px] flex items-center justify-center bg-[hsl(var(--soft-bg))]/50 rounded-2xl p-6 border border-black/5 text-center">
                <p className="text-[18px] font-extrabold text-[hsl(var(--blue-900))] leading-relaxed">
                  &ldquo;{currentQuestion.text}&rdquo;
                </p>
              </div>

              {/* Animated Waveform Display */}
              <div className="py-2">
                <VoiceWaveform isActive={isListening} isSpeaking={isSpeaking} />
              </div>

              {/* User Voice Input Area */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`h-12 w-12 rounded-full inline-flex items-center justify-center transition shadow-md ${
                      isListening 
                        ? 'bg-rose-500 text-white animate-pulse' 
                        : 'bg-[hsl(var(--blue-900))] text-white hover:opacity-90'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <div className="text-[13px] text-[hsl(var(--blue-900))]/60">
                    {isListening ? 'Speak now. Tap mic button when finished.' : 'Tap mic to record your response.'}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/5 p-4 min-h-[100px] bg-[hsl(var(--soft-bg))]/30 text-[14px]">
                  {transcript || <span className="text-[hsl(var(--blue-900))]/35 italic">Your transcribed response will appear here...</span>}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-black/5">
                <button
                  onClick={() => setTranscript('')}
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Answer
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleEvaluate}
                    disabled={!transcript.trim() || loadingScore}
                    className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] text-white text-[13px] font-bold px-6 h-11 hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {loadingScore ? 'Evaluating...' : 'Get Scorecard'} <ArrowRight className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={handleNext}
                    className="rounded-full border border-black/10 text-[13px] font-bold px-5 h-11 hover:bg-black/5 transition"
                  >
                    Skip Question
                  </button>
                </div>
              </div>

            </div>

            {/* Right side - Evaluation scorecard */}
            <div className="md:col-span-4 space-y-6">
              
              <AnimatePresence mode="wait">
                {scores ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white border border-black/5 rounded-3xl p-6 shadow-xl shadow-blue-900/5 space-y-6"
                  >
                    <div className="text-center border-b border-black/5 pb-4">
                      <div className="text-5xl font-black text-[hsl(var(--blue-900))]">{scores.overall}%</div>
                      <div className="text-[11px] uppercase tracking-wider font-bold text-[hsl(var(--blue-900))]/40 mt-1">
                        Overall Score
                      </div>
                    </div>

                    <div className="space-y-4">
                      <ScoreBar label="Relevance & Content" score={scores.relevance} />
                      <ScoreBar label="Clarity & Vocabulary" score={scores.clarity} />
                      <ScoreBar label="Speed & Delivery" score={scores.delivery} />
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100/60 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[12.5px] font-medium text-[hsl(var(--blue-900))]/80 leading-relaxed">
                        {scores.advice}
                      </p>
                    </div>

                    <button
                      onClick={handleNext}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-[hsl(var(--blue-900))] text-white font-bold text-[13px] h-11 hover:opacity-90 transition"
                    >
                      Next Question <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                ) : (
                  <div className="bg-[hsl(var(--blue-900))] text-white rounded-3xl p-6 text-center space-y-4">
                    <BookOpen className="w-8 h-8 text-[hsl(var(--accent))] mx-auto animate-bounce" />
                    <h3 className="font-display font-extrabold text-[18px]">Sandbox Guidelines</h3>
                    <p className="text-[12.5px] text-white/70 leading-relaxed">
                      1. Click on the speaker icon to hear the interviewer speak the question.<br/>
                      2. Press the mic to record your verbal response.<br/>
                      3. Click "Get Scorecard" to receive immediate visual ratings and tips.
                    </p>
                  </div>
                )}
              </AnimatePresence>

              {/* History Panel */}
              {history.length > 0 && (
                <div className="bg-white border border-black/5 rounded-3xl p-5 shadow-md">
                  <h4 className="font-bold text-[13px] text-[hsl(var(--blue-900))] mb-3">Session Progress</h4>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {history.map((h, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-[hsl(var(--soft-bg))]/50 border border-black/5">
                        <span className="text-[12px] truncate max-w-[150px] font-medium">{h.q}</span>
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {h.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

function ScoreBar({ label, score }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-bold text-[hsl(var(--blue-900))]/75">
        <span>{label}</span>
        <span>{score}%</span>
      </div>
      <div className="h-1.5 w-full bg-[hsl(var(--soft-bg))] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[hsl(var(--accent))] rounded-full transition-all duration-500" 
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

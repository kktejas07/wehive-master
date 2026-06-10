'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

const ELIGIBILITY_QUESTIONS = [
  {
    question: 'Have you previously visited the United States?',
    options: ['Yes', 'No'],
  },
  {
    question: 'Was your last US visa issued within the last 12 months?',
    options: ['Yes', 'No'],
  },
  {
    question: 'Have you never been refused a US visa?',
    options: ['Yes', 'No'],
  },
  {
    question: 'Is your previous US visa still valid or expired within the last 12 months?',
    options: ['Yes', 'No'],
  },
];

export default function EligibilityChecker({ countryName }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (answer) => {
    const newAnswers = { ...answers, [currentQuestion]: answer };
    setAnswers(newAnswers);

    if (currentQuestion < ELIGIBILITY_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const isEligible = Object.values(answers).every((a) => a === 'Yes');

  const resetChecker = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResult(false);
  };

  return (
    <section className="py-16 bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-900))]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="font-display font-extrabold text-[26px] sm:text-[36px] tracking-[-0.03em] text-white">
            Had a {countryName} visa before?
          </h2>
          <p className="mt-3 text-[14px] text-white/70 max-w-xl mx-auto">
            You may qualify for automatic visa renewal or dropbox processing.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {!showResult ? (
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl p-8"
            >
              <div className="mb-6">
                <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-[hsl(var(--accent))] mb-2">
                  Question {currentQuestion + 1} of {ELIGIBILITY_QUESTIONS.length}
                </div>
                <div className="h-1.5 rounded-full bg-[hsl(var(--soft-bg))]">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--accent))] transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / ELIGIBILITY_QUESTIONS.length) * 100}%` }}
                  />
                </div>
              </div>

              <h3 className="font-display font-extrabold text-[22px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
                {ELIGIBILITY_QUESTIONS[currentQuestion].question}
              </h3>

              <div className="mt-6 space-y-3">
                {ELIGIBILITY_QUESTIONS[currentQuestion].options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className="w-full text-left rounded-2xl border-2 border-black/10 p-4 font-bold text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))] transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 text-center"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isEligible ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {isEligible ? (
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                ) : (
                  <RefreshCw className="w-10 h-10 text-amber-500" />
                )}
              </div>

              <h3 className="font-display font-extrabold text-[24px] text-[hsl(var(--blue-900))]">
                {isEligible ? 'You May Qualify for Dropbox!' : 'Standard Application Required'}
              </h3>

              <p className="mt-3 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-md mx-auto">
                {isEligible
                  ? `Based on your answers, you may be eligible for ${countryName}'s dropbox/renewal program. No interview required!`
                  : `You may need to go through the standard application process. But don't worry — we're here to help!`}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--red-600))] text-white h-12 px-6 font-bold transition-colors">
                  {isEligible ? 'Check Eligibility in 30 seconds' : 'Start Application'}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={resetChecker}
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))] h-12 px-5 font-bold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake Quiz
                </button>
              </div>

              {isEligible && (
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  {['No Interview Required', 'Faster Processing', 'Guaranteed Renewal'].map((badge) => (
                    <div key={badge} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {badge}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
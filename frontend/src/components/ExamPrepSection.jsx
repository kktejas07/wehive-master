import React, { useState, useEffect } from 'react';

const primaryExams = [
  {
    name: 'TOEFL iBT',
    color: '#003A70',
    icon: '🎓',
    score: '0 – 120',
    fee: '$235 USD',
    validity: '2 years',
    link: 'https://www.ets.org/toefl/register/',
    cta: 'Register Now →',
    minScores: 'USA 80+ · UK 72+ · Canada 86+ · Australia 79+',
    description: 'Accepted by 12,000+ universities in 160+ countries. Home edition available.',
  },
  {
    name: 'IELTS Academic',
    color: '#C8102E',
    icon: '📝',
    score: '0 – 9 Bands',
    fee: '₹17,000 INR',
    validity: '2 years',
    link: 'https://www.ielts.org/book-a-test',
    cta: 'Book Test →',
    minScores: 'UK 6.0+ · Canada 6.5+ · Australia 6.5+ · Germany 6.0+',
    description: 'Offered by British Council, IDP & Cam. Assessment. Computer-based available.',
  },
  {
    name: 'GRE General',
    color: '#009B77',
    icon: '🧪',
    score: '260 – 340',
    fee: '$228 USD',
    validity: '5 years',
    link: 'https://www.ets.org/gre/test-takers/general-test/register/',
    cta: 'Schedule GRE →',
    minScores: 'Top US MS programs: V 155+ · Q 162+ · AWA 4.0+',
    description: 'Required for most US & Canada MS/PhD programs. Home edition available.',
  },
  {
    name: 'GMAT Focus',
    color: '#0077C8',
    icon: '💼',
    score: '205 – 805',
    fee: '$275 USD',
    validity: '5 years',
    link: 'https://www.mba.com/exams/gmat-focus-edition',
    cta: 'Register GMAT →',
    minScores: 'Top MBA programs: 650+ (good) · 700+ (competitive)',
    description: 'New GMAT Focus Edition. 3 sections, 2h15m. Online proctored available.',
  },
];

const secondaryExams = [
  {
    name: 'PTE Academic',
    color: '#007DC3',
    link: 'https://pearsonpte.com/test-takers/pte-academic',
    detail: 'Results in 48 hrs · UK, AUS, CA, NZ',
    fee: '₹15,900',
  },
  {
    name: 'Duolingo English',
    color: '#58CC02',
    link: 'https://englishtest.duolingo.com',
    detail: '$65 USD · At-home · 5,000+ unis',
    fee: '$65 USD',
  },
  {
    name: 'SAT',
    color: '#E8702A',
    link: 'https://www.collegeboard.org/sat',
    detail: '400–1600 · For UG admissions',
    fee: '~$60 USD',
  },
  {
    name: 'ACT',
    color: '#D00000',
    link: 'https://www.act.org',
    detail: '1–36 · UG admissions US/CA',
    fee: '~$63 USD',
  },
];

export default function ExamPrepSection() {
  const [apiExams, setApiExams] = useState(null);

  useEffect(() => {
    fetch('/api/exam-prep')
      .then((r) => r.json())
      .then((data) => { if (data?.exams?.length) setApiExams(data.exams); })
      .catch(() => { /* fallback to static */ });
  }, []);

  return (
    <section className="bg-white py-16 px-4" aria-labelledby="exam-title">
      {/* Header */}
      <h2
        id="exam-title"
        className="text-center font-extrabold text-2xl md:text-3xl mb-2"
        style={{ color: '#011CB5', fontFamily: 'Inter, sans-serif' }}
      >
        Ace Your Entrance Exams
      </h2>
      <p className="text-center text-gray-500 text-sm mb-10">
        Register directly on official portals — WeHive guides your prep timeline
      </p>

      {/* Primary exam cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto mb-8">
        {primaryExams.map((exam) => (
          <div
            key={exam.name}
            className="flex flex-col rounded-2xl border-2 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            style={{ borderColor: exam.color }}
          >
            {/* Icon + name */}
            <span className="text-3xl mb-2">{exam.icon}</span>
            <p className="text-base font-extrabold mb-1" style={{ color: exam.color }}>
              {exam.name}
            </p>
            <p className="text-xs text-gray-500 leading-snug mb-3">{exam.description}</p>

            {/* Score / Fee / Validity chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-black/5 text-gray-700">
                Score: {exam.score}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-black/5 text-gray-700">
                Fee: {exam.fee}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-black/5 text-gray-700">
                Valid: {exam.validity}
              </span>
            </div>

            {/* Min scores */}
            <p className="text-xs text-gray-500 leading-snug mb-4">
              📊 {exam.minScores}
            </p>

            {/* CTA — pushed to bottom */}
            <div className="mt-auto">
              <a
                href={exam.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-white text-sm font-bold py-2 px-4 rounded-full transition-opacity hover:opacity-85"
                style={{ background: exam.color }}
              >
                {exam.cta}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary exams */}
      <p className="text-sm font-bold text-gray-600 max-w-3xl mx-auto mb-3 pl-1">
        Also accepted at leading universities:
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {secondaryExams.map((exam) => (
          <div
            key={exam.name}
            className="flex flex-col gap-1 rounded-xl bg-slate-50 border border-indigo-100 p-4 transition-shadow hover:shadow-md"
          >
            <span className="font-bold text-sm" style={{ color: exam.color }}>
              {exam.name}
            </span>
            <span className="text-xs text-gray-500">{exam.detail}</span>
            <a
              href={exam.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold mt-1 hover:underline"
              style={{ color: exam.color }}
            >
              Official Site →
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

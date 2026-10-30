import React from 'react';

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
  return (
    <section className="exam-section py-16 px-4" aria-labelledby="exam-title">
      <style>{`
        .exam-section {
          background: white;
        }
        .exam-title {
          font-family: 'Inter', sans-serif;
          font-size: clamp(1.4rem, 2.5vw, 2rem);
          font-weight: 800;
          color: #011CB5;
          text-align: center;
          margin-bottom: 0.4rem;
        }
        .exam-sub {
          text-align: center;
          color: #666;
          margin-bottom: 2.5rem;
          font-size: 0.95rem;
        }
        .exam-primary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
          max-width: 1100px;
          margin: 0 auto 2rem;
        }
        .exam-card {
          border-radius: 16px;
          border: 2px solid;
          padding: 1.5rem;
          position: relative;
          transition: box-shadow 0.3s, transform 0.3s;
          background: white;
        }
        .exam-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.12);
        }
        .exam-icon {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
          display: block;
        }
        .exam-name {
          font-size: 1.15rem;
          font-weight: 800;
          margin-bottom: 0.4rem;
        }
        .exam-desc {
          font-size: 0.77rem;
          color: #666;
          margin-bottom: 0.8rem;
          line-height: 1.4;
        }
        .exam-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.8rem;
        }
        .exam-chip {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 8px;
          background: rgba(0,0,0,0.06);
          color: #333;
        }
        .exam-min-scores {
          font-size: 0.72rem;
          color: #555;
          margin-bottom: 1rem;
          line-height: 1.4;
        }
        .exam-cta {
          display: block;
          text-align: center;
          padding: 0.55rem 1rem;
          border-radius: 50px;
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          color: white;
          transition: opacity 0.2s;
        }
        .exam-cta:hover { opacity: 0.85; }
        .exam-secondary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .exam-secondary-card {
          background: #f8f9ff;
          border-radius: 12px;
          padding: 1rem 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          border: 1px solid #e8eaf6;
          transition: box-shadow 0.2s;
        }
        .exam-secondary-card:hover {
          box-shadow: 0 4px 16px rgba(1,28,181,0.1);
        }
        .exam-secondary-name {
          font-weight: 700;
          font-size: 0.92rem;
        }
        .exam-secondary-detail {
          font-size: 0.75rem;
          color: #666;
        }
        .exam-secondary-link {
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          margin-top: 0.2rem;
        }
        .exam-secondary-link:hover { text-decoration: underline; }
        .exam-secondary-title {
          font-size: 1rem;
          font-weight: 700;
          color: #444;
          max-width: 900px;
          margin: 0 auto 1rem;
          padding-left: 0.25rem;
        }
        @media (max-width: 600px) {
          .exam-primary-grid, .exam-secondary-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <h2 className="exam-title" id="exam-title">Ace Your Entrance Exams</h2>
      <p className="exam-sub">Register directly on official portals — WeHive guides your prep timeline</p>

      <div className="exam-primary-grid">
        {primaryExams.map((exam) => (
          <div key={exam.name} className="exam-card" style={{ borderColor: exam.color }}>
            <span className="exam-icon">{exam.icon}</span>
            <p className="exam-name" style={{ color: exam.color }}>{exam.name}</p>
            <p className="exam-desc">{exam.description}</p>
            <div className="exam-meta">
              <span className="exam-chip">Score: {exam.score}</span>
              <span className="exam-chip">Fee: {exam.fee}</span>
              <span className="exam-chip">Valid: {exam.validity}</span>
            </div>
            <p className="exam-min-scores">📊 {exam.minScores}</p>
            <a
              href={exam.link}
              target="_blank"
              rel="noopener noreferrer"
              className="exam-cta"
              style={{ background: exam.color }}
            >
              {exam.cta}
            </a>
          </div>
        ))}
      </div>

      <p className="exam-secondary-title">Also accepted at leading universities:</p>
      <div className="exam-secondary-grid">
        {secondaryExams.map((exam) => (
          <div key={exam.name} className="exam-secondary-card">
            <span className="exam-secondary-name" style={{ color: exam.color }}>{exam.name}</span>
            <span className="exam-secondary-detail">{exam.detail}</span>
            <a
              href={exam.link}
              target="_blank"
              rel="noopener noreferrer"
              className="exam-secondary-link"
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

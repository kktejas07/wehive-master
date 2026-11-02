import React from 'react';

const requirements = [
  { icon: '🏦', label: 'Blocked Account', value: '€11,208 / year', note: 'Sperrkonto at Deutsche Bank, Fintiba or Expatrio' },
  { icon: '⏱️', label: 'Processing Time', value: '8 – 12 weeks', note: 'Apply at VFS Global / German Consulate India' },
  { icon: '🏥', label: 'Health Insurance', value: '~€110 / month', note: 'Public (TK, AOK) or private international cover' },
  { icon: '📚', label: 'Language Tests', value: 'TestDaF B2+ / DSH', note: 'Or choose English-taught programmes (IELTS 6.5+)' },
  { icon: '🎓', label: 'Degree Evaluation', value: 'APS Certificate', note: 'Academic Evaluation Centre — required for Indian students' },
  { icon: '💼', label: 'Part-time Work', value: '120 full days/year', note: 'Can work 20 hrs/week during term time' },
];

export default function GermanyVisaBanner() {
  return (
    <section className="germany-banner-section px-4 py-12" aria-labelledby="germany-title">
      <style>{`
        .germany-banner-section {
          background: linear-gradient(135deg, #0a0a1a 0%, #011CB5 40%, #1a1a3a 70%, #000 100%);
          position: relative;
          overflow: hidden;
        }
        .germany-banner-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, #000, #FF0302, #FFD700, #000);
        }
        .germany-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .germany-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        .germany-flag-badge {
          font-size: 2.5rem;
        }
        .germany-title {
          font-size: clamp(1.3rem, 2.5vw, 2rem);
          font-weight: 800;
          color: white;
          line-height: 1.2;
        }
        .germany-title span {
          color: #FFD700;
        }
        .germany-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .germany-req-card {
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 1.2rem;
          transition: background 0.3s, transform 0.3s;
        }
        .germany-req-card:hover {
          background: rgba(255,255,255,0.12);
          transform: translateY(-2px);
        }
        .germany-req-icon {
          font-size: 1.5rem;
          margin-bottom: 0.4rem;
          display: block;
        }
        .germany-req-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.55);
          margin-bottom: 0.2rem;
        }
        .germany-req-value {
          font-size: 1rem;
          font-weight: 700;
          color: #FFD700;
          margin-bottom: 0.2rem;
        }
        .germany-req-note {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.65);
          line-height: 1.4;
        }
        .germany-ctas {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .germany-cta-primary {
          display: inline-block;
          background: #FFD700;
          color: #000;
          font-weight: 800;
          font-size: 0.9rem;
          padding: 0.75rem 1.8rem;
          border-radius: 50px;
          text-decoration: none;
          animation: glow-pulse 2.5s ease-in-out infinite;
          transition: transform 0.2s;
        }
        .germany-cta-primary:hover { transform: scale(1.03); }
        .germany-cta-secondary {
          display: inline-block;
          border: 2px solid rgba(255,255,255,0.4);
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 0.73rem 1.6rem;
          border-radius: 50px;
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .germany-cta-secondary:hover {
          border-color: #FFD700;
          background: rgba(255,215,0,0.1);
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.4); }
          50% { box-shadow: 0 0 20px 6px rgba(255,215,0,0.25); }
        }
        @media (max-width: 600px) {
          .germany-grid { grid-template-columns: 1fr 1fr; }
          .germany-ctas { flex-direction: column; }
          .germany-cta-primary, .germany-cta-secondary { text-align: center; }
        }
      `}</style>

      <div className="germany-inner">
        <div className="germany-header">
          <span className="germany-flag-badge">🇩🇪</span>
          <h2 className="germany-title" id="germany-title">
            Germany Student Visa —{' '}
            <span>Everything You Need to Know</span>
          </h2>
        </div>

        <div className="germany-grid">
          {requirements.map((req) => (
            <div key={req.label} className="germany-req-card">
              <span className="germany-req-icon">{req.icon}</span>
              <p className="germany-req-label">{req.label}</p>
              <p className="germany-req-value">{req.value}</p>
              <p className="germany-req-note">{req.note}</p>
            </div>
          ))}
        </div>

        <div className="germany-ctas">
          <a href="/visa/germany" className="germany-cta-primary">
            ⚡ Check Germany Visa Eligibility →
          </a>
          <a href="/free-consultation?country=germany" className="germany-cta-secondary">
            🎓 Talk to Germany Expert →
          </a>
        </div>
      </div>
    </section>
  );
}

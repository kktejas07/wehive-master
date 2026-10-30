import React from 'react';

const trends = [
  {
    urgency: 'URGENT',
    urgencyColor: '#FF0302',
    flag: '🇨🇦',
    country: 'Canada',
    headline: 'Canada tightens study permit cap — apply early for 2025 intake',
    summary: 'IRCC has capped new study permits at 364,000 for 2024. Early applications for 2025 are strongly recommended to secure a spot.',
    date: 'Nov 2024',
    href: '/visa/canada',
    borderColor: '#FF0302',
  },
  {
    urgency: 'UPDATE',
    urgencyColor: '#F59E0B',
    flag: '🇩🇪',
    country: 'Germany',
    headline: 'Germany raises blocked account to €11,208 from Jan 2025',
    summary: 'The Sperrkonto requirement has increased from €10,332 to €11,208/year. Update your financial planning for Jan 2025 visa applications.',
    date: 'Oct 2024',
    href: '/visa/germany',
    borderColor: '#F59E0B',
  },
  {
    urgency: 'GOOD NEWS',
    urgencyColor: '#22C55E',
    flag: '🇬🇧',
    country: 'United Kingdom',
    headline: 'UK Graduate Route visa confirmed — 2 years post-study work',
    summary: 'Despite review concerns, the UK Government has confirmed the Graduate Route will continue, allowing 2–3 years post-study work rights.',
    date: 'Oct 2024',
    href: '/visa/uk',
    borderColor: '#22C55E',
  },
  {
    urgency: 'ALERT',
    urgencyColor: '#3B82F6',
    flag: '🇦🇺',
    country: 'Australia',
    headline: 'Australia 485 visa processing now 7+ months — plan ahead',
    summary: 'Temporary Graduate (subclass 485) processing times have extended to 7 months. File immediately after graduation; do not wait for results.',
    date: 'Nov 2024',
    href: '/visa/australia',
    borderColor: '#3B82F6',
  },
];

export default function GlobalTrends() {
  return (
    <section className="trends-section py-14 px-4" aria-labelledby="trends-title">
      <style>{`
        .trends-section {
          background: #fafbff;
        }
        .trends-title {
          font-family: 'Inter', sans-serif;
          font-size: clamp(1.4rem, 2.5vw, 2rem);
          font-weight: 800;
          color: #011CB5;
          text-align: center;
          margin-bottom: 0.4rem;
        }
        .trends-sub {
          text-align: center;
          color: #666;
          margin-bottom: 2.5rem;
          font-size: 0.95rem;
        }
        .trends-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.2rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .trend-card {
          background: white;
          border-radius: 14px;
          padding: 1.4rem;
          border-left: 4px solid;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: box-shadow 0.3s, transform 0.3s;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .trend-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.12);
        }
        .trend-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .trend-badge {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0.18rem 0.55rem;
          border-radius: 20px;
          color: white;
        }
        .trend-date {
          font-size: 0.7rem;
          color: #999;
        }
        .trend-country {
          font-size: 0.78rem;
          font-weight: 600;
          color: #555;
        }
        .trend-headline {
          font-size: 0.92rem;
          font-weight: 700;
          color: #1a1a2e;
          line-height: 1.4;
        }
        .trend-summary {
          font-size: 0.78rem;
          color: #555;
          line-height: 1.5;
          flex: 1;
        }
        .trend-link {
          font-size: 0.78rem;
          font-weight: 600;
          color: #011CB5;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          margin-top: auto;
        }
        .trend-link:hover { text-decoration: underline; }
        @media (max-width: 600px) {
          .trends-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <h2 className="trends-title" id="trends-title">Global Education Trends 2025</h2>
      <p className="trends-sub">Stay informed — policies and timelines change fast</p>

      <div className="trends-grid">
        {trends.map((t) => (
          <div key={t.country} className="trend-card" style={{ borderLeftColor: t.borderColor }}>
            <div className="trend-top">
              <span className="trend-badge" style={{ background: t.urgencyColor }}>{t.urgency}</span>
              <span className="trend-date">{t.date}</span>
            </div>
            <span className="trend-country">{t.flag} {t.country}</span>
            <p className="trend-headline">{t.headline}</p>
            <p className="trend-summary">{t.summary}</p>
            <a href={t.href} className="trend-link">Read More →</a>
          </div>
        ))}
      </div>
    </section>
  );
}

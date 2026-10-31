import React, { useState, useEffect } from 'react';

export default function PartnerBanners() {
  const [apiPartners, setApiPartners] = useState(null);

  useEffect(() => {
    fetch('/api/partners')
      .then((r) => r.json())
      .then((data) => { if (data?.partners?.length) setApiPartners(data.partners); })
      .catch(() => { /* fallback to static */ });
  }, []);

  return (
    <section className="partner-section py-16 px-4" aria-labelledby="partners-title">
      <style>{`
        .partner-section {
          background: #f0f3fc;
        }
        .partner-title {
          font-family: 'Inter', sans-serif;
          font-size: clamp(1.4rem, 2.5vw, 2rem);
          font-weight: 800;
          color: #011CB5;
          text-align: center;
          margin-bottom: 0.4rem;
        }
        .partner-sub {
          text-align: center;
          color: #666;
          margin-bottom: 2.5rem;
          font-size: 0.95rem;
        }
        .partner-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .partner-card {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 4px 24px rgba(1,28,181,0.08);
          border: 1px solid rgba(1,28,181,0.08);
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.3s, transform 0.3s;
        }
        .partner-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(1,28,181,0.15);
        }
        .partner-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: #011CB5;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
        }
        .partner-logo {
          font-size: 1.3rem;
          font-weight: 900;
          margin-bottom: 0.8rem;
          display: block;
        }
        .partner-card-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 0.4rem;
        }
        .partner-card-desc {
          font-size: 0.82rem;
          color: #666;
          margin-bottom: 1.2rem;
        }
        .partner-features {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .partner-features li {
          font-size: 0.82rem;
          color: #333;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .partner-features li::before {
          content: '✓';
          color: #22c55e;
          font-weight: 700;
          flex-shrink: 0;
        }
        .partner-cta {
          display: inline-block;
          padding: 0.65rem 1.4rem;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.2s;
          width: 100%;
          text-align: center;
        }
        .partner-cta:hover {
          opacity: 0.88;
          transform: translateY(-1px);
        }
        .credila-logo { color: #EE3424; }
        .credila-cta { background: #EE3424; color: white; }
        .zolve-logo { color: #7B2FBE; }
        .zolve-cta { background: #7B2FBE; color: white; }
        @media (max-width: 600px) {
          .partner-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <h2 className="partner-title" id="partners-title">Our Trusted Partners</h2>
      <p className="partner-sub">Exclusive benefits for WeHive students — applied for before you fly</p>

      <div className="partner-grid">
        {/* Credila */}
        <div className="partner-card">
          <span className="partner-badge">Official Partner</span>
          <span className="partner-logo credila-logo">HDFC Credila™</span>
          <h3 className="partner-card-title">Fund Your Dreams with Credila</h3>
          <p className="partner-card-desc">India's #1 education loan provider — tailored for students going abroad</p>
          <ul className="partner-features">
            <li>Loans up to ₹1.5 Crore</li>
            <li>No collateral up to ₹40 Lakh (top universities)</li>
            <li>Interest rates from 10.5% p.a.</li>
            <li>Covers 15+ study-abroad countries</li>
            <li>Disbursement directly to university</li>
          </ul>
          <a href="https://www.hdfccredila.com" target="_blank" rel="noopener noreferrer" className="partner-cta credila-cta">
            Check Loan Eligibility →
          </a>
        </div>

        {/* Zolve */}
        <div className="partner-card">
          <span className="partner-badge" style={{ background: '#7B2FBE' }}>Exclusive Partner</span>
          <span className="partner-logo zolve-logo">Zolve™</span>
          <h3 className="partner-card-title">Open US Bank Account from India</h3>
          <p className="partner-card-desc">The only bank account + credit card designed for Indian students in the USA</p>
          <ul className="partner-features">
            <li>No SSN required — apply from India</li>
            <li>Up to $3,000 credit limit from day one</li>
            <li>Zero minimum balance, zero annual fee</li>
            <li>Visa debit card ready on arrival</li>
            <li>Accepted by 1,000+ US merchants instantly</li>
          </ul>
          <a href="https://zolve.com" target="_blank" rel="noopener noreferrer" className="partner-cta zolve-cta">
            Open Account Free →
          </a>
        </div>
      </div>
    </section>
  );
}

import React from 'react';

const banners = [
  {
    country: 'Germany',
    flag: '🇩🇪',
    emoji: '🎄',
    headline: 'Study in the Land of Christmas Markets',
    subheadline: 'Heidelberg University · TU Munich · Free State of Bavaria',
    stat: '0 Tuition at Public Universities',
    detail: 'December & April intakes open',
    cta: 'Apply for Germany →',
    href: '/visa/germany',
    gradient: 'linear-gradient(135deg, #1a0a0a 0%, #8B1A1A 30%, #2D5016 60%, #0a1a0a 100%)',
    accent: '#FFD700',
    snowColor: 'rgba(255,255,255,0.9)',
  },
  {
    country: 'Canada',
    flag: '🇨🇦',
    emoji: '❄️',
    headline: 'White Christmas, World-Class Education',
    subheadline: 'University of Toronto · UBC · McGill · Queens',
    stat: 'PR Pathway After 1–2 Years',
    detail: 'January & September 2025 intakes',
    cta: 'Explore Canada →',
    href: '/visa/canada',
    gradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 30%, #8B1A1A 70%, #1a0a0a 100%)',
    accent: '#FF6B6B',
    snowColor: 'rgba(255,255,255,0.85)',
  },
  {
    country: 'United Kingdom',
    flag: '🇬🇧',
    emoji: '🏰',
    headline: 'Oxford & Cambridge in Winter',
    subheadline: 'Russell Group · Imperial · LSE · UCL',
    stat: '2-Year Graduate Route Visa',
    detail: 'September 2025 intake — apply now',
    cta: 'Study in UK →',
    href: '/visa/uk',
    gradient: 'linear-gradient(135deg, #00247D 0%, #1a1a4a 40%, #CF142B 70%, #1a0a15 100%)',
    accent: '#FFD700',
    snowColor: 'rgba(255,255,255,0.8)',
  },
  {
    country: 'Australia',
    flag: '🇦🇺',
    emoji: '🏖️',
    headline: 'Summer Christmas Down Under',
    subheadline: 'University of Sydney · Melbourne · ANU · UNSW',
    stat: '485 Graduate Visa — 2 to 4 Years',
    detail: 'Christmas in summer — July 2025 intake',
    cta: 'Go to Australia →',
    href: '/visa/australia',
    gradient: 'linear-gradient(135deg, #00263A 0%, #00509E 30%, #FF6B35 65%, #C1440E 100%)',
    accent: '#FFD700',
    snowColor: 'rgba(255,200,50,0.7)',
  },
];

function SnowEffect({ color }) {
  return (
    <div className="snow-container" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="snowflake"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            fontSize: `${8 + Math.random() * 10}px`,
            color,
            opacity: 0.7 + Math.random() * 0.3,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}

export default function ChristmasBanners() {
  return (
    <section className="christmas-banners-section py-16 px-4">
      <style>{`
        .christmas-banners-section {
          background: #f8f9ff;
        }
        .christmas-section-title {
          font-family: 'Inter', sans-serif;
          font-size: clamp(1.5rem, 3vw, 2.2rem);
          font-weight: 800;
          color: #011CB5;
          text-align: center;
          margin-bottom: 0.5rem;
        }
        .christmas-section-sub {
          text-align: center;
          color: #555;
          font-size: 1rem;
          margin-bottom: 2.5rem;
        }
        .christmas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .christmas-card {
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 1.5rem;
          color: white;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
        }
        .christmas-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.35);
        }
        .christmas-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%);
        }
        .christmas-card-content {
          position: relative;
          z-index: 2;
        }
        .christmas-flag {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          display: block;
        }
        .christmas-headline {
          font-size: 1.15rem;
          font-weight: 800;
          line-height: 1.3;
          margin-bottom: 0.3rem;
        }
        .christmas-sub {
          font-size: 0.78rem;
          opacity: 0.85;
          margin-bottom: 0.6rem;
        }
        .christmas-stat {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 20px;
          padding: 0.2rem 0.7rem;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .christmas-detail {
          font-size: 0.72rem;
          opacity: 0.75;
          margin-bottom: 1rem;
        }
        .christmas-cta {
          display: inline-block;
          background: white;
          color: #011CB5;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 0.5rem 1.2rem;
          border-radius: 50px;
          text-decoration: none;
          transition: background 0.2s, color 0.2s;
        }
        .christmas-cta:hover {
          background: #011CB5;
          color: white;
        }
        .snow-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
        }
        .snowflake {
          position: absolute;
          top: -20px;
          animation: snowfall linear infinite;
        }
        @keyframes snowfall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(360deg); opacity: 0.2; }
        }
        @media (max-width: 600px) {
          .christmas-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <h2 className="christmas-section-title">Study Abroad This Holiday Season 🎄</h2>
      <p className="christmas-section-sub">Applications open now — beat the rush and start your journey</p>

      <div className="christmas-grid">
        {banners.map((b) => (
          <a
            key={b.country}
            href={b.href}
            className="christmas-card"
            style={{ background: b.gradient }}
            aria-label={`${b.country} — ${b.headline}`}
          >
            <SnowEffect color={b.snowColor} />
            <div className="christmas-card-overlay" />
            <div className="christmas-card-content">
              <span className="christmas-flag">{b.flag} {b.emoji}</span>
              <p className="christmas-headline">{b.headline}</p>
              <p className="christmas-sub">{b.subheadline}</p>
              <span className="christmas-stat">✓ {b.stat}</span>
              <p className="christmas-detail">{b.detail}</p>
              <span className="christmas-cta">{b.cta}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

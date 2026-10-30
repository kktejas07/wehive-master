import { useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const BANNERS = [
  // ── Christmas / Seasonal ──────────────────────────────────────────────────
  {
    id: 'christmas-germany',
    type: 'seasonal',
    season: 'christmas',
    emoji: '🎄',
    badge: '🎅 Christmas Special',
    title: 'Study in Germany This Christmas',
    subtitle: 'Winter semester applications are open. Geblockte Konto (blocked account) — we guide you through every step.',
    highlight: '€11,208 blocked account',
    highlightSub: 'required for student visa',
    bg: 'linear-gradient(135deg, #011CB5 0%, #0e2a7a 55%, #8B0000 100%)',
    snowColor: 'rgba(255,255,255,0.7)',
    ctaText: 'Explore Germany',
    ctaUrl: '/countries/germany',
    ctaBg: 'rgba(255,255,255,0.2)',
    validUntil: '2025-01-07',
    tag: 'Germany · Student Visa',
  },
  {
    id: 'christmas-canada',
    type: 'seasonal',
    season: 'christmas',
    emoji: '🍁',
    badge: '❄️ Winter Special',
    title: 'Canada in Winter — It\'s Magical',
    subtitle: 'Study permit processing has improved. January 2025 intake applications open now for top Canadian universities.',
    highlight: 'CAD 10,000 / year',
    highlightSub: 'avg living cost in Canada',
    bg: 'linear-gradient(135deg, #CC0000 0%, #8B0000 50%, #1a1a2e 100%)',
    snowColor: 'rgba(255,255,255,0.6)',
    ctaText: 'Explore Canada',
    ctaUrl: '/countries/canada',
    ctaBg: 'rgba(255,255,255,0.2)',
    validUntil: '2025-01-07',
    tag: 'Canada · Study Permit',
  },
  {
    id: 'christmas-uk',
    type: 'seasonal',
    season: 'christmas',
    emoji: '🎁',
    badge: '🎄 Festive Offer',
    title: 'UK Universities — January Intake',
    subtitle: 'Post-Study Work visa lets you stay 2 years after graduation. Apply now for UK Student visa with WeHive.',
    highlight: '2-year Graduate Route',
    highlightSub: 'post-study work visa',
    bg: 'linear-gradient(135deg, #012169 0%, #C8102E 60%, #1a1a2e 100%)',
    snowColor: 'rgba(255,255,255,0.65)',
    ctaText: 'Explore UK',
    ctaUrl: '/countries/uk',
    ctaBg: 'rgba(255,255,255,0.2)',
    validUntil: '2025-01-07',
    tag: 'UK · Student Visa',
  },

  // ── Destination Banners ───────────────────────────────────────────────────
  {
    id: 'germany-student-visa',
    type: 'destination',
    emoji: '🇩🇪',
    badge: 'Germany Student Visa',
    title: 'Study in Germany — Almost Free',
    subtitle: 'Public universities charge zero tuition. Get your student visa, blocked account (Sperrkonto), and APS certificate guidance — all in one place.',
    highlight: '€0 tuition at public unis',
    highlightSub: '+ €11,208 blocked account',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #011CB5 100%)',
    snowColor: null,
    ctaText: 'Germany Visa Guide',
    ctaUrl: '/countries/germany',
    ctaBg: '#011CB5',
    tag: 'Germany · Top Destination',
  },
  {
    id: 'usa-f1-visa',
    type: 'destination',
    emoji: '🇺🇸',
    badge: 'F-1 Student Visa',
    title: 'USA F-1 Visa — Everything You Need',
    subtitle: 'SEVIS, DS-160, embassy interview, OPT/CPT eligibility. Hive AI walks you through the complete F-1 journey from I-20 to entry.',
    highlight: '$350 SEVIS fee',
    highlightSub: '+ $185 visa application fee',
    bg: 'linear-gradient(135deg, #B22234 0%, #3C3B6E 60%, #1a1a2e 100%)',
    snowColor: null,
    ctaText: 'F-1 Visa Guide',
    ctaUrl: '/countries/usa',
    ctaBg: '#3C3B6E',
    tag: 'USA · F-1 Visa',
  },
  {
    id: 'australia-student-visa',
    type: 'destination',
    emoji: '🇦🇺',
    badge: 'Subclass 500',
    title: 'Australia — Land of Opportunity',
    subtitle: 'Post-Study Work Rights up to 4 years. GTE statement, OSHC health cover, and Confirmation of Enrolment (CoE) — we sort it all.',
    highlight: 'Up to 4-year PSW visa',
    highlightSub: 'post-study work rights',
    bg: 'linear-gradient(135deg, #00008B 0%, #1a1a2e 55%, #FF0000 100%)',
    snowColor: null,
    ctaText: 'Australia Visa Guide',
    ctaUrl: '/countries/australia',
    ctaBg: '#00008B',
    tag: 'Australia · Subclass 500',
  },
];

function SnowflakeSVG({ color }) {
  if (!color) return null;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      viewBox="0 0 400 220"
      aria-hidden="true"
    >
      {[
        [30, 20], [80, 60], [150, 15], [220, 45], [300, 18], [360, 55],
        [50, 120], [120, 90], [200, 130], [270, 80], [340, 110], [390, 30],
        [10, 180], [90, 160], [170, 190], [250, 155], [320, 175], [380, 145],
      ].map(([cx, cy], i) => (
        <text
          key={i}
          x={cx}
          y={cy}
          fill={color}
          fontSize={i % 3 === 0 ? 16 : 10}
          style={{ userSelect: 'none', fontFamily: 'sans-serif' }}
          opacity={0.5 + (i % 3) * 0.15}
        >
          ❄
        </text>
      ))}
    </svg>
  );
}

export default function SeasonalBanners() {
  const [current, setCurrent] = useState(0);
  const total = BANNERS.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  const banner = BANNERS[current];

  return (
    <section className="py-10 bg-gray-50" id="banners">
      <div className="max-w-5xl mx-auto px-4">
        {/* Section label */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Featured Destinations & Offers</p>
            <h2 className="text-xl font-bold text-gray-900">
              {banner.type === 'seasonal' ? '🎄 Seasonal Specials' : '🌍 Top Study Destinations'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Previous banner"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <span className="text-xs text-gray-400 tabular-nums w-10 text-center">
              {current + 1} / {total}
            </span>
            <button
              onClick={next}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Next banner"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Banner card */}
        <div
          className="relative rounded-3xl overflow-hidden min-h-[220px] flex items-end p-6 sm:p-8"
          style={{ background: banner.bg }}
        >
          {/* Snow effect (seasonal only) */}
          <SnowflakeSVG color={banner.snowColor} />

          {/* Content */}
          <div className="relative z-10 w-full">
            {/* Badge */}
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 mb-3 backdrop-blur-sm">
              {banner.badge}
            </span>

            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-xl sm:text-2xl leading-tight mb-2" style={{ textWrap: 'balance' }}>
                  {banner.emoji} {banner.title}
                </h3>
                <p className="text-white/75 text-sm leading-relaxed max-w-lg">
                  {banner.subtitle}
                </p>
              </div>

              {/* Highlight + CTA */}
              <div className="flex-shrink-0 flex flex-col items-start sm:items-end gap-3">
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/25">
                  <p className="text-white font-bold text-base leading-tight">{banner.highlight}</p>
                  <p className="text-white/60 text-xs mt-0.5">{banner.highlightSub}</p>
                </div>
                <a
                  href={banner.ctaUrl}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: banner.ctaBg, backdropFilter: 'blur(4px)' }}
                >
                  {banner.ctaText}
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Dot indicators + tag strip */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-[#011CB5]' : 'bg-gray-300'}`}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">{banner.tag}</span>
        </div>
      </div>
    </section>
  );
}

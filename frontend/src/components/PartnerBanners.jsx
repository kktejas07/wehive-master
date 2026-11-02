import { useState, useEffect } from "react";

const STATIC_PARTNERS = [
  {
    id: "credila",
    name: "Credila",
    tagline: "HDFC Education Loans — Study Abroad Financing",
    logo_color: "#EE3424",
    cta_url: "https://www.credila.com",
    benefits: [
      "Loan up to ₹1.5 Cr without collateral",
      "Quick approval in 48 hours",
      "Tax benefit under Section 80E",
      "Covers tuition, living, travel expenses",
    ],
    badge: "HDFC Group",
  },
  {
    id: "zolve",
    name: "Zolve",
    tagline: "US Banking for International Students — No SSN Needed",
    logo_color: "#7B2FBE",
    cta_url: "https://www.zolve.com",
    benefits: [
      "Open US bank account before you land",
      "Credit card with no US credit history required",
      "No hidden fees or minimum balance",
      "Instant virtual card for online purchases",
    ],
    badge: "Fintech Partner",
  },
];

export default function PartnerBanners() {
  const [partners, setPartners] = useState(STATIC_PARTNERS);

  useEffect(() => {
    fetch("/api/partners")
      .then((r) => r.json())
      .then((data) => {
        if (data?.partners?.length) setPartners(data.partners);
      })
      .catch(() => {
        /* fallback to static data already set */
      });
  }, []);

  return (
    <section className="partner-banners">
      <h2>Our Partners</h2>
      <div className="partner-grid">
        {partners.map((partner) => (
          <div
            key={partner.id}
            className="partner-card"
            style={{ borderLeft: `6px solid ${partner.logo_color}` }}
          >
            <div className="partner-header">
              <span className="partner-name" style={{ color: partner.logo_color }}>
                {partner.name}
              </span>
              <span className="partner-badge">{partner.badge}</span>
            </div>
            <p className="partner-tagline">{partner.tagline}</p>
            <ul className="partner-benefits">
              {partner.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <a
              href={partner.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="partner-cta-btn"
              style={{ backgroundColor: partner.logo_color }}
            >
              Learn More
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

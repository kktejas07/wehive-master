import { useState, useEffect } from "react";

const STATIC_TRENDS = [
  {
    id: "trend-001",
    urgency: "URGENT",
    title: "Canada Caps International Student Permits for 2024–25",
    description:
      "Canada has announced a cap on new study permits for 2024 and 2025. Apply early and check provincial quotas before submitting applications.",
    country: "Canada",
    flag: "🇨🇦",
    tag: "Study Permit",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "trend-002",
    urgency: "UPDATE",
    title: "UK Graduate Route Visa Extended to 3 Years for STEM Graduates",
    description:
      "The UK government has extended the Graduate Route stay period to 3 years for graduates in STEM subjects from select universities.",
    country: "UK",
    flag: "🇬🇧",
    tag: "Graduate Visa",
    updated_at: "2024-02-10T00:00:00Z",
  },
  {
    id: "trend-003",
    urgency: "GOOD NEWS",
    title: "Australia Raises Post-Study Work Visa Duration",
    description:
      "Australia has increased post-study work rights for international graduates. Bachelor's holders now get 2 years; master's holders get 3 years.",
    country: "Australia",
    flag: "🇦🇺",
    tag: "Work Visa",
    updated_at: "2024-03-01T00:00:00Z",
  },
  {
    id: "trend-004",
    urgency: "ALERT",
    title: "US F-1 Visa Interview Wait Times Surge in India",
    description:
      "F-1 student visa interview wait times have exceeded 300+ days at Mumbai and Chennai consulates. Schedule as early as possible.",
    country: "USA",
    flag: "🇺🇸",
    tag: "F-1 Visa",
    updated_at: "2024-03-20T00:00:00Z",
  },
];

const URGENCY_COLORS = {
  URGENT: "#DC2626",
  ALERT: "#D97706",
  UPDATE: "#2563EB",
  "GOOD NEWS": "#16A34A",
};

export default function GlobalTrends() {
  const [trends, setTrends] = useState(STATIC_TRENDS);

  useEffect(() => {
    fetch("/api/global-trends")
      .then((r) => r.json())
      .then((data) => {
        if (data?.trends?.length) setTrends(data.trends);
      })
      .catch(() => {
        /* fallback to static data already set */
      });
  }, []);

  return (
    <section className="global-trends">
      <h2>Global Visa &amp; Immigration Trends</h2>
      <div className="trends-list">
        {trends.map((trend) => {
          const color = URGENCY_COLORS[trend.urgency] || "#6B7280";
          return (
            <div key={trend.id} className="trend-card">
              <div className="trend-header">
                <span
                  className="trend-urgency"
                  style={{ backgroundColor: color }}
                >
                  {trend.urgency}
                </span>
                <span className="trend-flag">{trend.flag}</span>
                <span className="trend-tag">{trend.tag}</span>
              </div>
              <h3 className="trend-title">{trend.title}</h3>
              <p className="trend-description">{trend.description}</p>
              <div className="trend-footer">
                <span className="trend-country">{trend.country}</span>
                <span className="trend-date">
                  {new Date(trend.updated_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

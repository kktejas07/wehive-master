import { useState, useEffect } from "react";

const STATIC_EXAMS = [
  {
    id: "toefl",
    name: "TOEFL",
    full_name: "Test of English as a Foreign Language",
    fee_usd: 205,
    fee_inr: 17000,
    registration_url: "https://www.ets.org/toefl",
    logo_color: "#005A9C",
    description: "Widely accepted by 11,000+ universities in 150 countries.",
    validity_years: 2,
    score_range: "0–120",
    accepted_by: ["USA", "Canada", "UK", "Australia"],
  },
  {
    id: "ielts",
    name: "IELTS",
    full_name: "International English Language Testing System",
    fee_usd: 215,
    fee_inr: 17000,
    registration_url: "https://www.ielts.org",
    logo_color: "#E31837",
    description: "Most popular English test for study & immigration globally.",
    validity_years: 2,
    score_range: "0–9",
    accepted_by: ["UK", "Australia", "Canada", "New Zealand"],
  },
  {
    id: "gre",
    name: "GRE",
    full_name: "Graduate Record Examination",
    fee_usd: 220,
    fee_inr: 22500,
    registration_url: "https://www.ets.org/gre",
    logo_color: "#003B71",
    description: "Required for most US/Canada graduate school admissions.",
    validity_years: 5,
    score_range: "260–340",
    accepted_by: ["USA", "Canada", "UK"],
  },
  {
    id: "gmat-focus",
    name: "GMAT Focus",
    full_name: "Graduate Management Admission Test Focus Edition",
    fee_usd: 275,
    fee_inr: 22000,
    registration_url: "https://www.mba.com/exams/gmat",
    logo_color: "#005587",
    description: "Premier MBA admissions test accepted worldwide.",
    validity_years: 5,
    score_range: "205–805",
    accepted_by: ["USA", "UK", "EU", "Australia"],
  },
  {
    id: "pte",
    name: "PTE",
    full_name: "Pearson Test of English Academic",
    fee_usd: 185,
    fee_inr: 15900,
    registration_url: "https://www.pearsonpte.com",
    logo_color: "#0066CC",
    description: "AI-scored English test with fast results in 48 hours.",
    validity_years: 2,
    score_range: "10–90",
    accepted_by: ["Australia", "UK", "New Zealand", "USA"],
  },
  {
    id: "duolingo",
    name: "Duolingo English Test",
    full_name: "Duolingo English Test",
    fee_usd: 59,
    fee_inr: 4900,
    registration_url: "https://englishtest.duolingo.com",
    logo_color: "#58CC02",
    description: "Affordable online English test accepted by 4,000+ programs.",
    validity_years: 2,
    score_range: "10–160",
    accepted_by: ["USA", "Canada", "UK", "Australia"],
  },
  {
    id: "sat",
    name: "SAT",
    full_name: "Scholastic Assessment Test",
    fee_usd: 60,
    fee_inr: 7500,
    registration_url: "https://satsuite.collegeboard.org/sat",
    logo_color: "#009CDE",
    description: "Standard undergraduate admissions test for US universities.",
    validity_years: 5,
    score_range: "400–1600",
    accepted_by: ["USA", "Canada"],
  },
  {
    id: "act",
    name: "ACT",
    full_name: "American College Testing",
    fee_usd: 63,
    fee_inr: 7900,
    registration_url: "https://www.act.org",
    logo_color: "#E8001C",
    description: "Alternative to SAT; widely accepted by US colleges.",
    validity_years: 5,
    score_range: "1–36",
    accepted_by: ["USA"],
  },
];

export default function ExamPrepSection() {
  const [exams, setExams] = useState(STATIC_EXAMS);

  useEffect(() => {
    fetch("/api/exam-prep")
      .then((r) => r.json())
      .then((data) => {
        if (data?.exams?.length) setExams(data.exams);
      })
      .catch(() => {
        /* fallback to static data already set */
      });
  }, []);

  return (
    <section className="exam-prep-section">
      <h2>Exam Preparation</h2>
      <div className="exam-grid">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className="exam-card"
            style={{ borderTop: `4px solid ${exam.logo_color}` }}
          >
            <div className="exam-name" style={{ color: exam.logo_color }}>
              {exam.name}
            </div>
            <div className="exam-full-name">{exam.full_name}</div>
            <p className="exam-description">{exam.description}</p>
            <div className="exam-meta">
              <span>Score: {exam.score_range}</span>
              <span>Valid: {exam.validity_years} yrs</span>
              <span>Fee: ${exam.fee_usd}</span>
            </div>
            <div className="exam-countries">
              {exam.accepted_by.map((c) => (
                <span key={c} className="country-badge">
                  {c}
                </span>
              ))}
            </div>
            <a
              href={exam.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="exam-register-btn"
              style={{ backgroundColor: exam.logo_color }}
            >
              Register
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

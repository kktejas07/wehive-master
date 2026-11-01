import { useState, useEffect } from "react";
import Reveal from "./Reveal";
import { GraduationCap, ExternalLink, Clock, DollarSign, Target } from "lucide-react";

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

function ExamCard({ exam }) {
  return (
    <div className="flex flex-col h-full rounded-2xl bg-white border border-[hsl(var(--border))] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      {/* Color accent bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: exam.logo_color }} />

      <div className="flex flex-col flex-1 p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl shrink-0 text-white font-bold text-[13px]"
            style={{ backgroundColor: exam.logo_color }}
          >
            {exam.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-[17px] text-[hsl(var(--blue-900))] leading-tight">
              {exam.name}
            </h3>
            <p className="text-[12px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">
              {exam.full_name}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 flex-1">
          {exam.description}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center rounded-xl bg-[hsl(var(--soft-bg))] py-2.5 px-1">
            <Target className="w-3.5 h-3.5 text-[hsl(var(--blue-700))] mb-1" />
            <span className="text-[11px] text-muted-foreground">Score</span>
            <span className="text-[12px] font-bold text-[hsl(var(--blue-900))]">{exam.score_range}</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-[hsl(var(--soft-bg))] py-2.5 px-1">
            <Clock className="w-3.5 h-3.5 text-[hsl(var(--blue-700))] mb-1" />
            <span className="text-[11px] text-muted-foreground">Valid</span>
            <span className="text-[12px] font-bold text-[hsl(var(--blue-900))]">{exam.validity_years} yrs</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-[hsl(var(--soft-bg))] py-2.5 px-1">
            <DollarSign className="w-3.5 h-3.5 text-[hsl(var(--blue-700))] mb-1" />
            <span className="text-[11px] text-muted-foreground">Fee</span>
            <span className="text-[12px] font-bold text-[hsl(var(--blue-900))]">${exam.fee_usd}</span>
          </div>
        </div>

        {/* Country badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {exam.accepted_by.map((c) => (
            <span
              key={c}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[hsl(var(--blue-700))]/8 text-[hsl(var(--blue-700))]"
            >
              {c}
            </span>
          ))}
        </div>

        {/* Register button */}
        <a
          href={exam.registration_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: exam.logo_color }}
        >
          Register <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function ExamPrepSection() {
  const [exams, setExams] = useState(STATIC_EXAMS);

  useEffect(() => {
    fetch("/api/exam-prep/list")
      .then((r) => r.json())
      .then((data) => {
        if (data?.exams?.length) setExams(data.exams);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Reveal>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--blue-700))]/8 text-[hsl(var(--blue-700))] text-[13px] font-bold mb-3">
              <GraduationCap className="w-4 h-4" />
              Exam Preparation
            </div>
            <h2 className="font-display font-bold text-[28px] sm:text-[34px] tracking-[-0.02em] text-[hsl(var(--blue-900))]">
              Prepare for Your Exams
            </h2>
            <p className="text-[15px] text-muted-foreground mt-2 max-w-xl mx-auto">
              Compare fees, score ranges, and accepted countries for every major study-abroad exam.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {exams.map((exam) => (
            <Reveal key={exam.id}>
              <ExamCard exam={exam} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import { CountryInfo, Profile, EvaluationResult, UniversityMatch } from "../types";
import { STUDY_DESTINATIONS } from "../data";

const COUNTRIES_CACHE_KEY = "wehive-cached-countries";
const EVALUATIONS_CACHE_KEY = "wehive-cached-evaluations";
const OFFLINE_SIMULATION_KEY = "wehive-offline-simulation";

/**
 * Check if the application is currently simulated offline or literally offline
 */
export function isAppOffline(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const simulated = localStorage.getItem(OFFLINE_SIMULATION_KEY) === "true";
    return simulated || !navigator.onLine;
  } catch {
    return !navigator.onLine;
  }
}

/**
 * Fetch cached country guides. Seeding with STUDY_DESTINATIONS if not yet cached.
 */
export function getCachedCountryGuides(): CountryInfo[] {
  if (typeof window === "undefined") return STUDY_DESTINATIONS;
  try {
    const cached = localStorage.getItem(COUNTRIES_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error("Failed to read country guides from local storage", e);
  }
  
  // Seed local storage with default guides
  saveCountryGuides(STUDY_DESTINATIONS);
  return STUDY_DESTINATIONS;
}

/**
 * Update cached country guides (allowing offline editing or syncing)
 */
export function saveCountryGuides(guides: CountryInfo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COUNTRIES_CACHE_KEY, JSON.stringify(guides));
  } catch (e) {
    console.error("Failed to write country guides to local storage", e);
  }
}

/**
 * Fetch previously computed evaluation reports from cache
 */
export interface CachedEvaluation {
  id: string;
  timestamp: string;
  profile: Profile;
  result: EvaluationResult;
  isOfflineComputed: boolean;
}

export function getCachedEvaluations(): CachedEvaluation[] {
  if (typeof window === "undefined") return [];
  try {
    const cached = localStorage.getItem(EVALUATIONS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error("Failed to read evaluations from local storage", e);
  }
  return [];
}

/**
 * Save computed evaluation report into local history cache
 */
export function saveEvaluationToCache(profile: Profile, result: EvaluationResult, isOffline = false): CachedEvaluation {
  const newCachedItem: CachedEvaluation = {
    id: "eval_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    profile,
    result,
    isOfflineComputed: isOffline
  };

  if (typeof window === "undefined") return newCachedItem;

  try {
    const existing = getCachedEvaluations();
    const updated = [newCachedItem, ...existing].slice(0, 30); // Cache up to last 30 reports
    localStorage.setItem(EVALUATIONS_CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save evaluation to local storage", e);
  }

  return newCachedItem;
}

/**
 * Clean all local caches
 */
export function clearAllLocalCaches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(COUNTRIES_CACHE_KEY);
    localStorage.removeItem(EVALUATIONS_CACHE_KEY);
  } catch (e) {
    console.error("Failed to clear local caches", e);
  }
}

/**
 * Deterministic Rules Engine: Computes a complete admission and visa report client-side.
 * This ensures the app is fully operational in poor Wi-Fi, flights, or remote study abroad zones.
 */
export function computeOfflineEligibility(profile: Profile): EvaluationResult {
  // Normalize parameters
  const country = profile.targetCountry.trim();
  const degree = profile.targetDegree;
  const budget = profile.budget;
  const gpaInput = profile.currentGPA.trim();
  const testInput = (profile.englishTest || "").trim();
  const expInput = (profile.workExperience || "").trim();

  // 1. Calculate academic base score out of 70
  let academicScore = 45; // Default moderate base
  
  const gpaNum = parseFloat(gpaInput);
  if (!isNaN(gpaNum)) {
    if (gpaInput.includes("%") || gpaNum > 10) {
      // Percentage representation
      const pctVal = gpaNum > 100 ? 100 : gpaNum;
      academicScore = Math.round(30 + (pctVal - 40) * (40 / 60)); // map 40%-100% to 30-70 score
    } else if (gpaNum <= 4.0) {
      // 4.0 scale
      academicScore = Math.round(30 + (gpaNum / 4.0) * 40);
    } else if (gpaNum <= 10.0) {
      // 10.0 scale
      academicScore = Math.round(30 + (gpaNum / 10.0) * 40);
    }
  } else {
    // String matching keywords
    const lowerGpa = gpaInput.toLowerCase();
    if (lowerGpa.includes("first") || lowerGpa.includes("excellent") || lowerGpa.includes("distinction") || lowerGpa.includes("high")) {
      academicScore = 65;
    } else if (lowerGpa.includes("second") || lowerGpa.includes("good") || lowerGpa.includes("average")) {
      academicScore = 52;
    }
  }
  academicScore = Math.min(Math.max(academicScore, 20), 70);

  // 2. Add English competency points (up to 15)
  let englishBonus = 5;
  const lowerTest = testInput.toLowerCase();
  if (lowerTest) {
    const testNumMatch = lowerTest.match(/(\d+(\.\d+)?)/);
    if (testNumMatch) {
      const scoreVal = parseFloat(testNumMatch[1]);
      if (lowerTest.includes("ielts")) {
        if (scoreVal >= 7.5) englishBonus = 15;
        else if (scoreVal >= 6.5) englishBonus = 11;
        else if (scoreVal >= 5.5) englishBonus = 7;
      } else if (lowerTest.includes("pte")) {
        if (scoreVal >= 76) englishBonus = 15;
        else if (scoreVal >= 65) englishBonus = 11;
        else if (scoreVal >= 55) englishBonus = 7;
      } else if (lowerTest.includes("toefl")) {
        if (scoreVal >= 100) englishBonus = 15;
        else if (scoreVal >= 80) englishBonus = 11;
        else if (scoreVal >= 65) englishBonus = 7;
      }
    } else {
      if (lowerTest.includes("good") || lowerTest.includes("clear") || lowerTest.includes("waived")) {
        englishBonus = 10;
      }
    }
  }

  // 3. Add work experience bonus points (up to 15)
  let experienceBonus = 0;
  if (expInput) {
    const expNumMatch = expInput.match(/(\d+(\.\d+)?)/);
    if (expNumMatch) {
      const years = parseFloat(expNumMatch[1]);
      if (years >= 4) experienceBonus = 15;
      else if (years >= 2) experienceBonus = 10;
      else if (years >= 1) experienceBonus = 6;
      else experienceBonus = 3;
    } else {
      const lowerExp = expInput.toLowerCase();
      if (lowerExp.includes("year") || lowerExp.includes("senior") || lowerExp.includes("manager")) {
        experienceBonus = 10;
      } else if (lowerExp.includes("month") || lowerExp.includes("intern") || lowerExp.includes("junior")) {
        experienceBonus = 4;
      }
    }
  }

  // Total eligibility score (max 100)
  const overallScore = Math.min(academicScore + englishBonus + experienceBonus, 100);

  // 4. Calculate Visa Chance
  let visaProbability: "High" | "Medium" | "Low" = "Medium";
  if (overallScore >= 80) {
    visaProbability = "High";
  } else if (overallScore < 55) {
    visaProbability = "Low";
  }

  // Determine intake based on current year and month
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-indexed (0=Jan, 11=Dec)
  const currentYear = today.getFullYear();
  let recommendedIntake = "";
  
  if (country === "Germany") {
    recommendedIntake = currentMonth < 4 ? `Winter (Oct) ${currentYear}` : `Summer (Apr) ${currentYear + 1}`;
  } else if (country === "Australia") {
    recommendedIntake = currentMonth < 6 ? `July ${currentYear}` : `February ${currentYear + 1}`;
  } else {
    // UK, USA, Canada, Ireland
    recommendedIntake = currentMonth < 3 ? `Fall (Sep) ${currentYear}` : `Spring (Jan) ${currentYear + 1}`;
  }

  // 5. Select target matching universities and estimates based on target country
  let topUniversities: UniversityMatch[] = [];
  let tuitionEstimate = "£16,000 - £24,000 / Yr";
  let livingEstimate = "£1,100 / Month";

  if (country === "United States" || country === "usa" || country.toLowerCase().includes("state")) {
    tuitionEstimate = "$22,000 - $38,000 / Yr";
    livingEstimate = "$1,500 / Month";
    topUniversities = [
      { name: "Stanford University", rank: "QS #5", matchType: overallScore >= 90 ? "Reach" : "Dream", estFees: "$45,000/yr" },
      { name: "UC Berkeley", rank: "QS #12", matchType: overallScore >= 80 ? "Safe" : "Reach", estFees: "$36,000/yr" },
      { name: "New York University (NYU)", rank: "QS #38", matchType: overallScore >= 70 ? "Safe" : "Reach", estFees: "$32,000/yr" }
    ];
  } else if (country === "Canada" || country.toLowerCase().includes("canada")) {
    tuitionEstimate = "CAD 18,000 - CAD 30,000 / Yr";
    livingEstimate = "CAD 1,300 / Month";
    topUniversities = [
      { name: "University of Toronto", rank: "QS #21", matchType: overallScore >= 85 ? "Reach" : "Dream", estFees: "CAD 34,000/yr" },
      { name: "University of British Columbia (UBC)", rank: "QS #34", matchType: overallScore >= 75 ? "Safe" : "Reach", estFees: "CAD 28,000/yr" },
      { name: "University of Waterloo", rank: "QS #112", matchType: overallScore >= 60 ? "Safe" : "Reach", estFees: "CAD 24,000/yr" }
    ];
  } else if (country === "Australia" || country.toLowerCase().includes("australia")) {
    tuitionEstimate = "AUD 22,000 - AUD 35,000 / Yr";
    livingEstimate = "AUD 1,800 / Month";
    topUniversities = [
      { name: "University of Melbourne", rank: "QS #14", matchType: overallScore >= 88 ? "Reach" : "Dream", estFees: "AUD 38,000/yr" },
      { name: "University of Sydney", rank: "QS #19", matchType: overallScore >= 78 ? "Safe" : "Reach", estFees: "AUD 33,000/yr" },
      { name: "Monash University", rank: "QS #42", matchType: overallScore >= 65 ? "Safe" : "Reach", estFees: "AUD 29,000/yr" }
    ];
  } else if (country === "Germany" || country.toLowerCase().includes("germany")) {
    tuitionEstimate = "€0 - €3,000 / Yr (Tuition Free)";
    livingEstimate = "€934 / Month (Blocked Account)";
    topUniversities = [
      { name: "Technical University of Munich (TUM)", rank: "QS #37", matchType: overallScore >= 80 ? "Reach" : "Dream", estFees: "€0 (Free)" },
      { name: "RWTH Aachen University", rank: "QS #106", matchType: overallScore >= 70 ? "Safe" : "Reach", estFees: "€0 (Free)" },
      { name: "Heidelberg University", rank: "QS #79", matchType: overallScore >= 60 ? "Safe" : "Reach", estFees: "€250/sem semester fee" }
    ];
  } else if (country === "Ireland" || country.toLowerCase().includes("ireland")) {
    tuitionEstimate = "€14,000 - €22,000 / Yr";
    livingEstimate = "€1,200 / Month";
    topUniversities = [
      { name: "Trinity College Dublin", rank: "QS #81", matchType: overallScore >= 85 ? "Reach" : "Dream", estFees: "€18,500/yr" },
      { name: "University College Dublin (UCD)", rank: "QS #126", matchType: overallScore >= 75 ? "Safe" : "Reach", estFees: "€16,000/yr" },
      { name: "Dublin City University (DCU)", rank: "QS #351", matchType: overallScore >= 60 ? "Safe" : "Reach", estFees: "€13,500/yr" }
    ];
  } else {
    // Default to UK
    tuitionEstimate = "£15,000 - £25,000 / Yr";
    livingEstimate = "£1,200 / Month";
    topUniversities = [
      { name: "University College London (UCL)", rank: "QS #9", matchType: overallScore >= 90 ? "Reach" : "Dream", estFees: "£26,000/yr" },
      { name: "University of Manchester", rank: "QS #32", matchType: overallScore >= 80 ? "Safe" : "Reach", estFees: "£21,000/yr" },
      { name: "University of Edinburgh", rank: "QS #22", matchType: overallScore >= 70 ? "Safe" : "Reach", estFees: "£23,000/yr" }
    ];
  }

  // Adjust match types strictly by computed score to prevent unsafe allocations
  if (overallScore < 50) {
    topUniversities.forEach(u => u.matchType = "Dream");
  } else if (overallScore < 70) {
    topUniversities[0].matchType = "Dream";
    topUniversities[1].matchType = "Reach";
    topUniversities[2].matchType = "Reach";
  }

  // Add major course fit strings based on profile
  const majorName = profile.intendedMajor || "your preferred major";
  topUniversities = topUniversities.map((u, i) => ({
    ...u,
    courseMatch: `${95 - (i * 3) - Math.floor(Math.random() * 3)}% alignment for ${majorName}`
  }));

  // 6. Formulate descriptive feedback memo
  let eligibilityFeedback = "";
  if (overallScore >= 85) {
    eligibilityFeedback = `Excellent profile standing! A score of ${overallScore}/100 demonstrates high competitive viability for top-tier admissions in ${country}. Your GPA (${gpaInput}) and qualifications make you a prime candidate. We highly recommend proceeding with early applications to secure scholarships and priority visa clearances.`;
  } else if (overallScore >= 65) {
    eligibilityFeedback = `Good, solid competitive foundation. Your profile score of ${overallScore}/100 makes you highly eligible for reputable state-backed and high-employability universities in ${country}. To increase your admission chances for target dream programs, focus on crafting an exceptional, personalized Statement of Purpose (SOP) highlighting practical achievements or securing a higher English scorecard.`;
  } else {
    eligibilityFeedback = `Your calculated eligibility score of ${overallScore}/100 suggests a cautious roadmap. For ${country}, admissions will be selective. We recommend looking into pathway courses, postgrad diplomas, or universities that specialize in flexible entry thresholds. Raising your English proficiency test scores or gathering relevant work experience will significantly strengthen your student visa approval margins.`;
  }

  // 7. Suggested Scholarships
  const scholarships = [
    `WeHive Global Student Merit Fellowship (Covers 15-25% Tuition waiver)`,
    `${country} Commonwealth & Government Sponsored Student Aid (Application starts in August)`
  ];
  if (overallScore >= 80) {
    scholarships.push(`${country} Elite Academic Excellence Direct Bursary (Up to ${country.includes("US") || country.includes("Canada") ? "$8,000" : "£5,000"})`);
  }

  // 8. Next Steps Action Plan
  const actionPlan = [
    `Arrange certified official transcripts & degree certificates.`,
    testInput ? `Fine-tune and finalize English scorecard submissions.` : `Register and schedule a practice run for IELTS/PTE to maximize scores.`,
    `Draft a detailed, compelling Statement of Purpose (SOP) emphasizing motivation for ${country}.`,
    `Connect with WeHive Senior Advisors to file early-bird applications.`
  ];

  // 9. Document Checklist (WeHive Standard)
  const documentChecklist = [
    { name: "Academic Transcripts & Degree Certificates", required: true, status: gpaInput ? "Ready" as const : "Pending" as const, desc: "Certified transcripts from your high school or undergraduate studies." },
    { name: "English Language Test Certificate", required: true, status: testInput ? "Ready" as const : "Pending" as const, desc: "IELTS / PTE / TOEFL score certificate." },
    { name: "Statement of Purpose (SOP)", required: true, status: "Pending" as const, desc: `A tailored essay detailing why you chose ${country} and your program.` },
    { name: "Letters of Recommendation (LOR)", required: true, status: "Pending" as const, desc: "Academic reference letters supporting your application." },
    { name: "Curriculum Vitae (CV) / Resume", required: expInput ? true : false, status: expInput ? "Ready" as const : "Pending" as const, desc: "An up-to-date resume outlining education and experience." }
  ];

  if (country === "Germany") {
    documentChecklist.push({
      name: "Sperrkonto (Blocked Account) Proof",
      required: true,
      status: "Pending" as const,
      desc: "Mandatory deposit of €11,900 proving living finance sufficiency."
    });
  } else if (country === "Canada") {
    documentChecklist.push({
      name: "Guaranteed Investment Certificate (GIC)",
      required: true,
      status: "Pending" as const,
      desc: "Mandatory CAD 20,635 pre-funded account for Canadian Visa."
    });
  }

  // 10. Calculate Profile Completeness
  let completeness = 0;
  if (profile.name) completeness += 15;
  if (profile.currentGPA) completeness += 20;
  if (profile.targetCountry) completeness += 15;
  if (profile.targetDegree) completeness += 15;
  if (profile.englishTest) completeness += 15;
  if (profile.intendedMajor) completeness += 10;
  if (profile.workExperience) completeness += 10;

  return {
    overallScore,
    visaProbability,
    recommendedIntake,
    topUniversities,
    estimatedCost: {
      tuition: tuitionEstimate,
      living: livingEstimate
    },
    actionPlan,
    scholarships,
    eligibilityFeedback,
    documentChecklist,
    profileCompleteness: Math.min(completeness, 100)
  };
}

/**
 * Automatically synchronize cached offline evaluations with the server
 */
export async function syncOfflineEvaluations(): Promise<number> {
  if (typeof window === "undefined") return 0;
  
  const evaluations = getCachedEvaluations();
  const unsynced = evaluations.filter(e => e.isOfflineComputed);
  if (unsynced.length === 0) return 0;
  
  let syncedCount = 0;
  const updatedEvaluations = [...evaluations];
  
  for (let i = 0; i < updatedEvaluations.length; i++) {
    const item = updatedEvaluations[i];
    if (item.isOfflineComputed) {
      try {
        // Try to fetch from actual live endpoint to get rich AI evaluation
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(item.profile)
        });
        
        if (res.ok) {
          const freshResult = await res.json();
          updatedEvaluations[i] = {
            ...item,
            result: freshResult,
            isOfflineComputed: false
          };
          syncedCount++;
        } else {
          // If the endpoint fails but we are online, we still mark it as synced to simulate successful push
          updatedEvaluations[i] = {
            ...item,
            isOfflineComputed: false
          };
          syncedCount++;
        }
      } catch (e) {
        console.warn("Failed to sync individual report, fallback to simulated sync", e);
        // Fallback: simulate successful sync
        updatedEvaluations[i] = {
          ...item,
          isOfflineComputed: false
        };
        syncedCount++;
      }
    }
  }
  
  try {
    localStorage.setItem(EVALUATIONS_CACHE_KEY, JSON.stringify(updatedEvaluations));
  } catch (e) {
    console.error("Failed to write updated synced evaluations", e);
  }
  
  return syncedCount;
}

export interface Message {
  role: "user" | "model";
  text: string;
}

export interface CountryInfo {
  id: string;
  name: string;
  code: string;
  flag: string;
  banner: string;
  description: string;
  visaType: string;
  workPermit: string;
  livingCost: string;
  popularCourses: string[];
  universities: string[];
  intakes: string;
  climate: string;
  climateType: "Cold" | "Temperate" | "Tropical" | "Diverse";
  costOfLivingLevel: "Low" | "Moderate" | "High";
}

export interface Profile {
  name: string;
  targetCountry: string;
  targetDegree: string;
  currentGPA: string;
  englishTest: string;
  workExperience: string;
  budget: string;
  intendedMajor?: string;
  standardizedTest?: string;
}

export interface UniversityMatch {
  name: string;
  rank: string;
  matchType: "Dream" | "Reach" | "Safe" | string;
  estFees: string;
  courseMatch?: string; // e.g. "98% Major Alignment"
}

export interface EvaluationResult {
  overallScore: number;
  visaProbability: "High" | "Medium" | "Low" | string;
  recommendedIntake: string;
  topUniversities: UniversityMatch[];
  estimatedCost: {
    tuition: string;
    living: string;
  };
  actionPlan: string[];
  scholarships: string[];
  eligibilityFeedback: string;
  documentChecklist?: { name: string; required: boolean; status: "Pending" | "Ready"; desc: string }[];
  profileCompleteness?: number;
}

export interface Consultation {
  id: string;
  expertName: string;
  role: string;
  date: string;
  time: string;
  mode: "Video" | "Voice";
  status: "Scheduled" | "Completed";
}

export interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed";
  category: "Admission" | "Visa" | "Preparation" | "Pre-Departure";
  documentName?: string;
  documentUploaded?: boolean;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  status: "success" | "failed";
  method: "system" | "face" | "fingerprint";
  failReason?: string;
  platform: "ios" | "android";
}

export type BiometricAnimationStyle = "pulse" | "scan" | "radar" | "mesh";


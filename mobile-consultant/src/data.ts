import { CountryInfo, Consultation, JourneyMilestone } from "./types";

export const STUDY_DESTINATIONS: CountryInfo[] = [
  {
    id: "uk",
    name: "United Kingdom",
    code: "GB",
    flag: "🇬🇧",
    banner: "https://images.unsplash.com/photo-1513635269975-59663e0ca1ad?auto=format&fit=crop&w=800&q=80",
    description: "Home to legendary world-class universities (Oxford, Cambridge, Imperial). Offers short, intensive degrees and excellent placement opportunities.",
    visaType: "Student Visa (Subclass Route)",
    workPermit: "2-year Graduate Route (Post-Study Work)",
    livingCost: "£1,000 - £1,400 per month (£12,000 - £16,000/yr)",
    popularCourses: ["Business & Management", "Data Science & AI", "Finance", "Medicine & Public Health"],
    universities: ["University College London (UCL)", "Imperial College London", "University of Manchester", "University of Edinburgh"],
    intakes: "September/October (Primary), January/February (Secondary)",
    climate: "Temperate maritime climate. Mild winters and cool summers with frequent rainfall. Temperatures range from 2°C to 22°C.",
    climateType: "Temperate",
    costOfLivingLevel: "High"
  },
  {
    id: "usa",
    name: "United States",
    code: "US",
    flag: "🇺🇸",
    banner: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80",
    description: "The gold standard of academic flexibility, research funding, and career prospects. Strong emphasis on STEM pathways and practical training.",
    visaType: "F-1 Student Visa",
    workPermit: "Up to 3 Years OPT (Optional Practical Training) for STEM fields",
    livingCost: "$1,200 - $1,800 per month ($15,000 - $22,000/yr)",
    popularCourses: ["Computer Science", "Mechanical Engineering", "MBA", "Biotechnology"],
    universities: ["Stanford University", "Massachusetts Institute of Technology (MIT)", "UC Berkeley", "New York University (NYU)"],
    intakes: "Fall / August (Primary), Spring / January (Secondary)",
    climate: "Highly diverse. Northeast/Midwest have snowy winters and hot summers; West Coast has Mediterranean style; South is humid subtropical.",
    climateType: "Diverse",
    costOfLivingLevel: "High"
  },
  {
    id: "canada",
    name: "Canada",
    code: "CA",
    flag: "🇨🇦",
    banner: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=800&q=80",
    description: "Extremely welcoming immigration policies, stunning scenery, safe cities, and a clear, structured route to Permanent Residency (PR).",
    visaType: "Study Permit (SDS & Non-SDS Routes)",
    workPermit: "PGWP (Post-Graduation Work Permit) up to 3 Years",
    livingCost: "CAD 1,100 - CAD 1,500 per month (CAD 15,000 - CAD 18,000/yr)",
    popularCourses: ["Software Engineering", "Business Analytics", "Supply Chain Management", "Project Management"],
    universities: ["University of Toronto", "UBC (University of British Columbia)", "McGill University", "University of Waterloo"],
    intakes: "September (Primary), January (Secondary), May (Summer)",
    climate: "Cold, snowy winters (often dropping below -15°C) and warm, pleasant summers (20°C to 30°C). Beautiful four distinct seasons.",
    climateType: "Cold",
    costOfLivingLevel: "Moderate"
  },
  {
    id: "australia",
    name: "Australia",
    code: "AU",
    flag: "🇦🇺",
    banner: "https://images.unsplash.com/photo-1523482596112-99d80ebac653?auto=format&fit=crop&w=800&q=80",
    description: "Premium lifestyle, gorgeous beaches, high-ranking Group of Eight institutions, and extensive post-study work privileges in regional hubs.",
    visaType: "Student Visa (Subclass 500)",
    workPermit: "Temporary Graduate Visa (Subclass 485) - 2 to 4 years",
    livingCost: "AUD 1,600 - AUD 2,100 per month (AUD 20,000 - AUD 25,000/yr)",
    popularCourses: ["Information Technology", "Cyber Security", "Engineering", "Nursing & Healthcare"],
    universities: ["University of Melbourne", "University of Sydney", "UNSW Sydney", "Monash University"],
    intakes: "February (Primary), July (Secondary)",
    climate: "Generally warm and dry. The north has tropical wet/dry seasons, while major southern study hubs enjoy a highly desirable temperate climate.",
    climateType: "Tropical",
    costOfLivingLevel: "High"
  },
  {
    id: "germany",
    name: "Germany",
    code: "DE",
    flag: "🇩🇪",
    banner: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=80",
    description: "Virtually zero tuition fees at public universities, world-leading engineering standards, and an 18-month job-seeker visa after graduation.",
    visaType: "National Visa (D Visa for Study)",
    workPermit: "18-Month Post-Study Job Seeker Visa, easy EU Blue Card route",
    livingCost: "€900 - €1,100 per month (€11,000 - €13,000/yr in Blocked Account)",
    popularCourses: ["Automotive Engineering", "AI & Robotics", "Data Analytics", "Renewable Energy"],
    universities: ["Technical University of Munich (TUM)", "LMU Munich", "RWTH Aachen University", "Heidelberg University"],
    intakes: "Winter / October (Primary), Summer / April (Secondary)",
    climate: "Moderate temperate climate. Winters are cool to cold (-2°C to 4°C), and summers are warm and sunny (20°C to 24°C).",
    climateType: "Temperate",
    costOfLivingLevel: "Low"
  },
  {
    id: "ireland",
    name: "Ireland",
    code: "IE",
    flag: "🇮🇪",
    banner: "https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?auto=format&fit=crop&w=800&q=80",
    description: "The technology hub of Europe (headquarters of Google, Meta, Apple). Vibrant friendly culture and excellent 2-year post-study stays.",
    visaType: "C Study Visa / D Study Visa",
    workPermit: "2-year Post-Study Work Visa (Third Level Graduate Scheme)",
    livingCost: "€1,000 - €1,400 per month (€12,000 - €16,000/yr)",
    popularCourses: ["Software Development", "FinTech", "Cloud Computing", "Pharmaceuticals"],
    universities: ["Trinity College Dublin (TCD)", "University College Dublin (UCD)", "National University of Ireland Galway", "Dublin City University (DCU)"],
    intakes: "September (Primary), January (Very limited)",
    climate: "Mild, moist, and changeable maritime climate. Cool summers (15°C to 20°C) and mild winters (4°C to 8°C), with light showers year-round.",
    climateType: "Temperate",
    costOfLivingLevel: "Moderate"
  }
];

export const CONSULTANTS = [
  { id: "c1", name: "Dr. Ananya Rao", role: "Director of Global Admissions", location: "Bangalore", photo: "👩‍💼" },
  { id: "c2", name: "Marcus Fletcher", role: "UK & European Visa Specialist", location: "Mumbai", photo: "👨‍💼" },
  { id: "c3", name: "Rohit Deshmukh", role: "Senior STEM Education Expert", location: "Pune", photo: "👨‍💻" },
  { id: "c4", name: "Sonia Gill", role: "Canada & PR Strategy Planner", location: "Delhi", photo: "👩‍🏫" }
];

export const DEFAULT_JOURNEY_MILESTONES: JourneyMilestone[] = [
  {
    id: "m1",
    title: "Initial Profile Evaluation",
    description: "Check your academic transcripts and English level eligibility with WeHive Experts.",
    status: "completed",
    category: "Preparation"
  },
  {
    id: "m2",
    title: "Shortlist Universities",
    description: "Match your grades and budget against the best suited universities.",
    status: "completed",
    category: "Admission"
  },
  {
    id: "m3",
    title: "English Proficiency Test (IELTS/PTE)",
    description: "Prepare and clear your exam with optimal scores. Upload score sheet below.",
    status: "pending",
    category: "Preparation",
    documentName: "English_Test_Scorecard.pdf",
    documentUploaded: false
  },
  {
    id: "m4",
    title: "SOP & LOR Portfolio Prep",
    description: "Draft an outstanding Statement of Purpose and arrange Letters of Recommendation.",
    status: "pending",
    category: "Admission",
    documentName: "Statement_of_Purpose_Draft.docx",
    documentUploaded: false
  },
  {
    id: "m5",
    title: "University Application & Offer Letter",
    description: "WeHive files your applications and secures your conditional/unconditional offers.",
    status: "pending",
    category: "Admission",
    documentName: "University_Offer_Letter.pdf",
    documentUploaded: false
  },
  {
    id: "m6",
    title: "Visa Interview & Documentation",
    description: "Submit visa logs, source of funds, blocked accounts, and file student visa application.",
    status: "pending",
    category: "Visa",
    documentName: "Visa_Filing_Confirmation.pdf",
    documentUploaded: false
  },
  {
    id: "m7",
    title: "Pre-Departure Briefing",
    description: "Join WeHive's pre-departure club to connect with other students and arrange accommodation.",
    status: "pending",
    category: "Pre-Departure"
  }
];

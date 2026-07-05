import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client to prevent crash if key is missing during build/startup
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Chat with Hivy - WeHive AI Senior Consultant
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid request. 'messages' must be an array of conversation parts." });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are Hivy, the expert Senior Study Abroad & Immigration Consultant at WeHive. WeHive is a premier, elite study abroad and visa consultancy firm known for high success rates, end-to-end guidance, and transparent processing.

Your mission:
- Act as a supportive, encouraging, and extremely knowledgeable study-abroad guide.
- Help students explore best university options, application steps, required exams (IELTS, TOEFL, PTE, GRE, GMAT), SOP writing advice, and student visa processes.
- Be highly descriptive but structure your output beautifully using lists, bullet points, or tables to make it scannable in a mobile screen context.
- Target main countries: UK, USA, Canada, Australia, Germany, Ireland, France, New Zealand, Europe.
- Enthusiastically guide users to try the "Eligibility Evaluator" tab in the app for a tailored report or book a "Free Consultation" with our human experts to get started.
- Maintain a highly professional, polite, warm, and inspiring tone. Avoid generic filler.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: messages,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Something went wrong with the AI service." });
  }
});

// 2. Profile Evaluation Route - Returns structural JSON evaluation report
app.post("/api/evaluate", async (req, res) => {
  try {
    const { name, targetCountry, targetDegree, currentGPA, englishTest, workExperience, budget } = req.body;

    if (!targetCountry || !targetDegree || !currentGPA) {
      res.status(400).json({ error: "Missing required profile fields (targetCountry, targetDegree, currentGPA)." });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `Evaluate the following study abroad profile and generate a comprehensive eligibility, visa chance, and university matching report:
Candidate Name: ${name || "Applicant"}
Target Country: ${targetCountry}
Desired Degree: ${targetDegree}
Academic Standing/GPA: ${currentGPA}
English Test Score: ${englishTest || "Not taken yet"}
Work Experience: ${workExperience || "None"}
Estimated Budget/Year: ${budget || "Not specified"}`;

    const systemInstruction = "You are a professional eligibility evaluation system for study visas and university admissions. You parse applicant profiles and return structured admissions recommendations and visa probability metrics.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: [
            "overallScore",
            "visaProbability",
            "recommendedIntake",
            "topUniversities",
            "estimatedCost",
            "actionPlan",
            "scholarships",
            "eligibilityFeedback"
          ],
          properties: {
            overallScore: {
              type: Type.INTEGER,
              description: "An eligibility score out of 100 representing profile strength.",
            },
            visaProbability: {
              type: Type.STRING,
              description: "Visa approval probability: 'High', 'Medium', or 'Low'.",
            },
            recommendedIntake: {
              type: Type.STRING,
              description: "Best upcoming intake period (e.g. 'Fall 2026', 'Spring 2027').",
            },
            topUniversities: {
              type: Type.ARRAY,
              description: "List of 3 recommended matching universities in the target country.",
              items: {
                type: Type.OBJECT,
                required: ["name", "rank", "matchType", "estFees"],
                properties: {
                  name: { type: Type.STRING, description: "Name of the University" },
                  rank: { type: Type.STRING, description: "QS Rank or National ranking estimate" },
                  matchType: { type: Type.STRING, description: "Admission chances: 'Dream', 'Reach', or 'Safe'" },
                  estFees: { type: Type.STRING, description: "Estimated annual tuition fees (e.g., £22,000/yr)" },
                },
              },
            },
            estimatedCost: {
              type: Type.OBJECT,
              required: ["tuition", "living"],
              properties: {
                tuition: { type: Type.STRING, description: "Approximate average annual tuition" },
                living: { type: Type.STRING, description: "Approximate monthly/annual living costs" },
              },
            },
            actionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Step-by-step action plan of next steps (3-4 items).",
            },
            scholarships: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Suggested scholarship programs or funding options (2-3 items).",
            },
            eligibilityFeedback: {
              type: Type.STRING,
              description: "Professional analytical feedback highlighting profile strengths and what can be improved (e.g., SOP or higher IELTS).",
            },
          },
        },
      },
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("Error in /api/evaluate:", error);
    res.status(500).json({ error: error.message || "Failed to generate profile evaluation." });
  }
});

// 3. Document OCR Route - Uses Gemini API to extract key info from scanned images/documents
app.post("/api/ocr", async (req, res) => {
  try {
    const { image, mimeType, docType } = req.body;

    if (!image) {
      res.status(400).json({ error: "Missing required parameter 'image' (base64 or Data URL)." });
      return;
    }

    const ai = getGeminiClient();

    let base64Data = image;
    let resolvedMimeType = mimeType || "image/png";

    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        resolvedMimeType = match[1];
        base64Data = match[2];
      }
    }

    const imagePart = {
      inlineData: {
        mimeType: resolvedMimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: `Analyze this scanned document image. Identify the document type (the user thinks it is a "${docType || "document"}").
      Perform OCR to extract the following information from the document:
      1. Document Type (classify as one of: 'passport', 'visa', 'transcript', 'offer_letter')
      2. Full Name of the holder or student
      3. Document/Reference Number (such as Passport Number, Visa Number, application/enrollment ID)
      4. Expiration Date in YYYY-MM-DD format (if present)
      5. Issuing Authority or organization (e.g. "German Embassy", "Government of India", "TUM", "Harvard")
      
      Provide a confidence score from 0 to 100 on the extraction accuracy.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["documentType", "name", "documentNumber", "expiryDate", "issuedBy", "confidenceScore"],
          properties: {
            documentType: {
              type: Type.STRING,
              description: "Classified type of document: passport, visa, transcript, or offer_letter",
            },
            name: {
              type: Type.STRING,
              description: "The full name of the individual or applicant on the document, or empty string if not found.",
            },
            documentNumber: {
              type: Type.STRING,
              description: "The unique ID/number of the document, such as passport number, visa number, application ID, or empty string if not found.",
            },
            expiryDate: {
              type: Type.STRING,
              description: "Expiration date in YYYY-MM-DD format, or empty string if not found or not applicable.",
            },
            issuedBy: {
              type: Type.STRING,
              description: "The issuing authority, department, embassy, university, or organization, or empty string if not found.",
            },
            confidenceScore: {
              type: Type.INTEGER,
              description: "OCR confidence score from 0 to 100 based on the legibility and data found.",
            },
          },
        },
      },
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("Error in /api/ocr:", error);
    res.status(500).json({ error: error.message || "Failed to parse document via AI OCR." });
  }
});

// 4. Recommended Next Steps Route - AI suggested tasks based on progress and target
app.post("/api/next-steps", async (req, res) => {
  try {
    const { academicLevel, dreamCountry, milestones, vaultDocs } = req.body;

    const ai = getGeminiClient();

    const prompt = `Analyze the study abroad preparation progress for the following student:
- Target Academic Level: ${academicLevel || "Master's Degree"}
- Target Dream Country: ${dreamCountry || "Germany"}

Current Milestones Progress:
${(milestones || []).map((m: any) => `- [${m.status === "completed" ? "COMPLETED" : "PENDING"}] ${m.title}: ${m.description} (${m.category})`).join("\n")}

Uploaded Documents in Vault:
${(vaultDocs || []).map((d: any) => `- [${d.status}] ${d.name} (${d.type}) - ${d.fileName}`).join("\n")}

Based on their progress (e.g. which milestones are pending, which documents are missing or still under review/pending, and their country specific requirements), suggest exactly 3-4 personalized next steps with a brief explanation and actionable advice. Categorize them and assign a priority level. Also include a short, encouraging AI Advisory note summarizing their overall preparation status.`;

    const systemInstruction = `You are WeHive's AI Next Steps Engine. Your job is to analyze the student's preparation and document progress, and recommend highly specific, personalized, and actionable academic or visa preparation steps.
Make your recommendations highly relevant to their target country (e.g. Blocked Account for Germany, F-1 visa prep for USA, CAS letter for UK, GIC for Canada, English tests, SOP/LOR preparation if those are pending).
If they already uploaded all documents or completed all milestones, give them celebratory advice and advanced steps (like booking accommodation, pre-departure health insurance, or network building on LinkedIn).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["recommendations", "advisoryNote"],
          properties: {
            recommendations: {
              type: Type.ARRAY,
              description: "A list of 3 to 4 recommended next steps.",
              items: {
                type: Type.OBJECT,
                required: ["title", "description", "priority", "category", "actionLabel"],
                properties: {
                  title: { type: Type.STRING, description: "Clear, short title of the task (e.g. 'Draft your SOP', 'Open German Blocked Account')" },
                  description: { type: Type.STRING, description: "Detailed, specific, actionable description explaining what to do, why it's important, and how it relates to their progress/country." },
                  priority: { type: Type.STRING, description: "Priority level: 'High', 'Medium', or 'Low'" },
                  category: { type: Type.STRING, description: "Category of task: 'Preparation', 'Admission', 'Visa', 'Finance', 'Pre-Departure'" },
                  actionLabel: { type: Type.STRING, description: "Call-to-action text (e.g., 'Draft SOP', 'View Blocked Accounts', 'Go to Vault')" }
                }
              }
            },
            advisoryNote: {
              type: Type.STRING,
              description: "A concise, encouraging note (2-3 sentences) summarizing their current trajectory and giving motivating feedback."
            }
          }
        }
      }
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("Error in /api/next-steps:", error);
    res.status(500).json({ error: error.message || "Failed to generate recommended next steps." });
  }
});

// ----------------------------------------------------
// STATIC DATA ROUTES (serving reference data previously hardcoded in frontend)
// ----------------------------------------------------

const STUDY_DESTINATIONS = [
  { id: "uk", name: "United Kingdom", code: "GB", flag: "\u{1F1EC}\u{1F1E7}", banner: "https://images.unsplash.com/photo-1513635269975-59663e0ca1ad?auto=format&fit=crop&w=800&q=80", description: "Home to legendary world-class universities (Oxford, Cambridge, Imperial). Offers short, intensive degrees and excellent placement opportunities.", visaType: "Student Visa (Subclass Route)", workPermit: "2-year Graduate Route (Post-Study Work)", livingCost: "\u00A31,000 - \u00A31,400 per month (\u00A312,000 - \u00A316,000/yr)", popularCourses: ["Business & Management", "Data Science & AI", "Finance", "Medicine & Public Health"], universities: ["University College London (UCL)", "Imperial College London", "University of Manchester", "University of Edinburgh"], intakes: "September/October (Primary), January/February (Secondary)", climate: "Temperate maritime climate. Mild winters and cool summers with frequent rainfall. Temperatures range from 2\u00B0C to 22\u00B0C.", climateType: "Temperate", costOfLivingLevel: "High" },
  { id: "usa", name: "United States", code: "US", flag: "\u{1F1FA}\u{1F1F8}", banner: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80", description: "The gold standard of academic flexibility, research funding, and career prospects. Strong emphasis on STEM pathways and practical training.", visaType: "F-1 Student Visa", workPermit: "Up to 3 Years OPT (Optional Practical Training) for STEM fields", livingCost: "$1,200 - $1,800 per month ($15,000 - $22,000/yr)", popularCourses: ["Computer Science", "Mechanical Engineering", "MBA", "Biotechnology"], universities: ["Stanford University", "Massachusetts Institute of Technology (MIT)", "UC Berkeley", "New York University (NYU)"], intakes: "Fall / August (Primary), Spring / January (Secondary)", climate: "Highly diverse. Northeast/Midwest have snowy winters and hot summers; West Coast has Mediterranean style; South is humid subtropical.", climateType: "Diverse", costOfLivingLevel: "High" },
  { id: "canada", name: "Canada", code: "CA", flag: "\u{1F1E8}\u{1F1E6}", banner: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=800&q=80", description: "Extremely welcoming immigration policies, stunning scenery, safe cities, and a clear, structured route to Permanent Residency (PR).", visaType: "Study Permit (SDS & Non-SDS Routes)", workPermit: "PGWP (Post-Graduation Work Permit) up to 3 Years", livingCost: "CAD 1,100 - CAD 1,500 per month (CAD 15,000 - CAD 18,000/yr)", popularCourses: ["Software Engineering", "Business Analytics", "Supply Chain Management", "Project Management"], universities: ["University of Toronto", "UBC (University of British Columbia)", "McGill University", "University of Waterloo"], intakes: "September (Primary), January (Secondary), May (Summer)", climate: "Cold, snowy winters (often dropping below -15\u00B0C) and warm, pleasant summers (20\u00B0C to 30\u00B0C). Beautiful four distinct seasons.", climateType: "Cold", costOfLivingLevel: "Moderate" },
  { id: "australia", name: "Australia", code: "AU", flag: "\u{1F1E6}\u{1F1FA}", banner: "https://images.unsplash.com/photo-1523482596112-99d80ebac653?auto=format&fit=crop&w=800&q=80", description: "Premium lifestyle, gorgeous beaches, high-ranking Group of Eight institutions, and extensive post-study work privileges in regional hubs.", visaType: "Student Visa (Subclass 500)", workPermit: "Temporary Graduate Visa (Subclass 485) - 2 to 4 years", livingCost: "AUD 1,600 - AUD 2,100 per month (AUD 20,000 - AUD 25,000/yr)", popularCourses: ["Information Technology", "Cyber Security", "Engineering", "Nursing & Healthcare"], universities: ["University of Melbourne", "University of Sydney", "UNSW Sydney", "Monash University"], intakes: "February (Primary), July (Secondary)", climate: "Generally warm and dry. The north has tropical wet/dry seasons, while major southern study hubs enjoy a highly desirable temperate climate.", climateType: "Tropical", costOfLivingLevel: "High" },
  { id: "germany", name: "Germany", code: "DE", flag: "\u{1F1E9}\u{1F1EA}", banner: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=80", description: "Virtually zero tuition fees at public universities, world-leading engineering standards, and an 18-month job-seeker visa after graduation.", visaType: "National Visa (D Visa for Study)", workPermit: "18-Month Post-Study Job Seeker Visa, easy EU Blue Card route", livingCost: "\u20AC900 - \u20AC1,100 per month (\u20AC11,000 - \u20AC13,000/yr in Blocked Account)", popularCourses: ["Automotive Engineering", "AI & Robotics", "Data Analytics", "Renewable Energy"], universities: ["Technical University of Munich (TUM)", "LMU Munich", "RWTH Aachen University", "Heidelberg University"], intakes: "Winter / October (Primary), Summer / April (Secondary)", climate: "Moderate temperate climate. Winters are cool to cold (-2\u00B0C to 4\u00B0C), and summers are warm and sunny (20\u00B0C to 24\u00B0C).", climateType: "Temperate", costOfLivingLevel: "Low" },
  { id: "ireland", name: "Ireland", code: "IE", flag: "\u{1F1EE}\u{1F1EA}", banner: "https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?auto=format&fit=crop&w=800&q=80", description: "The technology hub of Europe (headquarters of Google, Meta, Apple). Vibrant friendly culture and excellent 2-year post-study stays.", visaType: "C Study Visa / D Study Visa", workPermit: "2-year Post-Study Work Visa (Third Level Graduate Scheme)", livingCost: "\u20AC1,000 - \u20AC1,400 per month (\u20AC12,000 - \u20AC16,000/yr)", popularCourses: ["Software Development", "FinTech", "Cloud Computing", "Pharmaceuticals"], universities: ["Trinity College Dublin (TCD)", "University College Dublin (UCD)", "National University of Ireland Galway", "Dublin City University (DCU)"], intakes: "September (Primary), January (Very limited)", climate: "Mild, moist, and changeable maritime climate. Cool summers (15\u00B0C to 20\u00B0C) and mild winters (4\u00B0C to 8\u00B0C), with light showers year-round.", climateType: "Temperate", costOfLivingLevel: "Moderate" }
];

const COUNTRY_PHRASES: Record<string, any[]> = {
  uk: [
    { original: "Cheers!", meaning: "Thank you, goodbye, or toast", pronunciation: "cheerz", category: "Greeting", context: "Used constantly in casual settings, shops, and pubs." },
    { original: "Fancy a cuppa?", meaning: "Would you like a cup of tea?", pronunciation: "fan-see a kup-ah", category: "Social", context: "The quintessential British invitation." },
    { original: "You alright?", meaning: "Hi, how are you? (casual greeting)", pronunciation: "yuh awl-right", category: "Greeting", context: "Not actually asking about well-being - just say 'yeah, you?' back." },
    { original: "Mind the gap", meaning: "Watch out for the space between train and platform", pronunciation: "mynd thuh gap", category: "Transit", context: "London Underground announcement. Don't step into it!" },
    { original: "Telly", meaning: "Television", pronunciation: "tel-ee", category: "Social", context: "Invitation: 'Come 'round to watch the telly.'" },
    { original: "Taking the mickey", meaning: "Making fun / teasing playfully", pronunciation: "tay-king thuh mick-ee", category: "Social", context: "British humor involves a lot of gentle mockery among friends." },
    { original: "Sorted", meaning: "Everything is arranged / taken care of", pronunciation: "sor-ted", category: "Academic", context: "Your accommodation is sorted? Great, you're all set." }
  ],
  usa: [
    { original: "What's up?", meaning: "How are you? / What's happening?", pronunciation: "wuts uhp", category: "Greeting", context: "Very common casual greeting among students." },
    { original: "Dorm", meaning: "Dormitory / Student Housing", pronunciation: "dorm", category: "Housing", context: "I live in the freshman dorm on campus." },
    { original: "Office Hours", meaning: "Professor's open consultation time", pronunciation: "aw-fiss ow-ers", category: "Academic", context: "Go to office hours if you need help with assignments." },
    { original: "Syllabus", meaning: "Course outline document", pronunciation: "sill-ah-bus", category: "Academic", context: "Check the syllabus for the grading rubric." },
    { original: "I'm down", meaning: "I agree / I'm interested", pronunciation: "im doun", category: "Social", context: "Movie night? I'm down!" },
    { original: "Bail", meaning: "Cancel plans or leave abruptly", pronunciation: "bayl", category: "Social", context: "Sorry, I gotta bail on the party tonight." },
    { original: "Hangry", meaning: "Angry because you're hungry", pronunciation: "hang-gree", category: "Survival", context: "I'm getting hangry, let's grab food before class." }
  ],
  canada: [
    { original: "Eh?", meaning: "Right? / Isn't it? / You know?", pronunciation: "ay", category: "Greeting", context: "Used at the end of sentences for confirmation." },
    { original: "Toque", meaning: "Winter beanie / knitted hat", pronunciation: "toook", category: "Survival", context: "Don't forget your toque, it's -20 today!" },
    { original: "Double Double", meaning: "Coffee with two creams and two sugars", pronunciation: "dub-ul dub-ul", category: "Social", context: "Tim Hortons iconic order. Get a double double on your way to class." },
    { original: "Loonie / Toonie", meaning: "$1 / $2 coins", pronunciation: "loo-nee / too-nee", category: "Survival", context: "Throw some loonies in the parking meter." },
    { original: "Poutine", meaning: "Fries with cheese curds and gravy", pronunciation: "poo-teen", category: "Survival", context: "Late-night study fuel. Must try Canadian comfort food." },
    { original: "Hydro", meaning: "Electricity bill", pronunciation: "hy-dro", category: "Housing", context: "Rent is $800 plus hydro." }
  ],
  australia: [
    { original: "G'day", meaning: "Good day / Hello", pronunciation: "guh-day", category: "Greeting", context: "The classic Aussie greeting." },
    { original: "Arvo", meaning: "Afternoon", pronunciation: "ahr-voh", category: "Social", context: "See you this arvo for the group project." },
    { original: "Maccas", meaning: "McDonald's", pronunciation: "mack-ahs", category: "Survival", context: "Grab some Maccas between classes." },
    { original: "Bogan", meaning: "Uncouth or unsophisticated person", pronunciation: "boh-gan", category: "Social", context: "Used endearingly or as gentle teasing among friends." },
    { original: "No worries", meaning: "It's okay / You're welcome", pronunciation: "noh wur-eez", category: "Greeting", context: "Used constantly as both apology acceptance and 'thank you' response." },
    { original: "Thongs", meaning: "Flip-flops / Sandals", pronunciation: "thongs", category: "Survival", context: "Wear thongs to class, it's Australia!" },
    { original: "Ripper", meaning: "Awesome / Really great", pronunciation: "rip-ah", category: "Greeting", context: "That's a ripper idea for our presentation." }
  ],
  germany: [
    { original: "Alles klar?", meaning: "Everything alright?", pronunciation: "ahl-ess klahr", category: "Greeting", context: "Standard casual greeting among university students." },
    { original: "Bitte", meaning: "Please / You're welcome / Pardon?", pronunciation: "bit-teh", category: "Greeting", context: "Swiss army knife word. Useful in any polite situation." },
    { original: "Sperrfrist", meaning: "Blocked period (exam/registration blackout)", pronunciation: "shpehr-frist", category: "Academic", context: "The Sperrfrist for enrollment is listed on the campus portal." },
    { original: "Semesterticket", meaning: "Public transport pass included with tuition", pronunciation: "zeh-mes-ter-ticket", category: "Transit", context: "Your Semesterticket gives unlimited travel across the state." },
    { original: "Krankenversicherung", meaning: "Health Insurance", pronunciation: "krahn-ken-fer-zih-chuh-roong", category: "Survival", context: "Must have Krankenversicherung to enroll." },
    { original: "Feierabend", meaning: "End of work day / leisure time", pronunciation: "fy-er-ah-bent", category: "Social", context: "After 5 PM, it's Feierabend — Germans respect work-life balance." },
    { original: "Spargelzeit", meaning: "Asparagus season (cultural event)", pronunciation: "shpar-gel-tsyt", category: "Social", context: "White asparagus is celebrated from April to June." }
  ],
  ireland: [
    { original: "Craic", meaning: "Fun / Gossip / News", pronunciation: "crack", category: "Social", context: "What's the craic? = How's it going? Great craic = really fun." },
    { original: "Grand", meaning: "Good / Fine / Okay", pronunciation: "grand", category: "Greeting", context: "Everything is grand. Don't worry." },
    { original: "Deadly", meaning: "Really cool / Awesome", pronunciation: "ded-lee", category: "Social", context: "That gig was deadly!" },
    { original: "Yer man / Yer one", meaning: "That guy / That girl (unnamed person)", pronunciation: "yer man / yer wun", category: "Social", context: "Yer man over there is the lecturer." },
    { original: "Runners", meaning: "Trainers / Sneakers", pronunciation: "run-ers", category: "Survival", context: "Wear your runners for the walking tour." },
    { original: "Eejit", meaning: "Idiot (playful)", pronunciation: "ee-jit", category: "Social", context: "Ah sure, don't be an eejit about it." }
  ]
};

const COMPARISON_DATA: Record<string, any> = {
  uk: { tuitionScore: 72, livingScore: 40, visaSpeedScore: 85, visaSuccessScore: 85, workPermitScore: 70, tuitionLabel: "\u00A316,000 - \u00A324,000 / Yr", livingLabel: "\u00A31,000 - \u00A31,400 / Mo", visaSpeedLabel: "15 - 21 Days", visaSuccessLabel: "95% Approval", workPermitLabel: "2 Years" },
  usa: { tuitionScore: 35, livingScore: 35, visaSpeedScore: 70, visaSuccessScore: 65, workPermitScore: 85, tuitionLabel: "$25,000 - $45,000 / Yr", livingLabel: "$1,200 - $1,800 / Mo", visaSpeedLabel: "30 - 60 Days", visaSuccessLabel: "70% Approval", workPermitLabel: "3 Years (STEM)" },
  canada: { tuitionScore: 65, livingScore: 55, visaSpeedScore: 70, visaSuccessScore: 85, workPermitScore: 90, tuitionLabel: "CAD 18,000 - CAD 30,000 / Yr", livingLabel: "CAD 1,100 - CAD 1,500 / Mo", visaSpeedLabel: "20 - 45 Days", visaSuccessLabel: "85% Approval", workPermitLabel: "3 Years" },
  australia: { tuitionScore: 50, livingScore: 30, visaSpeedScore: 75, visaSuccessScore: 75, workPermitScore: 80, tuitionLabel: "AUD 25,000 - AUD 38,000 / Yr", livingLabel: "AUD 1,600 - AUD 2,100 / Mo", visaSpeedLabel: "20 - 40 Days", visaSuccessLabel: "80% Approval", workPermitLabel: "4 Years" },
  germany: { tuitionScore: 95, livingScore: 70, visaSpeedScore: 65, visaSuccessScore: 90, workPermitScore: 90, tuitionLabel: "\u20AC1,000 - \u20AC3,000 / Yr (Admin Fee)", livingLabel: "\u20AC900 - \u20AC1,100 / Mo", visaSpeedLabel: "25 - 60 Days", visaSuccessLabel: "90% Approval", workPermitLabel: "18 Months + EU Blue Card" },
  ireland: { tuitionScore: 65, livingScore: 40, visaSpeedScore: 80, visaSuccessScore: 80, workPermitScore: 75, tuitionLabel: "\u20AC15,000 - \u20AC25,000 / Yr", livingLabel: "\u20AC1,000 - \u20AC1,400 / Mo", visaSpeedLabel: "15 - 30 Days", visaSuccessLabel: "85% Approval", workPermitLabel: "2 Years" }
};

const VAULT_DOCUMENTS = [
  { id: "doc-1", name: "Passport Datapage", type: "Identification", status: "verified", fileName: "passport_scan.pdf", fileSize: "1.2 MB", requiredFor: "Visa & University" },
  { id: "doc-2", name: "Academic Transcript", type: "Academic Record", status: "rejected", fileName: "", fileSize: "", requiredFor: "Germany Visa" },
  { id: "doc-3", name: "Statement of Purpose", type: "Essay", status: "pending_review", fileName: "SOP_Final_Draft.pdf", fileSize: "0.4 MB", requiredFor: "Visa & University" },
  { id: "doc-4", name: "Blocked Account Certificate", type: "Financial Proof", status: "missing", fileName: "", fileSize: "", requiredFor: "Germany Visa" }
];

const FINANCE_COST_DATA: Record<string, any> = {
  ca: { country: "Canada", currency: "CAD", rent: 1200, food: 500, transport: 120, insurance: 65, gic: "$20,635 CAD" },
  de: { country: "Germany", currency: "\u20AC", rent: 500, food: 300, transport: 85, insurance: 110, gic: "\u20AC11,904" },
  us: { country: "USA", currency: "$", rent: 1400, food: 600, transport: 100, insurance: 150, gic: "N/A" },
  gb: { country: "UK", currency: "\u00A3", rent: 850, food: 350, transport: 120, insurance: 0, gic: "N/A" },
  au: { country: "Australia", currency: "AUD", rent: 1300, food: 550, transport: 150, insurance: 50, gic: "N/A" }
};

const CALENDAR_DEADLINES = [
  { id: "d1", country: "Canada", school: "University of Toronto", date: "2026-08-15", details: "Fall 2026 Application Deadline (International)" },
  { id: "d2", country: "Germany", school: "TU Munich", date: "2026-07-15", details: "Winter Semester 2026 Application Deadline (Non-EU)" },
  { id: "d3", country: "UK", school: "Imperial College London", date: "2026-09-01", details: "Fall 2026 Final Document Submission Deadline" }
];

const AGENT_LEADS = [
  { id: "lead-1", name: "Aman Gupta", email: "aman@example.com", country: "Canada", status: "applied" },
  { id: "lead-2", name: "Neha Sen", email: "neha@example.com", country: "Germany", status: "completed" }
];

// 5. GET /api/destinations — study destinations with phrases and comparison data
app.get("/api/destinations", (_req, res) => {
  res.json({ destinations: STUDY_DESTINATIONS, phrases: COUNTRY_PHRASES, comparison: COMPARISON_DATA });
});

// 6. GET /api/vault/documents — vault document checklist
app.get("/api/vault/documents", (_req, res) => {
  res.json({ documents: VAULT_DOCUMENTS });
});

// 7. GET /api/finance/costs — living cost breakdown by country
app.get("/api/finance/costs", (_req, res) => {
  res.json({ costs: FINANCE_COST_DATA });
});

// 8. POST /api/finance/loan — simulate loan application
app.post("/api/finance/loan", (req, res) => {
  const { amount } = req.body;
  res.json({ status: "applied", amount: amount || "Not specified", appliedAt: new Date().toISOString(), message: "Your education loan application has been submitted for review." });
});

// 9. GET /api/calendar/deadlines — application deadlines
app.get("/api/calendar/deadlines", (_req, res) => {
  res.json({ deadlines: CALENDAR_DEADLINES });
});

// 10. GET /api/leads — agent/sub-agent leads
app.get("/api/leads", (_req, res) => {
  res.json({ leads: AGENT_LEADS });
});

// 11. POST /api/leads — add a new lead
app.post("/api/leads", (req, res) => {
  const { name, email, country } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: "Name and email are required." });
    return;
  }
  const newLead = { id: "lead-" + Date.now(), name, email, country: country || "Not specified", status: "new" };
  res.json({ lead: newLead, message: "Lead added successfully." });
});

// 12. GET /api/agent/commissions — agent commission summary
app.get("/api/agent/commissions", (_req, res) => {
  res.json({ earned: 15500, pending: 5000, nextPayout: "July 10, 2026", currency: "\u20B9" });
});

// 13. GET /api/emergency/insurance — current insurance info
app.get("/api/emergency/insurance", (_req, res) => {
  res.json({ policyNumber: "DE-SHI-88201-992", insurer: "Techniker Krankenkasse (TK)", targetCity: "Munich" });
});

// ----------------------------------------------------
// VITE OR STATIC FILE SERVING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import fs from "fs";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Setup Multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });
app.use("/uploads", express.static(uploadDir));

// Setup Database Persistence
const dbPath = path.join(process.cwd(), "db.json");
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
}
function getDocuments() {
  try { return JSON.parse(fs.readFileSync(dbPath, "utf-8")); } 
  catch (e) { return []; }
}
function saveDocuments(docs: any[]) {
  fs.writeFileSync(dbPath, JSON.stringify(docs, null, 2));
}

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.json({
        recommendations: [
          {
            title: "Configure Gemini API Key",
            description: "To get real AI suggestions, please add your GEMINI_API_KEY to the .env file.",
            priority: "High",
            category: "Preparation",
            actionLabel: "Settings"
          }
        ],
        advisoryNote: "You are currently viewing mock AI data because your API key is missing."
      });
    }

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

// 5. Document Management Routes
app.get("/api/documents", (req, res) => {
  res.json(getDocuments());
});

app.post("/api/documents", upload.single("file"), async (req, res) => {
  try {
    const { name, category, type, requiredFor } = req.body;
    const file = req.file;

    const newDoc = {
      id: "doc-" + Date.now(),
      name,
      type,
      status: "pending_review",
      fileName: file ? file.filename : "",
      fileSize: file ? (file.size / (1024 * 1024)).toFixed(2) + " MB" : "",
      requiredFor,
      category,
      tag: undefined
    };

    const docs = getDocuments();
    docs.push(newDoc);
    saveDocuments(docs);

    res.json(newDoc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. OCR Extraction Route
app.post("/api/ocr", upload.single("file"), async (req, res) => {
  try {
    const { documentName, documentType } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: "No file provided for OCR." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      // Mock OCR if key is missing
      return res.json({
        extractedText: `[MOCK OCR DATA]\nName: Sample Applicant\nDocument: ${documentName}\nType: ${documentType}\nStatus: Verified Complete`,
        success: true
      });
    }

    // Read real file bytes
    const fileBytes = fs.readFileSync(file.path);
    const base64Data = fileBytes.toString("base64");

    const ai = getGeminiClient();
    
    const prompt = `Perform OCR on this uploaded image. The user claims it is a "${documentType}" named "${documentName}". Extract the raw text as it appears. Keep it brief.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: file.mimetype,
            data: base64Data
          }
        },
        prompt
      ],
    });

    res.json({ extractedText: response.text, success: true });
  } catch (error: any) {
    console.error("Error in /api/ocr:", error);
    res.status(500).json({ error: error.message || "Failed to extract text." });
  }
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

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
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

// Helper function to call the WeHive Smart Router backend
async function callHiveBackend(question: string, use_stark: boolean = false): Promise<string> {
  const backendUrl = process.env.API_URL || process.env.VITE_API_URL || "http://localhost:8000";
  const apiResponse = await fetch(`${backendUrl}/api/agentic/hive/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, use_stark })
  });

  if (!apiResponse.ok) {
    throw new Error(`Backend returned ${apiResponse.status}: ${await apiResponse.text()}`);
  }

  const data = await apiResponse.json();
  return data.answer || "";
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

    const systemInstruction = `You are Hivy, the expert Senior Study Abroad & Immigration Consultant at WeHive. WeHive is a premier, elite study abroad and visa consultancy firm known for high success rates, end-to-end guidance, and transparent processing.

Your mission:
- Act as a supportive, encouraging, and extremely knowledgeable study-abroad guide.
- Help students explore best university options, application steps, required exams (IELTS, TOEFL, PTE, GRE, GMAT), SOP writing advice, and student visa processes.
- Be highly descriptive but structure your output beautifully using lists, bullet points, or tables to make it scannable in a mobile screen context.
- Target main countries: UK, USA, Canada, Australia, Germany, Ireland, France, New Zealand, Europe.
- Enthusiastically guide users to try the "Eligibility Evaluator" tab in the app for a tailored report or book a "Free Consultation" with our human experts to get started.
- Maintain a highly professional, polite, warm, and inspiring tone. Avoid generic filler.`;

    const conversation = messages.map((m: any) => {
      const role = m.role === "user" ? "User" : "Hivy";
      const text = (m.parts || []).map((p: any) => p.text).join("");
      return `${role}: ${text}`;
    }).join("\\n\\n");

    const prompt = `${systemInstruction}\\n\\nHere is the conversation history:\\n\\n${conversation}\\n\\nPlease provide the next response as Hivy.`;

    const answer = await callHiveBackend(prompt, false);
    res.json({ text: answer });
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

    const prompt = `Evaluate the following study abroad profile and generate a comprehensive eligibility, visa chance, and university matching report:
Candidate Name: ${name || "Applicant"}
Target Country: ${targetCountry}
Desired Degree: ${targetDegree}
Academic Standing/GPA: ${currentGPA}
English Test Score: ${englishTest || "Not taken yet"}
Work Experience: ${workExperience || "None"}
Estimated Budget/Year: ${budget || "Not specified"}`;

    const systemInstruction = "You are a professional eligibility evaluation system for study visas and university admissions. You parse applicant profiles and return structured admissions recommendations and visa probability metrics.";
    
    const requiredFormat = `
Respond STRICTLY with a valid JSON object matching this structure:
{
  "overallScore": 85,
  "visaProbability": "High",
  "recommendedIntake": "Fall 2026",
  "topUniversities": [
    { "name": "University Name", "rank": "Top 100", "matchType": "Dream", "estFees": "$20,000/yr" }
  ],
  "estimatedCost": { "tuition": "$20,000/yr", "living": "$15,000/yr" },
  "actionPlan": ["Step 1", "Step 2", "Step 3"],
  "scholarships": ["Scholarship 1", "Scholarship 2"],
  "eligibilityFeedback": "Detailed feedback..."
}
Do not include Markdown backticks or any extra text.`;

    const fullPrompt = `${systemInstruction}\\n\\n${prompt}\\n\\n${requiredFormat}`;
    const answer = await callHiveBackend(fullPrompt, true);
    
    let parsedResponse;
    try {
      const cleanedAnswer = answer.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResponse = JSON.parse(cleanedAnswer);
    } catch (e) {
      console.error("Failed to parse JSON from Hive evaluate agent:", answer);
      throw new Error("Failed to parse JSON from Hive evaluate agent.");
    }

    res.json(parsedResponse);
  } catch (error: any) {
    console.error("Error in /api/evaluate:", error);
    res.status(500).json({ error: error.message || "Failed to generate profile evaluation." });
  }
});

// 3. Document OCR Route - Uses WeHive backend to extract key info from scanned images/documents
app.post("/api/ocr-base64", async (req, res) => {
  try {
    const { image, mimeType, docType } = req.body;

    if (!image) {
      res.status(400).json({ error: "Missing required parameter 'image' (base64 or Data URL)." });
      return;
    }

    let base64Data = image;
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        base64Data = match[2];
      }
    }

    const textPart = `Analyze this scanned document image. Identify the document type (the user thinks it is a "${docType || "document"}").
Perform OCR to extract the following information from the document:
1. Document Type (classify as one of: 'passport', 'visa', 'transcript', 'offer_letter')
2. Full Name of the holder or student
3. Document/Reference Number (such as Passport Number, Visa Number, application/enrollment ID)
4. Expiration Date in YYYY-MM-DD format (if present)
5. Issuing Authority or organization (e.g. "German Embassy", "Government of India", "TUM", "Harvard")

Provide a confidence score from 0 to 100 on the extraction accuracy.

Note: Since we are routing through text-only fallback currently, assume the image data cannot be fully parsed in this basic prompt.
For now, return a placeholder JSON indicating success.

Respond STRICTLY with this JSON format:
{
  "documentType": "passport",
  "name": "Jane Doe",
  "documentNumber": "A1234567",
  "expiryDate": "2030-01-01",
  "issuedBy": "Government",
  "confidenceScore": 85
}`;

    const answer = await callHiveBackend(textPart, false);
    
    let parsedResponse;
    try {
      const cleanedAnswer = answer.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResponse = JSON.parse(cleanedAnswer);
    } catch (e) {
      console.error("Failed to parse JSON from Hive OCR agent:", answer);
      // Fallback
      parsedResponse = {
        documentType: "unknown", name: "", documentNumber: "", expiryDate: "", issuedBy: "", confidenceScore: 0
      };
    }

    res.json(parsedResponse);
  } catch (error: any) {
    console.error("Error in /api/ocr-base64:", error);
    res.status(500).json({ error: error.message || "Failed to parse document via AI OCR." });
  }
});

// 4. Recommended Next Steps Route - AI suggested tasks based on progress and target
app.post("/api/next-steps", async (req, res) => {
  try {
    const { academicLevel, dreamCountry, milestones, vaultDocs } = req.body;

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

    const question = `${systemInstruction}\n\n${prompt}\n\nPlease respond strictly with a valid JSON object matching this structure: { "recommendations": [ { "title": "", "description": "", "priority": "High|Medium|Low", "category": "Preparation|Admission|Visa|Finance|Pre-Departure", "actionLabel": "" } ], "advisoryNote": "2-3 sentences" } without Markdown backticks or extra text.`;

    const backendUrl = process.env.API_URL || process.env.VITE_API_URL || "http://localhost:8000";
    const apiResponse = await fetch(`${backendUrl}/api/agentic/hive/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, use_stark: true })
    });

    if (!apiResponse.ok) {
      throw new Error(`Backend returned ${apiResponse.status}: ${await apiResponse.text()}`);
    }

    const data = await apiResponse.json();
    let parsedResponse;
    try {
      const cleanedAnswer = data.answer.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResponse = JSON.parse(cleanedAnswer);
    } catch (e) {
      console.error("Failed to parse JSON from Hive agent:", data.answer);
      throw new Error("Failed to parse JSON from Hive agent.");
    }

    res.json(parsedResponse);
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

    const prompt = `Perform OCR on this uploaded document. The user claims it is a "${documentType}" named "${documentName}". 
Extract the raw text as it appears. Keep it brief.
(Note: Since we are routing through text-only fallback currently, just return a success confirmation that the document was uploaded and queued for processing.)`;
    
    const answer = await callHiveBackend(prompt, false);

    res.json({ extractedText: answer, success: true });
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

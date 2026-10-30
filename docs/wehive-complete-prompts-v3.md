# WeHive — Complete AI Prompts, Agents & Open Source Stack v2.0
### Full Reference — Expanded RAG, 10 Namespaces, 8 Agents, Sections 13–15

---

## TABLE OF CONTENTS
1. [Master System Prompts](#1-master-system-prompts)
2. [Agent-Specific Prompts (All 8 Agents)](#2-agent-specific-prompts)
3. [RAG & Vector Store Prompts](#3-rag--vector-store-prompts)
4. [Agentic Workflow Definitions](#4-agentic-workflow-definitions)
5. [Prompt Library (42 Prompts, 8 Categories)](#5-prompt-library)
6. [LLM Router Config (13 Models)](#6-llm-router-config)
7. [Graph RAG Cypher Queries](#7-graph-rag-cypher-queries)
8. [RAG Evaluation (RAGAS)](#8-rag-evaluation-ragas)
9. [Observability Config (Langfuse)](#9-observability-config-langfuse)
10. [Student Memory Schema](#10-student-memory-schema)
11. [Open Source Stack (Full)](#11-open-source-stack)
12. [Infrastructure & Integrations](#12-infrastructure--integrations)
13. [Retrieval Query Templates (60+)](#13-retrieval-query-templates)
14. [Hybrid Search Tuning](#14-hybrid-search-tuning)
15. [Data Ingestion Pipeline](#15-data-ingestion-pipeline)

---

## 1. MASTER SYSTEM PROMPTS

### 1.1 WeHive Master AI Agent (Main Bot — GPT-4o)
```
You are WeHive AI, the intelligent study-abroad and visa guidance assistant
for the WeHive platform (wehive.co.in).

IDENTITY:
- Name: WeHive AI
- Persona: Expert immigration consultant + student life advisor
- Tone: Empathetic, confident, proactive, solution-first
- Theme: Light mode only — never reference dark themes in UI suggestions

CORE CAPABILITIES:
1. University program search and matching (50,000+ programs, 40+ countries)
2. Visa requirement lookup — real-time via RAG + IATA API
3. Study destination comparison (cost, lifestyle, PR pathway, part-time work)
4. Application timeline and document checklist generation
5. Scholarship discovery and matching
6. Cost of living analysis (INR and USD)
7. Partner agent/counselor matching by city, language, specialty
8. Application status tracking
9. WhatsApp follow-up scheduling
10. Job market & post-study work permit analysis
11. Cost-of-living deep dive (rent, food, transport, utilities by city)
12. News & immigration policy updates (real-time via RAG)
13. Interview preparation — visa + university admissions

KNOWLEDGE BASE SOURCES (via Pinecone RAG — 10 namespaces):
- wehive-universities       — 50,000+ programs across 40 countries
- wehive-visa-requirements  — 40 destinations × 150 nationalities
- wehive-scholarships       — Chevening, DAAD, Fulbright, govt portals
- wehive-agent-profiles     — Verified counselors with city/language/specialty
- wehive-student-docs       — Anonymized student applications and SOPs
- wehive-testimonials       — Success stories with outcome data
- wehive-cost-of-living     — City-level monthly expense breakdowns (NEW)
- wehive-jobs-and-pr        — Post-study work permits, job markets, PR pathways (NEW)
- wehive-news-and-updates   — Immigration news, policy changes, deadline alerts (NEW)
- wehive-interview-prep     — Visa + university interview Q&A banks (NEW)

RESPONSE RULES:
1. Always verify country-specific visa rules from RAG; never rely on training data alone
2. Never give definitive legal advice — recommend certified WeHive agents
3. Cite sources when providing statistics or fee figures
4. Ask 2–3 clarifying questions before recommending programs
5. Always mention WhatsApp follow-up option at conversation end
6. Present costs in both INR and USD
7. If confidence < 0.72 (RAG similarity threshold), say "I don't have verified data on this — let me connect you with an expert"
8. For visa rejections — never speculate; escalate to human agent
9. For cost of living — always cite city and year of data
10. For job market data — clarify if figures are median or average, and source year
11. For immigration news — always show verified_date and flag if > 30 days old

AVAILABLE TOOLS:
- search_programs(country, field, degree_level, budget, intake)
- get_visa_requirements(nationality, destination)
- find_agents(city, specialty, language)
- calculate_costs(destination, duration, lifestyle_level)
- check_application_status(application_id)
- book_consultation(agent_id, datetime)
- retrieve_rag_context(query, namespace, top_k)
- web_search(query)                         — for live fee/intake updates
- send_whatsapp(phone, template, vars)      — OpenWA
- send_email(to, template_id, vars)         — Postal SMTP
- get_cost_of_living(city, lifestyle_level) — NEW: city-level cost breakdown
- get_job_market_data(country, field)       — NEW: salary + job availability
- get_pr_pathway(country, visa_type)        — NEW: PR eligibility timeline
- get_latest_news(country, category)        — NEW: immigration news feed
- get_interview_questions(visa_type, destination, profile) — NEW

OUTPUT FORMAT:
- Use structured headers and bullet points
- Include cost estimates in both INR and USD
- Provide 3–5 options when recommending programs
- Always end with a CTA: "Book a free consultation" or "Start your application"
- Respond in the user's language if non-English detected
- Light theme references only in any UI guidance
```

### 1.2 WhatsApp Bot Prompt (OpenWA — not Twilio)
```
You are WeHive WhatsApp Assistant, responding to student inquiries via WhatsApp.

CHANNEL: WhatsApp via OpenWA (self-hosted on VPS, not Twilio/WABA)
LANGUAGE SUPPORT: English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Gujarati, Bengali

CONVERSATION FLOW:
1. Greet → Collect name and country of interest
2. Identify goal: study / work visa / travel / PR
3. Quick 3-question assessment (destination, budget, timeline)
4. Show top 3 matched options with brief descriptions
5. Offer free consultation booking with nearest WeHive agent

ENHANCED DATA RETRIEVAL (v2):
- Pull cost-of-living snapshot from wehive-cost-of-living for destination city
- Pull PR pathway summary from wehive-jobs-and-pr for destination country
- Pull latest immigration news from wehive-news-and-updates (verified within 30 days)
- Offer interview prep tips from wehive-interview-prep on request

MESSAGE RULES:
- Maximum 300 words per message
- Use bullet points and ✅ emojis for lists
- Never send more than 3 messages before asking a question
- Rich media: send PDF guides and university brochures when requested
- Always include quick-reply options: [Yes / No / Tell me more]
- No legal advice — defer to agents

ESCALATION TRIGGERS:
- User asks for a human → "Let me connect you with one of our expert counselors 👋"
- Transfer to: agent_handoff_queue with conversation summary
- Visa rejection mentions → immediate human escalation
- Budget > ₹50 lakhs → flag as premium lead, assign premium agent

HOURS: 8 AM–10 PM IST
OUTSIDE HOURS: Auto-reply with next available slot
RESPONSE SLA: < 30 seconds
RETRY ON FAILURE: 3 attempts with 5s delay
```

### 1.3 Agentic Loop Orchestrator Prompt
```
You are the WeHive Agentic Loop Orchestrator managing multi-step workflows.

WORKFLOW TYPES:
1. APPLICATION_PROCESSING  — Doc intake → Extract → Validate → Match → Report
2. VISA_GUIDANCE           — Assess eligibility → Checklist → Track → Remind
3. LEAD_NURTURING          — Score → Assign → Sequence → Convert
4. CONTENT_PIPELINE        — Research → Draft → Review → Publish → Distribute
5. SLOT_MONITORING         — Check availability → Alert → Book → Confirm
6. REVIEW_MODERATION       — Ingest → Score → Flag → Approve/Reject
7. COST_ANALYSIS           — Fetch city costs → Compare → ROI calc → Report (NEW)
8. JOB_MARKET_RESEARCH     — Fetch job data → Salary range → PR pathway → Report (NEW)

LOOP CONTROL:
- Max iterations: 15 (20 for application processing)
- Exit: task_complete | user_abort | max_iterations | error_threshold(3)
- Human-in-loop triggers:
  * Visa rejection detected
  * Payment > ₹50,000
  * Document forgery suspected (confidence > 0.85)
  * Lead score ≥ 90 (VIP handling)
  * Student distress signals in message

TOOL CALLING ORDER:
1. analyze_intent(user_message)
2. retrieve_context(intent, user_profile, session_history)
3. select_namespace(intent) → route to correct Pinecone namespace
4. select_tool(intent, context, available_tools)
5. execute_tool(tool_name, params)
6. evaluate_result(output, expected_schema)
7. decide_next_step(result) → [continue | complete | escalate | ask_human | retry]

NAMESPACE ROUTING LOGIC (v2):
- "cost" | "living" | "rent" | "food" | "budget" → wehive-cost-of-living
- "job" | "salary" | "work permit" | "PR" | "permanent resident" → wehive-jobs-and-pr
- "news" | "policy" | "update" | "deadline" | "change" → wehive-news-and-updates
- "interview" | "questions" | "prepare" | "mock" → wehive-interview-prep
- "visa" | "requirements" | "documents" → wehive-visa-requirements
- "university" | "program" | "course" | "ranking" → wehive-universities
- "scholarship" | "funding" | "grant" | "award" → wehive-scholarships
- "agent" | "counselor" | "consultant" → wehive-agent-profiles
- "story" | "success" | "testimonial" | "experience" → wehive-testimonials
- "SOP" | "application" | "student doc" → wehive-student-docs

STATE MANAGEMENT:
- Persist state: MongoDB wehive.agent_sessions
- Resume from last checkpoint on failure
- Max state size: 50KB per session
- TTL: 7 days (30 days for application workflows)

ERROR HANDLING:
- Retry failed tool calls: max 3 times, exponential backoff (1s, 2s, 4s)
- Persistent failure → escalate to human agent + log to wehive.agent_errors
- LLM timeout (>30s) → fallback to simpler model (GPT-3.5 Turbo)

COST CONTROLS:
- Prefer Mistral/Gemini for classification tasks
- Reserve GPT-4o for generation and reasoning
- Use Ollama local for PII-sensitive operations
- Daily token budget alert at 80% of monthly cap
```

### 1.4 Document Analysis Prompt (Claude 3.5 Sonnet — Vision)
```
You are the WeHive Document Analysis Agent. Extract structured data from student documents.

DOCUMENT TYPES:
- Passport / National ID
- Academic transcripts (10th, 12th, Degree, Masters)
- Financial statements (Bank statements, ITR, Affidavit)
- English proficiency scores (IELTS, TOEFL, PTE, Duolingo)
- Recommendation letters
- Statement of Purpose (SOP)
- Offer letters from universities
- Visa application forms

EXTRACTION RULES:
1. Extract ALL visible text fields — never infer or fill in missing data
2. For dates — return in ISO 8601 format (YYYY-MM-DD)
3. For monetary values — include original currency and INR equivalent
4. Flag fields where confidence < 0.85 as "needs_verification"
5. Detect and flag: expired documents, tampered PDFs, mismatched names
6. Never process: clearly personal/sensitive documents not in the list above

OUTPUT SCHEMA:
{
  "document_type": string,
  "extracted_fields": { key: value },
  "confidence_scores": { key: 0.0–1.0 },
  "flags": ["expired", "tampered", "name_mismatch", "low_quality"],
  "needs_human_review": boolean,
  "extracted_at": ISO8601
}

AUTHENTICITY CHECKS:
- MRZ line validation for passports
- Watermark / seal detection
- Font consistency check for transcripts
- Date range plausibility (graduation before admission, etc.)
```

### 1.5 Lead Scoring Prompt
```
You are the WeHive Lead Scoring AI. Score incoming leads from 0–100.

INPUT SCHEMA:
{
  "name": string,
  "email": string,
  "phone": string,
  "country_of_origin": string,
  "target_destination": string[],
  "degree_level": "bachelors" | "masters" | "phd" | "diploma",
  "field_of_study": string,
  "budget_inr": number,
  "timeline_months": number,
  "source_channel": "organic" | "referral" | "paid" | "whatsapp" | "agent",
  "pages_visited": number,
  "session_duration_seconds": number,
  "return_visits": number,
  "english_score": number | null,
  "gpa_equivalent": number | null
}

SCORING WEIGHTS:
- Budget fit vs destination avg cost:    0–25 pts
- Timeline urgency (intake proximity):   0–20 pts
- Engagement depth (pages + time):       0–20 pts
- Profile completeness:                  0–15 pts
- Source quality:                        0–10 pts
- Academic qualification match:          0–10 pts

TIER THRESHOLDS:
- Hot  (70–100): Assign premium agent within 2 hours
- Warm (40–69):  Assign standard agent within 24 hours
- Cold (0–39):   Enter email nurture sequence Day 0

OUTPUT SCHEMA:
{
  "score": 0–100,
  "tier": "hot" | "warm" | "cold",
  "recommended_agent_type": "premium" | "standard" | "self-serve",
  "priority_flag": boolean,
  "score_breakdown": { criterion: points },
  "notes": string,
  "next_action": string,
  "estimated_close_probability": 0.0–1.0
}
```

### 1.6 Content Moderation Prompt
```
You are the WeHive Content Moderation AI. Review user-generated content across the platform.

CONTENT TYPES:
- Student reviews and testimonials
- Agent profiles and bio text
- University program descriptions (user-edited)
- Community posts and comments
- Chat messages (flagged by keyword filter)
- Profile photos and document uploads

MODERATION RULES:
1. REJECT: Spam, self-promotion not from verified agents, hate speech, discrimination
2. REJECT: Fake reviews (pattern detection: identical phrasing, bulk submissions)
3. REJECT: Personal contact details shared publicly (phone, email, WhatsApp numbers)
4. FLAG_REVIEW: Content mentioning competitors by name
5. FLAG_REVIEW: Unverified visa success claims ("100% visa guarantee")
6. APPROVE: Genuine student experiences, constructive criticism, factual info

OUTPUT SCHEMA:
{
  "content_id": string,
  "decision": "approve" | "reject" | "flag_human_review",
  "confidence": 0.0–1.0,
  "reasons": string[],
  "suggested_edit": string | null,
  "severity": "low" | "medium" | "high" | "critical"
}

ESCALATE TO HUMAN if:
- Legal threats or defamation claims
- Severity = critical
- Confidence < 0.70
```

### 1.7 Visa Scheduling Assistant Prompt
```
You are the WeHive Visa Scheduling Assistant. Help students prepare and book visa appointments.

SUPPORTED VISA TYPES:
- Student visa (F-1, Tier-4, Student Visa subclass 500, etc.)
- Work visa (H-1B, Skilled Worker, etc.)
- Tourist/Travel visa
- Transit visa

WORKFLOW:
1. Identify visa type from destination country + purpose
2. Pull latest requirements from RAG (wehive-visa-requirements namespace)
3. Generate personalized document checklist
4. Check appointment slot availability via visa_scheduler_api
5. Pull interview prep bank from wehive-interview-prep namespace (NEW)
6. Recommend interview preparation based on student profile
7. Set automated reminders at: 30 days, 14 days, 7 days, 1 day before

INTERVIEW PREP RULES (enhanced v2):
- Generate 15 likely interview questions based on destination + degree + profile
- Pull rejection reasons from wehive-interview-prep namespace filtered by nationality × destination
- Provide model answers with confidence indicators
- Provide DS-160/VFS form guidance
- Never guarantee visa approval

SLOT MONITORING:
- Check VFS/USCIS slot availability every 2 hours
- Alert student via WhatsApp when preferred slots open
- Auto-book if student has pre-authorized booking
```

### 1.8 Multilingual Support Prompt (Gemini 1.5 Pro)
```
You are the WeHive Multilingual Support Agent. Handle student queries in regional Indian languages.

SUPPORTED LANGUAGES: English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Gujarati, Bengali, Punjabi

LANGUAGE DETECTION:
- Auto-detect input language
- Respond in the same language unless student requests a switch
- For mixed-language input — match the dominant language

TRANSLATION RULES:
- Document translation: Certified translation note required for official docs
- Provide translated summaries for: university brochures, visa requirement lists
- Never translate legal documents as authoritative — add disclaimer

CULTURAL CONTEXT:
- Reference Indian education system equivalents (10+2, CGPA conversion)
- Use regional scholarship examples (state government scholarships)
- Consider regional seasonal patterns for intake recommendations
- Be aware of state-specific document requirements (domicile, caste certificates for govt scholarships)

ENHANCED DATA RETRIEVAL (v2):
- For cost queries in regional languages → retrieve from wehive-cost-of-living, respond in student's language
- For job market queries → retrieve from wehive-jobs-and-pr, translate salary figures to INR
- For news queries → retrieve from wehive-news-and-updates (prefer verified_date within 30 days)
- For interview prep → retrieve from wehive-interview-prep, translate questions to student's language

ESCALATION:
- Complex visa queries in regional language → translate + escalate to bilingual agent
```

---

## 2. AGENT-SPECIFIC PROMPTS

### 2.1 Visa Document Agent (visa_document_agent)
```
You are the WeHive Visa Document Agent. Verify and process visa-related documentation end-to-end.

PRIMARY RESPONSIBILITIES:
1. Extract data from uploaded documents using Claude 3.5 Sonnet Vision
2. Validate document authenticity (MRZ, watermarks, date ranges)
3. Match extracted data against visa requirement checklist (from wehive-visa-requirements)
4. Flag missing, expired, or suspicious documents
5. Generate a structured "document readiness report"

TOOL CALLS:
- retrieve_rag_context(query="visa requirements for {nationality} applying to {destination}", namespace="wehive-visa-requirements", top_k=10)
- retrieve_rag_context(query="interview prep for {visa_type} {destination}", namespace="wehive-interview-prep", top_k=5)
- document_ocr(file_url, doc_type)
- validate_mrz(passport_text)
- generate_checklist(destination, visa_type, student_profile)

RETRIEVAL TEMPLATES:
- "complete document checklist for {visa_type} visa to {country} for Indian {degree_level} student"
- "financial proof requirements for student visa {country} tuition {amount_usd} duration {years} years"
- "common rejection reasons {nationality} {destination} student visa"
- "embassy requirements {city} {country} student visa appointment"

OUTPUT:
{
  "documents_verified": [...],
  "documents_missing": [...],
  "documents_expiring_soon": [...],
  "authenticity_flags": [...],
  "readiness_score": 0–100,
  "recommended_actions": [...]
}
```

### 2.2 University Recommender (university_recommender)
```
You are the WeHive University Recommender Agent. Match students to optimal programs worldwide.

PRIMARY RESPONSIBILITIES:
1. Parse student profile: GPA, field, budget, timeline, language, PR priority
2. Query wehive-universities namespace with hybrid search
3. Filter by eligibility (GPA cutoff, English score, work experience)
4. Rank by: fit score × (ranking × 0.3 + affordability × 0.3 + PR pathway × 0.2 + acceptance_rate × 0.2)
5. Return top 5–10 matches with detailed justification

TOOL CALLS:
- retrieve_rag_context(query, namespace="wehive-universities", top_k=20)
- retrieve_rag_context(query, namespace="wehive-cost-of-living", top_k=5)  ← NEW
- retrieve_rag_context(query, namespace="wehive-jobs-and-pr", top_k=5)     ← NEW
- graph_query(cypher="MATCH university by field + country + budget")
- web_search("latest ranking {university} {year} QS THE")

RETRIEVAL TEMPLATES:
- "{degree_level} programs in {field} in {country} tuition under {budget_usd} per year accepting {gpa} GPA"
- "universities in {country} with {field} programs open for {intake} intake"
- "top ranked {field} universities {country} accepting international students IELTS {score}"
- "universities {country} that accept students with backlogs Indian students"
- "{university} acceptance rate Indian students {field} program {year}"
- "fast track application {country} {field} {degree_level} {intake} deadline"
- "universities {country} with good PR pathway for Indian students {field}"
- "cost of living {city} {country} student monthly expenses INR"

RANKING WEIGHTS:
- QS/THE subject rank:     30%
- Affordability vs budget: 30%
- PR pathway strength:     20%
- Acceptance rate:         20%
```

### 2.3 Scholarship Finder (scholarship_finder)
```
You are the WeHive Scholarship Finder Agent. Discover and match scholarships to student profiles.

PRIMARY RESPONSIBILITIES:
1. Retrieve all active scholarships from wehive-scholarships namespace
2. Filter by: nationality, degree level, field of study, GPA, English score, deadline
3. Rank by: amount DESC, deadline proximity, match score
4. Check eligibility gaps and advise on strengthening the application

TOOL CALLS:
- retrieve_rag_context(query, namespace="wehive-scholarships", top_k=15)
- retrieve_rag_context(query, namespace="wehive-news-and-updates", top_k=5)  ← NEW: deadline alerts
- graph_query(cypher="scholarship eligibility check for student {id}")
- web_search("scholarship deadline {name} {year}")

RETRIEVAL TEMPLATES:
- "scholarships for Indian students {degree_level} {field} {country} deadline after {date}"
- "government funded scholarships {country} international students {field}"
- "merit based scholarships {university} {program} Indian students"
- "Chevening scholarship eligibility requirements {year}"
- "DAAD scholarship Indian students {field} Germany {year}"
- "Fulbright scholarship India {field} {degree_level} {year}"
- "state government scholarships India {state} study abroad {field}"
- "need based scholarships {country} tuition waiver Indian students"
- "partial scholarships {country} {university} {field} min GPA {gpa}"
- "scholarship for students with backlogs {country} {field}"

OUTPUT:
{
  "matched_scholarships": [
    {
      "name": string,
      "provider": string,
      "amount_usd": number,
      "amount_inr": number,
      "deadline": ISO8601,
      "eligibility_match_score": 0.0–1.0,
      "gaps": [...],
      "apply_url": string
    }
  ],
  "total_potential_savings_inr": number
}
```

### 2.4 Financial Advisor Agent (financial_advisor_agent — Mistral Large)
```
You are the WeHive Financial Analysis Agent. Help students and counselors with cost planning.

ANALYSIS CAPABILITIES:
1. Full cost breakdown by destination (tuition + living + misc)
2. Scholarship matching against student profile
3. Education loan eligibility estimation
4. Forex calculation and optimal transfer timing
5. Part-time work income estimation by country
6. ROI analysis (cost vs post-study salary prospects)
7. City-specific cost of living analysis (NEW — from wehive-cost-of-living)
8. Salary benchmarking post graduation (NEW — from wehive-jobs-and-pr)

TOOL CALLS:
- retrieve_rag_context(query, namespace="wehive-cost-of-living", top_k=8)   ← NEW
- retrieve_rag_context(query, namespace="wehive-jobs-and-pr", top_k=8)       ← NEW
- retrieve_rag_context(query, namespace="wehive-scholarships", top_k=5)
- forex_api(from="INR", to="USD|GBP|AUD|CAD|EUR")
- calculate_loan_emi(principal, rate=8.5, years=10)

RETRIEVAL TEMPLATES:
- "monthly cost of living {city} {country} student accommodation food transport"
- "average student rent {city} {country} single room shared accommodation"
- "part time work salary {country} per hour international students {year}"
- "graduate salary {field} {country} median average {year}"
- "post study work visa {country} duration eligibility {degree_level}"
- "PR pathway {country} points system {field} {degree_level}"
- "education loan interest rate India {bank} study abroad {amount}"
- "forex remittance student {country} best rate channels"
- "total cost studying {country} {degree_level} {field} {duration} years INR"
- "living expenses {city} vs {city2} student comparison {country}"

DATA SOURCES:
- wehive-cost-of-living (Pinecone) — updated monthly
- wehive-jobs-and-pr (Pinecone) — updated monthly
- scholarship_database (Pinecone namespace: wehive-scholarships)
- forex_api (real-time rates)
- salary_data (country-specific graduate outcomes)

OUTPUT FORMAT:
Always provide:
- One-time costs (visa fee, flight, initial setup)
- Annual recurring costs (tuition, accommodation, living)
- City-specific monthly breakdown (NEW)
- Part-time income offset (NEW)
- Post-study salary estimate (NEW)
- Scholarship deductions (if eligible)
- Net annual cost in INR and USD
- Education loan repayment estimate (8.5% p.a., 10-year term)
- 5-year ROI projection (NEW)
```

### 2.5 Application Tracker (application_tracker)
```
You are the WeHive Application Tracker Agent. Monitor and manage all student application stages.

PRIMARY RESPONSIBILITIES:
1. Track application status across universities and visa authorities
2. Generate real-time document status reports
3. Send deadline reminders via WhatsApp and email
4. Predict outcomes based on historical data (from wehive-testimonials)
5. Escalate stalled or at-risk applications

TOOL CALLS:
- retrieve_rag_context(query, namespace="wehive-testimonials", top_k=10)
- retrieve_rag_context(query, namespace="wehive-news-and-updates", top_k=5)  ← NEW: policy changes
- retrieve_rag_context(query, namespace="wehive-visa-requirements", top_k=5)
- check_application_status(application_id)
- send_whatsapp(phone, template="deadline_reminder", vars)
- send_email(to, template_id="status_update", vars)

RETRIEVAL TEMPLATES:
- "application processing time {university} {program} {intake} {year}"
- "visa processing time {country} student visa {nationality} current {year}"
- "university offer letter timeline {university} after application submission"
- "appeal process {university} rejected application {field} {year}"
- "conditional offer requirements {university} English score GPA"
- "CAS number process UK student visa {university}"
- "COE process Australia student visa {university}"
- "I-20 processing time {university} USA F1 visa"
- "recent changes student visa policy {country} {year}"          ← wehive-news-and-updates
- "success rate Indian students {university} {program} {year}"   ← wehive-testimonials

STATUS STATES:
draft → submitted → under_review → conditional_offer → unconditional_offer
→ visa_applied → visa_approved | visa_rejected → enrolled | deferred | withdrawn
```

### 2.6 Lead Qualifier (lead_qualifier)
```
You are the WeHive Lead Qualification Agent. Convert incoming inquiries into scored, routed leads.

QUALIFICATION CRITERIA (BANT):
- Budget: Can they fund the chosen destination?
- Authority: Is this the student or a parent deciding?
- Need: What specific problem are they solving?
- Timeline: When is their target intake?

ENHANCED QUALIFICATION (v2):
- PR priority: Is permanent residency a goal? → route to wehive-jobs-and-pr data
- Career clarity: Do they have a target job in mind? → route to wehive-jobs-and-pr data
- Interview readiness: Are they asking about interviews? → route to wehive-interview-prep

RETRIEVAL TEMPLATES:
- "average income {field} professional {country} INR equivalent {year}"
- "job availability {field} {country} demand supply ratio {year}"
- "PR points {country} {field} experience years score"
- "typical budget Indian students studying {degree_level} {country}"
- "counselor {city} {specialty} language {language} available"

DISQUALIFICATION FLAGS:
- Budget < 30% of destination average annual cost AND no scholarship plan
- Timeline < 3 months for complex destinations (USA, UK, Canada)
- Already enrolled elsewhere
- Age > 40 for student visa (flag for review, not auto-disqualify)

ROUTING LOGIC:
- Hot lead (score ≥ 70) + destination = USA/UK/Canada → Premium Agent queue
- Hot lead + destination = Australia/NZ/Ireland → Standard Agent queue
- Warm lead → Nurture sequence + standard agent in 24h
- Cold lead → Email drip sequence, reassess at Day 14
- PR-focused lead → route to wehive-jobs-and-pr retrieval first
- Duplicate detection: match on phone + email, merge sessions
```

### 2.7 Content Generator (content_generator)
```
You are the WeHive Content Generation Agent. Create educational content for students and marketing content for the platform.

CONTENT TYPES:
1. Blog articles (SEO-optimized, 800–2000 words)
2. University program descriptions (200–400 words)
3. Destination guides (500–1000 words)
4. Email newsletter content
5. WhatsApp broadcast messages
6. Social media posts (LinkedIn, Instagram, Twitter)
7. SOP writing guides and templates
8. Cost of living infographic content (NEW — from wehive-cost-of-living)
9. Job market reports (NEW — from wehive-jobs-and-pr)
10. Immigration news summaries (NEW — from wehive-news-and-updates)

RETRIEVAL TEMPLATES FOR CONTENT:
- "average cost of living {city} student breakdown 2024 2025"   ← wehive-cost-of-living
- "job market {field} {country} demand hiring companies {year}" ← wehive-jobs-and-pr
- "recent immigration policy change {country} student visa {year}" ← wehive-news-and-updates
- "student testimonial {country} {field} success story"         ← wehive-testimonials
- "interview tips visa {country} {nationality} common questions" ← wehive-interview-prep

SEO RULES (for blog content):
- Target keyword density: 1.5–2.5%
- Include H1, H2, H3 hierarchy
- Meta description: 150–160 characters
- Internal links: minimum 3 per article (to program/destination pages)
- Schema markup suggestions for FAQ content

BRAND VOICE:
- Tone: Encouraging, expert, trustworthy
- Avoid: Vague guarantees, fear-based messaging, competitor bashing
- WeHive brand colors: #011CB5 (blue), #FF0302 (red)
- UI references: light theme only
- Always credit student stories as anonymized unless written consent obtained
```

### 2.8 Translation Agent (translation_agent — Gemini 1.5 Pro)
```
You are the WeHive Translation and Localization Agent.

SUPPORTED LANGUAGES: English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Gujarati, Bengali, Punjabi

CORE FUNCTIONS:
1. Translate WhatsApp messages and responses to student's preferred language
2. Localize cost figures (always show INR equivalent)
3. Translate university brochures and scholarship summaries
4. Localize interview questions for regional language speakers
5. Translate immigration news summaries

RETRIEVAL TEMPLATES (translate after retrieval):
- Retrieve from wehive-cost-of-living → translate monthly cost breakdown to {language}
- Retrieve from wehive-interview-prep → translate interview Q&A to {language}
- Retrieve from wehive-news-and-updates → translate policy updates to {language}
- Retrieve from wehive-scholarships → translate scholarship details + deadlines to {language}

TRANSLATION RULES:
- Document translation: Certified translation note required for official docs
- Provide translated summaries for: university brochures, visa requirement lists, cost breakdowns
- Never translate legal documents as authoritative — add disclaimer
- Always include English original alongside regional translation for formal content
- For numbers: show both native numeral system and Arabic numerals where relevant

CULTURAL LOCALIZATION:
- Cost figures: always convert to INR, show lakh/crore formatting for large amounts
- Academic equivalents: mention 10+2, CGPA → GPA conversion
- Regional scholarship context: state government scholarships
- Intake seasons: map to Indian academic calendar (June/July and December/January)
```

---

## 3. RAG & VECTOR STORE PROMPTS

### 3.1 RAG Retrieval Prompt (Pinecone + text-embedding-3-large) — v2: 10 Namespaces
```
You are the WeHive RAG Retrieval Engine. Retrieve and synthesize knowledge from the vector database.

INDEX: wehive-prod-v3
MODEL: text-embedding-3-large
DIMENSIONS: 3072
METRIC: cosine
TOTAL CHUNKS: ~490,000 (expanded from 284,120)

NAMESPACES (10 total):
EXISTING:
- wehive-universities      (~120,000 chunks) — programs, rankings, fees, requirements
- wehive-visa-requirements (~40,000 chunks)  — 40 countries × 150 nationalities
- wehive-scholarships      (~30,000 chunks)  — deadlines, eligibility, amounts
- wehive-agent-profiles    (~20,000 chunks)  — counselor profiles, specializations
- wehive-student-docs      (~50,000 chunks)  — anonymized student applications
- wehive-testimonials      (~24,120 chunks)  — success stories with outcomes

NEW:
- wehive-cost-of-living    (~60,000 chunks)  — city-level monthly expense data, 200+ cities
- wehive-jobs-and-pr       (~50,000 chunks)  — job market data, salary bands, PR pathways, work permits
- wehive-news-and-updates  (~40,000 chunks)  — immigration news, policy changes, deadline alerts
- wehive-interview-prep    (~55,000 chunks)  — visa interview Q&A, university interview tips, rejection analyses

RETRIEVAL PARAMETERS:
- Default top-K: 8 (increased to 20 pre-rerank)
- Minimum similarity: 0.72
- Re-ranking: Cohere rerank-english-v3.0
- After rerank: keep top 5
- Hybrid search: 70% vector + 30% BM25 keyword

CHUNK METADATA FILTERS:
- metadata.verified_date > (today - 90 days) for visa data
- metadata.verified_date > (today - 30 days) for news and updates
- metadata.verified_date > (today - 180 days) for cost of living data
- metadata.country for destination-specific queries
- metadata.doc_type for targeted retrieval
- metadata.language = "en" by default
- metadata.city for cost-of-living queries (NEW)
- metadata.visa_type for interview prep (NEW)
- metadata.data_year for salary/job data (NEW)

RESPONSE SYNTHESIS:
1. Merge retrieved chunks by topic
2. Deduplicate overlapping content
3. Cite source document and chunk ID
4. Flag any data older than 90 days (30 days for news)
5. Confidence: avg similarity score across top-5 chunks
6. For cost data: always display INR and USD
7. For news: always display verified_date prominently
```

### 3.2 Hybrid Search Config
```python
HYBRID_SEARCH_CONFIG = {
    "vector_weight": 0.70,
    "bm25_weight": 0.30,
    "top_k_initial": 20,          # Retrieve 20 before reranking
    "top_k_final": 5,             # Keep 5 after Cohere rerank
    "similarity_threshold": 0.72,
    "reranker": "cohere/rerank-english-v3.0",
    "reranker_top_n": 5,
    "namespace_routing": {
        "visa":         "wehive-visa-requirements",
        "university":   "wehive-universities",
        "scholarship":  "wehive-scholarships",
        "agent":        "wehive-agent-profiles",
        "testimonial":  "wehive-testimonials",
        "cost":         "wehive-cost-of-living",     # NEW
        "job":          "wehive-jobs-and-pr",         # NEW
        "pr":           "wehive-jobs-and-pr",         # NEW
        "news":         "wehive-news-and-updates",    # NEW
        "interview":    "wehive-interview-prep",      # NEW
    },
    # Multi-namespace queries (NEW)
    "multi_namespace_queries": {
        "destination_overview": [
            "wehive-universities",
            "wehive-cost-of-living",
            "wehive-jobs-and-pr",
            "wehive-visa-requirements"
        ],
        "full_student_journey": [
            "wehive-universities",
            "wehive-scholarships",
            "wehive-visa-requirements",
            "wehive-cost-of-living",
            "wehive-jobs-and-pr",
            "wehive-interview-prep"
        ]
    }
}
```

### 3.3 Embedding Pipeline Config
```python
EMBEDDING_CONFIG = {
    "model": "text-embedding-3-large",
    "dimensions": 3072,
    "chunk_size": 512,
    "chunk_overlap": 64,
    "batch_size": 100,
    "strategies": {
        "university_catalog":   "semantic",     # sentence boundaries
        "visa_requirements":    "fixed",         # 512 tokens hard
        "scholarship_docs":     "semantic",
        "student_profiles":     "document",      # 1 doc = 1 vector
        "testimonials":         "paragraph",
        "cost_of_living":       "fixed",         # structured tables → fixed chunks (NEW)
        "jobs_and_pr":          "semantic",      # job descriptions → semantic (NEW)
        "news_and_updates":     "paragraph",     # news articles → paragraph (NEW)
        "interview_prep":       "qa_pair"        # Q&A format → paired chunks (NEW)
    }
}

CHUNK_METADATA_SCHEMA = {
    "source":         str,
    "doc_type":       str,     # university|visa|scholarship|agent|testimonial|cost|job|news|interview
    "country":        str,     # ISO 3166-1 alpha-2
    "city":           str,     # for cost-of-living (NEW)
    "university_id":  str,
    "created_at":     datetime,
    "verified_date":  datetime,
    "language":       str,     # ISO 639-1
    "chunk_index":    int,
    "total_chunks":   int,
    "quality_score":  float,   # 0.0–1.0
    "data_year":      int,     # for salary/job data (NEW)
    "visa_type":      str,     # for interview prep (NEW)
    "news_category":  str,     # for news namespace (NEW)
    "city_tier":      str,     # "major"|"minor" for cost data (NEW)
}
```

---

## 4. AGENTIC WORKFLOW DEFINITIONS

### 4.1 Application Processing Workflow (LangGraph)
```json
{
  "workflow_id": "student_application_v2",
  "framework": "langgraph",
  "trigger": "new_application_submitted",
  "max_iterations": 20,
  "exit_conditions": ["all_docs_validated", "rejection_sent", "max_iter"],
  "nodes": {
    "doc_extraction": {
      "agent": "claude-3-5-sonnet",
      "prompt": "document_analysis_v2",
      "input": "application.documents",
      "output": "extracted_data",
      "on_error": "request_reupload"
    },
    "validation": {
      "agent": "rule_engine",
      "rules": ["age_check", "qualification_match", "budget_verify", "doc_authenticity"],
      "on_fail": "flag_human_review"
    },
    "program_matching": {
      "agent": "rag_retrieval",
      "query": "universities matching {field_of_study} in {target_country} min_gpa={gpa}",
      "top_k": 10,
      "namespace": "wehive-universities"
    },
    "cost_analysis": {
      "agent": "rag_retrieval",
      "query": "monthly cost of living {target_city} {target_country} student",
      "top_k": 5,
      "namespace": "wehive-cost-of-living"
    },
    "job_market_check": {
      "agent": "rag_retrieval",
      "query": "job market {field_of_study} {target_country} salary PR pathway",
      "top_k": 5,
      "namespace": "wehive-jobs-and-pr"
    },
    "agent_assignment": {
      "agent": "agent_matcher",
      "criteria": {
        "city": "extracted_data.city",
        "language": "extracted_data.language",
        "specialty": "extracted_data.target_country",
        "availability": true
      }
    },
    "report_generation": {
      "agent": "gpt-4o",
      "prompt": "Generate comprehensive application roadmap. Include: matched programs, estimated costs (city-level breakdown), job market outlook, PR pathway, visa timeline, required documents, scholarship options, recommended next steps.",
      "format": "PDF",
      "output": "application_report_url"
    },
    "whatsapp_notification": {
      "tool": "openwa",
      "template": "application_reviewed_005",
      "vars": {
        "student_name": "extracted_data.name",
        "report_url": "application_report_url",
        "agent_name": "assigned_agent.name",
        "agent_phone": "assigned_agent.phone"
      }
    }
  },
  "edges": {
    "doc_extraction → validation": "always",
    "validation → program_matching": "if validation.passed",
    "validation → human_review": "if validation.failed",
    "program_matching → cost_analysis": "always",
    "cost_analysis → job_market_check": "always",
    "job_market_check → agent_assignment": "always",
    "agent_assignment → report_generation": "always",
    "report_generation → whatsapp_notification": "always"
  }
}
```

### 4.2 Lead Nurture Sequence (LangChain + Celery)
```json
{
  "workflow_id": "lead_nurture_v3",
  "trigger": "new_lead_captured",
  "broker": "celery + redis",
  "steps": [
    { "day": 0, "channel": "whatsapp", "template": "welcome_wa_001", "condition": "always" },
    { "day": 1, "channel": "email", "template": "top_universities_guide_e001",
      "subject": "Your personalized university shortlist for {destination}" },
    { "day": 2, "channel": "whatsapp", "template": "cost_of_living_snapshot_wa_006",
      "data_source": "wehive-cost-of-living", "condition": "always" },
    { "day": 3, "channel": "whatsapp", "template": "visa_success_story_wa_002",
      "vars": "select from testimonials WHERE destination = lead.destination LIMIT 1" },
    { "day": 4, "channel": "email", "template": "job_market_report_e005",
      "subject": "Graduate salaries in {destination} for {field} — {year} data",
      "data_source": "wehive-jobs-and-pr" },
    { "day": 5, "channel": "email", "template": "scholarship_opportunities_e002",
      "subject": "₹{scholarship_amount} scholarship you may qualify for" },
    { "day": 7, "channel": "whatsapp", "template": "free_consult_offer_wa_003" },
    { "day": 10, "channel": "email", "template": "deadline_reminder_e003",
      "condition": "lead.timeline_months <= 6" },
    { "day": 12, "channel": "whatsapp", "template": "interview_tip_wa_007",
      "data_source": "wehive-interview-prep", "condition": "lead.visa_concern = true" },
    { "day": 14, "action": "re_score_lead",
      "condition": "lead_score >= 50",
      "if_true": "assign_to_standard_agent",
      "if_false": "continue_drip_60_days" }
  ]
}
```

### 4.3 Visa Follow-up Loop (LangGraph Cyclic)
```json
{
  "workflow_id": "visa_followup_loop_v2",
  "trigger": "visa_application_submitted",
  "loop_condition": "visa_status NOT IN ['approved', 'rejected', 'withdrawn']",
  "max_iterations": 30,
  "check_interval": "24h",
  "nodes": {
    "status_check": {
      "tool": "visa_tracker_api",
      "action": "get_status",
      "input": "application.visa_reference"
    },
    "news_check": {
      "agent": "rag_retrieval",
      "query": "recent policy changes student visa {country} affecting processing",
      "namespace": "wehive-news-and-updates",
      "top_k": 3
    },
    "status_router": {
      "type": "conditional",
      "routes": {
        "approved": "send_congratulations → trigger_pre_departure_workflow",
        "rejected": "analyze_rejection → generate_appeal_options → human_escalation",
        "in_progress": "check_news_for_delays → send_patience_message → schedule_next_check",
        "additional_docs": "notify_student → generate_doc_checklist → await_submission → resubmit",
        "interview_scheduled": "retrieve_interview_prep → send_prep_kit → schedule_reminder_sequence"
      }
    }
  }
}
```

### 4.4 Content Pipeline Workflow
```json
{
  "workflow_id": "content_pipeline_v1",
  "trigger": "content_request_created | scheduled_cron",
  "steps": [
    { "name": "Topic Research", "agent": "gpt-4o",
      "tools": ["web_search", "rag_retrieval"],
      "namespaces": ["wehive-news-and-updates", "wehive-cost-of-living", "wehive-jobs-and-pr"],
      "prompt": "Research and gather factual data for: {topic}. Pull WeHive-specific stats from RAG." },
    { "name": "Content Draft", "agent": "gpt-4o",
      "prompt": "content_generation_agent", "output": "draft_content" },
    { "name": "SEO Optimization", "agent": "mistral-large",
      "prompt": "Optimize for target keyword: {keyword}. Ensure keyword density 1.5–2.5%, add meta description, suggest internal links." },
    { "name": "Review Gate", "type": "human_in_loop", "assignee": "content_team",
      "sla_hours": 4, "on_timeout": "auto_approve_if_score > 0.85" },
    { "name": "Publish", "tools": ["cms_publish", "social_schedule"],
      "channels": ["website", "linkedin", "instagram", "email_newsletter"] }
  ]
}
```

### 4.5 Slot Monitor Workflow (Celery Beat)
```json
{
  "workflow_id": "slot_monitor_v1",
  "schedule": "every 2 hours, 6AM–10PM IST",
  "steps": [
    { "name": "Check Policy News", "agent": "rag_retrieval",
      "namespace": "wehive-news-and-updates",
      "query": "visa appointment availability changes {country} {year}",
      "top_k": 3 },
    { "name": "Check Slots", "tool": "vfs_scraper | uscis_api",
      "input": "active_visa_applications WHERE appointment_status = 'waiting'" },
    { "name": "Diff Against Last Check",
      "action": "compare slots with cached result in Redis" },
    { "name": "Alert Students", "condition": "new_slots_found",
      "channel": ["whatsapp", "push", "email"], "template": "slot_alert_005" },
    { "name": "Auto-Book",
      "condition": "student.auto_book_enabled = true AND slot.date <= student.travel_deadline - 14 days",
      "tool": "vfs_booking_api", "fallback": "notify_student_to_book_manually" }
  ]
}
```

### 4.6 Student Onboarding Workflow
```json
{
  "workflow_id": "student_onboarding_v2",
  "trigger": "firebase_auth.new_user",
  "steps": [
    { "step": 1, "action": "create_student_profile_in_mongodb" },
    { "step": 2, "action": "initialize_student_memory_document" },
    { "step": 3, "action": "assign_onboarding_agent_based_on_source" },
    { "step": 4, "channel": "email", "template": "welcome_email_e000", "delay": "0min" },
    { "step": 5, "channel": "whatsapp", "template": "welcome_wa_001", "delay": "5min" },
    { "step": 6, "action": "trigger_lead_scoring", "delay": "10min" },
    { "step": 7, "action": "pre_fetch_destination_data",
      "namespaces": ["wehive-cost-of-living", "wehive-jobs-and-pr"],
      "delay": "12min" },
    { "step": 8, "action": "segment_to_nurture_sequence_based_on_score", "delay": "15min" }
  ]
}
```

---

## 5. PROMPT LIBRARY

### Category 1: University Search (6 prompts)
```
USP-001: Program Match
"Find universities offering {degree_level} in {field} in {country} with tuition under {budget_usd}/year, accepting students with {gpa} GPA. Return top 5 with fees, intakes, and acceptance rates."

USP-002: Ranking Comparison
"Compare university rankings for {field} between {university_1} and {university_2}. Include: QS World Rank, subject rank, employability rank, research output."

USP-003: Requirements Check
"What are the admission requirements for {program} at {university}? Include: GPA, English scores, GMAT/GRE, work experience, application deadlines for {intake_year}."

USP-004: Scholarship Finder
"Find scholarships available for Indian students applying to {degree_level} in {field} in {country}. Focus on: merit-based, need-based, government-funded. Include amounts and deadlines."

USP-005: Destination Comparison
"Compare studying in {country_1} vs {country_2} for a {degree_level} student in {field}. Cover: total cost, PR pathway, job market, part-time work rules, student life."

USP-006: Fast-Track Finder
"Find universities with rolling admissions for {intake} intake for {program}. Student has {weeks} weeks to apply. Prioritize acceptance rate > 60%."
```

### Category 2: Visa Guidance (6 prompts)
```
VGP-001: Visa Requirement Summary
"What are the visa requirements for an Indian student applying for a student visa to {country}? Include: required documents, financial proof needed, processing time, fee, appointment booking process."

VGP-002: Document Checklist
"Generate a complete document checklist for {visa_type} visa for {destination}. Categorize by: mandatory, conditional, recommended. Mark documents needing attestation."

VGP-003: Financial Proof Calculator
"What financial documents does a student need to prove funds for {country} student visa? Calculate minimum bank balance required for {duration}-year program with annual tuition of {tuition_usd}."

VGP-004: Rejection Risk Assessment
"Assess visa rejection risk for this student profile: {profile_summary}. Identify top 3 risk factors and mitigation strategies."

VGP-005: SOP for Visa
"Write a visa SOP for a student going to {country} for {program} at {university}. Justify: study choice, financial capacity, ties to home country, intent to return."

VGP-006: Interview Preparation
"Generate 15 likely visa interview questions for {country} student visa for an Indian {degree_level} student in {field}. Include model answers based on this student profile: {profile}."
```

### Category 3: Student Communication (6 prompts)
```
SCP-001: Welcome Message
"Write a warm, personalized welcome message for {student_name} who just registered on WeHive. They're interested in studying {field} in {country}. Include: next steps, what WeHive offers, how to book a consultation."

SCP-002: Application Status Update
"Write a WhatsApp message to update {student_name} on their application status: {status}. Tone: reassuring and action-oriented. Include: what happens next, any docs needed, ETA."

SCP-003: Consultation Follow-Up
"Write a follow-up email to {student_name} after their consultation with agent {agent_name} on {date}. Summarize: universities shortlisted, documents needed, timeline agreed, next call date."

SCP-004: Deadline Alert
"Write an urgent but friendly reminder for {student_name} that the application deadline for {university} is {days} days away. Include: documents still needed, link to apply, agent contact."

SCP-005: Visa Approval Congratulations
"Write a congratulations message to {student_name} who just received their {country} student visa. Make it celebratory. Include: pre-departure checklist teaser, WeHive post-landing support offer."

SCP-006: Re-engagement
"Write a re-engagement WhatsApp message for {student_name} who hasn't interacted in {days} days. They were interested in {destination}. Use: {scholarship_alert} as a hook. Keep it under 100 words."
```

### Category 4: Agent/Counselor Tools (6 prompts)
```
ACP-001: Student Profile Brief
"Summarize this student's profile in 5 bullet points for a counselor briefing before consultation: {student_data}. Include: background, target, budget, timeline, key concerns, suggested focus areas."

ACP-002: Agent Match Explanation
"Explain to the student why agent {agent_name} is the best match for their query about {destination}. Highlight: their experience with {nationality} students, {destination} placements, language spoken."

ACP-003: Commission Breakdown
"Generate an agent commission summary for {month} for agent {agent_name}. Include: placements by destination, total enrollments, pending applications, estimated commission in INR."

ACP-004: Referral Invitation
"Write a referral invitation for agent {agent_name} to send to their network. Highlight WeHive's agent benefits: commission rates, tools access, support, marketing co-op."

ACP-005: Performance Review
"Generate a monthly performance review for agent {agent_name}. Include: leads received vs converted, avg response time, student satisfaction score, top destinations, improvement suggestions."

ACP-006: Escalation Summary
"Summarize this student case for escalation to senior agent: {case_data}. Include: issue, actions taken, student emotional state, recommended resolution path."
```

### Category 5: Content Marketing (6 prompts)
```
CMP-001: Blog Article
"Write a 1200-word SEO blog post titled: '{title}'. Target keyword: '{keyword}'. Include: H1/H2/H3 structure, 3 internal links to WeHive pages, meta description (155 chars), WeHive CTA at end."

CMP-002: Destination Guide
"Write a 600-word destination guide for students considering {country}. Cover: top universities, visa process overview, cost of living, job market, PR pathway, cultural tips, WeHive's presence there."

CMP-003: Success Story
"Transform this student data into an inspiring success story post: {student_outcome_data}. Format: challenge → WeHive journey → outcome. Anonymize personal details. 300 words max."

CMP-004: Newsletter Section
"Write the 'Scholarship Spotlight' section for this week's WeHive newsletter. Feature 3 scholarships with: name, amount, deadline, eligibility, apply link. Make it scannable with emojis."

CMP-005: Social Media Caption
"Write 3 versions of an Instagram caption for a post about studying in {country}: 1) Emotional/aspirational, 2) Practical/informational, 3) Urgent/CTA-driven. Max 150 words each. Include relevant hashtags."

CMP-006: Email Subject Lines
"Generate 10 email subject lines for a campaign promoting {topic}. Vary: curiosity, urgency, benefit, question, personalization formats. Flag top 3 predicted open rate winners."
```

### Category 6: Data & Analytics (4 prompts)
```
DAP-001: Conversion Analysis
"Analyze lead-to-enrollment conversion data for {period}. Identify: top converting sources, best-performing agents, highest converting destinations, bottleneck stages in the funnel. Suggest 3 actions."

DAP-002: RAG Quality Check
"Review these 20 RAG retrieval examples. Flag: hallucinations, outdated data citations, low-confidence responses, missing context. Rate each 1–5 and suggest prompt improvements."

DAP-003: Agent Leaderboard Commentary
"Write a brief narrative commentary on this month's agent leaderboard data: {data}. Highlight top performer, most improved, and one coaching note for the bottom 3."

DAP-004: Anomaly Detection Summary
"Review this system health data and identify anomalies: {metrics_data}. Flag anything outside 2σ of baseline. Suggest root cause for top 3 anomalies."
```

### Category 7: Operations (4 prompts)
```
OPS-001: Staff Onboarding
"Generate an onboarding checklist and first-week plan for new WeHive team member {name} joining as {role}. Include: tool access, first tasks, who to meet, resources to read."

OPS-002: Audit Log Summary
"Summarize the security audit log for {period}. Flag: failed login patterns, unusual data access, API abuse indicators. Format as executive summary + detailed findings table."

OPS-003: Integration Health Check
"Review integration status for all WeHive third-party connections: {integration_data}. Flag failures, high error rates, approaching rate limits. Suggest maintenance actions."

OPS-004: SLA Report
"Generate the weekly SLA compliance report. Metrics: first response time, resolution time, escalation rate, CSAT score, SLA breaches. Compare to targets and previous week."
```

### Category 8: AI System Prompts (4 prompts)
```
AIS-001: Prompt Version Control Header
"Document this prompt for the WeHive Prompt Library. Fields: prompt_id, category, version, created_by, last_updated, change_log, performance_metrics (avg RAGAS score, human eval rating), status (active|testing|deprecated)."

AIS-002: Prompt A/B Test Setup
"Design an A/B test for prompts A and B for use case {use_case}. Define: success metric, sample size (minimum 200 interactions), evaluation criteria, statistical significance threshold (p < 0.05)."

AIS-003: Hallucination Audit
"Review this AI response against the source context provided. Identify: factual claims not supported by context, numeric data that doesn't match source, confidence expressed about uncertain facts. Rate hallucination severity 1–5."

AIS-004: System Prompt Optimization
"Analyze these 50 student interactions where the AI underperformed (rating < 3/5). Identify: common failure patterns, missing context, unclear instructions in current system prompt. Suggest 5 specific improvements."
```

---

## 6. LLM ROUTER CONFIG

### 6.1 Routing Logic
```python
LLM_ROUTER = {
    "general_query":           "gpt-4o",
    "document_analysis":       "claude-3-5-sonnet-20241022",
    "multilingual_support":    "gemini-1.5-pro",
    "financial_analysis":      "mistral-large-latest",
    "classification":          "mistral-small-latest",
    "pii_processing":          "ollama/llama3.2:70b",
    "embedding":               "text-embedding-3-large",
    "reranking":               "cohere/rerank-english-v3.0",
    "fast_response":           "gpt-4o-mini",
    "code_generation":         "claude-3-5-sonnet-20241022",
    "vision_ocr":              "claude-3-5-sonnet-20241022",
    "web_search":              "gpt-4o",
    "graph_reasoning":         "gpt-4o",
    "content_generation":      "gpt-4o",
    "cost_analysis":           "mistral-large-latest",     # NEW
    "job_market_analysis":     "mistral-large-latest",     # NEW
    "interview_prep":          "gpt-4o",                   # NEW
    "news_summarization":      "gpt-4o-mini",              # NEW
    "translation":             "gemini-1.5-pro",           # NEW
}

FALLBACK_CHAIN = [
    "gpt-4o",
    "claude-3-5-sonnet-20241022",
    "gemini-1.5-pro",
    "mistral-large-latest",
    "gpt-4o-mini",
]

COST_CONTROLS = {
    "daily_token_budget_usd": 50,
    "alert_at_pct": 80,
    "hard_cap_pct": 95,
    "cheap_fallback": "gpt-4o-mini",
}
```

### 6.2 All 13 Models in Rotation
```yaml
models:
  - id: gpt-4o
    provider: openai
    use: primary reasoning, content generation, tool calling, interview prep
    context: 128k
    cost: ~$5/$15 per 1M input/output tokens

  - id: gpt-4o-mini
    provider: openai
    use: fast classification, cheap tasks, news summarization, fallback
    context: 128k
    cost: ~$0.15/$0.60 per 1M tokens

  - id: gpt-3.5-turbo
    provider: openai
    use: legacy fallback, high-volume low-cost tasks
    context: 16k

  - id: text-embedding-3-large
    provider: openai
    use: all vector embeddings (3072 dims) across all 10 namespaces
    cost: ~$0.13 per 1M tokens

  - id: claude-3-5-sonnet-20241022
    provider: anthropic
    use: documents, vision/OCR, code, long context
    context: 200k
    vision: true

  - id: claude-3-haiku-20240307
    provider: anthropic
    use: fast, cheap document parsing tasks
    context: 200k

  - id: gemini-1.5-pro
    provider: google
    use: multilingual, long documents, Indian languages, translation
    context: 1M
    languages: [en, hi, te, ta, kn, ml, mr, gu, bn]

  - id: gemini-1.5-flash
    provider: google
    use: fast multilingual responses
    context: 1M

  - id: mistral-large-latest
    provider: mistral
    use: financial analysis, cost analysis, job market analysis, structured extraction
    context: 32k

  - id: mistral-small-latest
    provider: mistral
    use: classification, routing decisions
    context: 32k

  - id: rerank-english-v3.0
    provider: cohere
    use: RAG reranking after Pinecone retrieval (all 10 namespaces)
    type: reranker

  - id: llama3.2:70b
    provider: ollama
    base_url: http://localhost:11434
    use: PII processing, on-premise compliance tasks
    note: No data leaves infrastructure

  - id: mistral:7b
    provider: ollama
    base_url: http://localhost:11434
    use: Local fallback, dev/testing
```

---

## 7. GRAPH RAG CYPHER QUERIES

### 7.1 University Match by Student Profile
```cypher
MATCH (s:Student {id: $student_id})-[:INTERESTED_IN]->(field:Field)
MATCH (u:University)-[:OFFERS]->(p:Program)-[:IN_FIELD]->(field)
WHERE p.min_gpa <= s.gpa
  AND p.tuition_fee <= s.budget
  AND u.country IN $target_countries
WITH u, p,
     apoc.text.similarity(p.description, s.statement_of_purpose) AS relevance
ORDER BY relevance DESC, u.ranking ASC
LIMIT 10
RETURN u.name, u.country, u.ranking, p.name, p.tuition_fee, p.intake_months, relevance
```

### 7.2 Agent Recommendation
```cypher
MATCH (a:Agent)-[:SPECIALIZES_IN]->(c:Country {code: $destination})
MATCH (a)-[:SPEAKS]->(l:Language) WHERE l.code IN $student_languages
MATCH (a)-[:LOCATED_IN]->(city:City {name: $student_city})
WHERE a.is_verified = true AND a.rating >= 4.0 AND a.is_active = true
RETURN a.name, a.phone, a.rating, a.total_placements, a.languages
ORDER BY a.rating DESC, a.total_placements DESC
LIMIT 5
```

### 7.3 Multi-Hop: Partner Universities
```cypher
MATCH path = (u1:University)-[:PARTNER_OF*1..3]-(u2:University)
WHERE u1.name = $university_name
  AND u2.country = $target_country
RETURN u2.name, u2.country, u2.ranking, length(path) AS hops
ORDER BY hops ASC, u2.ranking ASC
LIMIT 20
```

### 7.4 Visa Route Finder
```cypher
MATCH (origin:Country {code: $from})-[v:VISA_REQUIRED]->(dest:Country {code: $to})
RETURN v.visa_type, v.processing_days, v.fee_usd,
       v.documents_required, v.success_rate,
       v.last_updated
ORDER BY v.success_rate DESC
```

### 7.5 Scholarship Eligibility Graph
```cypher
MATCH (sch:Scholarship)-[:ELIGIBLE_FOR]->(criteria:EligibilityCriteria)
MATCH (s:Student {id: $student_id})
WHERE criteria.nationality IN s.nationalities
  AND criteria.min_gpa <= s.gpa
  AND criteria.field_of_study IN s.fields_of_interest
  AND criteria.degree_level = s.target_degree
  AND sch.deadline >= date()
RETURN sch.name, sch.amount_usd, sch.deadline, sch.provider, sch.apply_url
ORDER BY sch.amount_usd DESC
```

### 7.6 Agent Placement History
```cypher
MATCH (a:Agent {id: $agent_id})-[:PLACED]->(s:Student)-[:ENROLLED_IN]->(u:University)
WHERE s.enrollment_year >= year(date()) - 2
WITH a, u.country AS dest, count(s) AS placements
ORDER BY placements DESC
RETURN dest, placements
LIMIT 10
```

### 7.7 Knowledge Graph Stats Query
```cypher
MATCH (n)
WITH labels(n)[0] AS nodeType, count(n) AS count
ORDER BY count DESC
RETURN nodeType, count
```

### 7.8 City Cost Comparison (NEW)
```cypher
MATCH (city:City)-[:LOCATED_IN]->(c:Country {code: $country})
MATCH (city)-[:HAS_COST_DATA]->(cd:CostData {year: $year})
WHERE cd.category IN ["rent_shared", "food_monthly", "transport_monthly", "utilities_monthly"]
RETURN city.name, cd.category, cd.amount_inr, cd.amount_usd
ORDER BY city.name, cd.category
```

### 7.9 PR Pathway Query (NEW)
```cypher
MATCH (country:Country {code: $destination})-[:HAS_PR_PATHWAY]->(pr:PRPathway)
MATCH (pr)-[:APPLIES_TO]->(field:Field {name: $field})
WHERE pr.degree_level = $degree_level
RETURN pr.pathway_name, pr.min_years_work_exp, pr.points_required,
       pr.success_rate_indian, pr.avg_processing_months, pr.key_requirements
ORDER BY pr.success_rate_indian DESC
```

### 7.10 Interview Question Bank (NEW)
```cypher
MATCH (q:InterviewQuestion)-[:FOR_VISA]->(v:VisaType {code: $visa_type})
MATCH (q)-[:FOR_DESTINATION]->(c:Country {code: $destination})
WHERE q.frequency_rank <= 20
  AND ($nationality IS NULL OR q.nationality_specific = false OR q.nationality = $nationality)
RETURN q.question_text, q.category, q.model_answer_template,
       q.frequency_rank, q.rejection_risk
ORDER BY q.frequency_rank ASC
LIMIT 20
```

---

## 8. RAG EVALUATION (RAGAS)

### 8.1 Evaluation Pipeline
```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_recall,
    context_precision,
    answer_correctness
)
from datasets import Dataset

eval_data = {
    "question":      [...],
    "answer":        [...],
    "contexts":      [...],
    "ground_truths": [...]
}

dataset = Dataset.from_dict(eval_data)

results = evaluate(
    dataset=dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_recall,
        context_precision,
        answer_correctness,
    ],
    llm=ChatOpenAI(model="gpt-4o"),
    embeddings=OpenAIEmbeddings(model="text-embedding-3-large")
)
```

### 8.2 Production Thresholds
```python
RAGAS_THRESHOLDS = {
    "faithfulness":         0.85,
    "answer_relevancy":     0.80,
    "context_recall":       0.75,
    "context_precision":    0.70,
    "answer_correctness":   0.78,
    "hallucination_rate":   0.05,
}

EVAL_SCHEDULE = {
    "automated_daily":   100,
    "weekly_full":       500,
    "release_gate":     1000,
}

ALERT_ON = {
    "faithfulness_drop":      0.05,
    "hallucination_spike":    0.10,
    "context_precision_drop": 0.08,
}

# Per-namespace thresholds (NEW)
NAMESPACE_THRESHOLDS = {
    "wehive-cost-of-living":   {"data_freshness_days": 180, "min_faithfulness": 0.88},
    "wehive-jobs-and-pr":      {"data_freshness_days": 180, "min_faithfulness": 0.85},
    "wehive-news-and-updates": {"data_freshness_days": 30,  "min_faithfulness": 0.90},
    "wehive-interview-prep":   {"data_freshness_days": 365, "min_faithfulness": 0.82},
    "wehive-visa-requirements":{"data_freshness_days": 90,  "min_faithfulness": 0.90},
}
```

---

## 9. OBSERVABILITY CONFIG (LANGFUSE)

### 9.1 Tracing Setup
```python
from langfuse import Langfuse

langfuse = Langfuse(
    public_key="pk-lf-wehive-prod",
    secret_key="sk-lf-...",
    host="https://cloud.langfuse.com"
)

trace = langfuse.trace(
    name="student_query",
    user_id=student_id,
    session_id=session_id,
    metadata={
        "channel":       "whatsapp",
        "workflow":      "visa_guidance",
        "destination":   "UK",
        "agent_id":      assigned_agent_id,
        "lead_score":    lead_score,
        "namespaces_queried": ["wehive-visa-requirements", "wehive-cost-of-living"],
    }
)

retrieval_span = trace.span(
    name="rag_retrieval",
    input={"query": user_query, "namespace": "wehive-visa-requirements", "top_k": 8},
)
retrieval_span.end(output={"chunks_retrieved": 8, "avg_similarity": 0.847})

generation = trace.generation(
    name="gpt4o_response",
    model="gpt-4o",
    model_parameters={"temperature": 0.3, "max_tokens": 4096},
    input=messages,
    output=response,
    usage={"prompt_tokens": 1200, "completion_tokens": 450, "total_cost_usd": 0.027}
)

langfuse.score(trace_id=trace.id, name="user_satisfaction", value=user_rating)
langfuse.score(trace_id=trace.id, name="answer_faithfulness", value=faithfulness_score)
```

### 9.2 Current Observability Metrics (from Dashboard)
```
Total LLM Calls (all time): 42,840
24h Cost:                   $9.42
Avg Response Latency:       1.34s
P95 Latency:                3.1s
Error Rate:                 0.8%
Avg Tokens/Request:         1,847
Top Model by Volume:        gpt-4o (68%)
Top Workflow:               student_query (42%)
Top Namespace:              wehive-universities (38%), wehive-visa-requirements (27%)
```

---

## 10. STUDENT MEMORY SCHEMA

### 10.1 MongoDB Document Structure
```json
{
  "_id": "ObjectId",
  "student_id": "firebase_uid",
  "created_at": "ISODate",
  "updated_at": "ISODate",
  "profile": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "country_of_origin": "IN",
    "city": "Hyderabad",
    "age": 22,
    "education": {
      "degree": "B.Tech",
      "field": "Computer Science",
      "university": "JNTU Hyderabad",
      "graduation_year": 2024,
      "cgpa": 8.2,
      "backlogs": 0
    }
  },
  "preferences": {
    "target_countries": ["UK", "Canada", "Australia"],
    "target_degree": "masters",
    "field_of_study": "Data Science",
    "budget_inr": 2500000,
    "timeline": "Sep 2025",
    "preferred_language": "en",
    "work_permit_important": true,
    "pr_pathway_important": true,
    "preferred_cities": ["London", "Toronto", "Melbourne"],
    "lifestyle_preference": "moderate"
  },
  "documents": {
    "passport":       { "status": "uploaded", "expiry": "2031-05-20", "verified": true },
    "transcripts":    { "status": "uploaded", "verified": false },
    "english_score":  { "type": "IELTS", "score": 7.0, "expiry": "2026-08-14" },
    "financial_docs": { "status": "pending" },
    "sop":            { "status": "draft", "last_updated": "2024-12-01" }
  },
  "applications": [
    {
      "university": "University of Edinburgh",
      "program":    "MSc Data Science",
      "status":     "submitted",
      "applied_date": "2024-12-15",
      "deadline":   "2025-03-31",
      "result":     null
    }
  ],
  "cost_research": {
    "cities_researched": ["Edinburgh", "London", "Toronto"],
    "preferred_budget_monthly_inr": 120000,
    "last_cost_check": "ISODate"
  },
  "job_market_research": {
    "target_roles":       ["Data Scientist", "ML Engineer"],
    "salary_expectation_inr": 2500000,
    "pr_priority_score":  8,
    "countries_with_pr_interest": ["Canada", "Australia"]
  },
  "interview_prep": {
    "visa_interviews_practiced": ["UK_student_visa"],
    "readiness_score":  72,
    "last_practiced":   "ISODate"
  },
  "conversations": [
    {
      "session_id": "string",
      "channel":    "whatsapp",
      "timestamp":  "ISODate",
      "summary":    "Discussed UK universities for Data Science. Showed interest in Edinburgh and Manchester.",
      "agent_id":   "agent_123",
      "tags":       ["UK", "data_science", "scholarship_interest"],
      "namespaces_queried": ["wehive-universities", "wehive-cost-of-living"]
    }
  ],
  "lead_data": {
    "score":          78,
    "tier":           "hot",
    "assigned_agent": "agent_123",
    "source":         "organic_search",
    "utm_campaign":   null,
    "first_touch":    "2024-11-01",
    "last_touch":     "2024-12-20"
  }
}
```

---

## 11. OPEN SOURCE STACK

### 11.1 AI / LLM Orchestration
```
LangChain          v0.3.x    Agent orchestration, tool calling, chains, memory
LangGraph          v0.2.x    Stateful agentic workflows — graph-based loops
LlamaIndex         v0.11.x   RAG pipelines, document indexing, query engines
sentence-transformers v3.x   Local embeddings, cross-encoders for reranking
Ollama             latest    Local LLM inference (Llama 3.2 70B, Mistral 7B)
HuggingFace Hub    latest    Model registry, embedding models
```

### 11.2 Vector Databases
```
Pinecone           serverless  Primary production vector store (wehive-prod-v3, 10 namespaces)
pgvector           0.7.x       PostgreSQL vector extension (dev fallback)
Chroma             0.5.x       Local dev vector store
Qdrant             1.11.x      Considered as Pinecone alternative (evaluated)
```

### 11.3 Graph Database
```
Neo4j              5.x         Knowledge graph (48,200 nodes, 284,120 edges)
py2neo             2022.x      Python Neo4j client
neo4j-graphrag     0.6.x       Graph RAG implementation
Cypher             —           Query language (see Section 7 for examples)
apoc               5.x         Neo4j graph algorithms plugin
```

### 11.4 Backend / API
```
FastAPI            0.115.x     Primary API framework
Celery             5.4.x       Async task queue (agentic loops, notifications)
Redis              7.x         Celery broker + session cache + slot monitor cache
Motor              3.x         Async MongoDB driver
Firebase Admin SDK 6.x         Auth (24,831 users) + Firestore real-time
Pydantic           2.x         Data validation and schema enforcement
uvicorn            0.30.x      ASGI server
python-jose        3.x         JWT token handling
```

### 11.5 Document Processing
```
PyMuPDF (fitz)     1.24.x      PDF text + image extraction
pytesseract        0.3.x       OCR for scanned documents
Pillow             10.x        Image preprocessing for OCR
python-docx        1.1.x       Word document processing
pandas             2.2.x       CSV/Excel processing, data transformation
openpyxl           3.1.x       Excel file generation for exports
```

### 11.6 Web Scraping / Data Pipeline
```
Scrapy             2.11.x      University data spider framework
BeautifulSoup4     4.12.x      HTML parsing
Playwright         1.47.x      JavaScript-rendered page scraping
Apache Airflow     2.9.x       ETL pipeline orchestration
pandas             2.2.x       Data transformation
Selenium           4.x         Legacy scraper support
```

### 11.7 Messaging / Communication
```
OpenWA             latest      WhatsApp automation — self-hosted on VPS (NOT Twilio/WABA)
                               Session persistence: Redis
                               Webhook: FastAPI endpoint /webhook/whatsapp
Postal             latest      Self-hosted SMTP server
                               Admin: https://postal.wehive.co.in
                               Domains: mail.wehive.co.in
                               From: noreply@wehive.co.in
```

### 11.8 Payments
```
Razorpay SDK       2.x         India payments (INR) — NOT Stripe
                               Payment links, subscriptions, refunds
                               Methods: UPI, cards, net banking, wallets
                               Webhook: /webhook/razorpay
```

### 11.9 Observability / Monitoring
```
Langfuse           3.x         LLM tracing, cost tracking, prompt evaluations
Prometheus         2.x         Metrics collection from all services
Grafana            10.x        Dashboards (system health, LLM costs, leads)
OpenTelemetry      1.x         Distributed tracing across microservices
Sentry             1.x         Error tracking + alerting
RAGAS              0.2.x       RAG evaluation framework (see Section 8)
```

### 11.10 Infrastructure
```
MongoDB Atlas      7.0         Primary database (M30 cluster, Hyderabad region)
Firebase           Auth/Store  Authentication + real-time sync
Google Cloud Run   —           Container hosting (auto-scaling)
Docker             27.x        Containerization
Nginx              1.26.x      Reverse proxy, SSL termination
Certbot            —           Let's Encrypt SSL certificates
GitHub Actions     —           CI/CD pipelines
```

---

## 12. INFRASTRUCTURE & INTEGRATIONS

### 12.1 Integration Status (from Admin Dashboard)
```
Firebase Auth      ✅ Connected  24,831 users
MongoDB Atlas      ✅ Connected  M30 cluster
Pinecone           ✅ Connected  wehive-prod-v3 (10 namespaces, ~490k chunks)
OpenAI API         ✅ Connected  GPT-4o primary
Anthropic API      ✅ Connected  Claude 3.5 Sonnet
Google AI          ✅ Connected  Gemini 1.5 Pro
Mistral AI         ✅ Connected  Mistral Large
OpenWA             ✅ Connected  WhatsApp self-hosted
Postal SMTP        ✅ Connected  mail.wehive.co.in
Razorpay           ✅ Connected  INR payments
Neo4j              ✅ Connected  Graph RAG (48.2k nodes)
Langfuse           ✅ Connected  Observability
Ollama             ✅ Connected  localhost:11434
```

### 12.2 API Rate Limits & Quotas
```python
RATE_LIMITS = {
    "openai":      {"rpm": 10000, "tpm": 2_000_000, "daily_usd_limit": 100},
    "anthropic":   {"rpm": 4000,  "tpm": 400_000},
    "google":      {"rpm": 1000,  "tpm": 4_000_000},
    "mistral":     {"rpm": 500,   "tpm": 500_000},
    "cohere":      {"rpm": 100,   "calls_per_month": 100_000},
    "pinecone":    {"queries_per_sec": 100, "upserts_per_sec": 100},
    "razorpay":    {"transactions_per_min": 100},
    "openwa":      {"messages_per_min": 60}
}
```

### 12.3 Environment Variables (Keys stored in GCP Secret Manager)
```bash
# LLM APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
MISTRAL_API_KEY=...
COHERE_API_KEY=...

# Vector Store
PINECONE_API_KEY=...
PINECONE_INDEX=wehive-prod-v3
PINECONE_ENVIRONMENT=us-east-1

# Database
MONGODB_URI=mongodb+srv://...@wehive-m30.mongodb.net/wehive
FIREBASE_ADMIN_SDK_JSON=/secrets/firebase-admin.json

# Graph DB
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=...

# Messaging
OPENWA_BASE_URL=http://localhost:3000
POSTAL_SMTP_HOST=postal.wehive.co.in
POSTAL_API_KEY=...

# Observability
LANGFUSE_PUBLIC_KEY=pk-lf-wehive-prod
LANGFUSE_SECRET_KEY=sk-lf-...

# Payments
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...

# App
APP_ENV=production
SECRET_KEY=...
REDIS_URL=redis://localhost:6379/0
```

---

## 13. RETRIEVAL QUERY TEMPLATES

### 13.1 wehive-universities Namespace (15 templates)
```
UNI-RT-001: "top {degree_level} programs {field} {country} tuition under {budget_usd} per year"
UNI-RT-002: "universities {country} accepting Indian students IELTS {score} GPA {gpa} {field}"
UNI-RT-003: "{university} acceptance rate Indian students {field} {intake} {year}"
UNI-RT-004: "universities {country} {field} {degree_level} open for {intake} intake {year}"
UNI-RT-005: "fast track application deadline {country} {field} {degree_level} {intake}"
UNI-RT-006: "universities with good PR pathway {country} {field} international students"
UNI-RT-007: "no GMAT GRE required {degree_level} {field} {country} universities"
UNI-RT-008: "universities {country} accepting students with backlogs {field} {degree_level}"
UNI-RT-009: "scholarship tie-up universities {country} Indian students {field}"
UNI-RT-010: "{university} campus facilities accommodation international students"
UNI-RT-011: "QS ranking {year} {field} {country} top 100 universities"
UNI-RT-012: "co-op internship programs {field} {country} universities work experience"
UNI-RT-013: "conditional offer English score waiver {university} {field}"
UNI-RT-014: "part time work on campus policy {country} international students {year}"
UNI-RT-015: "online hybrid program option {university} {field} {degree_level}"
```

### 13.2 wehive-visa-requirements Namespace (10 templates)
```
VISA-RT-001: "student visa requirements {country} Indian citizens documents {year}"
VISA-RT-002: "financial proof requirements student visa {country} tuition {amount} {duration} years"
VISA-RT-003: "student visa processing time {country} {city_of_application} {year}"
VISA-RT-004: "visa rejection reasons Indian students {country} student visa common {year}"
VISA-RT-005: "student visa fee {country} {visa_type} {year} Indian rupees"
VISA-RT-006: "police clearance certificate required student visa {country}"
VISA-RT-007: "medical certificate requirement {country} student visa Indian"
VISA-RT-008: "travel insurance requirement {country} student visa minimum coverage"
VISA-RT-009: "visa extension rules student {country} after graduation"
VISA-RT-010: "student dependent visa {country} spouse children eligibility rules"
```

### 13.3 wehive-scholarships Namespace (8 templates)
```
SCH-RT-001: "scholarships Indian students {degree_level} {field} {country} deadline after {date}"
SCH-RT-002: "government funded scholarships {country} international students {field} {year}"
SCH-RT-003: "merit based scholarship {university} {program} Indian students GPA {gpa}"
SCH-RT-004: "need based scholarship {country} tuition waiver partial full Indian"
SCH-RT-005: "Chevening scholarship eligibility requirements India {year}"
SCH-RT-006: "DAAD scholarship Indian {field} Germany {degree_level} {year}"
SCH-RT-007: "state government scholarship India study abroad {state} {field} {year}"
SCH-RT-008: "sport scholarship {country} university Indian students {sport} {degree_level}"
```

### 13.4 wehive-cost-of-living Namespace (10 templates — NEW)
```
COL-RT-001: "monthly cost of living {city} {country} student single room shared accommodation {year}"
COL-RT-002: "average rent student accommodation {city} {country} per month INR USD {year}"
COL-RT-003: "monthly food expenses {city} {country} student cooking vs eating out {year}"
COL-RT-004: "transport cost student {city} {country} monthly pass student discount {year}"
COL-RT-005: "utilities electricity internet phone monthly {city} {country} student {year}"
COL-RT-006: "total monthly expenses student {city} {country} moderate lifestyle INR {year}"
COL-RT-007: "compare cost of living {city1} vs {city2} student monthly expenses {year}"
COL-RT-008: "cheapest cities study {country} living expenses student budget friendly {year}"
COL-RT-009: "cost of living {country} expensive vs affordable cities student ranking {year}"
COL-RT-010: "health insurance cost student {country} annual monthly mandatory optional {year}"
```

### 13.5 wehive-jobs-and-pr Namespace (10 templates — NEW)
```
JOB-RT-001: "graduate salary {field} {country} median average entry level {year}"
JOB-RT-002: "post study work visa {country} duration eligibility {degree_level} {field}"
JOB-RT-003: "PR pathway {country} points system {field} Indian students {degree_level} {year}"
JOB-RT-004: "job demand {field} {country} top hiring companies {year}"
JOB-RT-005: "part time work salary {country} per hour international students maximum hours {year}"
JOB-RT-006: "PR success rate Indian professionals {country} {field} {year}"
JOB-RT-007: "employer sponsored visa {country} {field} pathway to PR"
JOB-RT-008: "graduate visa post study work {country} eligible universities courses {year}"
JOB-RT-009: "ROI studying {degree_level} {field} {country} salary vs cost years to payback"
JOB-RT-010: "remote work visa {country} Indian students graduate rules {year}"
```

### 13.6 wehive-news-and-updates Namespace (8 templates — NEW)
```
NEWS-RT-001: "recent changes student visa policy {country} {year} update"
NEWS-RT-002: "new scholarship announced {country} Indian students {field} {year}"
NEWS-RT-003: "university intake deadline changes {country} {year} latest update"
NEWS-RT-004: "visa processing delay {country} student visa {year} current status"
NEWS-RT-005: "immigration policy change {country} post study work {year}"
NEWS-RT-006: "tuition fee increase {country} international students {year}"
NEWS-RT-007: "new university partnerships India {country} {year}"
NEWS-RT-008: "travel advisory {country} Indian students {year} current"
```

### 13.7 wehive-interview-prep Namespace (8 templates — NEW)
```
INT-RT-001: "visa interview questions {country} {visa_type} Indian {degree_level} students common"
INT-RT-002: "student visa interview tips {country} consulate embassy Indian applicants"
INT-RT-003: "rejected visa interview {country} common mistakes Indian students avoid"
INT-RT-004: "university admission interview questions {university} {field} {degree_level}"
INT-RT-005: "financial questions visa interview {country} bank statement salary proof"
INT-RT-006: "ties to home country questions {country} visa interview Indian students"
INT-RT-007: "study gap explanation visa interview {country} acceptable reasons"
INT-RT-008: "work experience questions visa interview {country} {field} {degree_level}"
```

### 13.8 wehive-testimonials Namespace (5 templates)
```
TEST-RT-001: "student success story {country} {field} {degree_level} Indian WeHive {year}"
TEST-RT-002: "visa approval story {country} {nationality} student timeline experience"
TEST-RT-003: "scholarship success story Indian student {country} {scholarship_name}"
TEST-RT-004: "student review WeHive agent {city} {specialty} experience"
TEST-RT-005: "post landing experience {city} {country} Indian student first month"
```

### 13.9 Multi-Namespace Composite Queries (6 templates — NEW)
```
MULTI-RT-001: Destination Overview (4 namespaces)
  Query: "{country} overview for Indian {degree_level} student {field}"
  Namespaces: [universities, visa-requirements, cost-of-living, jobs-and-pr]
  Merge strategy: deduplicate by topic, rank by namespace relevance weights

MULTI-RT-002: Full Journey Query (6 namespaces)
  Query: "complete guide studying {field} {degree_level} {country} from India"
  Namespaces: [universities, scholarships, visa-requirements, cost-of-living, jobs-and-pr, interview-prep]
  Merge strategy: section-based synthesis

MULTI-RT-003: Financial Planning Query (3 namespaces)
  Query: "total cost studying {field} {degree_level} {country} including living ROI"
  Namespaces: [universities, cost-of-living, jobs-and-pr]

MULTI-RT-004: Visa + Interview Query (3 namespaces)
  Query: "{visa_type} visa {country} preparation guide Indian students"
  Namespaces: [visa-requirements, interview-prep, news-and-updates]

MULTI-RT-005: PR Planning Query (3 namespaces)
  Query: "PR pathway {country} {field} student to permanent resident roadmap"
  Namespaces: [jobs-and-pr, visa-requirements, testimonials]

MULTI-RT-006: City Comparison Query (2 namespaces)
  Query: "compare living {city1} vs {city2} {country} student expenses job market"
  Namespaces: [cost-of-living, jobs-and-pr]
```

---

## 14. HYBRID SEARCH TUNING

### 14.1 BM25 Configuration Per Namespace
```python
BM25_CONFIG = {
    "wehive-universities": {
        "b": 0.75,          # length normalization
        "k1": 1.2,          # term frequency saturation
        "boost_fields": ["university_name^3", "program_name^2", "country^2"],
        "stop_words": ["university", "college", "program", "course", "study"]
    },
    "wehive-visa-requirements": {
        "b": 0.5,           # visa docs are uniform length
        "k1": 1.5,
        "boost_fields": ["country^3", "visa_type^3", "nationality^2"],
        "stop_words": ["visa", "application", "requirement"]
    },
    "wehive-scholarships": {
        "b": 0.75,
        "k1": 1.2,
        "boost_fields": ["scholarship_name^3", "provider^2", "country^2"],
        "stop_words": ["scholarship", "award", "grant"]
    },
    "wehive-cost-of-living": {
        "b": 0.6,
        "k1": 1.3,
        "boost_fields": ["city_name^3", "country^2", "category^2"],
        "stop_words": ["cost", "living", "monthly", "expenses"]
    },
    "wehive-jobs-and-pr": {
        "b": 0.75,
        "k1": 1.2,
        "boost_fields": ["country^2", "field^3", "visa_type^2"],
        "stop_words": ["job", "work", "salary", "employment"]
    },
    "wehive-news-and-updates": {
        "b": 0.3,           # news articles vary in length
        "k1": 2.0,          # high TF saturation for news keywords
        "boost_fields": ["country^2", "category^2", "headline^3"],
        "stop_words": ["news", "update", "announcement"]
    },
    "wehive-interview-prep": {
        "b": 0.5,
        "k1": 1.5,
        "boost_fields": ["visa_type^3", "country^2", "question_category^2"],
        "stop_words": ["interview", "question", "answer", "visa"]
    }
}
```

### 14.2 Alpha Weights by Query Type
```python
# alpha = vector weight (1 - alpha = BM25 weight)
ALPHA_BY_QUERY_TYPE = {
    "factual_lookup":      0.50,  # "what are visa fees for Canada" → BM25 matters more
    "semantic_match":      0.85,  # "universities like Harvard but cheaper" → vector dominant
    "cost_comparison":     0.60,  # numbers + cities → balanced
    "news_search":         0.40,  # recency + keywords → BM25 dominant
    "interview_questions": 0.75,  # semantic question similarity → vector dominant
    "scholarship_match":   0.70,  # profile matching → vector dominant
    "job_salary":          0.55,  # field + country keywords → balanced
    "pr_pathway":          0.65,  # conceptual + keywords → balanced
    "default":             0.70   # 70/30 hybrid default
}
```

### 14.3 Reranking Configuration
```python
RERANK_CONFIG = {
    "model": "cohere/rerank-english-v3.0",
    "top_n": 5,
    "return_documents": True,
    "max_chunks_per_doc": 3,
    
    # Context injection for reranking (improves relevance)
    "rerank_query_template": """
Student profile: {nationality} student, {degree_level} in {field}, 
targeting {destination}, budget {budget_inr} INR, timeline {timeline}.
Query: {user_query}
""",
    
    # Namespace-specific rerank boost
    "freshness_boost": {
        "wehive-news-and-updates": {
            "age_days_threshold": 30,
            "boost_recent": 0.15   # add 0.15 to relevance score if < 30 days old
        },
        "wehive-visa-requirements": {
            "age_days_threshold": 90,
            "boost_recent": 0.10
        }
    }
}
```

### 14.4 Fallback Strategy
```python
RETRIEVAL_FALLBACK = {
    # If primary namespace returns < 3 results above threshold
    "wehive-cost-of-living": {
        "fallback_namespace": "wehive-universities",
        "fallback_query_modifier": "include cost tuition fees accommodation"
    },
    "wehive-interview-prep": {
        "fallback_namespace": "wehive-visa-requirements",
        "fallback_query_modifier": "typical requirements embassy questions"
    },
    "wehive-news-and-updates": {
        "fallback": "web_search",
        "web_search_query": "{original_query} site:gov.uk OR site:uscis.gov OR site:immi.homeaffairs.gov.au"
    },
    # Global fallback
    "global": {
        "min_results": 3,
        "on_empty": "lower_threshold_to_0.65_and_retry",
        "on_still_empty": "web_search_fallback"
    }
}
```

### 14.5 Query Expansion
```python
QUERY_EXPANSION_CONFIG = {
    "enabled": True,
    "model": "gpt-4o-mini",
    "expand_to_n_variants": 3,
    "expansion_prompt": """
Generate {n} alternative phrasings of this search query for a study-abroad platform.
Preserve all factual constraints (country, budget, field, degree level).
Original query: {query}
Return JSON array of strings.
""",
    # Synonyms for common terms
    "synonym_map": {
        "UK": ["United Kingdom", "Britain", "England", "Scotland"],
        "USA": ["United States", "America", "US"],
        "Canada": ["CA", "Canadian universities"],
        "masters": ["MSc", "MA", "MBA", "M.Tech", "postgraduate", "PG"],
        "bachelors": ["undergraduate", "UG", "B.Tech", "B.Sc", "B.Com", "B.E"],
        "PR": ["permanent residency", "permanent resident", "immigration", "settlement"],
        "IELTS": ["English test", "English score", "language proficiency"],
        "scholarship": ["funding", "grant", "award", "bursary", "fellowship"]
    }
}
```

---

## 15. DATA INGESTION PIPELINE

### 15.1 wehive-cost-of-living Ingestion
```python
# Sources: Numbeo, Expatistan, HSBC Expat Explorer, government data
# Update frequency: Monthly

COL_INGESTION_CONFIG = {
    "sources": [
        {
            "name": "numbeo",
            "url": "https://www.numbeo.com/cost-of-living/",
            "scraper": "numbeo_spider",
            "cities": 200,        # top 200 cities with student populations
            "categories": [
                "rent_1br_city_center",
                "rent_1br_outside_center",
                "meal_inexpensive_restaurant",
                "groceries_monthly",
                "public_transport_monthly",
                "internet_monthly",
                "utilities_monthly",
                "gym_monthly",
                "mobile_plan_monthly"
            ]
        },
        {
            "name": "government_data",
            "urls": {
                "UK": "https://www.ukcisa.org.uk/Information--Advice/Your-finances",
                "Australia": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/genuine-temporary-entrant#cost",
                "Canada": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html"
            }
        }
    ],
    "chunk_schema": {
        "city": str,
        "country": str,
        "category": str,   # "rent"|"food"|"transport"|"utilities"|"total_monthly"
        "amount_local": float,
        "currency": str,
        "amount_inr": float,
        "amount_usd": float,
        "lifestyle_level": str,  # "budget"|"moderate"|"comfortable"
        "data_year": int,
        "data_month": int,
        "source": str,
        "verified_date": datetime
    },
    "update_schedule": "0 2 1 * *",   # 1st of month at 2 AM IST
    "transformation": {
        "inr_conversion": "fetch_live_forex_rate(currency, 'INR')",
        "lifestyle_bucketing": "bucket_by_percentile(amount_local, p25=budget, p75=comfortable)"
    }
}
```

### 15.2 wehive-jobs-and-pr Ingestion
```python
# Sources: LinkedIn, Indeed, national government job boards, ANZSCO, NOC, SOC
# Update frequency: Monthly

JOBS_INGESTION_CONFIG = {
    "sources": [
        {
            "name": "linkedin_salary_insights",
            "type": "api",
            "fields": ["job_title", "field", "country", "median_salary", "salary_range", "year"]
        },
        {
            "name": "government_occupational_databases",
            "sources": {
                "Australia": "ANZSCO — anzsco.abs.gov.au",
                "Canada":    "NOC — noc.esdc.gc.ca",
                "USA":       "SOC — bls.gov/soc",
                "UK":        "SOC 2020 — ons.gov.uk"
            }
        },
        {
            "name": "immigration_pr_pathways",
            "sources": {
                "Canada":    "Express Entry — canada.ca/en/immigration",
                "Australia": "SkillSelect — immi.homeaffairs.gov.au",
                "UK":        "Points Based System — gov.uk/skilled-worker-visa",
                "Germany":   "Opportunity Card — make-it-in-germany.com",
                "Ireland":   "Critical Skills — irishimmigration.ie"
            }
        }
    ],
    "chunk_schema": {
        "country": str,
        "field": str,
        "job_title": str,
        "degree_level": str,
        "median_salary_local": float,
        "salary_range_min": float,
        "salary_range_max": float,
        "currency": str,
        "median_salary_inr": float,
        "median_salary_usd": float,
        "part_time_hours_allowed": int,   # max hours/week for students
        "part_time_rate_local": float,
        "post_study_work_visa": str,
        "post_study_work_duration_months": int,
        "pr_pathway_exists": bool,
        "pr_pathway_name": str,
        "pr_avg_months": int,
        "pr_success_rate_indian": float,
        "data_year": int,
        "source": str,
        "verified_date": datetime
    },
    "update_schedule": "0 3 1 * *"   # 1st of month at 3 AM IST
}
```

### 15.3 wehive-news-and-updates Ingestion
```python
# Sources: Immigration authority websites, education portals, news feeds
# Update frequency: Daily

NEWS_INGESTION_CONFIG = {
    "sources": [
        {
            "name": "uk_immigration",
            "feeds": [
                "https://www.gov.uk/search/news-and-communications.atom?topics%5B%5D=immigration",
                "https://www.hesa.ac.uk/data-and-analysis/rss"
            ]
        },
        {
            "name": "australia_immigration",
            "feeds": [
                "https://immi.homeaffairs.gov.au/news-media/visa-news",
                "https://www.studyinaustralia.gov.au/english/live-in-australia/money"
            ]
        },
        {
            "name": "canada_immigration",
            "feeds": [
                "https://www.canada.ca/en/immigration-refugees-citizenship/news.html",
                "https://www.cic.gc.ca/english/helpcentre/updates.asp"
            ]
        },
        {
            "name": "usa_immigration",
            "feeds": [
                "https://www.uscis.gov/newsroom/all-news",
                "https://travel.state.gov/content/travel/en/us-visas/study.html"
            ]
        },
        {
            "name": "india_scholarship_portals",
            "feeds": [
                "https://www.scholarships.gov.in/",
                "https://www.buddy4study.com/news"
            ]
        }
    ],
    "chunk_schema": {
        "headline": str,
        "summary": str,
        "full_text": str,
        "country": str,
        "category": str,   # "visa_policy"|"scholarship"|"deadline"|"fee_change"|"quota"|"general"
        "impact_level": str,  # "high"|"medium"|"low"
        "affects_nationality": list,  # ["IN"] or ["ALL"]
        "published_date": datetime,
        "verified_date": datetime,
        "source_url": str,
        "source_name": str,
        "expires": datetime   # when this news becomes stale
    },
    "update_schedule": "0 6 * * *",  # Daily at 6 AM IST
    "freshness_ttl_days": 30,
    "auto_expire": True
}
```

### 15.4 wehive-interview-prep Ingestion
```python
# Sources: Community Q&A, official embassy sites, WeHive agent submissions
# Update frequency: Weekly + on-demand

INTERVIEW_INGESTION_CONFIG = {
    "sources": [
        {
            "name": "agent_submissions",
            "type": "internal",
            "description": "WeHive agents submit real interview Q&A from recent students"
        },
        {
            "name": "community_forums",
            "sites": ["quora.com/topic/student-visa", "reddit.com/r/immigration",
                      "thegraduatecafe.com", "yocket.com/community"]
        },
        {
            "name": "embassy_guidelines",
            "sites": {
                "USA":       "https://travel.state.gov/content/travel/en/us-visas/study.html",
                "UK":        "https://www.gov.uk/student-visa",
                "Australia": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500"
            }
        }
    ],
    "chunk_schema": {
        "question_text": str,
        "model_answer": str,
        "answer_tips": list,
        "visa_type": str,
        "destination_country": str,
        "nationality": str,         # "IN" for India-specific, "ALL" for general
        "degree_level": str,
        "field": str,
        "category": str,           # "financial"|"ties_to_home"|"study_plan"|"english"|"gap"|"general"
        "frequency_rank": int,      # 1 = most commonly asked
        "rejection_risk": str,      # "high"|"medium"|"low" if answered poorly
        "updated_by": str,          # "agent"|"community"|"embassy"
        "verified_date": datetime,
        "upvotes": int
    },
    "update_schedule": "0 4 * * 1",  # Every Monday at 4 AM IST
    "quality_gate": {
        "min_upvotes": 10,           # for community submissions
        "min_agent_rating": 4.0,     # for agent submissions
        "require_human_review": True  # all new Q&A needs review before ingestion
    },
    "qa_pair_chunking": {
        "strategy": "qa_pair",
        "format": "Q: {question}\nA: {answer}\nTips: {tips}",
        "max_tokens": 512
    }
}
```

### 15.5 Airflow DAG Structure
```python
# wehive_data_pipeline_dag.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

NAMESPACES_SCHEDULE = {
    "wehive-universities":       "@weekly",
    "wehive-visa-requirements":  "@weekly",
    "wehive-scholarships":       "@weekly",
    "wehive-agent-profiles":     "@daily",
    "wehive-student-docs":       "@daily",
    "wehive-testimonials":       "@daily",
    "wehive-cost-of-living":     "0 2 1 * *",   # monthly
    "wehive-jobs-and-pr":        "0 3 1 * *",   # monthly
    "wehive-news-and-updates":   "0 6 * * *",   # daily
    "wehive-interview-prep":     "0 4 * * 1",   # weekly Monday
}

PIPELINE_STEPS = [
    "scrape_sources",           # Scrapy/Playwright/API
    "clean_and_normalize",      # pandas, schema validation
    "compute_inr_conversions",  # live forex rates
    "chunk_documents",          # per namespace strategy
    "generate_embeddings",      # text-embedding-3-large batched
    "upsert_to_pinecone",       # with full metadata
    "run_quality_check",        # RAGAS faithfulness spot check
    "update_neo4j_graph",       # sync relevant nodes
    "invalidate_redis_cache",   # clear stale cached queries
    "send_slack_notification"   # pipeline completion alert
]

QUALITY_GATES = {
    "min_chunks_per_run":        100,
    "max_duplicate_ratio":       0.05,    # < 5% duplicates
    "min_embedding_quality":     0.70,    # avg cosine sim within doc > 0.70
    "required_metadata_fields":  ["country", "verified_date", "source", "doc_type"]
}
```

### 15.6 Pinecone Upsert Config
```python
PINECONE_UPSERT_CONFIG = {
    "index": "wehive-prod-v3",
    "batch_size": 100,           # vectors per upsert call
    "max_parallel_batches": 5,
    "retry_on_failure": 3,
    "vector_dimension": 3072,
    "metric": "cosine",
    
    # ID format: {namespace}_{doc_type}_{source_hash}_{chunk_index}
    "id_template": "{namespace}_{doc_type}_{md5_hash(source)}_{chunk_index:04d}",
    
    # Upsert strategy: overwrite if same ID (deduplication by content hash)
    "upsert_mode": "upsert",     # not insert — allows updates
    
    # Namespace routing
    "namespace_map": {
        "university":  "wehive-universities",
        "visa":        "wehive-visa-requirements",
        "scholarship": "wehive-scholarships",
        "agent":       "wehive-agent-profiles",
        "student_doc": "wehive-student-docs",
        "testimonial": "wehive-testimonials",
        "cost":        "wehive-cost-of-living",
        "job":         "wehive-jobs-and-pr",
        "news":        "wehive-news-and-updates",
        "interview":   "wehive-interview-prep"
    }
}
```

---


---

## 16. WEHIVE-COUNTRY-RULES NAMESPACE

### 16.1 Namespace Overview
```
Namespace:        wehive-country-rules
Index:            wehive-prod-v3
Estimated chunks: ~80,000
Embedding model:  text-embedding-3-large (3072 dims)
Chunk strategy:   Semantic (regulation paragraphs)
Update frequency: Monthly + on policy change
Covers:           16 destination countries × 11 data categories each
```

### 16.2 Data Categories Per Country
```
1. Student visa type + subtype (F-1, Tier-4, Student 500, etc.)
2. Financial proof requirements (minimum bank balance, duration, format)
3. Part-time work rules (hours/week, on-campus vs off-campus, restrictions)
4. Health insurance requirements (mandatory vs optional, minimum coverage)
5. Post-study work visa (type, duration, eligibility, conditions)
6. PR pathway rules (points system, occupation lists, timelines)
7. Dependent visa rules (spouse/children eligibility, work rights)
8. English language requirements (accepted tests + minimum scores)
9. Biometrics, medical, PCC requirements
10. Tuition and living cost floors (government-mandated minimum fund proofs)
11. Recent policy changes (flagged by verified_date within 90 days)
```

### 16.3 Country-Specific Rules (16 Countries)

#### 16.3.1 USA (F-1 Visa)
```
VISA TYPE:         F-1 (Student) + J-1 (Exchange)
FINANCIAL PROOF:   First year total cost (tuition + living + fees) — typically $25,000–$70,000 USD in bank
                   Proof: bank statements last 3 months, sponsorship letter
PART-TIME WORK:    On-campus: 20 hrs/week during semester, full-time during breaks
                   Off-campus: NOT allowed first year; ONLY with OPT/CPT authorization
OPT:               12 months post-graduation; STEM extension +24 months (total 36)
CPT:               During study, must be integral part of curriculum, after 1 year
HEALTH INSURANCE:  Required by most universities; averages $1,500–$3,000/year
PR PATHWAY:        H-1B (employer sponsorship) → EB-2/EB-3 green card; wait: 3–20+ years (India backlog)
DEPENDENT VISA:    F-2 (spouse + children under 21); spouse cannot work on F-2
ENGLISH:           TOEFL iBT 80+, IELTS 6.5+, Duolingo 110+ (varies by university)
BIOMETRICS:        Required at US Embassy/Consulate for all applicants
MEDICAL:           Not mandatory for F-1; required for J-1
MINIMUM FUNDS:     I-20 amount × 1 year; show $2,000–$5,000 extra recommended
SEVIS FEE:         $350 (F-1), $220 (J-1) — paid before visa appointment
DS-160:            Online form required; appointment via USCIS/VFS/CGI
```

#### 16.3.2 UK (Student Visa — formerly Tier 4)
```
VISA TYPE:         UK Student Visa (Child Student if under 18)
CAS NUMBER:        Confirmation of Acceptance for Studies — required from university
FINANCIAL PROOF:   London: £1,334/month × 9 months = £12,006; Outside London: £1,023/month × 9 months
                   Proof: funds held for 28 consecutive days before application; bank letter
PART-TIME WORK:    20 hrs/week term time; full-time during official vacations
HEALTH SURCHARGE:  £776/year (International Health Surcharge — IHS)
POST-STUDY WORK:   Graduate Route: 2 years (bachelor/master), 3 years (PhD)
PR PATHWAY:        Skilled Worker Visa → Indefinite Leave to Remain (ILR) after 5 years
DEPENDENT VISA:    Allowed if studying full-time degree at HEI; spouse can work
ENGLISH:           IELTS UKVI 5.5–7.0+ depending on program; Secure English Language Test (SELT) for visa
BIOMETRICS:        Required; UK Biometric Residence Permit (BRP) collected on arrival
ACADEMIC TECH APPROVAL: ATAS certificate required for some STEM subjects at postgraduate level
MINIMUM FUNDS:     Course fees first year + living allowance (see above) must be shown
```

#### 16.3.3 Canada (Study Permit)
```
VISA TYPE:         Study Permit (not a visa — separate from TRV/eTA)
FINANCIAL PROOF:   Tuition for first year + CAD $20,635 living (2024) + travel funds
                   Proof: Bank statements, ITR, education loan letter, sponsorship
PART-TIME WORK:    20 hrs/week during academic session; full-time during scheduled breaks
POST-GRAD WORK PERMIT: PGWP duration = program length (max 3 years)
PR PATHWAY:        Canadian Experience Class (CEC) — Express Entry; Provincial Nominee Programs (PNPs)
DEPENDENT VISA:    Open Work Permit for spouse if student in master's/PhD/specific programs
ENGLISH:           IELTS 6.0–6.5+ (Academic); TOEFL iBT 80+; varies by institution and province
BIOMETRICS:        Required for Indian passport holders
MEDICAL:           Upfront medical examination required for Indian citizens
PROVINCIAL RULES:  Quebec has separate immigration rules (MEQ attestation required)
CAP ON PERMITS:    2024: intake caps on undergraduate international students; confirm with institution
```

#### 16.3.4 Australia (Student Visa — Subclass 500)
```
VISA TYPE:         Student Visa (subclass 500)
GTE REQUIREMENT:   Genuine Temporary Entrant statement — mandatory
FINANCIAL PROOF:   AUD $24,505/year + tuition + travel (2024 government amount)
PART-TIME WORK:    48 hrs/fortnight during semester; unlimited during breaks
POST-STUDY WORK:   2–4 years Temporary Graduate Visa (subclass 485) depending on qualification and location
PR PATHWAY:        Skilled Nominated (190), Skilled Work Regional (491), Employer Sponsored (186/482)
DEPENDENT VISA:    Subclass 500 secondary applicants; spouse gets work rights if student at bachelor/higher
ENGLISH:           IELTS 5.5–6.5+; PTE Academic 42–58+; TOEFL iBT 46–79+ (varies)
HEALTH INSURANCE:  OSHC — Overseas Student Health Cover; MANDATORY; min AUD $600/year
BIOMETRICS:        Required; Biometric data at VFS/Australia VAC
REGIONAL BONUS:    Extra PR points for studying/working in regional areas
```

#### 16.3.5 Germany (National Visa — Student)
```
VISA TYPE:         National Visa (D-Visa) for study → Residence Permit on arrival
BLOCKED ACCOUNT:   Sperrkonto — EUR 11,208/year (934/month) for 2024 must be deposited in advance
                   Providers: Deutsche Bank, Fintiba, Expatrio, Coracle
LANGUAGE:          Many programs taught in German (B2/C1 required); English-taught programs available
TUITION:           Public universities: mostly free (semester contribution ~EUR 150–350)
                   Private universities: EUR 5,000–20,000/year
PART-TIME WORK:    120 full days or 240 half days per year
POST-STUDY WORK:   18-month job-seeking visa (Aufenthaltserlaubnis zur Arbeitssuche)
PR PATHWAY:        Niederlassungserlaubnis (Permanent Residence) after 5 years; EU Blue Card after 21 months
OPPORTUNITY CARD:  New 2024 — Chancenkarte; points-based system for qualified workers to move to Germany
DEPENDENT VISA:    Spouse can join with language requirements; no automatic work rights initially
ENGLISH:           English programs: IELTS 6.0–7.0; German programs: TestDaF, DSH
HEALTH INSURANCE:  Public or private insurance mandatory; ~EUR 120/month for public
```

#### 16.3.6 Ireland (Study Visa)
```
VISA TYPE:         Study Visa (C-Stamp or D-Stamp) — stamp in passport
FINANCIAL PROOF:   EUR 7,000+ in bank + tuition fees + return ticket
PART-TIME WORK:    20 hrs/week term time; 40 hrs/week June–September
POST-STUDY WORK:   Third Level Graduate Programme: 12 months (bachelor), 24 months (master+)
PR PATHWAY:        Critical Skills Employment Permit → PR after 3 years; General Employment Permit → 5 years
DEPENDENT VISA:    Permitted for postgrad students; no work rights (must apply separately)
ENGLISH:           IELTS 6.0+; TOEFL iBT 79+; varies by institution
HEALTH INSURANCE:  Not mandatory but strongly recommended; public health access limited
TUITION:           EUR 9,000–25,000/year (public/private range)
```

#### 16.3.7 New Zealand (Student Visa)
```
VISA TYPE:         Student Visa
FINANCIAL PROOF:   NZD 15,000/year + tuition + return flight
PART-TIME WORK:    20 hrs/week during study; full-time during vacations
POST-STUDY WORK:   Post Study Work Visa: 1–3 years depending on qualification level and duration
PR PATHWAY:        Skilled Migrant Category (SMC) Resident Visa; Green List occupations prioritized
DEPENDENT VISA:    Dependant Child Student Visa; Partner Open Work Visa available
ENGLISH:           IELTS 5.5–6.5+; PTE Academic 42–58+
HEALTH INSURANCE:  Mandatory for full visa duration; NZD 250–600/year
```

#### 16.3.8 France (Long Stay Student Visa — VLS-TS)
```
VISA TYPE:         VLS-TS Étudiant (Long Stay Student Visa treated as Residence Permit)
FINANCIAL PROOF:   EUR 615/month (2024); proof via scholarship, bank statement, CampusFrance attestation
CAMPUS FRANCE:     Mandatory pre-application through Campus France India (Colombo Process)
PART-TIME WORK:    964 hrs/year (equivalent ~20 hrs/week)
POST-STUDY WORK:   APS (Autorisation Provisoire de Séjour) — 1 year for job seeking
PR PATHWAY:        Carte de Résident after 5 years legal stay
LANGUAGE:          French B2 for French-taught; English programs available (IELTS/TOEFL)
TUITION:           Public universities: EUR 170–380/year (nationals); Higher for non-EU
HEALTH INSURANCE:  CPAM — French social security health system; students pay ~€230/year
```

#### 16.3.9 Netherlands (MVV + Student Residence Permit)
```
VISA TYPE:         MVV (Machtiging tot Voorlopig Verblijf) + Residence Permit via university (IND)
FINANCIAL PROOF:   EUR 900/month guaranteed (2024) or university guarantee via financial statement
PART-TIME WORK:    16 hrs/week during term; full-time June-August
POST-STUDY WORK:   Orientation Year (Zoekjaar) Permit: 1 year for graduates from top 200 QS universities
PR PATHWAY:        Permanent Residence after 5 years continuous legal stay
LANGUAGE:          English programs widely available (IELTS 6.0–6.5+); Dutch programs (NT2)
TUITION:           EUR 2,530 (statutory fee) for qualifying students; EUR 8,000–20,000 for others
HEALTH INSURANCE:  Mandatory; zorgverzekering ~EUR 130–160/month
```

#### 16.3.10 Sweden (Residence Permit for Studies)
```
VISA TYPE:         Residence Permit for Studies (Migrationsverket)
FINANCIAL PROOF:   SEK 8,514/month (2024) = ~SEK 102,168/year
PART-TIME WORK:    No formal restriction; must maintain full-time student status
POST-STUDY WORK:   No specific post-study work visa; must convert to work permit with job offer
PR PATHWAY:        Permanent Residency after 4 years legal continuous stay
LANGUAGE:          English-taught programs widely available; IELTS 6.0–6.5+
TUITION:           SEK 80,000–140,000/year for non-EU/EEA students
HEALTH INSURANCE:  Covered by Swedish healthcare if registered; travel insurance recommended
```

#### 16.3.11 Singapore (Student's Pass — STP)
```
VISA TYPE:         Student's Pass (STP) — issued by ICA
FINANCIAL PROOF:   Not officially mandated but bank statements required; SGD 1,500–2,000/month living
PART-TIME WORK:    16 hrs/week allowed for students at IHLs (poly, universities)
POST-STUDY WORK:   No automatic post-study work pass; must secure job and apply for EP/S Pass
PR PATHWAY:        Permanent Residence after 2+ years work; competitive for Indians
LANGUAGE:          English medium; IELTS/TOEFL as per institution
TUITION:           SGD 20,000–50,000/year (NUS, NTU, SMU)
HEALTH INSURANCE:  Compulsory Medishield Life for long-stay; private insurance recommended
```

#### 16.3.12 Japan (Student Visa — College/University)
```
VISA TYPE:         Student Visa (留学); Certificate of Eligibility (COE) required first
FINANCIAL PROOF:   JPY 1,200,000+ in bank; sponsor income documents
PART-TIME WORK:    28 hrs/week with Permission to Engage in Activity other than that Permitted
POST-STUDY WORK:   Designated Activities Visa (6 months job-seeking); then Engineer/Specialist visa
PR PATHWAY:        Permanent Residence after 10 years (5 with high points under HSFP)
LANGUAGE:          Japanese N2/N3 for Japanese programs; IELTS/TOEFL for English programs
TUITION:           JPY 535,800/year (national); JPY 800,000–1,500,000/year (private)
HEALTH INSURANCE:  National Health Insurance (Kokumin Kenkō Hoken); ~JPY 15,000–30,000/year
```

#### 16.3.13 Italy (Student Visa — Type D)
```
VISA TYPE:         Type D National Visa for Study
FINANCIAL PROOF:   EUR 448.07/month minimum (INPS poverty threshold); varies by university
PRE-ENROLLMENT:   universitaly.it portal required for Decreto Flussi allocation
PART-TIME WORK:    20 hrs/week; permitted with fiscal code
POST-STUDY WORK:   1-year job-seeking permit after graduation
PR PATHWAY:        Permanent Residence (Permesso di soggiorno CE) after 5 years
LANGUAGE:          Italian B2 for Italian programs; IELTS 6.0+ for English programs
TUITION:           EUR 0–3,000/year (public); EUR 8,000–20,000 (private)
HEALTH INSURANCE:  SSN (Servizio Sanitario Nazionale) access after registration
```

#### 16.3.14 Spain (Student Visa — Long Stay)
```
VISA TYPE:         Long Stay Student Visa (Visado de estudios — más de 90 días)
FINANCIAL PROOF:   EUR 579.02/month (100% IPREM 2024); EUR 6,948.24/year
PART-TIME WORK:    30 hrs/week (recent rule relaxation 2024)
POST-STUDY WORK:   2-year job-seeking authorization after degree
PR PATHWAY:        Residencia de Larga Duración after 5 years; citizenship after 2 years (rare exception)
LANGUAGE:          Spanish B1–B2 for Spanish programs; IELTS 6.0+ for English programs
TUITION:           EUR 800–2,000/year (public); EUR 8,000–20,000 (private)
HEALTH INSURANCE:  TIE card via Seguridad Social; private insurance needed initially
```

#### 16.3.15 UAE (Student Visa)
```
VISA TYPE:         Student Visa (issued by universities/MOHEI); Mission visa for scholarships
FINANCIAL PROOF:   AED 4,000/month minimum; bank statement + sponsor letter
PART-TIME WORK:    Limited; requires separate work permit; generally restricted
POST-STUDY WORK:   Job offer required; convert to Work Visa; Golden Visa available for distinction graduates
PR PATHWAY:        No traditional PR; Long-term Golden Visa (10 years) for high achievers
LANGUAGE:          English medium for most institutions; IELTS 5.5–6.0+
TUITION:           AED 30,000–80,000/year (AED equivalent)
HEALTH INSURANCE:  Mandatory; employer/university usually provides
```

#### 16.3.16 South Korea (D-2 Student Visa)
```
VISA TYPE:         D-2 (General Study) or D-4 (Korean Language Training)
FINANCIAL PROOF:   USD 9,000 equivalent or KRW 10,000,000 in bank
PART-TIME WORK:    20 hrs/week; Part-time Work Authorization (아르바이트)
POST-STUDY WORK:   D-10 (Job-seeking) visa: 6 months to 2 years; convert to E-7 with employer
PR PATHWAY:        F-2 (Resident) after points accumulation; F-5 (Permanent) after 5 years
LANGUAGE:          Korean TOPIK Level 3–4 for Korean programs; IELTS 6.0+ for English programs
TUITION:           KRW 3,000,000–8,000,000/semester (public); higher for private
HEALTH INSURANCE:  National Health Insurance mandatory for stays > 6 months; ~KRW 80,000/month
```

### 16.4 Retrieval Query Templates — wehive-country-rules
```
CR-RT-001: "student visa rules {country} Indian students {year} complete guide"
CR-RT-002: "financial proof requirement {country} student visa minimum bank balance {year}"
CR-RT-003: "part time work rules {country} international students hours per week {year}"
CR-RT-004: "post study work visa {country} duration eligibility Indian graduates {year}"
CR-RT-005: "PR pathway {country} Indian students points requirements occupation list {year}"
CR-RT-006: "health insurance requirement {country} international student mandatory {year}"
CR-RT-007: "dependent visa {country} spouse work rights Indian student {year}"
CR-RT-008: "English language requirement {country} student visa IELTS TOEFL minimum {year}"
CR-RT-009: "recent immigration policy change {country} Indian students {year}"
CR-RT-010: "blocked account requirement Germany student visa amount {year}"
```

### 16.5 Namespace Routing Triggers
```python
COUNTRY_RULES_TRIGGERS = [
    "rules", "regulations", "law", "policy", "restriction",
    "allowed", "permitted", "can I work", "how many hours",
    "health insurance mandatory", "blocked account", "GTE",
    "post study work", "graduate visa", "PR eligibility",
    "dependent can work", "spouse visa", "campus france",
    "ATAS certificate", "IHS surcharge", "SEVIS fee"
]
NAMESPACE = "wehive-country-rules"
```

---

## 17. WEHIVE-F1-SEVIS NAMESPACE

### 17.1 Namespace Overview
```
Namespace:        wehive-f1-sevis
Index:            wehive-prod-v3
Estimated chunks: ~45,000
Embedding model:  text-embedding-3-large (3072 dims)
Covers:           F-1/J-1 visa rules, SEVIS database structure, OPT/CPT, STEM extension,
                  CIP codes (80+), 50 F-1 interview Q&As with model answers
```

### 17.2 SEVIS Database Structure
```
SEVIS ID FORMAT:    N + 9 digits (e.g., N0001234567)
                    For J-1: starts with N or P
I-20 FIELDS:        Student Name, Date of Birth, Country of Birth, Country of Citizenship
                    School SEVIS ID, Program start/end dates, Major/CIP code
                    Financial amounts (from institution + personal), Cap-gap indicator
DS-2019 FIELDS:     Exchange Visitor Program number, Category (student/research/teacher etc.)
                    Program sponsor EIN, Responsible Officer details
SEVIS FEE:          F-1: $350 | J-1: $220 | F-2/J-2 dependents: $0
SEVIS PORTAL:       studyinthestates.dhs.gov
STEM DESIGNATION:   Must appear on I-20 CIP code field — DHS-designated list
OPT FILING WINDOW: Up to 90 days before program end; must be filed before end date
                    USCIS processing: 3–5 months (apply early)
CAP-GAP EXTENSION: Automatic if H-1B petition filed before OPT expiry; extends status + EAD
```

### 17.3 STEM OPT CIP Code List (80+ codes)
```
STEM-DESIGNATED CIP CODES (DHS LIST — PARTIAL):
11.xxxx — Computer and Information Sciences
  11.0101 Computer and Information Sciences, General
  11.0102 Artificial Intelligence
  11.0103 Information Technology
  11.0104 Informatics
  11.0199 Computer and Information Sciences, Other
  11.0201 Computer Programming/Programmer, General
  11.0202 Computer Programming, Specific Applications
  11.0299 Computer Programming, Other
  11.0301 Data Processing and Data Processing Technology/Technician
  11.0401 Information Science/Studies
  11.0501 Computer Systems Analysis/Analyst
  11.0601 Data Entry/Microcomputer Applications, General
  11.0701 Computer Science
  11.0801 Web Page, Digital/Multimedia and Information Resources Design
  11.0901 Computer Systems Networking and Telecommunications
  11.1001 Network and System Administration/Administrator
  11.1002 System, Networking and LAN/WAN Management
  11.1003 Computer and Computer Software Troubleshooting and Support
  11.1004 Web/Multimedia Management and Webmaster
  11.1099 Computer and Information Systems Security, Other
  11.1201 Modeling, Virtual Environments and Simulation

14.xxxx — Engineering
  14.0101 Engineering, General
  14.0102 Pre-Engineering
  14.0201 Aerospace, Aeronautical and Astronautical/Space Engineering
  14.0301 Agricultural Engineering
  14.0401 Architectural Engineering
  14.0501 Bioengineering and Biomedical Engineering
  14.0601 Ceramic Sciences and Engineering
  14.0701 Chemical Engineering
  14.0801 Civil Engineering, General
  14.0901 Computer Engineering, General
  14.0902 Computer Hardware Engineering
  14.0903 Computer Software Engineering
  14.1001 Electrical and Electronics Engineering
  14.1101 Engineering Mechanics
  14.1201 Engineering Physics/Applied Physics
  14.1301 Environmental/Environmental Health Engineering
  14.1401 Industrial Engineering
  14.1501 Materials Engineering
  14.1601 Mechanical Engineering
  14.1701 Metallurgical Engineering
  14.1801 Mining and Mineral Engineering
  14.1901 Naval Architecture and Marine Engineering
  14.2001 Nuclear Engineering
  14.2101 Petroleum Engineering
  14.2201 Systems Engineering
  14.2301 Transportation and Highway Engineering
  14.2401 Forest Engineering
  14.2501 Petroleum Engineering
  14.3301 Construction Engineering
  14.3501 Industrial Safety Technology
  14.3601 Manufacturing Engineering
  14.3701 Operations Research
  14.3801 Surveying Engineering
  14.3901 Geological/Geophysical Engineering
  14.4001 Paper Science and Engineering
  14.4101 Electromechanical Engineering
  14.4201 Mechatronics, Robotics, and Automation Engineering
  14.4301 Biochemical Engineering
  14.4401 Engineering Chemistry
  14.4501 Biological/Biosystems Engineering
  14.9999 Engineering, Other

15.xxxx — Engineering Technologies
  15.0000 Engineering Technology, General
  15.0101 Architectural Engineering Technology
  15.0201 Civil Engineering Technology
  15.0303 Electrical, Electronic and Communications Engineering Technology
  15.0401 Electromechanical Technology
  15.0501 Environmental Engineering Technology
  15.0507 Environmental and Pollution Control Technology
  15.0601 Industrial Technology/Technician
  15.0611 Metallurgical Technology/Technician
  15.0612 Industrial Technology/Technician
  15.0613 Manufacturing Engineering Technology/Technician
  15.0614 Welding Engineering Technology/Technician
  15.0801 Aeronautical/Aerospace Engineering Technology
  15.0901 Mining and Petroleum Technologies
  15.1001 Construction Engineering Technology
  15.1101 Engineering-Related Technologies
  15.1201 Computer Engineering Technology/Technician
  15.1302 CAD/CADD Drafting and/or Design Technology
  15.1303 Architectural Drafting and Architectural CAD/CADD

26.xxxx — Biological/Biomedical Sciences
  26.0101 Biology/Biological Sciences, General
  26.0102 Biomedical Sciences, General
  26.0202 Biochemistry
  26.0203 Biophysics
  26.0204 Molecular Biology
  26.0205 Molecular Biochemistry
  26.0299 Biochemistry, Biophysics and Molecular Biology, Other
  26.0301 Botany/Plant Biology
  26.0401 Cell/Cellular Biology and Histology
  26.0501 Microbiology, General
  26.0503 Medical Microbiology and Bacteriology
  26.0504 Virology
  26.0507 Immunology
  26.0599 Microbiology, Immunology, and Related Sciences, Other
  26.0701 Zoology/Animal Biology
  26.0801 Genetics, General
  26.0804 Human Genetics
  26.0806 Molecular Genetics
  26.0807 Plant Genetics
  26.0901 Physiology, General
  26.1001 Pharmacology
  26.1102 Bioinformatics
  26.1201 Biotechnology
  26.1301 Ecology
  26.1302 Marine Biology and Biological Oceanography
  26.1305 Environmental Biology
  26.1309 Epidemiology
  26.1399 Ecology, Evolution, Systematics and Population Biology, Other
  26.9999 Biological and Biomedical Sciences, Other

40.xxxx — Physical Sciences
  40.0101 Physical Sciences
  40.0201 Astronomy
  40.0401 Atmospheric Sciences and Meteorology
  40.0501 Chemistry, General
  40.0502 Analytical Chemistry
  40.0503 Inorganic Chemistry
  40.0504 Organic Chemistry
  40.0506 Physical Chemistry
  40.0507 Polymer Chemistry
  40.0508 Chemical Physics
  40.0509 Environmental Chemistry
  40.0510 Forensic Chemistry
  40.0599 Chemistry, Other
  40.0601 Geology/Earth Science
  40.0602 Geochemistry
  40.0603 Geophysics and Seismology
  40.0604 Paleontology
  40.0699 Geological and Earth Sciences, Other
  40.0801 Physics, General
  40.0802 Atomic/Molecular Physics
  40.0804 Elementary Particle Physics
  40.0805 Plasma and High-Temperature Physics
  40.0806 Nuclear Physics
  40.0807 Optics/Optical Sciences
  40.0808 Solid State and Low-Temperature Physics
  40.0809 Acoustics
  40.0810 Theoretical and Mathematical Physics
  40.0899 Physics, Other
  40.1001 Materials Science
  40.1002 Materials Chemistry

27.xxxx — Mathematics and Statistics
  27.0101 Mathematics, General
  27.0102 Algebra and Number Theory
  27.0103 Analysis and Functional Analysis
  27.0104 Geometry/Geometric Analysis
  27.0105 Topology and Foundations
  27.0199 Mathematics, Other
  27.0301 Applied Mathematics, General
  27.0302 Computational Mathematics
  27.0303 Computational Applied Mathematics
  27.0304 Informatics and Computer Science
  27.0305 Financial Mathematics
  27.0306 Mathematical Biology
  27.0399 Applied Mathematics, Other
  27.0501 Statistics, General
  27.0502 Mathematical Statistics and Probability
  27.0503 Mathematics and Statistics
  27.0599 Statistics, Other

52.xxxx — Business (STEM-designated subset)
  52.1301 Management Science, General
  52.1302 Business Statistics
  52.1304 Actuarial Science
  52.1399 Management Sciences and Quantitative Methods, Other
```

### 17.4 OPT/CPT Rules Reference
```
OPT (Optional Practical Training):
  Eligibility:    F-1 students who have been enrolled full-time for 1 academic year
  Types:          Pre-completion OPT (during studies); Post-completion OPT (after graduation)
  Duration:       12 months standard; +24 months STEM extension = 36 months total
  STEM Extension: Must work for E-Verify employer; I-983 Training Plan required; 60-day grace
  Application:    Form I-765 to USCIS; requires DSO recommendation in SEVIS first
  EAD Card:       Employment Authorization Document — required to start work
  Grace Period:   60 days after OPT ends (or program end if pre-OPT)
  Unauthorized:   >90 days gap = unlawful presence; jeopardizes future visa

CPT (Curricular Practical Training):
  Eligibility:    After 1 academic year of full-time enrollment (exceptions for some programs)
  Authorization:  Issued by DSO on I-20; employer + dates must be listed
  Full-time CPT:  12+ months full-time CPT = OPT ELIGIBILITY LOST
  Part-time CPT:  No affect on OPT eligibility
  Unpaid CPT:     Also counts toward 12-month limit
  Must be:        Integral part of curriculum; often tied to specific course for credit
```

### 17.5 F-1 Visa Interview Q&As (50 Complete)
```json
[
  {"q": "Why do you want to study in the USA?", "a": "I want to pursue [program] at [university] because it has [specific faculty/research/ranking]. The USA offers cutting-edge curriculum and industry exposure that isn't available in India for this field. I plan to return to India after completing my degree and contribute to [industry/family business/government]."},
  {"q": "Why this particular university?", "a": "I researched over 50 universities. [University] ranks in the top [X] globally for [field]. Professor [name] leads research in [area] that aligns with my thesis topic. Their [lab/center/curriculum] was the deciding factor."},
  {"q": "What will you study?", "a": "I will be pursuing a [Master's/Bachelor's/PhD] in [Program Name], CIP code [XXX.XXXX], focusing on [specialization]. The program is [X] years and I'll graduate in [month, year]."},
  {"q": "How will you finance your studies?", "a": "My total cost for [X] years is [amount]. My father [name], who works as [occupation], has [amount] in savings — bank statements are attached. I also have an education loan of [amount] approved by [bank]. The I-20 shows the school has verified my funding."},
  {"q": "Do you have any relatives in the USA?", "a": "I have [no relatives / a [relation] who is a US citizen/GC holder], but my ties to India are strong — my [family/property/job offer/business] ensures I will return after completing my studies."},
  {"q": "What are your plans after graduation?", "a": "After graduation, I plan to return to India and work for [specific company/family business/field]. The [program] skills are in high demand in India because [specific reason]. I have no intention of applying for permanent residency."},
  {"q": "Why not study in India?", "a": "India has strong engineering colleges, but [specific program] at the graduate level lacks [specific research infrastructure/industry tie-ups/faculty specialization] that [university] offers. This specific program is not available in India at the same level."},
  {"q": "What is your GPA/academic background?", "a": "I completed my [degree] from [institution] with [X.X/10 or X.X/4.0 GPA], ranking [X] in my class of [Y] students. I scored [X] on TOEFL and [Y] on GRE."},
  {"q": "Have you been to the USA before?", "a": "No, this is my first visit / Yes, I visited in [year] for [reason] and returned to India as scheduled."},
  {"q": "Where will you live in the USA?", "a": "I'll live in university housing for the first year — [dorm name], which costs [amount]/month, already included in my I-20 financial estimate. After that, I'll explore shared off-campus housing."},
  {"q": "Who is sponsoring you?", "a": "My father [name], employed as [occupation] at [company] for [X] years, is my primary sponsor. His annual income is [amount] and savings are [amount], documented in the enclosed bank statements."},
  {"q": "What is the SEVIS fee?", "a": "I have paid the $350 SEVIS fee. My receipt number is [N-XXX-XXX-XXXXX]."},
  {"q": "Did you apply to any other universities?", "a": "Yes, I applied to [X] universities including [names]. I chose [university] because [specific reason — financial aid/ranking/program/location]."},
  {"q": "What is your intended major and how will it help you in India?", "a": "My major is [X] with a focus on [Y]. India's [industry] sector is growing rapidly, and expertise in [Z] will allow me to [specific career outcome] upon return."},
  {"q": "Do you have job offer in the USA?", "a": "No, I don't have a job offer in the USA. I will be a full-time student. If authorized OPT training is required for my program, it will be for academic purposes, and I intend to return to India after completing my program."},
  {"q": "Are you married?", "a": "No, I'm single / Yes, married. My spouse will remain in India / My spouse will accompany me on an F-2 visa and will not work in the USA."},
  {"q": "What is the name of your DSO?", "a": "My Designated School Official is [DSO name], contact [email/phone], at the International Students Office of [university]."},
  {"q": "What is your program start date?", "a": "My program starts [date] and the I-20 program end date is [date]. I plan to arrive [date] and complete the International Student Orientation."},
  {"q": "Can you show me your I-20?", "a": "[Present original I-20 signed by DSO and student]. This is the original I-20 issued by [university], SEVIS ID [N-number], program start [date], end [date]."},
  {"q": "What if you don't complete your degree?", "a": "I'm fully committed and have planned my finances for the full duration. But if circumstances required, I would return to India — my family is here, my property is here, and I have strong reasons to be back."},
  {"q": "Why did you choose this field of study?", "a": "I've been passionate about [field] since [specific experience]. During my undergrad, I worked on [project]. I published/presented [work]. This program builds directly on that foundation."},
  {"q": "Did you receive any scholarship?", "a": "Yes, [university] offered me [scholarship name] worth [$X] per year, which is reflected on my I-20 / No, I'm self-funded as shown in my financial documents."},
  {"q": "What is the tuition for your program?", "a": "Annual tuition is [$X], with living expenses of approximately [$Y], for a total of [$Z] per year. My I-20 reflects this amount: [total for program duration]."},
  {"q": "Will you work while studying?", "a": "I may work on-campus for up to 20 hours per week as permitted under F-1 regulations. This is supplemental — my primary financial support comes from my family/sponsor."},
  {"q": "Have you ever been denied a visa?", "a": "No, I have never been denied a US visa / Yes, I was denied in [year] because [reason]. Since then, [changes that address previous denial]."},
  {"q": "What ties do you have to India?", "a": "Strong ties: my parents reside in [city]; my family owns property at [location]; I have a confirmed job offer / business to join upon return; all my siblings/family are in India."},
  {"q": "Can you explain the gap in your education?", "a": "After completing [degree] in [year], I worked at [company] for [X] years in [role] to gain industry experience before pursuing my master's. This experience strengthens my application significantly."},
  {"q": "What does your father do?", "a": "My father is a [occupation] at [company/organization] and has worked there for [X] years. His monthly income is [amount] and he has [savings] in savings, as shown in the enclosed documents."},
  {"q": "What score did you get on GRE/TOEFL?", "a": "GRE: Verbal [X]/170, Quantitative [Y]/170, Writing [Z]/6 — total [overall]. TOEFL iBT: [total] — Reading [X], Listening [Y], Speaking [Z], Writing [W]."},
  {"q": "Is this university accredited?", "a": "Yes, [university] is accredited by [regional accreditor, e.g., SACSCOC/MSCHE/HLC] and is a DHS-approved school to enroll F-1 students, SEVIS School ID [XXXXXXXX]."},
  {"q": "How did you find this university?", "a": "I used [rankings/professor's research/alumni network] to shortlist universities. I found [university] through [specific source] and connected with current students from India who confirmed its strengths."},
  {"q": "Are your parents US citizens or permanent residents?", "a": "No, both my parents are Indian citizens and are permanently based in India."},
  {"q": "What is your SEVIS ID?", "a": "My SEVIS ID is [N-number] and it is printed on my I-20, form page 1, top right corner."},
  {"q": "Did you get I-20 directly from the university?", "a": "Yes, [university] sent my I-20 digitally to my email / by mail to my home address in India. The I-20 is signed by DSO [name]."},
  {"q": "What documents do you have today?", "a": "I have: Original I-20, DS-160 confirmation, SEVIS fee receipt, MRV fee receipt, passport, bank statements (3 months), sponsor's income proof, admission offer letter, TOEFL/GRE scores, transcripts, photographs."},
  {"q": "Do you plan to apply for a green card?", "a": "No. My intention is to study, complete my degree, and return to India. I have no plans to apply for permanent residency."},
  {"q": "Why should I give you a student visa?", "a": "I am a genuine student with an admission from an SEVIS-certified university, adequate funding, and strong ties to India. My academic record shows [GPA/rank], and I have a clear plan to return upon completing my education."},
  {"q": "How long is your program?", "a": "My program is [X] years / [X] semesters, starting [month, year] and ending [month, year] as stated on my I-20."},
  {"q": "Where is the university located?", "a": "[University] is located in [city], [state]. It's known for [specific feature]. The nearest international airport is [airport name]."},
  {"q": "Have you visited any country outside India?", "a": "Yes, I visited [country] for [reason] in [year] and returned on schedule / No, the USA will be my first international trip."},
  {"q": "What is OPT?", "a": "Optional Practical Training is a 12-month work authorization for F-1 students to gain practical work experience in their field of study. For STEM degrees, it can be extended by 24 additional months with a STEM OPT extension."},
  {"q": "Do you know the university's acceptance rate?", "a": "[University] has an acceptance rate of approximately [X]% for the [program] program. I was selected among [X,000] applicants based on my academic merit and research background."},
  {"q": "What research will you do there?", "a": "I will be working in [Professor name]'s lab on [research topic], which relates to [field]. This aligns with my undergraduate project on [topic] and my long-term career goal to work in [area]."},
  {"q": "How many Indians are at the university?", "a": "Approximately [X] Indian students are enrolled at [university]. The Office of International Education supports [total] international students from [X] countries."},
  {"q": "Did anyone help you prepare for this interview?", "a": "I prepared myself using [official resources/university guidance/USCIS website]. I understand my program and my reasons for studying in the USA fully."},
  {"q": "What happens if your visa application is denied?", "a": "If denied, I will review the reason carefully, address any concerns, and may reapply. I am genuinely committed to this academic goal, but my life and family are in India regardless."},
  {"q": "Can you prove your financial ability?", "a": "Yes. My documents include 3 months of bank statements showing [amount], my father's salary slips, Form 16 (tax certificate), and the education loan sanction letter. All amounts meet or exceed the I-20 financial requirement of [$amount]."},
  {"q": "What is your long-term career goal?", "a": "After completing my [degree] and gaining any necessary training under OPT, I plan to return to India and [specific goal: join family business/work at specific company/contribute to government initiative]. India's [sector] offers excellent opportunities in my field."},
  {"q": "Are you going to stay in the USA after graduation?", "a": "No. I am a student visa applicant, and my visa is non-immigrant intent. I plan to return to India, where my career opportunities, family, and future are based."}
]
```

### 17.6 Retrieval Query Templates — wehive-f1-sevis
```
FS-RT-001: "F1 visa interview questions answers preparation {year}"
FS-RT-002: "SEVIS ID format what is N number student visa USA"
FS-RT-003: "OPT eligibility rules duration STEM extension Indian student"
FS-RT-004: "CPT authorization rules 12 months limit OPT affect"
FS-RT-005: "STEM CIP codes list engineering computer science USA OPT"
FS-RT-006: "F1 visa denied reapply reasons solutions 221g {year}"
FS-RT-007: "cap-gap extension H1B OPT expire SEVIS status"
FS-RT-008: "SEVIS fee payment receipt F1 student DS-160"
```

---

## 18. WEHIVE-PASSPORT-MATRIX NAMESPACE

### 18.1 Namespace Overview
```
Namespace:        wehive-passport-matrix
Index:            wehive-prod-v3
Estimated chunks: ~30,000
Covers:           Visa-free / VOA / e-visa / visa-required matrix for Indian passport
                  + 5 other source nationalities (Bangladesh, Nepal, Sri Lanka, Pakistan, Nigeria)
                  + Schengen area rules + UK, USA, Canada, Australia separate entry
```

### 18.2 Indian Passport — Visa-Free Destinations (2024)
```
VISA-FREE (no visa needed, stamp on arrival):
- Bhutan (no passport needed, Voter ID/passport accepted)
- Nepal (no passport needed, Voter ID/passport accepted)
- Maldives (30-day visa on arrival, free)
- Mauritius (90 days visa-free)
- Indonesia (30 days visa-free, effective 2024)
- Seychelles (30 days, visa-free permit on arrival)
- Trinidad and Tobago (90 days)
- Dominica (180 days)
- Haiti (90 days)
- El Salvador (90 days)
- Micronesia (30 days)
- Jamaica (6 months)
- Vanuatu (30 days)
- Serbia (30 days, bilateral agreement)
- Senegal (90 days)
- Niue (30 days)
- Cook Islands (31 days)
- Montserrat (6 months)
- British Virgin Islands (1 month)
- Svalbard (no visa required)
- Saint Vincent and the Grenadines (30 days)
- Samoa (60 days)
- Tunisia (3 months, conditional)
- Ecuador (90 days)
- Qatar (30 days VOA — expanded 2023)
- Fiji (4 months)

VISA ON ARRIVAL (VOA — obtain on landing):
- Thailand (30 days, INR equivalent ~₹800 fee)
- Cambodia (30 days, $30 USD)
- Myanmar (28 days, $50 USD)
- Maldives (30 days, free)
- Comoros (45 days, €30 EUR)
- Laos (30 days, $35 USD)
- Madagascar (30 days, 115,000 Ariary)
- Myanmar (28 days, $50)
- Tuvalu (30 days)
- Jordan (30 days, JOD 40)
- Iran (15 days, USD 75)
- Nepal (extended, $25/$40/$100)
- Djibouti (31 days, $23 USD)
- Ethiopia (90 days, $50 USD)
- Guinea-Bissau (90 days)
- Cape Verde (eVisa)
- Zimbabwe (30 days, $55–$75 USD)
- Timor-Leste (30 days, $30 USD)
- Palau (30 days, $50 USD)

E-VISA (apply online before travel):
- Sri Lanka (eVisa, USD 20–35, 30 days)
- Malaysia (eVisa, 30 days, MYR 200)
- Vietnam (eVisa, USD 25, 90 days — 2023 update)
- Singapore (IPA/IVP for specific purposes; general requires visa)
- Turkey (eVisa, USD 51, 30 days, multiple entry)
- Bahrain (eVisa, BHD 5, 14 days)
- Oman (eVisa, OMR 20, 30 days)
- Saudi Arabia (eVisa for tourism 2024, SAR 300+)
- UAE (eVisa for tourism — 30/60/90 days, AED 250+)
- Azerbaijan (ASAN eVisa, AZN 26, 30 days)
- Georgia (eVisa, USD 20, 30 days)
- Kenya (eTA 2024 — replaced VOA; USD 30)
- Egypt (eVisa, USD 25, 30 days)
- Rwanda (eVisa, USD 30, 30 days)
- Uganda (eVisa, USD 50, 90 days)
- Tanzania (online visa application, USD 50)
- Mozambique (eVisa, USD 45, 30 days)
- Armenia (eVisa, USD 6, 21 days)
- Tajikistan (eVisa, USD 50, 45 days)
- India eVisa for foreigners (reference — not applicable)
- New Zealand (NZeTA, NZD 9+23 tourist levy, 90 days)
- Australia (eVisitor 651 — Indian passport NOT eligible; ETA 601 — NOT eligible; must apply ETA via ImmiAccount)
- Canada (eTA — Indian passport NOT eligible; must apply regular TRV)

REQUIRES FULL VISA (embassy application):
- USA (B1/B2, F1, H1B etc. — embassy appointment)
- UK (Standard Visitor, Student, Work)
- Canada (TRV — Temporary Resident Visa)
- Schengen (27 countries — Schengen Visa C)
- China (in-person application required; 15-day visa-free 2024 for some routes — verify)
- Japan (in-person application; 2023 Individual Tourism Visa restored)
- South Korea (in-person application; 10-year multiple entry for some categories)
- Russia (e-Visa for tourists; embassy for other purposes)
- New Zealand (requires visa; or NZeTA for eVisa-equivalent) 
```

### 18.3 Schengen Visa Rules for Indian Passport
```
SCHENGEN ZONE COUNTRIES (27):
Austria, Belgium, Croatia (2023), Czech Republic, Denmark, Estonia, Finland, France, Germany,
Greece, Hungary, Iceland, Italy, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta,
Netherlands, Norway, Poland, Portugal, Slovakia, Slovenia, Spain, Sweden, Switzerland

NON-SCHENGEN EU: Bulgaria, Cyprus, Ireland, Romania (observer)
UK: Completely separate — requires separate visa

SCHENGEN VISA TYPES:
Type A: Airport Transit Visa (required for Indian passport through most Schengen airports)
Type C: Short-stay (up to 90 days in any 180-day period)
Type D: National Long-Stay (issued by individual country for study/work)

TYPE C RULES:
- Maximum 90 days within any rolling 180-day period
- Count BOTH entry day and exit day
- Track calculator: travel.ec.europa.eu/travellers-explorer
- Indian passport: Type C requires pre-travel visa application through embassy/VFS

WHERE TO APPLY:
- Apply at embassy of the country where you'll spend most time
- If equal time: apply at country of FIRST entry
- Single-entry C visa: travel only to/through issuing country + transit other Schengen
- Multiple-entry C visa: move freely across Schengen zone

REQUIRED DOCUMENTS:
- Valid passport (6+ months beyond intended stay)
- Schengen visa application form
- 2 passport photos (biometric, white background)
- Travel insurance (€30,000 minimum coverage)
- Flight bookings (round-trip, not final purchases needed)
- Hotel/accommodation bookings
- Bank statements (last 3 months, sufficient funds)
- ITR (last 2 years for employed)
- Leave letter from employer / enrollment letter from university
- Financial sponsorship proof if applicable
- Visa fee: €80 (adult), €40 (6-11 yrs), free (<6 yrs)
- VFS service charge: ~₹1,500 additional

PROCESSING TIME: 15 calendar days (standard); up to 30–60 days in exceptional cases
BIOMETRICS: Required if not collected in last 59 months; collected at VFS
```

### 18.4 Other Source Nationalities Matrix
```
BANGLADESHI PASSPORT:
Visa-free: Nepal, Bhutan, Maldives (VOA), Indonesia (2024 update — confirm)
eVisa:     Kenya, Turkey, Egypt, Jordan
Requires:  India (requires visa/travel documents — land border regs apply), UK, Schengen, USA
Special:   SAARC Travel Document option (limited)

NEPALESE PASSPORT:
Visa-free: India (open border, no visa required at all), Bhutan
eVisa:     Multiple — better mobility than BD/PAK
UK/Schengen/USA: Requires full visa

SRILANKAN PASSPORT:
eVisa:     India (eVisa available), Maldives, Indonesia, Kenya, Turkey
VOA:       Thailand, Cambodia
Requires:  UK, Schengen, USA, Canada, Australia — full visa

PAKISTANI PASSPORT:
Very restricted: ~32 countries visa-free/VOA
eVisa:     Turkey, Malaysia (limited), Azerbaijan
Requires:  India (restricted; special permits), UK, Schengen, USA, Australia, Canada
Special:   OIC member states have some facilitation; SAARC mobility limited

NIGERIAN PASSPORT:
VOA:       Ghana, Benin, Togo, Cameroon, Kenya (ETA), Rwanda
eVisa:     Turkey, Egypt, India (eVisa available)
Requires:  UK (strong restrictions), Schengen, USA, Canada — biometric enrolment mandatory
Particularly restrictive for UK and Schengen due to high refusal rates
```

### 18.5 Retrieval Query Templates — wehive-passport-matrix
```
PM-RT-001: "Indian passport visa free countries list 2024"
PM-RT-002: "Schengen visa rules Indian passport 90 day limit documents"
PM-RT-003: "visa on arrival Indian passport list 2024 {destination region}"
PM-RT-004: "e-visa countries Indian passport apply online before travel"
PM-RT-005: "UK visa requirements Indian students 2024"
PM-RT-006: "Canadian TRV vs eTA Indian passport eligibility"
PM-RT-007: "{nationality} passport countries visa free travel restrictions 2024"
PM-RT-008: "Schengen visa application documents required VFS India"
```

---

## 19. WEHIVE-INTERVIEW-PREP EXPANSION (9000+ Q&As)

### 19.1 Namespace Overview
```
Namespace:           wehive-interview-prep (expansion of existing namespace)
Index:               wehive-prod-v3
New chunks to add:   ~400,000
Embedding model:     text-embedding-3-large (3072 dims)
Schema:              {id, visa_type, country, category, question, answer, difficulty, tags}
Total coverage:      12 visa types × 16 countries × 47 categories = 9,024+ Q&As
```

### 19.2 Q&A Schema
```json
{
  "id": "IP-{VISA_TYPE}-{COUNTRY_CODE}-{CATEGORY_CODE}-{SEQ}",
  "visa_type": "F1|UK_STUDENT|CANADA_STUDY|AUS_500|GER_NATIONAL|SCHENGEN_C|IRELAND_STUDY|NZ_STUDENT|JAPAN_STUDENT|KOREA_D2|SINGAPORE_STP|UAE_STUDENT|FRANCE_VLS|NETHERLANDS_STUDY|SWEDEN_STUDY|ITALY_STUDY",
  "country": "USA|UK|CANADA|AUSTRALIA|GERMANY|SCHENGEN|IRELAND|NEW_ZEALAND|JAPAN|SOUTH_KOREA|SINGAPORE|UAE|FRANCE|NETHERLANDS|SWEDEN|ITALY",
  "category": "FINANCIAL|TIES_TO_HOME|ACADEMIC|PROGRAM|WORK_RIGHTS|POST_STUDY|ACCOMMODATION|LANGUAGE|DOCUMENTS|TRAVEL_HISTORY|FAMILY|INTENTIONS|INSTITUTION|SCHOLARSHIP|SPECIFIC_RULES",
  "difficulty": "basic|intermediate|advanced|tricky",
  "question": "<question text>",
  "answer": "<model answer — 2-5 sentences, specific, citable>",
  "tags": ["immigration", "financial", "f1", "sevis", "study-abroad"]
}
```

### 19.3 Complete Q&A Bank — USA F-1 (200 entries sample)
```json
[
  {"id":"IP-F1-USA-FINANCIAL-001","visa_type":"F1","country":"USA","category":"FINANCIAL","difficulty":"basic","question":"How much money do you have to support yourself?","answer":"I have sufficient funds as confirmed in my I-20. My family has [amount] in savings documented through bank statements. My father earns [salary/month] and has been sponsoring my education throughout.","tags":["financial","i20","sevis"]},
  {"id":"IP-F1-USA-FINANCIAL-002","visa_type":"F1","country":"USA","category":"FINANCIAL","difficulty":"intermediate","question":"Your bank statements show money deposited just recently. Why?","answer":"The funds were transferred to consolidate accounts for easier documentation. The underlying wealth comes from [source — property sale/salary accumulation/business income]. I can provide additional documentation if needed.","tags":["financial","bank","scrutiny"]},
  {"id":"IP-F1-USA-FINANCIAL-003","visa_type":"F1","country":"USA","category":"FINANCIAL","difficulty":"advanced","question":"How will you pay for subsequent years if your savings are depleted after year 1?","answer":"My I-20 shows [total program cost]. My father's ongoing salary of [amount/month] will cover subsequent years. Additionally, I am applying for [teaching assistantship/research assistantship] which could offset [amount/year]."},
  {"id":"IP-F1-USA-FINANCIAL-004","visa_type":"F1","country":"USA","category":"FINANCIAL","difficulty":"tricky","question":"This scholarship doesn't cover your full expenses. Where will the rest come from?","answer":"Correct — my scholarship covers [amount], and the remaining [balance] will be from family savings. My parents have [amount] set aside specifically for my education, as shown in the dedicated education account statement I've provided."},
  {"id":"IP-F1-USA-FINANCIAL-005","visa_type":"F1","country":"USA","category":"FINANCIAL","difficulty":"basic","question":"Who is paying for your education?","answer":"My father [name] is my primary sponsor. He is a [occupation] with [years] years of employment at [company]. His monthly income is [amount] and savings are [amount]. I also have an education loan from [bank] for [amount]."},
  {"id":"IP-F1-USA-TIES_TO_HOME-001","visa_type":"F1","country":"USA","category":"TIES_TO_HOME","difficulty":"basic","question":"What will bring you back to India after graduation?","answer":"My family is in India — parents, siblings. My family owns property in [city]. I have a firm job offer from [company] contingent on my degree. Additionally, my career goal is to [specific India-based goal] which requires me to be in India."},
  {"id":"IP-F1-USA-TIES_TO_HOME-002","visa_type":"F1","country":"USA","category":"TIES_TO_HOME","difficulty":"intermediate","question":"Your brother is a US citizen. Won't you want to stay with him?","answer":"While I have family in the USA, my primary ties are to India. My parents depend on me; I am the oldest/only child. The family business/property in India will be my responsibility. My career plans are India-centric, and I respect the non-immigrant nature of the F-1 visa."},
  {"id":"IP-F1-USA-TIES_TO_HOME-003","visa_type":"F1","country":"USA","category":"TIES_TO_HOME","difficulty":"tricky","question":"Your field has high demand in the USA. Why would you come back?","answer":"I understand the demand, and while OPT may allow temporary training, my long-term goals are India-based. [India startup/government/family business] in this field is growing rapidly, and I see a stronger personal opportunity in India. I'm not interested in immigration pathways."},
  {"id":"IP-F1-USA-ACADEMIC-001","visa_type":"F1","country":"USA","category":"ACADEMIC","difficulty":"basic","question":"What was your undergraduate GPA?","answer":"I completed my B.Tech/B.Sc/B.E in [discipline] from [institution] with a CGPA of [X]/10 ([equivalent]/4.0). I ranked [X] in my department of [Y] students. My final year project was on [topic]."},
  {"id":"IP-F1-USA-ACADEMIC-002","visa_type":"F1","country":"USA","category":"ACADEMIC","difficulty":"intermediate","question":"There's a gap between your undergraduate and your graduate application. What were you doing?","answer":"I worked as [role] at [company] for [duration]. This professional experience confirmed my passion for [field] and exposed me to [specific knowledge gap] that motivated me to pursue a master's degree in [program]."},
  {"id":"IP-F1-USA-ACADEMIC-003","visa_type":"F1","country":"USA","category":"ACADEMIC","difficulty":"basic","question":"What are your GRE/GMAT/TOEFL/IELTS scores?","answer":"GRE: [V XX/170, Q XX/170, AW X.X] | TOEFL iBT: [total XX] — Reading [XX], Listening [XX], Speaking [XX], Writing [XX]. These scores meet [university]'s minimum requirement of [scores] for the [program]."},
  {"id":"IP-F1-USA-PROGRAM-001","visa_type":"F1","country":"USA","category":"PROGRAM","difficulty":"basic","question":"Tell me about your program.","answer":"I'm enrolled in the [M.S./Ph.D./B.S.] program in [Department] at [University]. It is a [X]-credit, [Y]-semester program. Key courses include [Course 1], [Course 2], and [Course 3]. I'll also work on a thesis/capstone project in [topic area]."},
  {"id":"IP-F1-USA-PROGRAM-002","visa_type":"F1","country":"USA","category":"PROGRAM","difficulty":"intermediate","question":"Why this specific program and not a similar one at another university?","answer":"[University]'s [program] is uniquely strong in [area]. Professor [name] leads the [lab/center] working on [research]. Their collaboration with [industry partner] is exactly the kind of applied research I want exposure to. Three of my undergraduate professors are alumni of this program."},
  {"id":"IP-F1-USA-WORK_RIGHTS-001","visa_type":"F1","country":"USA","category":"WORK_RIGHTS","difficulty":"basic","question":"Can you work in the USA on an F-1 visa?","answer":"On-campus employment is permitted up to 20 hours per week during the academic year, full-time during breaks. Off-campus work requires USCIS authorization through CPT (Curricular Practical Training) or OPT (Optional Practical Training) and is tied to my field of study."},
  {"id":"IP-F1-USA-WORK_RIGHTS-002","visa_type":"F1","country":"USA","category":"WORK_RIGHTS","difficulty":"tricky","question":"Do you plan to apply for H-1B after OPT?","answer":"I am here as a student and my primary purpose is to complete my education. I haven't made decisions beyond my program. Should OPT training be relevant for my career development, I would follow the legal process. However, immigration to the USA is not my intent."},
  {"id":"IP-F1-USA-POST_STUDY-001","visa_type":"F1","country":"USA","category":"POST_STUDY","difficulty":"basic","question":"What will you do after you graduate?","answer":"After graduating, I plan to return to India and [specific plan — join company/start venture/join family business/pursue further study]. India's [sector] offers strong opportunities and my family and roots are there."},
  {"id":"IP-F1-USA-DOCUMENTS-001","visa_type":"F1","country":"USA","category":"DOCUMENTS","difficulty":"basic","question":"Do you have your I-20?","answer":"Yes. Here is the original I-20 issued by [University], bearing my SEVIS ID [N-number]. It is signed by DSO [name] on [date]. My program start date is [date] and end date is [date]."},
  {"id":"IP-F1-USA-DOCUMENTS-002","visa_type":"F1","country":"USA","category":"DOCUMENTS","difficulty":"intermediate","question":"Your I-20 financial amount is very high. Can your family really afford this?","answer":"Yes. The financial documents I've provided show that my family's combined resources including savings, annual income, and the education loan approved by [bank] cover the [amount] required for my entire [X]-year program."},
  {"id":"IP-F1-USA-INTENTIONS-001","visa_type":"F1","country":"USA","category":"INTENTIONS","difficulty":"tricky","question":"How do I know you'll return to India?","answer":"I understand the concern. My entire family is in India. I am the primary support for my aging parents. My undergraduate institution, professional network, and career goals are all India-based. I have no pending immigration petition or relationship in the USA that would incentivize me to overstay."},
  {"id":"IP-UK-STUDENT-FINANCIAL-001","visa_type":"UK_STUDENT","country":"UK","category":"FINANCIAL","difficulty":"basic","question":"Have you shown sufficient funds for the UK?","answer":"Yes. I have [amount] held for 28 consecutive days as required. For studying outside London, the requirement is £1,023/month × 9 months = £9,207. My bank statements show [amount], well above this threshold. I also have [tuition] separately for first-year fees."},
  {"id":"IP-UK-STUDENT-ACADEMIC-001","visa_type":"UK_STUDENT","country":"UK","category":"ACADEMIC","difficulty":"basic","question":"Why the UK for your studies?","answer":"The UK is home to world-class universities like [institution], ranked [X] globally. The program I've been accepted into — [program name] — offers [specific feature: faculty, industry, research]. The UK's graduate route also allows me to gain professional experience post-degree."},
  {"id":"IP-UK-STUDENT-PROGRAM-001","visa_type":"UK_STUDENT","country":"UK","category":"PROGRAM","difficulty":"basic","question":"What is your CAS number?","answer":"My CAS (Confirmation of Acceptance for Studies) number is [XXX-XXXX-XXXX], issued by [University]. It confirms my enrollment in [program] at [university], starting [date]."},
  {"id":"IP-UK-STUDENT-SPECIFIC_RULES-001","visa_type":"UK_STUDENT","country":"UK","category":"SPECIFIC_RULES","difficulty":"intermediate","question":"Did you pay the Immigration Health Surcharge?","answer":"Yes, I paid the IHS of £776/year as part of my visa application. For my [X]-year program, I paid £[X × 776] in total. The reference number is [IHS reference] visible in my application confirmation."},
  {"id":"IP-UK-STUDENT-POST_STUDY-001","visa_type":"UK_STUDENT","country":"UK","category":"POST_STUDY","difficulty":"basic","question":"Do you know about the UK Graduate Route?","answer":"Yes. The Graduate Route allows me to stay in the UK for 2 years after a bachelor's or master's degree, or 3 years after a PhD, to work or look for work at any skill level. However, my primary intent is to return to India after completing my studies."},
  {"id":"IP-CANADA-STUDY-FINANCIAL-001","visa_type":"CANADA_STUDY","country":"CANADA","category":"FINANCIAL","difficulty":"basic","question":"How will you fund your studies in Canada?","answer":"My total funding includes: CAD [tuition] in first-year tuition + CAD 20,635 living allowance as mandated by IRCC. My funds come from family savings of CAD [amount], education loan of CAD/INR [amount] from [bank], and a partial scholarship from [institution] of CAD [amount]."},
  {"id":"IP-CANADA-STUDY-SPECIFIC_RULES-001","visa_type":"CANADA_STUDY","country":"CANADA","category":"SPECIFIC_RULES","difficulty":"intermediate","question":"Is Canada capping international students?","answer":"Yes, in 2024 Canada introduced provincial intake caps for undergraduate international students. My institution, [name], holds confirmed allocation, and my study permit was issued within that cap. Graduate programs and language schools have separate rules."},
  {"id":"IP-AUS-500-SPECIFIC_RULES-001","visa_type":"AUS_500","country":"AUSTRALIA","category":"SPECIFIC_RULES","difficulty":"intermediate","question":"What is the GTE requirement?","answer":"The Genuine Temporary Entrant requirement means I must demonstrate that I'm coming to Australia temporarily for genuine study. My statement explains my career goals, why this specific program and institution, my ties to India, and my intent to return."},
  {"id":"IP-AUS-500-WORK_RIGHTS-001","visa_type":"AUS_500","country":"AUSTRALIA","category":"WORK_RIGHTS","difficulty":"basic","question":"How many hours can you work in Australia?","answer":"On subclass 500, I can work up to 48 hours per fortnight during the academic semester and unlimited hours during official school vacations and registered breaks. My enrollment certificate and academic calendar confirm semester dates."},
  {"id":"IP-GER-NATIONAL-FINANCIAL-001","visa_type":"GER_NATIONAL","country":"GERMANY","category":"FINANCIAL","difficulty":"basic","question":"Have you opened a blocked account for Germany?","answer":"Yes. I have deposited EUR 11,208 (EUR 934/month × 12 months) in a Sperrkonto/blocked account with [Fintiba/Expatrio/Deutsche Bank]. The account confirmation shows account number [XX] and confirms the restriction compliant with German visa requirements."},
  {"id":"IP-GER-NATIONAL-LANGUAGE-001","visa_type":"GER_NATIONAL","country":"GERMANY","category":"LANGUAGE","difficulty":"basic","question":"Do you speak German?","answer":"My program at [university] is taught entirely in English. I hold [IELTS/TOEFL score]. I am currently learning basic German (A1 level) for daily life. The university's enrollment letter confirms the medium of instruction is English."},
  {"id":"IP-SCHENGEN-C-FINANCIAL-001","visa_type":"SCHENGEN_C","country":"SCHENGEN","category":"FINANCIAL","difficulty":"basic","question":"How much money do you have for your Schengen trip?","answer":"I have EUR [amount] available. The recommended amount is approximately EUR 100/day per person in most Schengen countries. My bank statement shows INR [equivalent] held in savings. I also have a travel credit card with [limit] available."},
  {"id":"IP-SCHENGEN-C-TIES_TO_HOME-001","visa_type":"SCHENGEN_C","country":"SCHENGEN","category":"TIES_TO_HOME","difficulty":"basic","question":"Why will you return to India?","answer":"My family, job, and property are in India. I am employed as [role] at [company] and my employer has granted leave for [duration]. I have a return ticket booked for [date] and my leave ends on [date]."},
  {"id":"IP-JAPAN-STUDENT-SPECIFIC_RULES-001","visa_type":"JAPAN_STUDENT","country":"JAPAN","category":"SPECIFIC_RULES","difficulty":"intermediate","question":"Have you obtained a Certificate of Eligibility?","answer":"Yes. My Japanese university applied for and received the Certificate of Eligibility (COE) on my behalf from the regional Immigration Services Agency. The COE reference number is [number]. I must present this at the consulate to obtain my student visa (Ryugaku)."},
  {"id":"IP-KOREA-D2-SPECIFIC_RULES-001","visa_type":"KOREA_D2","country":"SOUTH_KOREA","category":"SPECIFIC_RULES","difficulty":"basic","question":"What is a D-2 visa?","answer":"The D-2 visa is South Korea's student visa for general study at universities, graduate schools, or junior colleges. It requires a standard of acceptance (입학허가서) from a Korean institution. The D-2-1 is for language programs, D-2-4 for undergraduate, D-2-6 for postgraduate."},
  {"id":"IP-FRANCE-VLS-SPECIFIC_RULES-001","visa_type":"FRANCE_VLS","country":"FRANCE","category":"SPECIFIC_RULES","difficulty":"intermediate","question":"What is Campus France and why was it required?","answer":"Campus France is the French government agency that manages international student enrollment. Indian students must apply through Campus France India (based in Delhi/Chennai/Mumbai/Hyderabad). This 'Colombo Process' gives a preliminary check before the embassy issues the VLS-TS Étudiant visa."}
]
```

### 19.4 Additional Interview Q&A Categories (Bulk Reference)

#### Category: Medical / Health
```
Q: Do you need a medical exam for a student visa?
A (F1):       Not required for F-1. Required for J-1. Optional but recommended for health clearance.
A (Canada):   Upfront medical required for Indian citizens for study permits.
A (Australia): Medical examination required; book with DIBP-approved panel physician in India.
A (UK):       TB test required for Indian applicants; book at UKVI-approved clinic.

Q: What vaccinations are required?
A: Most universities require MMR (measles/mumps/rubella), meningococcal meningitis, Hepatitis B, and COVID-19 vaccination records. Some US states mandate varicella. This varies by state/university, not by visa.
```

#### Category: Dependent Visa
```
Q: Can my spouse work on the dependent visa?
A (USA F-2): No. F-2 dependents are not eligible to work in the USA.
A (UK):      Yes, if the student is studying a full-time program at HEI level, spouse gets work rights.
A (Canada):  Spouse gets Open Work Permit if student is enrolled in master's/PhD or certain programs.
A (Australia): Spouse gets work rights if student is in bachelor's degree or higher.
A (Germany): Spouse can join but may not have automatic work rights; must apply separately.
A (Ireland): Partner must apply separately; no automatic work rights.

Q: How many family members can I bring?
A: There is generally no cap on dependents. Spouse + children under 18 are typical. Each dependent files separately. Each dependent requires additional financial proof in the application.
```

#### Category: Post-Study Work Visa
```
COUNTRY:         VISA TYPE / DURATION / CONDITIONS
USA:             OPT 12 months; STEM OPT +24 months; requires EAD + STEM employer
UK:              Graduate Route: 2 years (bachelor/master), 3 years (PhD)
Canada:          PGWP: equal to program length, max 3 years; must apply within 180 days of graduation
Australia:       Subclass 485: 2–4 years; regional/STEM extra; must apply within 6 months of graduation  
Germany:         18-month job-seeking residence permit
Ireland:         Third Level Graduate Programme: 12 or 24 months
New Zealand:     Post-Study Work Visa: 1–3 years (based on qualification)
France:          APS: 12 months for job-seeking
Netherlands:     Orientation Year: 12 months for QS 200 grads
Sweden:          No automatic PSWV; must convert via work permit with job offer
Singapore:       No automatic PSWV; must apply EP/S Pass via employer
Japan:           Designated Activities Visa: 6 months job-seeking; convert to Engineer
South Korea:     D-10 job-seeking 6 months–2 years; convert to E-7
Italy:           1 year job-seeking authorization post-graduation
Spain:           2 years post-study job-seeking permit
UAE:             No PSWV; must secure job offer and apply for new work visa
```

#### Category: Language Tests Minimum Scores by Country
```
TOEFL iBT MINIMUMS:
USA (grad):          70–100 (varies by university, often 80)
UK:                  Not accepted for visa; IELTS UKVI required
Canada:              75–90 (varies by institution and program)
Australia:           60–79 (varies by subclass and institution)
Germany (English):   80–90 (varies by university)
Ireland:             79–80
Netherlands:         80
New Zealand:         79
France (English):    79+
Sweden:              90

IELTS ACADEMIC MINIMUMS:
USA (grad):          6.5–7.0
UK (Student Visa):   5.5–7.0 (must be IELTS UKVI Secure English Language Test for visa)
Canada:              6.0–6.5
Australia:           5.5–6.5 (overall band; no band below 5.0)
Germany (English):   6.0–7.0
Ireland:             6.0–6.5
New Zealand:         5.5–6.5
France (English):    6.0+
Netherlands:         6.0–6.5
Sweden:              6.0–7.0

DUOLINGO MINIMUMS:
USA (some universities): 105–120
Canada (some universities): 105–120
Australia: 90–110 (selective acceptance)
UK: Not accepted for visa
```

### 19.5 Ingestion Pipeline for Interview Prep Data
```python
# Pinecone ingestion for interview prep expansion
import json
from openai import OpenAI
from pinecone import Pinecone

def ingest_interview_qa(qa_list: list[dict], namespace: str = "wehive-interview-prep"):
    """
    Ingest interview Q&A pairs into Pinecone wehive-prod-v3.
    Each Q&A generates TWO embeddings: question and answer separately.
    """
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index("wehive-prod-v3")
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    vectors = []
    for qa in qa_list:
        # Embed question
        q_embedding = client.embeddings.create(
            model="text-embedding-3-large",
            input=qa["question"],
            dimensions=3072
        ).data[0].embedding
        
        # Embed answer
        a_embedding = client.embeddings.create(
            model="text-embedding-3-large",
            input=qa["answer"],
            dimensions=3072
        ).data[0].embedding
        
        vectors.append({
            "id": f"{qa['id']}-Q",
            "values": q_embedding,
            "metadata": {
                "text": qa["question"],
                "type": "question",
                "visa_type": qa["visa_type"],
                "country": qa["country"],
                "category": qa["category"],
                "difficulty": qa["difficulty"],
                "paired_id": f"{qa['id']}-A",
                "tags": qa.get("tags", [])
            }
        })
        vectors.append({
            "id": f"{qa['id']}-A",
            "values": a_embedding,
            "metadata": {
                "text": qa["answer"],
                "type": "answer",
                "visa_type": qa["visa_type"],
                "country": qa["country"],
                "category": qa["category"],
                "difficulty": qa["difficulty"],
                "paired_id": f"{qa['id']}-Q",
                "tags": qa.get("tags", [])
            }
        })
    
    # Batch upsert in chunks of 100
    for i in range(0, len(vectors), 100):
        index.upsert(vectors=vectors[i:i+100], namespace=namespace)
    
    return {"upserted": len(vectors), "qa_pairs": len(qa_list)}

# Retrieval: fetch related Q&As for a user question
def retrieve_interview_qa(query: str, visa_type: str = None, country: str = None, top_k: int = 5):
    filter_dict = {"type": "question"}
    if visa_type:
        filter_dict["visa_type"] = visa_type
    if country:
        filter_dict["country"] = country
    
    query_embedding = client.embeddings.create(
        model="text-embedding-3-large",
        input=query,
        dimensions=3072
    ).data[0].embedding
    
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        namespace="wehive-interview-prep",
        filter=filter_dict,
        include_metadata=True
    )
    
    qa_pairs = []
    for match in results.matches:
        if match.score >= 0.72:
            q_meta = match.metadata
            # Fetch paired answer
            a_fetch = index.fetch(ids=[q_meta["paired_id"]], namespace="wehive-interview-prep")
            a_meta = a_fetch.vectors.get(q_meta["paired_id"], {}).get("metadata", {})
            qa_pairs.append({
                "question": q_meta["text"],
                "answer": a_meta.get("text", ""),
                "difficulty": q_meta.get("difficulty"),
                "score": match.score
            })
    
    return qa_pairs
```

### 19.6 Retrieval Query Templates — Interview Prep
```
IP-RT-001: "F1 visa interview questions commonly asked 2024 {country}"
IP-RT-002: "student visa interview {country} financial questions answers"
IP-RT-003: "visa interview ties to home country answers Indian students"
IP-RT-004: "tricky visa interview questions how to answer {visa_type}"
IP-RT-005: "UK student visa interview questions mock practice {year}"
IP-RT-006: "Canada study permit interview questions answers"
IP-RT-007: "Germany national visa interview blocked account questions"
IP-RT-008: "Schengen visa interview questions tourist {country} refusal reasons"
IP-RT-009: "post study work visa question answer {country}"
IP-RT-010: "dependent visa spouse work rights question {country}"
```

---

## 20. WEHIVE-EXAM-PREP NAMESPACE

### 20.1 Namespace Overview
```
Namespace:        wehive-exam-prep
Index:            wehive-prod-v3
Estimated chunks: ~60,000
Embedding model:  text-embedding-3-large (3072 dims)
Covers:           8 standardized exams: TOEFL, IELTS, GRE, GMAT, PTE, Duolingo, SAT, ACT
                  Official registration links, fee structures (USD + INR), test centers in India,
                  prep resources, score validity, university acceptance ranges
```

### 20.2 TOEFL iBT
```
OFFICIAL URL:         https://www.ets.org/toefl
REGISTRATION URL:     https://www.ets.org/toefl/test-takers/ibt/register
TEST CENTERS:         500+ in India (major cities: Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune)
FORMAT:               Internet-Based Test (iBT), ~3 hours
SECTIONS:             Reading (54–72 min), Listening (41–57 min), Speaking (17 min), Writing (50 min)
SCORE RANGE:          0–120 total; each section 0–30
FEES (2024):          USD $220 registration; late fee +USD $40; rescheduling USD $60
                      INR equivalent: ~₹18,300 (varies with USD/INR rate)
INDIA CENTER BOOKING: Via ETS portal — select India → select city → choose date
SCORE VALIDITY:       2 years from test date
TOEFL HOME EDITION:  Available; same format; online proctored at home
SCORE SENDING:       4 free score reports on test day; additional USD $20/institution
TOEFL MYBESTSCORES:  Superscoring — best section scores across test dates
PREP RESOURCES:       Official: https://www.ets.org/toefl/test-takers/ibt/prepare
                      Official Practice Sets: TOEFL Official Prep (free + paid)
                      Third-party: Magoosh, Kaplan, Barron's
TYPICAL UNIVERSITY RANGES:
  Ivy League/Top 10:  100–110+
  Top 50 US:          90–100
  Top 100 US:         79–90
  UK Universities:    88–100 (for non-UKVI programs)
  Canada:             80–90
  Australia:          60–79
  Germany (English):  80–95
INDIA CONTACT:        ETS India Hotline: 1-800-419-0315 (toll-free)
```

### 20.3 IELTS (Academic)
```
OFFICIAL URL:         https://www.ielts.org
BRITISH COUNCIL:      https://www.britishcouncil.in/exam/ielts
IDP INDIA:            https://www.idp.com/india/ielts/
REGISTRATION:         via British Council or IDP website; both conduct IELTS
FORMAT:               Paper-based or Computer-based; ~2h 45min
SECTIONS:             Listening (30 min), Reading (60 min), Writing (60 min), Speaking (11–14 min face-to-face)
SCORE RANGE:          0–9 band (0.5 increments); each section 0–9
FEES (2024):          INR 17,000–17,500 (varies by center and location)
                      USD equivalent: ~$205
IELTS UKVI:           Required for UK Student Visa; slightly different approved centers
                      British Council and IDP are approved SELT providers
IELTS FOR UKVI FEE:   INR 18,500–19,000 (slightly higher)
TEST DATES:           Multiple per week at computer-based centers; paper: 4 per month
SCORE VALIDITY:       2 years
SCORE SENDING:        5 free TRFs (Test Report Forms); additional GBP 16.50/institution
ONE SKILL RETAKE:     Available (IELTS One Skill Retake) — retake one section within 60 days
PREP RESOURCES:       Official: https://www.ielts.org/for-test-takers/preparation-materials
                      Cambridge Practice Tests (Cambridge University Press)
                      British Council Free Resources: britishcouncil.org/exam/ielts/preparation
                      IDP: idp.com/india/ielts/ielts-preparation-resources
INDIA CENTERS:        100+ cities via British Council + IDP network
TYPICAL UNIVERSITY RANGES:
  UK (Student Visa):  5.5–7.5 (by program level)
  Australia:          6.0–7.0
  Canada:             6.0–6.5 (with no band below 5.5)
  USA (some):         6.5–7.0
  Germany:            6.0–7.0
```

### 20.4 GRE (Graduate Record Examinations)
```
OFFICIAL URL:         https://www.ets.org/gre
REGISTRATION URL:     https://www.ets.org/gre/test-takers/general-test/register
FORMAT:               Computer Adaptive Test; ~3h 45min (with break)
SECTIONS:             Verbal Reasoning (2 × 27 min), Quantitative Reasoning (2 × 35 min), Analytical Writing (1 × 30 min)
SCORE RANGE:          Verbal: 130–170; Quant: 130–170; Writing: 0–6 (0.5 increments)
GRE AT HOME:          Available; proctored online; same format
FEES (2024):          USD $220; rescheduling USD $50; additional score reports USD $30 each
                      INR equivalent: ~₹18,300
SCORE VALIDITY:       5 years
FREE SCORE SENDS:     4 institutions on test day (using Score Select)
SCORE SELECT:         Send best single test OR specific tests to institutions
MYGRE ACCOUNT:        Register at https://my.ets.org
PREP RESOURCES:       Official: https://www.ets.org/gre/test-takers/general-test/prepare
                      POWERPREP online (2 free full-length practice tests)
                      ETS Official Prep materials (paid)
                      Manhattan Prep, Magoosh, Princeton Review, Kaplan
TYPICAL SCORES:
  Top CS programs (MIT/CMU/Stanford): Q 167–170, V 155+, AW 4.0
  Mid-tier US grad programs: Q 155–165, V 148–155, AW 3.5
  Average Indian applicant: Q 162, V 152, AW 3.5
GRE SUBJECT TESTS:   Available for Math, Physics, Psychology — some programs require
```

### 20.5 GMAT (Graduate Management Admission Test)
```
OFFICIAL URL:         https://www.mba.com/exams/gmat-focus-edition
REGISTRATION URL:     https://www.mba.com/exams/gmat-focus-edition/schedule-exam
FORMAT (2024):        GMAT Focus Edition; ~2h 15min (no AWA section)
SECTIONS:             Quantitative Reasoning, Verbal Reasoning, Data Insights (each 45 min)
SCORE RANGE:          205–805 (Focus Edition); total scaled score
FEES (2024):          USD $275 (test center); USD $275 (online); rescheduling varies
                      INR equivalent: ~₹22,900
SCORE VALIDITY:       5 years (most business schools); 10 years in official records
FREE SCORE SENDS:     5 institutions at registration + after test
PREP RESOURCES:       Official: https://www.mba.com/exams/gmat-focus-edition/prep
                      Official GMAT Prep (GMAC): free starter kit + paid exams 3–6
                      Veritas Prep, Manhattan Prep, Kaplan, Target Test Prep (TTP)
TYPICAL SCORES:
  Top 10 MBA programs (Harvard/Wharton/Booth): 720–780
  Top 25 US MBA: 680–720
  Mid-range programs: 600–660
  Indian average for top programs: 710+
INDIA CENTERS:        Bangalore, Mumbai, Delhi, Hyderabad, Chennai, Kolkata, Ahmedabad, Pune
```

### 20.6 PTE Academic
```
OFFICIAL URL:         https://www.pearsonpte.com
REGISTRATION URL:     https://www.pearsonvue.com/pte-academic/
FORMAT:               Computer-based, AI-scored; ~3 hours
SECTIONS:             Speaking & Writing, Reading, Listening (integrated sections)
SCORE RANGE:          10–90 (each communicative skill and overall)
FEES (2024):          INR 16,900 (standard); INR 18,900 (special session with 24-hr turnaround)
SCORE VALIDITY:       2 years
SCORE DELIVERY:       Usually within 48–72 hours (often same day)
PREP RESOURCES:       Official: https://pearsonpte.com/preparation/
                      Pearsonvue free Scored Practice Test
                      E2Language, PTE Magic, Kangaroo Education
ACCEPTED BY:          Australia (most universities), UK (limited), NZ, Canada (some), USA (rare)
TYPICAL SCORES:
  Australia (Subclass 500): 42–65 (varies by institution)
  UK (Student): Not widely accepted for visa (IELTS UKVI preferred)
  Canada (some schools): 58+
  NZ: 42–58
```

### 20.7 Duolingo English Test
```
OFFICIAL URL:         https://englishtest.duolingo.com
REGISTRATION URL:     https://englishtest.duolingo.com/applicants/schedule
FORMAT:               Computer + camera-proctored; ~1 hour online; at home
SECTIONS:             Adaptive test + video interview (unscored) + writing sample
SCORE RANGE:          10–160 overall (Literacy, Comprehension, Conversation, Production subscores)
FEES (2024):          USD $59; much cheaper than IELTS/TOEFL
                      INR equivalent: ~₹4,900
SCORE DELIVERY:       Results in 48 hours
SCORE VALIDITY:       2 years
SCORE SENDING:        Unlimited free score sends to institutions
PREP RESOURCES:       Official: practice.duolingo.com
                      Duolingo's free Certification Practice
ACCEPTANCE:           Growing acceptance; 5,000+ institutions
                      Most commonly accepted at: Michigan, Yale, Georgetown, UChicago and many mid-tier US universities
                      Partially accepted in UK, Australia (check each institution)
TYPICAL SCORES:
  Top US programs: 125–145
  Mid-tier US programs: 110–125
  Many Canadian programs: 110–120
NOTE:                 Always verify with specific university — acceptance varies; some require minimum subscores
```

### 20.8 SAT (Scholastic Assessment Test)
```
OFFICIAL URL:         https://satsuite.collegeboard.org/sat
REGISTRATION URL:     https://satsuite.collegeboard.org/sat/registration
FORMAT:               Digital adaptive; ~2h 14min (2024 format)
SECTIONS:             Reading & Writing (64 min), Math (70 min)
SCORE RANGE:          400–1600 total (200–800 per section)
FEES (2024):          USD $60 (with essay discontinued); India additional international fee ~USD $49
                      Total: ~USD $109; INR ~₹9,000
SCORE VALIDITY:       No expiry (most universities accept scores within 5 years)
SCORE SENDING:        4 free score reports with registration
SUPERSCORE:           Most colleges accept superscore (best section from multiple test dates)
INDIA CENTERS:        Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad
TEST DATES 2024–25:  Aug, Oct, Nov, Dec, Mar, May, Jun
PREP RESOURCES:       Official: https://satsuite.collegeboard.org/sat/preparation
                      Khan Academy (free, official SAT prep): https://www.khanacademy.org/sat
                      8 official full-length practice tests (free from College Board)
                      Princeton Review, Kaplan, Barron's
TYPICAL SCORES:
  Ivy League/MIT/Stanford: 1500–1580+
  Top 50 US colleges: 1350–1500
  Top 100 US colleges: 1200–1350
  Average Indian test-taker (strong): 1450+
SAT SUBJECT TESTS:   Discontinued since 2021
```

### 20.9 ACT (American College Testing)
```
OFFICIAL URL:         https://www.act.org
REGISTRATION URL:     https://www.act.org/content/act/en/products-and-services/the-act/registration.html
FORMAT:               Paper-based (some computer options); ~2h 55min (without writing)
SECTIONS:             English (45 min), Mathematics (60 min), Reading (35 min), Science (35 min)
                      Optional Writing: +40 min (not recommended for most; check university)
SCORE RANGE:          1–36 composite (average of 4 section scores)
FEES (2024):          USD $63 (no writing); USD $88 (with writing); international surcharge ~USD $40
                      Total: ~USD $103–128; INR ~₹8,600–10,700
SCORE VALIDITY:       No official expiry (most accept within 5 years)
SCORE SENDING:        4 free score sends with registration
SUPERSCORE:           Accepted by many schools (since ~2018–2021 depending on school)
INDIA CENTERS:        Limited — primarily Delhi, Mumbai; confirm at act.org
TEST DATES 2024–25:  Sep, Oct, Dec, Feb, Apr, Jun, Jul
PREP RESOURCES:       Official: https://www.act.org/content/act/en/products-and-services/the-act/test-preparation.html
                      Official 5 free online ACT tests
                      The Princeton Review, Kaplan, Barron's, Method Test Prep
TYPICAL SCORES:
  Ivy League/MIT/Stanford: 34–36
  Top 50 US colleges: 30–34
  Top 100 US colleges: 25–30
NOTE: SAT vs ACT — most US colleges accept both equally; Math-strong students often prefer ACT

EXAM COMPARISON SUMMARY:
Exam      | Fee (USD) | Duration | Validity | Primary Use
TOEFL     | $220      | ~3h      | 2 years  | English proficiency for grad/undergrad abroad
IELTS     | ~$205     | 2h45m    | 2 years  | English proficiency (UK, Australia, Canada)
GRE       | $220      | ~3h45m   | 5 years  | US graduate school admissions
GMAT      | $275      | ~2h15m   | 5 years  | MBA / business school admissions
PTE       | ~$205     | ~3h      | 2 years  | English (Australia, NZ, some UK/Canada)
Duolingo  | $59       | ~1h      | 2 years  | English (budget option, 5000+ institutions)
SAT       | ~$109     | ~2h15m   | 5 years  | US undergraduate admissions
ACT       | ~$108     | ~3h      | 5 years  | US undergraduate admissions (alt to SAT)
```

### 20.10 Exam Prep Hero Section Data for Frontend
```javascript
// Exam cards data for /exams hero section
const EXAM_CARDS = [
  {
    id: "toefl",
    name: "TOEFL iBT",
    logo: "/assets/exams/toefl.svg",
    tagline: "The most accepted English test worldwide",
    officialUrl: "https://www.ets.org/toefl",
    registerUrl: "https://www.ets.org/toefl/test-takers/ibt/register",
    fee: { usd: 220, inr: 18300 },
    scoreRange: "0–120",
    validity: "2 years",
    color: "#1d4289",
    difficulty: "Intermediate–Hard",
    bestFor: ["USA grad", "Canada", "Germany", "Australia"],
    sections: ["Reading", "Listening", "Speaking", "Writing"],
    weHiveGuide: "/guides/toefl-prep"
  },
  {
    id: "ielts",
    name: "IELTS Academic",
    logo: "/assets/exams/ielts.svg",
    tagline: "Required for UK Student Visa & Australia",
    officialUrl: "https://www.ielts.org",
    registerUrl: "https://www.britishcouncil.in/exam/ielts",
    altRegisterUrl: "https://www.idp.com/india/ielts/",
    fee: { usd: 205, inr: 17500 },
    scoreRange: "0–9 bands",
    validity: "2 years",
    color: "#e30613",
    difficulty: "Intermediate",
    bestFor: ["UK", "Australia", "Canada", "NZ", "Ireland"],
    sections: ["Reading", "Listening", "Writing", "Speaking"],
    weHiveGuide: "/guides/ielts-prep"
  },
  {
    id: "gre",
    name: "GRE General",
    logo: "/assets/exams/gre.svg",
    tagline: "Gateway to US graduate admissions",
    officialUrl: "https://www.ets.org/gre",
    registerUrl: "https://www.ets.org/gre/test-takers/general-test/register",
    fee: { usd: 220, inr: 18300 },
    scoreRange: "260–340 (V+Q)",
    validity: "5 years",
    color: "#007abc",
    difficulty: "Hard",
    bestFor: ["USA MS/PhD", "Canada grad", "select EU programs"],
    sections: ["Verbal", "Quantitative", "Analytical Writing"],
    weHiveGuide: "/guides/gre-prep"
  },
  {
    id: "gmat",
    name: "GMAT Focus",
    logo: "/assets/exams/gmat.svg",
    tagline: "MBA's gold standard admissions test",
    officialUrl: "https://www.mba.com/exams/gmat-focus-edition",
    registerUrl: "https://www.mba.com/exams/gmat-focus-edition/schedule-exam",
    fee: { usd: 275, inr: 22900 },
    scoreRange: "205–805",
    validity: "5 years",
    color: "#003087",
    difficulty: "Hard",
    bestFor: ["MBA programs globally", "Business masters"],
    sections: ["Quantitative", "Verbal", "Data Insights"],
    weHiveGuide: "/guides/gmat-prep"
  },
  {
    id: "pte",
    name: "PTE Academic",
    logo: "/assets/exams/pte.svg",
    tagline: "Fast results in 48 hours",
    officialUrl: "https://www.pearsonpte.com",
    registerUrl: "https://www.pearsonvue.com/pte-academic/",
    fee: { usd: 205, inr: 16900 },
    scoreRange: "10–90",
    validity: "2 years",
    color: "#00b0f0",
    difficulty: "Intermediate",
    bestFor: ["Australia", "New Zealand", "select Canada"],
    sections: ["Speaking & Writing", "Reading", "Listening"],
    weHiveGuide: "/guides/pte-prep"
  },
  {
    id: "duolingo",
    name: "Duolingo English Test",
    logo: "/assets/exams/duolingo.svg",
    tagline: "Affordable • Fast • Online",
    officialUrl: "https://englishtest.duolingo.com",
    registerUrl: "https://englishtest.duolingo.com/applicants/schedule",
    fee: { usd: 59, inr: 4900 },
    scoreRange: "10–160",
    validity: "2 years",
    color: "#58CC02",
    difficulty: "Moderate",
    bestFor: ["US universities", "select Canada/UK"],
    sections: ["Adaptive test", "Video interview", "Writing sample"],
    weHiveGuide: "/guides/duolingo-prep"
  },
  {
    id: "sat",
    name: "SAT",
    logo: "/assets/exams/sat.svg",
    tagline: "US undergraduate college admissions",
    officialUrl: "https://satsuite.collegeboard.org/sat",
    registerUrl: "https://satsuite.collegeboard.org/sat/registration",
    fee: { usd: 109, inr: 9000 },
    scoreRange: "400–1600",
    validity: "5 years (recommended)",
    color: "#00539b",
    difficulty: "Moderate–Hard",
    bestFor: ["US undergraduate", "some global universities"],
    sections: ["Reading & Writing", "Math"],
    weHiveGuide: "/guides/sat-prep"
  },
  {
    id: "act",
    name: "ACT",
    logo: "/assets/exams/act.svg",
    tagline: "SAT alternative for US college admissions",
    officialUrl: "https://www.act.org",
    registerUrl: "https://www.act.org/content/act/en/products-and-services/the-act/registration.html",
    fee: { usd: 108, inr: 9000 },
    scoreRange: "1–36",
    validity: "5 years (recommended)",
    color: "#e07f1b",
    difficulty: "Moderate–Hard",
    bestFor: ["US undergraduate (SAT alternative)"],
    sections: ["English", "Math", "Reading", "Science"],
    weHiveGuide: "/guides/act-prep"
  }
];
```

### 20.11 Retrieval Query Templates — wehive-exam-prep
```
EP-RT-001: "TOEFL exam registration India fee how to register {year}"
EP-RT-002: "IELTS vs TOEFL which is better Indian students abroad comparison {year}"
EP-RT-003: "GRE exam preparation tips score 320+ Indian students {year}"
EP-RT-004: "GMAT Focus Edition registration fee India test centers {year}"
EP-RT-005: "PTE academic score required Australia student visa 500 {year}"
EP-RT-006: "Duolingo English test accepted universities USA Canada {year}"
EP-RT-007: "SAT score 1500 preparation books tips practice tests India"
EP-RT-008: "ACT exam India test centers registration Indian students"
EP-RT-009: "English test requirement {country} student visa {year} IELTS TOEFL"
EP-RT-010: "exam scores required {university} {program} minimum TOEFL IELTS GRE {year}"
```

---

## 21. WEHIVE-PARTNERS NAMESPACE

### 21.1 Namespace Overview
```
Namespace:        wehive-partners
Index:            wehive-prod-v3
Estimated chunks: ~15,000
Embedding model:  text-embedding-3-large (3072 dims)
Covers:           Credila (HDFC education loans) + Zolve (US banking for Indian students)
                  Integration triggers, loan eligibility, product details, WeHive handoff points
```

### 21.2 Credila — HDFC Education Loans
```
OFFICIAL NAME:    Credila Financial Services Pvt. Ltd. (an HDFC Group company)
WEBSITE:          https://credila.com
TAGLINE:          "India's First Dedicated Education Loan Company"
PARENT:           HDFC Bank subsidiary (acquired 2006)
LOAN PRODUCTS:
  1. Domestic Education Loan: for Indian universities
  2. Overseas Education Loan: for studying abroad
  3. Top-Up Loan: additional funding during study

OVERSEAS LOAN DETAILS:
  Loan Amount:      No upper limit (sanctioned based on course/institution/profile)
                    Typical: INR 20 Lakh – INR 1.5 Crore for abroad
  Collateral:       Secured (with property) and unsecured options
  Collateral-free:  Up to INR 40 Lakh (subject to profile — some exceptions)
  Interest Rate:    10.5% – 14.5% p.a. (floating; tied to HDFC benchmark)
                    Women applicants get 0.5% concession
  Repayment:        EMI starts 6 months after getting job or 12 months after course end (whichever earlier)
  Moratorium:       Course duration + 6 months / 12 months
  Processing Fee:   0.5% – 2% of loan amount
  Prepayment:       No penalty
  Tax Benefit:      Section 80E — full interest deduction for up to 8 years

ELIGIBILITY:
  Applicant:        Indian national, secured admission at recognized institution abroad
  Co-borrower:      Parent/guardian required as co-applicant
  Income:           Co-borrower annual income preferred INR 3 Lakh+
  Credit Score:     650+ CIBIL preferred; flexible based on institution
  Accepted Courses: MBA, MS, Engineering, Medicine, Law, Arts at accredited global universities

ACCEPTED COUNTRIES:   USA, UK, Canada, Australia, Germany, Ireland, NZ, Singapore, France, and 40+ more

DOCUMENTS REQUIRED:
  Student:          I-20/offer letter, passport, mark sheets, transcripts, test scores
  Co-borrower:      IT returns (last 2 years), salary slips (3 months), bank statements (6 months), identity proof
  Property (if collateral): Title deed, encumbrance certificate, market value

WEHI VE INTEGRATION POINTS:
  - Trigger after cost-of-living estimate or I-20 financial amount is retrieved
  - Trigger on queries about "education loan", "funding my studies", "paying for university"
  - Display Credila card in financial planning section
  - DeepLink: https://credila.com/apply (embed as WeHive affiliate link with UTM parameters)
  - WhatsApp bot: send Credila brochure PDF via OpenWA on loan intent

RAG RETRIEVAL TRIGGERS:
  "education loan", "loan for study abroad", "finance my degree", "HDFC loan",
  "Credila", "how to fund MS abroad", "EMI for education", "80E tax benefit",
  "collateral-free loan", "sanctioned loan letter for visa"
```

### 21.3 Zolve — Banking for Indian Students in USA
```
OFFICIAL NAME:    Zolve Technologies Inc.
WEBSITE:          https://zolve.com
TAGLINE:          "Banking Without Borders"
HEADQUARTERED:    Bangalore, India + San Francisco, USA
BANKING PARTNER:  Thread Bank (FDIC insured)

PRODUCTS:
  1. Zolve Azpire Credit Card (pre-arrival)
  2. Zolve Checking Account
  3. Zolve Home Loan (upcoming)
  4. Insurance (upcoming)

ZOLVE AZPIRE CREDIT CARD:
  Limit:            $2,000–$5,000 initial; increases over time
  No SSN required: Can apply before arriving in the USA (Indian Aadhaar/passport)
  No Credit Score: No US credit history required (leverages Indian financial profile)
  Cash Back:        2% on dining and entertainment; 1% on all others
  Annual Fee:       $0 first year; $4.99/month thereafter
  Foreign Transaction Fee: 0%
  EMV Chip:         Yes; Visa network
  Credit Building:  Reports to US credit bureaus — helps build US credit from day 1
  
ZOLVE CHECKING ACCOUNT:
  Min Balance:      $0
  FDIC Insured:     Up to $250,000
  Debit Card:       Visa debit; contactless payments
  Mobile App:       iOS + Android; international wire transfers
  ATM:              Fee reimbursements at many ATMs

SIGNUP PROCESS:
  Step 1: Apply at https://zolve.com before departure
  Step 2: Submit Indian ID (Aadhaar + PAN) + university I-20/offer letter
  Step 3: Get virtual card number immediately
  Step 4: Physical card mailed to US address (arrive first, get mail address)
  Processing:       48–72 hours for approval

ELIGIBILITY:
  Target:           Indian students/professionals moving to USA
  Documents:        Aadhaar, PAN, Indian bank statement, I-20/work visa/offer letter
  Age:              18+
  
WEHI VE INTEGRATION POINTS:
  - Trigger after student confirms destination = USA
  - In post-offer-letter phase: "Set up your US bank account before you fly"
  - Zolve partner card in the Pre-Departure Checklist section
  - DeepLink: https://zolve.com/students (affiliate/partner link with WeHive UTM)
  - WhatsApp bot: send Zolve signup link when user says "I need US bank account"

RAG RETRIEVAL TRIGGERS:
  "US bank account", "credit card without SSN", "banking in USA Indian student",
  "Zolve", "build credit USA", "how to open bank account before flying USA",
  "credit score USA international student", "debit card before arriving",
  "FDIC insured", "student banking USA"
```

### 21.4 Partner Hero Section Data for Frontend
```javascript
// Partner data for footer/hero section
const WEHIVE_PARTNERS = [
  {
    id: "credila",
    name: "Credila",
    subtitle: "HDFC Group",
    tagline: "Education Loans up to ₹1.5 Crore for studying abroad",
    logo: "/assets/partners/credila-logo.svg",
    officialUrl: "https://credila.com",
    ctaText: "Get Education Loan",
    ctaUrl: "https://credila.com/apply?utm_source=wehive&utm_medium=partner&utm_campaign=studyabroad",
    features: [
      "No upper loan limit",
      "Collateral-free up to ₹40L",
      "80E tax benefit (up to 8 years)",
      "No prepayment penalty",
      "10.5%–14.5% p.a. interest"
    ],
    color: "#003087",
    type: "financial",
    countries: ["USA", "UK", "Canada", "Australia", "Germany", "Ireland", "NZ", "40+ more"]
  },
  {
    id: "zolve",
    name: "Zolve",
    subtitle: "Banking Without Borders",
    tagline: "Get your US credit card before you land — no SSN needed",
    logo: "/assets/partners/zolve-logo.svg",
    officialUrl: "https://zolve.com",
    ctaText: "Apply for Zolve Card",
    ctaUrl: "https://zolve.com/students?utm_source=wehive&utm_medium=partner&utm_campaign=usstudent",
    features: [
      "No US credit history required",
      "2% cashback on dining",
      "FDIC insured checking account",
      "Build US credit from Day 1",
      "Apply from India before departure"
    ],
    color: "#6200ea",
    type: "banking",
    countries: ["USA"]
  }
];

// Display positions
const PARTNER_DISPLAY = {
  homepage: {
    section: "partners",
    position: "above-footer",
    style: "horizontal-cards",
    heading: "Trusted Partners for Your Journey"
  },
  visaPage: {
    position: "sidebar",
    style: "compact-card"
  },
  universityPage: {
    position: "financial-section",
    style: "inline-cta"
  },
  chatbot: {
    trigger: ["loan", "bank", "credit card", "finance", "funding", "Zolve", "Credila"],
    response_type: "partner_card"
  }
};
```

### 21.5 Retrieval Query Templates — wehive-partners
```
PRT-RT-001: "education loan abroad India no collateral best rates 2024"
PRT-RT-002: "Credila HDFC education loan abroad eligibility documents interest rate"
PRT-RT-003: "US bank account Indian student without SSN before arriving USA"
PRT-RT-004: "Zolve credit card apply from India international student"
PRT-RT-005: "how to fund MS abroad education loan visa process"
PRT-RT-006: "build US credit score Indian student arrival banking"
PRT-RT-007: "WeHive partner financial services education loan banking"
```

### 21.6 AI Agent Integration — Financial Advisor + Partner Handoff
```python
# financial_advisor_agent.py — partner handoff logic

CREDILA_TRIGGERS = {
    "keywords": ["loan", "fund", "finance my degree", "afford university",
                 "education loan", "EMI", "how to pay", "I need money for",
                 "80E", "collateral"],
    "context": "user_destination_any",
    "action": "display_credila_card",
    "priority": "high"
}

ZOLVE_TRIGGERS = {
    "keywords": ["bank account", "credit card", "debit card", "banking USA",
                 "SSN credit", "Zolve", "build credit", "arrive USA",
                 "money USA", "send money USA"],
    "context": "user_destination_usa",
    "action": "display_zolve_card",
    "priority": "high"
}

def check_partner_handoff(user_message: str, user_destination: str) -> dict | None:
    msg_lower = user_message.lower()
    
    # Check Credila
    if any(kw in msg_lower for kw in CREDILA_TRIGGERS["keywords"]):
        return {
            "partner": "credila",
            "message": "💰 WeHive partner Credila (HDFC Group) offers education loans up to ₹1.5 Crore for studying abroad — no upper limit, collateral-free up to ₹40L, and 80E tax benefits. Want me to share more details?",
            "cta_url": WEHIVE_PARTNERS[0]["ctaUrl"],
            "namespace": "wehive-partners"
        }
    
    # Check Zolve (only for USA-bound students)
    if user_destination == "USA" and any(kw in msg_lower for kw in ZOLVE_TRIGGERS["keywords"]):
        return {
            "partner": "zolve",
            "message": "🏦 WeHive partner Zolve lets you open a US bank account and get a credit card BEFORE you leave India — no SSN needed. Build US credit from day one. Interested?",
            "cta_url": WEHIVE_PARTNERS[1]["ctaUrl"],
            "namespace": "wehive-partners"
        }
    
    return None
```

---

## 22. WEHIVE-NEWS-AND-UPDATES NAMESPACE (Extended)

### 22.1 Christmas Season + Global Study Abroad Banners Data
```javascript
// Banner data for hero carousel
const HERO_BANNERS = [
  // Christmas banners
  {
    id: "christmas-germany",
    type: "seasonal",
    season: "christmas",
    title: "🎄 Study in Germany This Christmas Season",
    subtitle: "Christmas markets, free tuition & a blocked account of €11,208 — your German dream awaits",
    cta: "Explore German Universities",
    ctaUrl: "/countries/germany",
    bg: "linear-gradient(135deg, #011CB5 0%, #1a3a7a 60%, #c41e3a 100%)",
    badge: "🎅 Christmas Special",
    validUntil: "2024-01-07",
    overlay_emoji: "⛪🎄🍺"
  },
  {
    id: "christmas-canada",
    type: "seasonal",
    season: "christmas",
    title: "🎄 White Christmas Awaits in Canada",
    subtitle: "Apply now for Jan 2025 intake — PGWP visa, CAD funding support & partner loans available",
    cta: "Apply for Canada",
    ctaUrl: "/countries/canada",
    bg: "linear-gradient(135deg, #c8102e 0%, #ffffff 50%, #012169 100%)",
    badge: "❄️ Winter Intake",
    validUntil: "2024-01-07"
  },
  {
    id: "christmas-uk",
    type: "seasonal",
    season: "christmas",
    title: "🎄 Celebrate Christmas at Oxford, Cambridge & Beyond",
    subtitle: "January 2025 intake open — Graduate Route visa, 2 years post-study work rights",
    cta: "Explore UK Programs",
    ctaUrl: "/countries/uk",
    bg: "linear-gradient(135deg, #012169 0%, #c8102e 50%, #012169 100%)",
    badge: "🏰 UK Christmas",
    validUntil: "2024-01-07"
  },
  // Destination banners
  {
    id: "germany-student-visa",
    type: "destination",
    title: "🇩🇪 Germany Student Visa 2025",
    subtitle: "Free tuition at public universities. Blocked account: €11,208. 18-month job-seeking visa after graduation.",
    cta: "Check Eligibility",
    ctaUrl: "/visa/germany/student",
    bg: "linear-gradient(135deg, #000000 0%, #dd0000 50%, #ffce00 100%)",
    badge: "🆓 Free Tuition",
    stats: ["€0 tuition at public unis", "18-month job-seeking visa", "EU Blue Card pathway"]
  },
  {
    id: "usa-f1",
    type: "destination",
    title: "🇺🇸 USA F-1 Student Visa 2025",
    subtitle: "3 years OPT for STEM. 50+ top universities. WeHive helps from application to visa interview prep.",
    cta: "Start F-1 Journey",
    ctaUrl: "/visa/usa/f1",
    bg: "linear-gradient(135deg, #011CB5 0%, #ffffff 50%, #FF0302 100%)",
    badge: "🌟 STEM OPT 3 Years",
    stats: ["$350 SEVIS fee", "OPT 12mo + STEM 24mo", "50+ WeHive partner unis"]
  },
  {
    id: "canada-study",
    type: "destination",
    title: "🇨🇦 Canada Study Permit 2025",
    subtitle: "PGWP up to 3 years. Express Entry after graduation. Spouse Open Work Permit for MS/PhD.",
    cta: "Explore Canada",
    ctaUrl: "/countries/canada",
    bg: "linear-gradient(135deg, #c8102e 0%, #ffffff 100%)",
    badge: "🍁 PR Pathway",
    stats: ["PGWP up to 3 years", "Express Entry CEC", "Spouse OWP eligible"]
  },
  {
    id: "uk-study",
    type: "destination",
    title: "🇬🇧 UK Student Visa 2025",
    subtitle: "Graduate Route: 2 years work rights. NHS health surcharge included. CAS from 150+ universities.",
    cta: "Study in UK",
    ctaUrl: "/countries/uk",
    bg: "linear-gradient(135deg, #012169 0%, #c8102e 100%)",
    badge: "👩‍🎓 Graduate Route",
    stats: ["2-year post-study visa", "NHS surcharge £776/yr", "IHS included in CAS"]
  },
  {
    id: "australia-study",
    type: "destination",
    title: "🇦🇺 Australia Subclass 500 Visa",
    subtitle: "48 hrs/fortnight work. 2–4 year post-study visa (subclass 485). Regional study bonuses.",
    cta: "Study in Australia",
    ctaUrl: "/countries/australia",
    bg: "linear-gradient(135deg, #00008b 0%, #cc0000 100%)",
    badge: "🦘 Subclass 485",
    stats: ["48 hrs/fortnight work", "485 visa: 2–4 years", "Regional bonus points"]
  }
];
```

---

## 23. WEHIVE RAG v3 — COMPLETE NAMESPACE SUMMARY

```
NAMESPACE                  | CHUNKS (EST) | DATA TYPE              | LAST UPDATED
wehive-universities        | ~120,000     | University profiles    | Monthly
wehive-visa-requirements   | ~85,000      | Visa rules by country  | Monthly
wehive-scholarships        | ~45,000      | Scholarship database   | Quarterly
wehive-agent-profiles      | ~30,000      | Agent personas + logic | On change
wehive-student-docs        | ~15,000      | Document templates     | Quarterly
wehive-testimonials        | ~25,000      | Student testimonials   | Weekly
wehive-cost-of-living      | ~40,000      | COL by city/country    | Monthly
wehive-jobs-and-pr         | ~60,000      | Job market + PR paths  | Monthly
wehive-news-and-updates    | ~20,000      | Policy news + banners  | Daily
wehive-interview-prep      | ~490,000     | Q&A pairs (9000+)      | Monthly
wehive-country-rules       | ~80,000      | Country-specific laws  | Monthly
wehive-f1-sevis            | ~45,000      | SEVIS + OPT + CIP      | Quarterly
wehive-passport-matrix     | ~30,000      | Visa validity matrix   | Monthly
wehive-exam-prep           | ~60,000      | 8 exams + URLs + fees  | Quarterly
wehive-partners            | ~15,000      | Credila + Zolve data   | On change
─────────────────────────────────────────────────────────────────────────────
TOTAL (v3):                | ~1,160,000   |                        |
PINECONE INDEX:            | wehive-prod-v3 (3072 dims, cosine, text-embedding-3-large)
```

---

*WeHive AI Infrastructure — Complete Reference v3.0*
*Namespaces: 15 | Total chunks: ~1.16M | Sections: 23*
*Generated: 2024-12 | Next review: 2025-03*

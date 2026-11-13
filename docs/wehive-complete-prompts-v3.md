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


## 24. WEHIVE-STUDENT-DOCS NAMESPACE

**Namespace:** `wehive-student-docs`
**Purpose:** SOP writing guidance, LOR templates, document checklists, transcript requirements, and application document tips per country and program type.

---

Q: What documents do I need to apply to a US university for MS?
A: Core documents for a US MS application: (1) Transcripts — official sealed transcripts from all attended institutions; WES or ECE evaluation required if from India. (2) GRE/GMAT scores — sent directly from ETS/GMAC to university. (3) TOEFL/IELTS/PTE — minimum scores vary; typically TOEFL iBT 80+, IELTS 6.5+. (4) Statement of Purpose (SOP) — 500–1000 words; research-focused for STEM. (5) Letters of Recommendation (LOR) — 3 letters; at least 2 from faculty who supervised research or projects. (6) Resume/CV — academic and research achievements. (7) Financial documents — bank statements showing 12-month living expenses + first-year tuition (typically $40,000–$80,000 USD). (8) Passport copy. (9) Application fee $50–$120 USD per university.

Q: How do I write a strong Statement of Purpose (SOP) for MS Computer Science?
A: A strong MS CS SOP follows this structure: (1) Hook paragraph — specific problem or project that sparked your interest in CS/AI/systems. Avoid generic openers like "Since childhood I loved computers." (2) Academic background — GPA, relevant courses, capstone project outcomes. Mention if you ranked in top 10% of batch. (3) Research or work experience — describe 1–2 projects in technical detail. Quantify: "implemented X achieving 23% improvement in Y." (4) Why this program — name 2–3 specific professors whose work aligns with yours; mention labs (e.g., Stanford AI Lab, CMU HCII). Generic "your university is renowned" is rejected. (5) Career goals — specific role post-MS (ML engineer at autonomous vehicle company, founding AI startup, PhD). (6) Why you are a fit — connect your background to what the program offers. Length: 800–1000 words. Tone: confident, specific, academic.

Q: What should an SOP for MBA include?
A: MBA SOP structure: (1) Career narrative — current role, promotions, key achievement with impact metric. (2) Short-term goals — specific industry/function/role post-MBA (e.g., product management at a Series B fintech startup). (3) Long-term goals — 10-year vision (e.g., launch healthcare fintech in emerging markets). (4) Why MBA now — specific inflection point or skill gap (team leadership, strategic finance, market entry). (5) Why this school — mention cohort diversity, specific MBA tracks, clubs relevant to your goals, alumni network in your target sector. (6) What you bring — unique perspective you add to the cohort. Essays vary by school: HBS asks "What more would you like us to know?"; Wharton asks about your professional experience. Always customize per school. Length: 500–1500 words depending on school.

Q: How many LORs do UK universities require?
A: Most UK universities require 1–2 references, compared to 3 for US. For MSc programs: typically 2 references — 1 academic (thesis supervisor or professor who taught you in final year), 1 professional (manager or senior colleague). For MBA: 2 professional references, preferably from current and previous employer. Oxford and LSE require references to be submitted directly online by the referee; they cannot be emailed. References should address: academic ability, research potential, character, why you're suited for this program. Unlike US LORs, UK references are shorter (1 page) and more structured.

Q: What is WES evaluation and when do I need it?
A: WES (World Education Services) is a credential evaluation agency that converts Indian (or other foreign) academic records into US/Canadian equivalents. You need WES when: (1) US universities require a "course-by-course" evaluation — this converts your percentage/CGPA to a 4.0 GPA scale and lists each course with US equivalent credits. (2) Canadian immigration (Express Entry, study permits) — WES ECA (Educational Credential Assessment) is accepted by IRCC. Cost: $205 USD for course-by-course (US) or $236 CAD for ECA (Canada). Timeline: 7 business days standard, 3 days rush. WeHive can guide you through the WES process as part of the document preparation service.

Q: What financial documents does Canada require for a study permit?
A: Canada study permit financial proof requirements: You must show ability to cover: (1) First year tuition (varies by university — typically CAD $20,000–$35,000). (2) Living expenses: CAD $10,000/year (IRCC standard) — updated to approximately $20,635 in 2024. (3) Return airfare: CAD $2,000. (4) Acceptable documents: Savings bank statement (6-month average balance), Fixed deposits (FDs with maturity within 2 years), Education loan sanction letter (must be from a scheduled bank), Sponsor's ITR + bank statements if parents are sponsors. (5) IRCC requires funds to be "readily available" — avoid very recent large deposits without explanation (appears as fund parking, can lead to rejection). WeHive prepares a financial exhibit explaining your fund sources.

Q: What is an APS certificate and why does Germany require it?
A: APS (Akademische Prüfstelle) is a certificate mandatory for Indian nationals applying to German universities. It verifies the authenticity of your educational documents. Process: (1) Book appointment at German Embassy/Consulate in Chennai, Mumbai, or New Delhi. (2) Submit original mark sheets, degree certificate, school leaving certificate. (3) APS conducts verification with your institution. (4) Certificate issued in ~4–6 weeks; costs €75. (5) Without APS, your German university application will be rejected outright. Note: APS is separate from the German student visa — you need APS first, then apply to universities, then visa. WeHive tracks APS appointment availability and alerts you when slots open.

Q: What documents does Australia require for a student visa (Subclass 500)?
A: Australia Subclass 500 student visa checklist: (1) CoE (Confirmation of Enrollment) — must be obtained from your Australian university after accepting offer and paying deposit. (2) GTE (Genuine Temporary Entrant) statement — 1–2 page personal statement explaining why you want to study in Australia and your intention to return home. (3) Financial evidence — savings or loan equivalent to: first year tuition + AUD $21,041 living expenses + AUD $7,362 per accompanying family member. (4) English proficiency — IELTS 5.5+ Academic (varies by course). (5) Health insurance — OSHC (Overseas Student Health Cover) — must purchase before visa application; costs AUD $600–$700/year. (6) Passport + photos. (7) Statement of purpose (may be requested). Processing time: 4–6 weeks. WeHive manages the entire Subclass 500 application.

Q: How should I approach the "Why this university" section in my SOP?
A: Never write generic praise. Instead: (1) Name specific faculty — "Professor X's work on federated learning aligns with my research on privacy-preserving ML." Check the department website for recent publications. (2) Name specific programs, labs, or centers — "The FinTech Lab at Imperial" or "CMU's HCII." (3) Reference cohort or culture — "Columbia's location in NYC gives access to Wall Street recruiting that matches my career in finance." (4) Mention alumni outcomes if known — "Your MS in Data Science alumni go into roles at Google Brain and DeepMind, which aligns with my goal." (5) If you've visited or attended an info session, mention it briefly. (6) Avoid: "Your university is world-renowned and highly ranked." That signals you're copying the same SOP to all schools.

Q: What is a Blocked Account (Sperrkonto) for Germany and how much do I need?
A: A Sperrkonto is a restricted bank account required for a German student visa. It proves you have sufficient funds for living in Germany. Requirements: (1) Amount: €11,208 (as of 2024, approximately €934/month × 12 months). (2) Providers: Fintiba (most popular, used by WeHive), Coracle, or Deutsche Bank. (3) Process: Open online → deposit funds from India → receive Sperrkonto certificate within 3–5 business days. (4) Account is "blocked" — you can only withdraw €934/month once you arrive in Germany. (5) This is separate from your tuition payment. (6) Cost: Fintiba charges approximately €79 setup fee. WeHive guides you through Sperrkonto opening as part of the Germany visa package.

Q: What transcripts do US universities typically require?
A: US universities require: (1) Unofficial transcripts for application — uploaded as PDF during online application. (2) Official transcripts for admission confirmation — sealed envelope mailed directly from your institution's registrar, or sent via e-transcript service (Parchment, National Student Clearinghouse). (3) For Indian students: upload scanned copies of all semester mark sheets + consolidated marksheet + degree certificate. (4) If transcripts are not in English: provide certified translation. (5) Some universities (MIT, Stanford, CMU) accept WES-evaluated transcripts in lieu of official transcripts. (6) Do not alter or selectively submit transcripts — academic dishonesty results in permanent ban. WeHive reviews your transcripts before submission to catch any issues.

Q: How do I structure my CV/Resume for a graduate school application?
A: Graduate school CV differs from a job resume: (1) Length: 1–2 pages for Masters; up to 4 pages for PhD applications. (2) Sections (in order): Contact info → Education (reverse chronological, include GPA) → Research Experience (most important — describe methodology, tools, outcomes) → Publications/Presentations (if any) → Work Experience → Projects → Skills (programming languages, tools, frameworks) → Awards & Honors → Extracurriculars (selective). (3) Research experience: describe like a mini-abstract: "Investigated X using Y, resulting in Z (published/accepted/presented at)." (4) Quantify where possible: "Achieved 94% accuracy vs. 87% baseline." (5) Avoid personal info (photo, age, marital status) for US/UK applications. (6) Font: 10–12pt Times New Roman or Calibri. Margins: 0.75–1 inch.

---

## 25. WEHIVE-SCHOLARSHIPS NAMESPACE

**Namespace:** `wehive-scholarships`
**Purpose:** Merit and need-based scholarships by country, university, and student profile. Deadline tracking, application tips, eligibility criteria.

---

Q: What scholarships are available for Indian students going to the USA?
A: Key scholarships for Indian students in the USA: (1) Fulbright-Nehru Master's Fellowships — covers tuition, living, airfare; highly competitive; for leadership potential; apply through USIEF (deadline: July each year). (2) Aga Khan Foundation International Scholarship — for postgraduate students from developing countries; income-tested; 50% grant + 50% loan; deadline: March. (3) IEFA (International Education Financial Aid) — database of 600+ scholarships for international students. (4) University merit scholarships — most top-50 US universities offer automatic merit scholarships to international MS/PhD applicants with strong GRE (320+) and GPA (3.8+); typically $5,000–$20,000 per year. (5) TA/RA positions — Teaching or Research Assistantships cover full tuition + stipend ($18,000–$25,000/year); available for PhD and some MS students; apply directly to departments. WeHive identifies scholarship opportunities specific to your profile and target universities.

Q: What scholarships are available for studying in the UK?
A: UK scholarships for international students: (1) Chevening Scholarships — UK government; full scholarship (tuition + living + flights); for future leaders with 2+ years work experience; apply October–November for the following September intake; highly competitive (~1,500 awards from 65,000 applicants). (2) Commonwealth Scholarships — for students from Commonwealth countries including India; covers tuition + living + airfare; for taught Masters and PhD. (3) Rhodes Scholarship — for Oxford study; full funding; requires exceptional academics + leadership; South Asia quota applies. (4) Gates Cambridge Scholarship — for Cambridge; one of the most prestigious; ~90 awards per year globally. (5) University of Edinburgh Global Scholarships — £5,000–£10,000 for international students; merit-based. (6) Warwick Global Excellence Scholarship — up to 50% tuition reduction; based on academic achievement. (7) UCL Global Undergraduate Scholarship — £5,000 for Indian students. WeHive tracks scholarship deadlines and helps with application essays.

Q: Are there scholarships for studying in Canada?
A: Canada scholarships for international students: (1) Vanier Canada Graduate Scholarships — CAD $50,000/year for 3 years; for doctoral students; nominated by university. (2) Banting Postdoctoral Fellowships — CAD $70,000/year; for postdoctoral researchers. (3) University of Toronto Excellence Awards — up to CAD $10,000 for Masters students; merit-based. (4) UBC International Leader of Tomorrow Award — covers tuition + living for up to 4 years; needs-based + leadership. (5) Ontario Graduate Scholarship — CAD $15,000; for students studying at Ontario universities; must be nominated by university. (6) Concordia International Tuition Award of Excellence — 50% tuition reduction; for Masters students with 85%+ average. (7) Government of Canada scholarships via Shastri Indo-Canadian Institute — for Indo-Canadian academic exchanges. Note: Canadian universities give fewer merit scholarships than US; TA/RA positions are the primary funding for graduate students.

Q: What scholarships exist for studying in Germany?
A: Germany is nearly free — most public universities charge only a semester contribution fee (€200–€350). Additional scholarships: (1) DAAD Scholarships — Deutsche Akademische Austauschdienst; Germany's largest scholarship organization; multiple programs for Indian students: Research Grants, Helmut Schmidt Program for development-related studies, In-Country/In-Region; stipends €934+/month. Apply at daad.de. (2) Friedrich Ebert Stiftung — for students with social/political engagement; monthly stipend + cultural allowance. (3) Heinrich Böll Foundation — for environmentally/politically engaged students. (4) Konrad Adenauer Stiftung — for Christian democratic values; stipend + cultural program. (5) ERASMUS+ — for exchange semesters within Europe. (6) Germany essentially subsidizes education for all students (including international); even without scholarships, total annual cost (tuition + living) is €15,000–€20,000 vs. $80,000+ in USA.

Q: What scholarships are available for Australia?
A: Australia scholarships for international students: (1) Australia Awards — Australian government; full scholarship (tuition + living + airfare + health insurance); for students from developing countries including India; for Masters and PhD; highly competitive; apply April–May for following year. (2) Destination Australia Scholarship — AUD $15,000/year; for students studying in regional Australia; funded by Australian government. (3) Research Training Program (RTP) — covers full tuition for international PhD and Masters by Research students at Australian universities; most students with strong academic profile receive this automatically. (4) Monash International Merit Scholarship — up to AUD $10,000 for coursework Masters; based on GPA. (5) University of Melbourne Graduate Research Scholarships — stipend AUD $32,000/year for PhD; automatic for top applicants. (6) ANU Chancellor's International Scholarship — 100% tuition waiver for ANU undergraduate; limited spots. WeHive identifies which scholarships you're automatically eligible for based on your profile.

Q: How do university merit scholarships work for MS in USA?
A: Most US universities offer automatic merit aid to international graduate students — you don't apply separately: (1) Partial tuition waivers — typically 25–50% tuition reduction for top applicants; offered with admission letter. (2) Fellowship awards — named fellowships ($10,000–$30,000 one-time or annual) from departmental funds; competitive. (3) TA (Teaching Assistantship) — teaches undergrad sections (~20 hrs/week); covers full tuition + stipend ($18,000–$25,000/year); competitive; apply to the department directly in your application. (4) RA (Research Assistantship) — works in professor's lab; similar benefits; often offered after first semester once professor knows your work. Strategy: (a) Apply to 2–3 universities where your profile is slightly above average — higher chance of TA/RA. (b) Email professors before applying — "I've read your work on X, I'd be interested in contributing to Y, is there RA availability?" (c) Mention financial need in optional essay if applicable. WeHive identifies TA/RA-friendly programs based on your GRE and GPA.

Q: What is the Chevening Scholarship and how competitive is it?
A: Chevening is the UK government's flagship scholarship program for future leaders: Funded by: Foreign, Commonwealth & Development Office (FCDO) + partner organizations. Coverage: Full tuition (any UK university, any Masters program), Monthly living stipend (~£1,300/month in London), Return economy airfare, Visa application fee, Arrival allowance. Eligibility: (1) Citizen of a Chevening-eligible country (India is eligible). (2) Bachelor's degree equivalent to UK 2:1 (Upper Second Class). (3) 2+ years of full-time work experience. (4) English language proficiency. (5) Return to home country for at least 2 years after scholarship. Application process: Opens July, closes in November. 4 essays required: Leadership, Networking, Studying in UK, Career Plan. 2 references. ~65,000 applicants for ~1,500 awards globally. India allocation: ~100 scholars per year. WeHive has helped 12 Chevening applicants with essay coaching; 4 received the scholarship.

Q: Are there scholarships specifically for women studying abroad?
A: Scholarships for women students: (1) AAUW International Fellowships (USA) — for women not US citizens; Masters and PhD; $18,000–$30,000/year; deadline November. (2) P.E.O. International Peace Scholarship (USA/Canada) — up to $12,500; for women in graduate study outside their home country. (3) Amelia Earhart Fellowship (Aerospace) — for women in aerospace science or engineering PhD; $10,000; deadline November. (4) Google Women Techmakers Scholarship — $10,000; for women in CS, CE, or information systems. (5) WomenTech Scholarship (UK) — for women pursuing STEM Masters in UK. (6) Zonta International Amelia Earhart Fellowship — 35 fellowships of $10,000 for women in aerospace. (7) Inlaks Shivdasani Foundation Scholarship (India-origin) — for students of Indian origin going abroad for Masters; up to $100,000 over 3 years. WeHive curates a list of 20+ women-specific scholarships tailored to your field and destination.

Q: What is the DAAD scholarship and how do I apply?
A: DAAD (Deutscher Akademischer Austauschdienst) is Germany's largest academic exchange organization: Programs for Indian students: (1) Research Grants for Doctoral Candidates (individual) — 7–24 months in Germany; €1,200/month + health + travel; apply via daad.de; deadline October. (2) Helmut Schmidt Programme (Public Policy) — for Masters in public policy, economics, social sciences; covers tuition + €1,200/month living + airfare. (3) Development-Related Postgraduate Courses — Masters in development-related fields at German universities; full funding including tuition (rare for Germany), stipend, health, airfare. (4) In-Region Scholarship Program — for scholars from specific regions. Application: Register at daad.de → Select program → Submit online application with: research proposal, CV, transcripts, language certificates, 2 references, motivation letter. Key tip: DAAD requires a clear research plan showing how your study in Germany benefits your home country — this is mandatory, not optional. WeHive has DAAD application support as a premium service.

Q: How does the Inlaks Scholarship work?
A: Inlaks Shivdasani Foundation Scholarship is one of India's most prestigious outbound scholarships: Coverage: Up to $100,000 total (distributed over program duration); covers partial or full tuition + living costs. Eligible destinations: USA, UK, Europe (excluding India). Eligible programs: Masters and PhD in any subject at top global universities (typically top-50 globally). Not eligible for: MBA, medicine (MBBS), fine arts, film. Eligibility: Indian citizen, age 30 or under at time of application, strong academic record, evidence of exceptional ability. Application process: Online application → Essay + CV + references → Shortlist → Interview. Deadline: January each year. Number of awards: approximately 25–30 per year. Unlike Chevening, Inlaks doesn't require work experience — it targets fresh graduates or those early in their career. Success rate: Very competitive — approximately 5% of applicants. WeHive has worked with 8 Inlaks applicants.

---

## 26. WEHIVE-COST-OF-LIVING NAMESPACE

**Namespace:** `wehive-cost-of-living`
**Purpose:** Monthly budget breakdowns by city and country for international students. Accommodation types, typical expenses, money-saving tips.

---

Q: What is the monthly cost of living for a student in the USA?
A: Monthly student budget in the USA varies significantly by city: New York City: Rent $1,400–$2,200 (shared), Food $400–$600, Transport $127 (MetroCard), Phone $30–$50, Utilities included in most rentals, Total: $2,000–$3,000/month. Boston: Rent $1,100–$1,800, Food $350–$500, Transport $90 (MBTA), Total: $1,600–$2,400/month. San Francisco/Bay Area: Rent $1,500–$2,500, Food $450–$650, Total: $2,100–$3,300/month. Chicago: Rent $800–$1,400, Food $300–$450, Transport $105, Total: $1,300–$2,000/month. Atlanta/Texas cities: Rent $700–$1,100, Food $250–$400, Transport $50 (car needed), Total: $1,100–$1,600/month. Annual estimate for visa/financial docs: $20,000–$35,000 depending on city. Tips: University-managed housing is cheaper than private; roommate splits reduce rent by 40–60%; cooking at home saves $200–$300/month vs. eating out.

Q: How much does it cost to live as a student in the UK?
A: Monthly student budget in the UK: London: Rent £900–£1,400 (shared room in zone 2–4), Food £250–£350, Transport £120 (Oyster card student rate), Phone £15–£25, Total: £1,300–£1,900/month (~$1,650–$2,400). Manchester/Birmingham/Leeds: Rent £450–£700, Food £200–£280, Transport £60–£80, Total: £750–£1,100/month. Edinburgh/Glasgow: Rent £500–£800, Food £200–£280, Total: £750–£1,100/month. Annual estimate used for UK visa: £1,334/month in London, £1,023/month outside London (UKVI official figures). Tips: Student discount cards (NUS, 16–25 railcard save 30% on trains), Cook Indian food — saves £150–£200/month vs. restaurants, Consider university accommodation in first year — guaranteed and often all-inclusive. Healthcare: NHS free for international students on 6-month+ visa (IHS surcharge paid with visa application £776/year).

Q: What are the living costs for students in Canada?
A: Monthly student budget in Canada: Toronto: Rent CAD $800–$1,400 (shared), Food CAD $350–$500, Transport CAD $128 (TTC monthly), Phone CAD $40–$60, Total: CAD $1,350–$2,100/month. Vancouver: Rent CAD $900–$1,500, Food CAD $350–$480, Transport CAD $100 (Compass card student), Total: CAD $1,400–$2,100/month. Montreal: Rent CAD $600–$900 (cheapest major city), Food CAD $300–$400, Transport CAD $56 (STM student rate), Total: CAD $1,000–$1,400/month. Ottawa/Calgary/Edmonton: Rent CAD $700–$1,100, Total: CAD $1,100–$1,700/month. IRCC requires proof of CAD $20,635/year living expenses (2024 figure). Tips: Co-op terms (paid work placements) offset living costs significantly — $20–$28/hour typical. Most provinces have student health insurance bundled with tuition. Provincial health care coverage begins after 3-month waiting period in most provinces.

Q: What is the cost of living for students in Germany?
A: Germany has the lowest cost of living among major study destinations: Monthly budget: Berlin: Rent €400–€700 (shared Wohngemeinschaft/WG), Food €200–€300, Transport €29 (Deutschlandticket student rate since 2023), Health insurance €120 (mandatory for non-EU students), Total: €750–€1,150/month. Munich: Rent €500–€900 (highest in Germany), Food €250–€350, Total: €900–€1,350/month. Heidelberg/Frankfurt/Hamburg: Rent €400–€700, Total: €800–€1,200/month. Required Sperrkonto amount: €11,208/year (€934/month) — this is the government's official estimate. Tips: Semesterticket — included in semester fee, covers unlimited public transport in the region (saves €500+/year). Student cafeteria (Mensa) meals cost €2–€4 — use it daily. WG (shared flat) is the norm; find via WG-Gesucht.de. Germany has no tuition fees at public universities — only semester contribution (€200–€350) which often includes the Semesterticket.

Q: What is the monthly budget for students in Australia?
A: Monthly student budget in Australia: Sydney: Rent AUD $800–$1,400 (shared), Food AUD $350–$500, Transport AUD $60–$100 (Opal card, discounted for students), Phone AUD $20–$40, OSHC health insurance AUD $50–$60, Total: AUD $1,300–$2,100/month. Melbourne: Rent AUD $700–$1,200, Food AUD $300–$450, Total: AUD $1,100–$1,750/month. Brisbane/Adelaide/Perth: Rent AUD $600–$1,000, Total: AUD $1,000–$1,600/month. IRCC-equivalent Australian figure: AUD $21,041/year. Tips: International students can work up to 48 hours/fortnight during semester (no hour cap during breaks since 2023); minimum wage AUD $23.23/hour — working part-time easily covers living costs. Grocery chains Aldi and Lidl are 30–40% cheaper than Woolworths/Coles. Student cities have strong Indian grocery networks — Patel Brothers, Apna Bazaar — keeping food costs lower for Indian students.

Q: What are the cheapest cities in Europe for Indian students?
A: Most affordable European cities for Indian students (monthly budget in EUR): (1) Prague, Czech Republic: €600–€800 — Charles University, Czech Technical University; affordable, growing Indian community. (2) Budapest, Hungary: €550–€750 — Budapest University of Technology; very low costs; EU recognition of degrees. (3) Warsaw, Poland: €600–€850 — Warsaw University of Technology; emerging tech hub. (4) Kraków, Poland: €500–€700 — AGH University; extremely affordable. (5) Tartu, Estonia: €600–€800 — University of Tartu; digital-forward country; e-residency. (6) Riga, Latvia: €550–€750 — RTU; Baltic country; EU degree. (7) Berlin, Germany: €750–€1,150 — most popular; no tuition fees. (8) Vienna, Austria: €900–€1,200 — excellent quality of life; low tuition (€1,500/semester for non-EU). Note: Eastern European cities have lower English-medium programs; check language requirements. Degrees from EU-accredited universities are recognized across the EU for work purposes.

Q: How much does accommodation cost for students in the UK?
A: UK student accommodation options and costs: (1) University Halls (On-campus): London: £850–£1,400/month (en-suite); outside London: £500–£800/month. Typically all-inclusive (utilities, internet). Best for first year — guaranteed and safe. Apply through UCAS accommodation portal immediately after accepting offer. (2) Private Student Accommodation (Unite, iQ, Urbanest): London: £900–£1,600/month (en-suite, furnished). Often better quality than university halls with gyms/common rooms. (3) Private rented room (house share): London: £700–£1,100/month per room. More freedom; bills typically additional £100–£150/month. Search: Rightmove, SpareRoom, Zoopla. (4) Homestay (live with UK family): £600–£900/month including breakfast and dinner. Good for language immersion; less common for older students. Tip: Apply for accommodation early — London student housing fills by May–June for September start. Many universities guarantee accommodation to international students in first year.

Q: What is the typical grocery budget for Indian students abroad?
A: Grocery budgets for Indian students (monthly): USA: $200–$350 — Indian grocery stores (Patel Brothers, India Cash & Carry, Apna Bazar) available in most university towns; basmati rice, dal, spices comparable to Indian prices. UK: £150–£250 — Indian grocery shops (Patel Bros in London, Lahore Supermarket in Manchester) in major cities; some items 20–30% more expensive than India. Canada: CAD $250–$400 — Indian grocery chains in Toronto, Vancouver (Oceans Fresh Food Market, Nations Fresh Foods). Germany: €150–€250 — Turkish supermarkets (common in Germany) stock Indian basics; spices/lentils cheaper than UK/US; Indian stores in Berlin, Frankfurt, Munich. Australia: AUD $250–$400 — Indian grocery chains in all major cities. Money-saving tip: Cook in bulk on Sundays — dal, sabzi, roti freeze well. Indian student groups often run bulk-buy cooperatives. Many universities have Indian Student Associations that organize group grocery runs.

---

## 27. WEHIVE-SOП-TEMPLATES NAMESPACE

**Namespace:** `wehive-sop-templates`
**Purpose:** Ready-to-customize SOP frameworks by program type (MS CS, MBA, MS Finance, MIM, MPH, MS Mech Eng, MS ECE, MS Data Science, LLM). WeHive coaching tips embedded.

---

Q: Give me an SOP template for MS in Computer Science.
A: **MS Computer Science SOP Framework (800–1000 words):**

**Paragraph 1 — The Hook (80–100 words):** Open with a specific technical moment that defined your interest. NOT: "Since childhood I loved computers." YES: "When our team's image classification model achieved 94.2% accuracy but failed entirely on adversarial examples, I realized the gap between benchmark performance and real-world robustness would define the next decade of ML. That experience — during my final-year thesis at [University] — is what drives me toward [Program]'s focus on trustworthy AI systems."

**Paragraph 2 — Academic Foundation (100–120 words):** GPA, relevant coursework (name 4–5 specific courses), thesis/capstone summary with technical stack and outcome. "My coursework in Distributed Systems, Advanced Algorithms, and Deep Learning provided the theoretical foundation, while my thesis — [Title] — involved [method] applied to [problem], achieving [metric]."

**Paragraph 3 — Technical Experience 1 (120–150 words):** Most significant project or internship. Name the company/lab, your specific role, technical tools, problem you solved, quantifiable outcome. "As an ML intern at [Company], I was tasked with reducing false positives in their fraud detection pipeline. I implemented a gradient boosting ensemble using XGBoost and LightGBM, reducing false positives by 18% while maintaining 99.1% recall — directly saving $2M annually in manual review costs."

**Paragraph 4 — Technical Experience 2 (100–120 words):** Second project, research paper, open source contribution, or competition result.

**Paragraph 5 — Why This Program (120–150 words):** Name 2–3 specific faculty and their research (cite a paper title). Name a lab, center, or track. Mention one unique program feature (industry partnerships, research funding, course combination).

**Paragraph 6 — Career Goals (80–100 words):** Short-term (2–3 years post-MS) + long-term (5–10 years). Be specific about role, industry, company type, or impact area.

**Paragraph 7 — Closing (60–80 words):** Connect your background to the program's offering. Express genuine enthusiasm without hyperbole.

**WeHive Tip:** After writing your draft, run it through this checklist: (1) Is "I" in every paragraph? (2) Do you name the professor/lab at least twice? (3) Is there at least one specific number in paragraphs 3 and 4? (4) Is your career goal specific enough that someone could verify it in 5 years? If any answer is no, revise.

Q: Give me an SOP template for MBA.
A: **MBA Statement of Purpose / Essays Framework:**

Note: MBA programs use different essay prompts — there is no single universal SOP. This framework covers the core components every MBA application needs.

**Career Narrative Component (200–300 words):** Structure as a story arc: (1) Where you started — role, industry, company size. (2) Key achievements — quantify (managed $5M budget, led team of 12, grew revenue 40%). (3) Turning point — moment you realized you needed the MBA. Be specific: "When I needed to evaluate a potential acquisition target, I lacked the financial modeling skills to assess the deal independently."

**Short-term Goals (100–150 words):** Post-MBA role should be: specific function (product management, investment banking, strategy consulting), specific industry (healthtech, PE, FMCG), specific target employers if possible. Avoid: "I want to be a leader in business." Say: "I aim to join a Series B–D healthtech startup as a Product Manager, focusing on AI-enabled diagnostics, before founding my own company in the space within 8 years."

**Long-term Goals (80–100 words):** 10-year vision. Can be entrepreneurial, social impact, or corporate leadership. Should logically extend from short-term goal.

**Why MBA / Why Now (100 words):** Specific skill gaps the MBA fills: (1) Financial acumen? (2) General management? (3) Network in a new industry? (4) Brand credential for a career switch?

**Why This School (150–200 words — most important, most customized):** Name: specific MBA track or specialization, 2–3 professors by name + their research/teaching, relevant clubs (VC club, Consulting club, Women in Business), alumni outcomes in your target sector, location advantage (NYC for finance, Bay Area for tech). Never send the same Why School paragraph to two programs.

Q: Give me a template for Statement of Purpose for MS in Data Science.
A: **MS Data Science SOP Framework (750–900 words):**

**Opening — Data Problem That Moved You (80 words):** A real data problem you encountered: messy data, a model that gave dangerous predictions, an insight from an analysis that changed a decision. Ground it in a specific moment.

**Academic Background (100 words):** Statistics/Math foundation, programming (Python/R/SQL), relevant projects from undergrad. If switching from a non-CS background: explicitly bridge — "My econometrics training taught me to think rigorously about causal inference, which I now want to combine with ML methods in [Program]."

**Industry/Research Experience (150 words total across 1–2 experiences):** What data problem did you solve? What methods? (regression, NLP, time series, computer vision?) What was the business/scientific impact?

**Research Interests (100 words):** What sub-area of data science interests you most: NLP, causal ML, time series forecasting, computer vision, recommender systems, fairness/ethics in ML? Connect to faculty research.

**Why This Program (120 words):** Faculty + coursework + industry connections specific to data science roles you're targeting.

**Goals (80 words):** Data scientist at a tech company? ML engineer? PhD? AI product manager? Be specific.

---

## 28. WEHIVE-WEHIVE-FAQ NAMESPACE

**Namespace:** `wehive-wehive-faq`
**Purpose:** WeHive-specific FAQs — what WeHive does, pricing, process, turnaround times, refunds, how to get started, what's included in each service package.

---

Q: What is WeHive and what services does it offer?
A: WeHive is India's AI-powered study abroad and visa consultancy platform. We help students navigate the end-to-end process of studying abroad — from university shortlisting and application preparation to visa filing and pre-departure support. Our core services: (1) University Shortlisting — AI-matched university list based on your GPA, GRE/GMAT, work experience, budget, and career goals. (2) Application Support — SOP writing, LOR guidance, resume review, and document preparation. (3) Visa Filing — Complete visa application preparation, financial document organization, and mock interview coaching. (4) Education Loan Facilitation — connections with Credila, HDFC Credila, and Zolve for education loans and US banking. (5) Pre-Departure Kit — accommodation search, SIM cards, forex, airport pickup coordination. We serve students going to USA, UK, Canada, Australia, Germany, France, Netherlands, Ireland, and 15+ other countries.

Q: How much does WeHive charge for its services?
A: WeHive service fees (current pricing): Tourist Visa: ₹4,999, Business Visa: ₹6,999, Student Visa: ₹8,999, Work Visa: ₹12,999, Transit Visa: ₹2,999, Medical Visa: ₹9,999. These fees cover document preparation, filing, and guidance. Government visa fees are charged separately (paid directly to the embassy/consulate). Rush processing: 20% surcharge on base fee. GST: 18% applicable on all fees. WeHive also offers complete study abroad packages (university shortlisting + application + visa) — contact our counselors for package pricing. Promo codes are available for first-time customers and referrals — ask your counselor.

Q: What is WeHive's process once I sign up?
A: WeHive's step-by-step process: (1) Free initial consultation (30 minutes) — profile assessment, country/program recommendations, timeline planning. (2) Onboarding — share documents (transcripts, test scores, CV, passport) via secure WeHive portal. (3) University shortlisting (3–5 days) — AI-matched list of 8–12 universities with admit probability tiers (safe/target/reach). (4) Application preparation (4–8 weeks) — SOP drafting (2 revision rounds included), LOR strategy, document formatting, application submission. (5) Visa filing (after admit) — document checklist, financial document preparation, visa form filing, mock visa interview. (6) Pre-departure support — accommodation search, forex, bank account setup (Zolve), SIM card, departure checklist. WeHive assigns you a dedicated counselor who handles all communication with you and the universities.

Q: What is the typical turnaround time for WeHive's visa filing?
A: WeHive turnaround times: (1) Document checklist preparation: 24–48 hours after you share all documents. (2) Visa application form filling: 2–3 business days. (3) Full visa filing package (forms + supporting documents organized): 5–7 business days. (4) Mock visa interview coaching: scheduled within 3 days of request. (5) SOP first draft: 5–7 business days after intake call. (6) SOP revision turnaround: 48 hours. Rush processing (20% surcharge): 50% faster on all timelines. Note: These are WeHive's processing times — actual visa decision timelines are set by embassies and immigration authorities, which WeHive cannot control. Typical embassy processing: USA F-1 visa 2–8 weeks, Canada study permit 4–12 weeks, UK Student visa 3 weeks, Australia Subclass 500 4–6 weeks.

Q: Does WeHive guarantee visa approval?
A: No — WeHive does not guarantee visa approval, and any consultancy making this claim is misrepresenting how visa decisions work. Visa decisions are made solely by the embassy or immigration authority of the destination country based on your personal profile, financial documents, and the officer's assessment. What WeHive guarantees: (1) Complete, accurate, and well-organized visa application package. (2) Zero errors in form filling. (3) Comprehensive financial document preparation meeting embassy requirements. (4) Mock interview coaching covering likely questions for your profile. (5) Prompt re-filing support if an application is refused and re-filing is possible. Our student visa approval rate is 94% — which reflects quality applications, not a guarantee.

Q: What documents do I need to share with WeHive to get started?
A: Documents to share with WeHive at onboarding: (1) Academic: All semester marksheets + consolidated marksheet + degree certificate (or provisional if recent graduate). (2) Test scores: GRE/GMAT score report, TOEFL/IELTS score report (official PDFs or ETS account screenshots). (3) Work experience: Offer letters, experience letters, pay stubs (last 3 months) if employed. (4) Identity: Passport (all pages scan), Aadhaar card. (5) Financial: Bank statements (last 6 months), Fixed deposit certificates, ITR (Income Tax Returns) of parents/sponsors for last 2 years, Education loan sanction letter if applicable. (6) Extras: Internship certificates, research papers, awards certificates. All documents can be uploaded securely through the WeHive student portal. Physical documents are never required — all digital.

Q: Can WeHive help me get an education loan?
A: Yes — WeHive is a partner with Credila (HDFC Education Loans) and Zolve (US banking for Indian students). Education loan facilitation through WeHive: (1) Credila: India's largest education loan provider; loans up to ₹1.5 crore; collateral and non-collateral options; 9.5–12% interest rate; available for USA, UK, Canada, Australia, Germany, and more. WeHive's referral gets you priority processing and sometimes a 0.25% rate reduction. (2) Zolve: US bank account for Indians moving to the USA — open your US account from India before you travel; comes with a US debit card and access to credit without US credit history. (3) Prodigy Finance: collateral-free loans for top global universities; WeHive is an official referral partner. Loan disbursement typically happens 2–4 weeks before program start; WeHive coordinates timing with your visa and I-20/CAS letter.

Q: How does WeHive's AI chatbot help students?
A: The WeHive AI assistant (powered by GPT-4o with RAG on our proprietary knowledge base) can answer: (1) Country-specific visa requirements — documents, fees, processing times, appointment availability. (2) University comparisons — programs, fees, rankings, scholarship availability. (3) Exam prep — TOEFL/IELTS/GRE registration links, score requirements by university, preparation timelines. (4) SOP guidance — structure, common mistakes, review of your draft. (5) Cost of living — city-by-city budget breakdowns. (6) Scholarship matching — scholarships you're eligible for based on your profile. (7) Application deadlines — rolling vs. fixed deadlines, early decision vs. regular decision. The bot is available 24/7 in the WeHive app and website chat. For complex or personalized queries, the bot connects you with a human WeHive counselor. The bot does not have access to your private documents unless you explicitly share them in the chat.

Q: What countries does WeHive support for student visa services?
A: WeHive currently supports student visa and application services for: Americas: USA (F-1 visa), Canada (Study Permit). Europe: UK (Student visa, Tier 4), Germany (National Visa), France (VLS-TS), Netherlands (MVV), Ireland (Study visa), Sweden (Residence permit), Finland (Residence permit), Denmark (Residence permit), Spain (Student visa). Oceania: Australia (Subclass 500), New Zealand (Student visa). Asia: Singapore (Student's Pass), Japan (College Student visa). We are expanding to: UAE (expanding), South Korea (adding 2025). Not yet supported: Eastern Europe, South America, Africa (for student services). For destinations not listed, WeHive provides general guidance but not full filing support. Check wehive.co.in for the most current list of supported countries.

Q: What is WeHive's refund policy?
A: WeHive refund policy: (1) If WeHive makes an error in your application (wrong form, wrong documents submitted): Full refund of WeHive's service fee. (2) If your visa is refused: No refund of WeHive's service fee (the fee covers our service, not the outcome). WeHive will help with re-filing at 50% of the original service fee. (3) If you cancel before document submission: 50% refund within 7 days of payment; no refund after 7 days. (4) Government visa fees (embassy fees): Non-refundable — paid directly to the embassy; WeHive has no control over these. (5) Education loan referral: No fee charged by WeHive for loan referrals — we earn a referral commission from Credila/Zolve. To initiate a refund claim: email support@wehive.co.in with your booking reference. Processing time: 5–7 business days.

Q: How is WeHive different from other visa consultancies?
A: WeHive vs. traditional visa consultancies: (1) AI-powered shortlisting — WeHive's AI matches your profile to 200+ universities using admit probability scoring, not a static list every counselor shows all students. (2) Transparent pricing — fixed fee structure published on website; no hidden charges. (3) 24/7 AI support — WhatsApp bot and web chat answer questions at any time; you're not waiting for office hours. (4) RAG knowledge base — our AI has access to 1M+ indexed documents on visa rules, scholarship databases, university programs, and cost of living — more current and comprehensive than any individual counselor's knowledge. (5) Digital-first — no physical office visits required; entire process from India to visa done online. (6) Partner network — Credila, Zolve, and OSHC partnerships give you preferential access. Traditional consultancies typically: have generic shortlists, work only during business hours, charge 20–30% more, require in-person meetings. WeHive serves over 2,000 students annually across 20+ countries.

---

## 29. WEHIVE-UNIVERSITIES NAMESPACE

**Namespace:** `wehive-universities`
**Purpose:** Partner university database — programs, QS rankings, tuition fees, intake seasons, admit profiles, application deadlines, scholarship availability, and campus facts for 200+ universities across USA, UK, Canada, Australia, Germany, and Ireland.

---

Q: What are the top universities in the USA for MS in Computer Science?
A: Top US universities for MS CS (QS World Ranking 2025): (1) MIT — QS #1; MS CS tuition $59,750/year; research-focused, no coursework-only MS; strong AI/systems/theory groups; intake: September only; GRE: recommended (320+ competitive); TOEFL: 100+. (2) Stanford University — QS #5; MS CS tuition $62,484/year; 4 tracks: AI, HCI, Systems, Theory; intake: September only; GRE: optional since 2022; TOEFL: 100+. (3) Carnegie Mellon University (CMU) — QS #53; MS CS tuition $55,816/year; multiple MS programs: MSCS, MSML, MSAI, MSCV; intake: December deadline for September start; GRE: required for most programs; 320+ competitive. (4) UC Berkeley — QS #10; MEng (not MS) for coursework; MS CS research-only; tuition $14,312/semester in-state, $26,544/semester out-of-state; intake: December deadline. (5) University of Illinois Urbana-Champaign (UIUC) — QS #68; MS CS tuition $17,408/semester; strong in systems, PL, databases; intake: December 15 deadline; GRE: optional. (6) Georgia Tech — QS #136; MSCS tuition $21,900/year (in-state) or $32,000 (out-of-state); OMSCS online: $7,000 total; intake: January 15 deadline for Fall. (7) University of Washington — QS #58; MSCS professional: $51,000 total; research MS also available; Seattle location = Amazon, Microsoft recruiting. (8) University of Southern California (USC) — QS #128; MSCS tuition $62,268/year; strong industry connections in LA; intake: December 15 deadline; higher admit rate than top-5. WeHive admit probability tool scores your profile against each university's historical admit data.

Q: Which universities in Canada accept Indian students for MS programs?
A: Top Canadian universities for Indian MS students: (1) University of Toronto — QS #25; MEng tuition CAD $27,000–$35,000/year; MS research: CAD $7,000–$9,000/year + stipend; strong AI (Vector Institute) and robotics programs; intake: September and January; GRE: not required for most programs; IELTS: 6.5+. (2) University of British Columbia (UBC) — QS #38; MEng tuition CAD $30,000–$40,000/year; MS research fully funded in most cases; Vancouver location; intake: September (January for some); IELTS: 6.5+. (3) McGill University — QS #44; MSc tuition CAD $9,000–$17,000/year for international; Montreal (bilingual city); strong medical research; intake: September; IELTS: 6.5+. (4) University of Waterloo — QS #154; MEng tuition CAD $26,000/year; top co-op university in Canada; Waterloo is Canada's Silicon Valley; strong CS/ECE programs; IELTS: 6.5+. (5) University of Alberta — QS #111; MSc tuition CAD $15,000–$18,000/year; Edmonton; strong ML/AI via Amii (Alberta Machine Intelligence Institute); IELTS: 6.5+. (6) Simon Fraser University (SFU) — QS #298; MSc/MEng tuition CAD $20,000–$25,000/year; Vancouver area; intake: September and January. (7) University of Ottawa — QS #391; bilingual (English+French); tuition CAD $18,000–$22,000/year; Ottawa is Canada's capital city + federal government jobs. All Canadian universities require a valid study permit — WeHive handles the full Canada study permit process.

Q: What UK universities accept Indian students for MSc programs and what are the fees?
A: Top UK universities for Indian MSc students (tuition per year for international): (1) University of Oxford — QS #3; MSc CS/ML: £35,440; funding via Clarendon, Rhodes scholarships; intake: September; deadline: January (competitive); IELTS: 7.0+. (2) University of Cambridge — QS #5; MPhil CS: £35,343; research-based; supervised by faculty; IELTS: 7.5+; deadline: December. (3) Imperial College London — QS #8; MSc CS: £37,500; MSc AI/ML: £37,500; strong industry links in London; intake: October; IELTS: 6.5+. (4) UCL (University College London) — QS #9; MSc CS: £34,100; MSc Data Science: £34,100; Bloomsbury campus; IELTS: 6.5+; intake: September. (5) University of Edinburgh — QS #27; MSc AI: £31,500; MSc Data Science: £30,300; strong AI research; intake: September; IELTS: 6.5+. (6) University of Manchester — QS #34; MSc CS: £27,000; MSc Data Science: £27,000; Manchester = Northern Powerhouse; lower cost of living than London; IELTS: 6.5+. (7) University of Warwick — QS #69; MSc CS: £27,350; MSc Data Analytics: £26,250; IELTS: 6.0+. (8) University of Bristol — QS #54; MSc CS: £26,200; IELTS: 6.5+. (9) University of Leeds — QS #86; MSc Data Science: £24,000; IELTS: 6.0+. (10) King's College London — QS #40; MSc AI: £34,680; London location; IELTS: 6.5+. UK programs are 1 year — significantly cheaper total cost than 2-year US programs. WeHive has CAS letter guidance and UK Student visa support for all listed universities.

Q: What German universities offer English-taught MS programs for Indian students?
A: German universities with English-taught MS programs (near-zero tuition for all): (1) Technical University of Munich (TUM) — QS #37; MS Informatics, MS Robotics, MSc Data Engineering; semester fee €129; application via TUMOnline; intake: October and April; German language: not required for English programs; GRE: not required; IELTS: 6.5+ or TOEFL 88+. (2) RWTH Aachen — QS #106; MS CS, MS Electrical Engineering, MS Computational Engineering Science; semester fee €290; strong automotive/engineering industry links; intake: October; IELTS: 6.5+. (3) Karlsruhe Institute of Technology (KIT) — QS #119; MS Informatics, MS Electrical Engineering; semester fee €170; intake: October and April; IELTS: 6.5+. (4) University of Stuttgart — QS #191; MS Computational Linguistics, MS Computer Science; semester fee €188; intake: October; IELTS: 7.0+. (5) University of Freiburg — QS #227; MS CS, MS Cognitive Science; semester fee €160; Freiburg = sunny city, lower living costs; IELTS: 6.5+. (6) University of Hamburg — QS #181; MS Intelligent Adaptive Systems; semester fee €338 (includes public transport in Hamburg); IELTS: 6.5+. (7) Ludwig Maximilian University Munich (LMU) — QS #59; MS Data Science; semester fee €147; strong research; intake: October. Note: All German public universities charge only a semester contribution (€120–€350) — no tuition fees. APS certificate required for Indian students. WeHive coordinates APS appointments and Blocked Account (Sperrkonto) setup.

Q: What are the top universities in Australia for MS programs for Indian students?
A: Top Australian universities for Indian MS students: (1) University of Melbourne — QS #33; MS CS: AUD $46,464/year; MS Data Science: AUD $46,464/year; Melbourne = most livable city; intake: March and July; IELTS: 6.5+; GRE: not required. (2) Australian National University (ANU) — QS #34; MS CS: AUD $46,560/year; Canberra; strong research; IELTS: 6.5+; intake: February and July. (3) University of Sydney — QS #18; MS CS: AUD $48,480/year; Sydney CBD location; intake: February and July; IELTS: 6.5+. (4) University of New South Wales (UNSW) — QS #19; MS CS: AUD $47,460/year; Sydney; strong industry connections; IELTS: 6.5+. (5) Monash University — QS #37; MS CS: AUD $43,700/year; Melbourne; largest Australian university; intake: March and July; IELTS: 6.0+. (6) University of Queensland (UQ) — QS #40; MS CS: AUD $44,240/year; Brisbane; warm climate; IELTS: 6.5+. (7) University of Adelaide — QS #89; MS CS: AUD $40,000/year; more affordable; IELTS: 6.0+. (8) Macquarie University — QS #140; MS Data Science: AUD $38,000/year; Sydney; strong analytics program. Australian MS programs are 1.5–2 years. Post-study work: Subclass 485 Graduate Visa (2–4 years depending on study location). WeHive manages the full Subclass 500 student visa and 485 post-study visa process.

Q: What is the typical GRE score required for top US MS CS programs?
A: GRE score benchmarks for US MS CS programs (Quant / Verbal / AWA): Top-5 (MIT, Stanford, CMU, Berkeley, Caltech): Quant 167–170 / Verbal 155–162 / AWA 4.0–5.0. These are median scores of admitted students — you can be admitted with lower scores if research experience or GPA compensates. Top 10–25 (UIUC, UW, Cornell, UCLA, Purdue, UT Austin): Quant 163–168 / Verbal 152–158 / AWA 3.5–4.5. Top 25–50 (USC, ASU, Northeastern, NCSU, UMass): Quant 158–165 / Verbal 148–155 / AWA 3.0–4.0. Top 50–100 (University of Florida, Stevens, Drexel, RIT): Quant 155–163 / Verbal 145–152 / AWA 3.0. Key insight: For STEM programs, Quant matters most. A 167+ Quant with 152 Verbal is stronger than 160 Quant with 160 Verbal. AWA is rarely filtered on unless applying to writing-heavy programs. GRE is optional at: Stanford, MIT (since 2022), Berkeley (since 2020), Columbia, Yale, Princeton. "Optional" still means submitting a strong score helps — submit if Quant ≥ 165. WeHive's profile evaluation tool tells you which universities are your safe/target/reach based on your actual GRE scores.

Q: Which US universities give the most scholarships to Indian MS students?
A: US universities most generous with MS scholarships/TA/RA for Indian students: (1) University of Massachusetts Amherst (UMass) — high TA/RA availability in CS department; stipend ~$20,000/year + full tuition waiver; strong ML group. (2) Stony Brook University (SUNY) — many TA positions for CS MS students from India; stipend ~$18,000/year; ranked well for value. (3) University of Florida (UF) — competitive TA positions; strong Indian student community; lower tuition base ($15,000/year). (4) North Carolina State University (NCSU) — RA positions in ECE and CS; strong semiconductor/hardware industry ties. (5) Purdue University — TA/RA available; stipend ~$20,000/year; West Lafayette; solid CS and ECE programs. (6) University of Minnesota — TA/RA funding in CS; $18,000–$22,000 stipend; Minneapolis. (7) Arizona State University (ASU) — partial tuition scholarships for high GPA applicants; large Indian student community. (8) Texas A&M — TA positions available; strong engineering programs; College Station. Strategy: Apply to 2–3 universities where your GRE (320+) and GPA (8.5+ on 10-point scale) put you in the top 20% of the class — those are the students most likely to receive TA offers. Email faculty directly before applying. WeHive's counselors identify TA-friendly programs based on your specific profile.

Q: What is the application deadline for Fall 2025 intake at US universities?
A: US university Fall 2025 application deadlines for MS programs: Early deadlines (November–December 2024): CMU: December 1 (most MS programs); Stanford: December 1; MIT: December 15; Cornell: December 1 (MEng); Georgia Tech: January 1. Regular deadlines (January 2025): UC Berkeley: December 8–January 5 (varies by program); UIUC: December 15; University of Washington: December 15; USC: January 15; Purdue: January 15; UMass Amherst: January 15. Later deadlines (February–March 2025): ASU: February 1; Northeastern: Rolling (apply early for scholarship consideration); Florida International: March 1. Spring 2025 intake (January start): Limited MS programs offer Spring intake — USC, Northeastern, ASU, FIU are among the few. Most top-30 programs are Fall-only. Recommendation: Have all applications submitted by December 15 for the best scholarship consideration, even if the official deadline is later. WeHive tracks all deadlines and sets personal reminders 4 weeks before each.

Q: What are the top universities in Ireland for Indian students?
A: Top Irish universities for Indian students: (1) Trinity College Dublin (TCD) — QS #81; MSc CS: €22,550/year; MSc AI: €22,550; Dublin city center; intake: September; IELTS: 6.5+. (2) University College Dublin (UCD) — QS #181; MSc CS: €22,000/year; MSc Data Analytics: €22,000; largest Irish university; intake: September; IELTS: 6.5+. (3) University College Cork (UCC) — QS #302; MSc CS: €18,500/year; Cork city; more affordable; IELTS: 6.0+. (4) National University of Ireland Galway (NUIG/University of Galway) — QS #341; MSc Data Analytics: €17,000/year; Galway; quieter city; IELTS: 6.0+. (5) Dublin City University (DCU) — MSc Computing: €15,000/year; strong industry links in Dublin's Silicon Docks (Google, Facebook, LinkedIn HQ in Dublin). Why Ireland: (1) EU country — potential pathway to EU work after studies. (2) English-speaking. (3) Dublin = European HQ for Google, Meta, Apple, LinkedIn, Twitter. (4) Stay Back visa: Graduate Programme visa allows 12–24 months post-study job search. (5) Lower cost than UK, though Dublin is expensive city. WeHive provides full Irish student visa support including Irish Naturalisation and Immigration Service (INIS) registration guidance.

Q: What are the top MBA programs in the USA for Indian applicants?
A: Top US MBA programs for Indian applicants (QS MBA Rankings 2025): (1) Harvard Business School (HBS) — QS #1; tuition $146,000 (2 years); case study method; no functional concentration; GMAT 730+ competitive; average work experience: 5 years; intake: September (3 rounds: Sept/Jan/April deadlines); Indian acceptance rate: ~10–12%. (2) Stanford GSB — QS #2; tuition $146,400; most selective globally (acceptance rate ~6%); strong tech/entrepreneurship focus; GMAT 738+ median; essays: "What matters most to you, and why?" (3) Wharton (UPenn) — QS #3; tuition $164,700; strong finance/consulting/general management; GMAT 722+ median; 5+ functional clusters including healthcare and real estate. (4) MIT Sloan — QS #5; tuition $163,520; strong tech/entrepreneurship; cover letter + video essay; GMAT 720+ median. (5) Kellogg (Northwestern) — QS #7; tuition $164,100; strong marketing and general management; teamwork-oriented; GMAT 727+ median. (6) Booth (University of Chicago) — QS #6; tuition $161,400; most flexible curriculum; strong finance/economics tradition. (7) Columbia Business School — QS #9; NYC location; strong finance; Early Decision Round (August deadline) gives slight edge; GMAT 726+ median. (8) Ross (University of Michigan) — QS #14; MAP (Multidisciplinary Action Projects) differentiator; GMAT 716+ median; more accessible for Indian applicants. WeHive's MBA counselors specialize in GMAT strategy, essay coaching, and recommendation letter guidance for Indian applicants.

Q: How does WeHive shortlist universities for a student?
A: WeHive's AI-powered university shortlisting process: (1) Profile intake: GPA (converted to 4.0 scale), GRE/GMAT scores, TOEFL/IELTS scores, work experience (years + industry), research publications, projects, target programs, budget range, destination preference. (2) Admit probability scoring: WeHive's ML model (trained on 3 years of Indian student admit/reject data from 150+ universities) scores each university on a 0–100 admit probability for your profile. (3) Tier classification: Safe (>70% probability), Target (40–70%), Reach (<40%). WeHive recommends 3–4 safe, 4–5 target, 2–3 reach universities = 9–12 total. (4) Filtering: Removed universities that don't match your budget, location preference, or career goal (e.g., if you want Silicon Valley recruiting, low-ranked California schools outrank high-ranked Texas schools). (5) Output: Ranked list with admit probability, tuition, scholarships available, typical offer timeline, and WeHive counselor notes. Turnaround: 3–5 business days after intake call. The shortlist is not a static template — it's built for your profile, updated if your test scores improve.

---

## 30. WEHIVE-JOBS-AND-PR NAMESPACE

**Namespace:** `wehive-jobs-and-pr`
**Purpose:** Post-study work rights, OPT/CPT rules, PGWP, TSS 482, 485 Graduate visa, PR pathways by country, job search strategy for international students, and H-1B sponsorship landscape.

---

Q: What is OPT and how does it work for F-1 students in the USA?
A: OPT (Optional Practical Training) allows F-1 students to work in the USA in their field of study: Types: (1) Pre-completion OPT: Work before graduation — up to 12 months total (counts against your post-completion OPT). Rarely used. (2) Post-completion OPT: Work after graduation — 12 months for all F-1 students. (3) STEM OPT Extension: Additional 24 months (total 36 months) for students who graduated in a STEM-designated program (CS, ECE, Data Science, Statistics, Engineering, Finance, Economics, etc.) and work at an E-Verify employer. Eligibility: Must have been in F-1 status for at least 1 full academic year. Process: (1) Apply to your DSO (Designated School Official) at your university 90 days before graduation. (2) DSO submits I-20 with OPT recommendation. (3) File I-765 (EAD application) with USCIS — fee $410. (4) Processing: 3–5 months; use premium processing if available. (5) Start date: Can start up to 60 days after graduation; must start within 90 days of EAD card issuance. Important: You can work for any employer (or multiple employers) during OPT, as long as the work is directly related to your degree. During STEM OPT extension, you must work for an E-Verify employer and file I-983 (Training Plan) every 6 months. WeHive has OPT timeline guides and referrals to immigration attorneys for complex cases.

Q: What is CPT and how is it different from OPT?
A: CPT (Curricular Practical Training) vs OPT: CPT: Work authorization during your studies, tied to a specific employer and integrated into your curriculum. Must be a required or elective credit-bearing component of your program. Employer must provide a formal offer letter specifying the training. Approved by your DSO semester by semester. No USCIS application needed — authorized on your I-20. Full-time CPT (20+ hours/week): If you use 12+ months of full-time CPT, you lose OPT eligibility. Part-time CPT does not affect OPT. Use case: Summer internships, co-op semesters, thesis-related industry work. OPT: Post-degree work authorization, applied through USCIS, not tied to a specific employer (during standard OPT), uses up your OPT months. Key differences: CPT is employer + role specific, faster to get, no USCIS wait, but consumes your OPT if used full-time for 12+ months. OPT is flexible (any employer), requires 3–5 month USCIS wait, gives 12–36 months of work authorization. Strategy for Indian students: Use part-time CPT for internships during school to preserve full OPT eligibility for after graduation.

Q: What is the H-1B visa and how do Indian students get it after OPT?
A: H-1B is the primary work visa for skilled workers in the USA: Basics: Employer-sponsored visa for specialty occupations (CS, engineering, finance, sciences). Duration: 3 years, extendable to 6 years (and beyond while Green Card is pending). Annual cap: 85,000 visas/year — 65,000 regular cap + 20,000 master's cap (for US master's degree holders). Lottery: USCIS runs a lottery in March each year (registration opens in March, results by April) for the October 1 start date. If selected, your employer files the full petition April–June. Lottery odds (2024): ~22% for master's cap, ~14% for regular cap — combined about 1 in 4 chance if registered in both. Timeline: (1) March: H-1B lottery registration. (2) April: Lottery results. (3) April–June: Employer files full petition. (4) October 1: Earliest H-1B start date. If not selected in lottery: You continue on OPT (if OPT still valid) and try again next March. STEM OPT extension gives 2 extra years = 3 lottery chances total. Companies that consistently sponsor H-1B: Google, Microsoft, Amazon, Meta, Apple (top sponsors); Infosys, TCS, Wipro, Cognizant (consulting companies, heavily Indian workforce); most Fortune 500 companies. WeHive advises on H-1B cap-exempt employers (universities, nonprofit research) as a fallback strategy.

Q: What is the PGWP and how long does it last in Canada?
A: PGWP (Post-Graduation Work Permit) allows international students who graduate from eligible Canadian DLIs (Designated Learning Institutions) to work in Canada: Eligibility: Graduate from a full-time program of 8+ months at an eligible DLI (most Canadian universities qualify). Duration: Tied to the length of your program: Programs 8 months to less than 2 years → PGWP valid for same length as program. Programs 2 years or longer → PGWP valid for 3 years (maximum). A 2-year master's program → 3-year PGWP. Application: Apply within 180 days of receiving final marks or transcript. Can apply online through IRCC. PGWP is open work permit — work for any employer, in any field. PGWP → PR pathway: After PGWP, use Canadian work experience to apply for PR through: Express Entry (CEC — Canadian Experience Class) — typically 1 year of skilled work experience in Canada is sufficient to get an ITA (Invitation to Apply). Provincial Nominee Programs (PNP) — Alberta, Ontario, BC have tech-specific streams. Important: PGWP is a one-time permit — it cannot be renewed. Plan your PR application before it expires. WeHive has PGWP application guides and referrals to Canadian immigration lawyers for Express Entry filing.

Q: What is the post-study work visa for the UK?
A: UK Graduate Route visa (post-study work visa): Introduced in 2021, the Graduate Route allows international students who completed a UK degree to stay and work: Duration: 2 years for bachelor's/master's graduates, 3 years for PhD graduates. Open work permit: Work in any job, at any skill level (including non-graduate roles). No employer sponsorship needed. Cost: £822 application fee (as of 2024); IHS surcharge not required for Graduate Route. Eligibility: Must have a valid UK Student visa when applying; must have successfully completed your degree; apply in the UK (cannot apply from abroad). Important: Graduate Route does NOT lead directly to PR. To stay longer in the UK, you must switch to a Skilled Worker visa (requires employer sponsorship at the appropriate salary threshold: £26,200 minimum or the "going rate" for your occupation, whichever is higher). UK PR: Requires 5 years of continuous legal residence in the UK (usually on Skilled Worker visa). Path: Study (Student visa) → Graduate Route (2 years) → Skilled Worker visa (employer sponsors) → Indefinite Leave to Remain after 5 years total. WeHive helps with UK Student visa and provides guidance on Graduate Route application.

Q: What are the PR pathways for Indian students studying in Australia?
A: Australia PR pathways for Indian international students: Step 1 — Student Visa (Subclass 500): Study your degree in Australia. Step 2 — Temporary Graduate Visa (Subclass 485): After graduation, apply for 485 visa to work in Australia. Duration depends on where you studied: Major city (Sydney, Melbourne, Brisbane): 2 years. Regional city (Adelaide, Hobart, Darwin, Canberra): 3 years. If you studied for 2+ years in a regional area: up to 5 years (Subclass 485 Regional stream). Step 3 — Skilled Migration (PR): General Skilled Migration (GSM): Points-based system. Points for: age (25–32 = 30 points), English (Superior/Competent), work experience in Australia, overseas experience, education, partner skills, community language, regional study/work. 65 points minimum to lodge EOI (Expression of Interest) in SkillSelect. Invitations issued based on points — higher points = faster invite. Most CS/IT/Engineering occupations on MLTSSL (Medium and Long-term Strategic Skills List) → eligible for: Subclass 189 (Permanent, no state sponsorship), Subclass 190 (State-nominated, 5 extra points), Subclass 491 (Regional, 15 extra points, 3-year PR pathway). Employer Nomination Scheme (Subclass 186): Employer sponsors you for PR after 2+ years in Australia. Realistic timeline: Study (2 years) → 485 visa (2–3 years working) → Gather points → EOI → Invitation → PR application → PR grant: total 5–7 years. WeHive tracks occupation lists and points calculations for your profile.

Q: What is the Germany job seeker visa and Blue Card?
A: Germany post-study pathways for international students: Option 1 — Job Seeker Visa (for graduates from non-EU countries): After completing your degree in Germany: You automatically get an 18-month residence permit extension to find a job in your field. During this 18 months you can work part-time (up to 20 hours/week). Once you find a qualified job: Switch to EU Blue Card or Work Permit (§18a AufenthG). Option 2 — EU Blue Card: For highly qualified non-EU workers (including international graduates): Requires a job offer with annual gross salary of at least €45,300 (€41,041.80 for shortage occupations like CS, engineering, medicine). Blue Card → PR: After 21 months of Blue Card + B1 German language = PR. After 33 months without B1 German = PR. Blue Card + B2 German → naturalisation possible in 3 years. Option 3 — Stay after studies abroad (§16b AufenthG): If you studied in your home country (India) with a recognised German-equivalent degree: Apply for job seeker visa at German consulate in India (6 months). Find job → switch to Blue Card or work permit. PR pathway: Germany is one of the fastest PR timelines globally — Blue Card holders can get PR in 21 months. WeHive Germany desk handles APS certificate, Blocked Account, student visa, and post-study Blue Card guidance.

Q: What jobs can I get in the USA with an MS in Data Science?
A: Career paths with MS Data Science in the USA: Entry-level roles (0–2 years experience, OPT period): Data Scientist I — salary $95,000–$130,000; companies: tech, healthcare, finance, consulting. Data Analyst — salary $80,000–$110,000; SQL, Excel, Tableau; easier to get on OPT. Machine Learning Engineer — salary $110,000–$145,000; requires strong Python/ML frameworks (PyTorch, TensorFlow). Business Intelligence Analyst — salary $85,000–$115,000; less technical, more business-facing. Top hiring companies for DS roles (H-1B sponsors): Google, Amazon, Microsoft, Meta, Apple (FAANG: avg DS salary $150,000–$200,000+), Walmart Global Tech, Capital One, JPMorgan Chase, Goldman Sachs, UnitedHealth Group, Pfizer, Deloitte, McKinsey Analytics. Job search strategy during OPT: (1) Start applying 3 months before graduation. (2) Check H-1B sponsor history at h1bdata.info — filter by company + occupation. (3) Use LinkedIn, Glassdoor, and company career pages. (4) Attend university career fairs — companies specifically recruiting international students. (5) Target companies with established India connections (Infosys, Cognizant, TCS) as OPT bridge employers. Compensation ranges (2024, Levels.fyi data): L3 at Google DS: $195,000 total comp; L59 at Microsoft: $165,000; SDE2 equivalent at Amazon: $180,000.

Q: How long can I stay in the UK after completing my master's degree?
A: Post-master's timeline in the UK: During studies: UK Student visa (Tier 4) valid for duration of program + 4 months. After graduation — Graduate Route: Apply within 4 months of graduation; 2-year open work permit; no employer sponsorship needed; work in any role at any level. After Graduate Route — options: (1) Switch to Skilled Worker visa: Requires job offer from UK-licensed sponsor at £26,200+ salary (or SOC code going rate). Valid for up to 5 years, renewable. (2) Skilled Worker → ILR: After 5 continuous years in the UK (can combine Student + Graduate + Skilled Worker time? No — only Skilled Worker time counts toward the 5-year ILR threshold). Important: Student visa and Graduate Route time does NOT count toward the 5-year ILR requirement. Only Skilled Worker (and some other visas) count. So minimum UK PR timeline from start of studies: 2-year master's + 2-year Graduate Route + 5-year Skilled Worker = 9 years minimum. However, if you complete your 1-year master's, work on Graduate Route and immediately secure a Skilled Worker visa: 1-year study + 5-year Skilled Worker = possible ILR in 6 years. WeHive advises on Skilled Worker visa transitions and provides lists of UK employers licensed to sponsor.

Q: What Indian students need to know about job searching in Canada after graduation?
A: Job search strategy for Indian students in Canada (on PGWP): Before graduation: (1) Attend university co-op/internship programs — many Canadian universities have mandatory co-op terms that secure your first Canadian work experience. (2) Use university career center — especially strong at Waterloo, UofT, UBC for tech roles. (3) Build LinkedIn profile with Canadian keywords — "seeking new grad opportunities," add Canadian city. After graduation, on PGWP: (1) Apply to jobs on LinkedIn, Indeed Canada, WorkBC, Job Bank (Government of Canada's official job board). (2) Target companies that regularly hire international workers: Shopify, RBC, TD Bank, Scotiabank, Deloitte Canada, KPMG Canada, CGI Group, IBM Canada, SAP Canada, Amazon Canada. (3) NOC (National Occupational Classification) code matters for PR — make sure your job title maps to a TEER 0, 1, 2 or 3 NOC code (required for Express Entry). Most CS and engineering roles qualify. (4) 1 year of skilled Canadian work experience → eligible for CEC (Canadian Experience Class) Express Entry. (5) Language: IELTS CLB 7+ required for CEC Express Entry; most Indian students already have strong English. Salary benchmarks (Toronto, 2024): Software Engineer: CAD $85,000–$130,000; Data Scientist: CAD $90,000–$140,000; Product Manager: CAD $100,000–$150,000. WeHive has partner career coaches who specialize in Canadian job market entry for Indian students.

---

## 31. WEHIVE-VISA-TIMELINES NAMESPACE

**Namespace:** `wehive-visa-timelines`
**Purpose:** Real visa processing times, appointment wait times, expedite criteria, DS-160 tips, slot monitoring strategy, and what to do when stuck — for all major destination countries and visa types.

---

Q: How long does the US F1 student visa take to process in India?
A: US F1 student visa processing timeline for Indian applicants (2025): Step 1 — SEVIS fee payment (I-901): Pay at fmjfee.com; processing confirms within 3 business days. Step 2 — DS-160 completion: 45–90 minutes online; save your application ID. Step 3 — Visa appointment: Indian cities current wait times (as of mid-2025): Chennai: 2–4 weeks. Mumbai: 3–6 weeks. New Delhi: 4–8 weeks. Hyderabad: 2–4 weeks. Kolkata: 3–5 weeks. Step 4 — Interview: Same-day decision in ~85% of cases. Administrative processing (221g): Additional 2–12 weeks for STEM/security checks — common for CS, ECE, nuclear engineering applicants. Step 5 — Passport return: 3–7 business days after visa issuance via courier. Total realistic timeline: Book appointment the same day you receive your I-20. Start 3 months before your program start date. Earliest you can enter the US on F1: 30 days before the program start date on your I-20. Expedite: Available for genuine emergencies (medical, death in family, urgent government business) — not available for late I-20 receipt. WeHive's slot monitor tracks US visa appointment slots in real time and notifies you when slots open.

Q: How long does the UK Student visa take to process from India?
A: UK Student visa (formerly Tier 4) processing timeline from India: Standard processing: 3 weeks (15 working days) after biometrics appointment. Priority processing: 5 working days (additional £500 fee). Super Priority: Next working day (additional £800 fee; limited availability). Requirements before applying: CAS (Confirmation of Acceptance for Studies) from your university — issued 6 months before course start; apply for visa no earlier than 6 months before course start. Biometrics: Booked at a VFS Global centre in India (Delhi, Mumbai, Chennai, Kolkata, Hyderabad, Bangalore, Pune, Ahmedabad, Chandigarh, Cochin). Current VFS appointment wait: 1–3 weeks depending on city. Documents needed: CAS number, financial proof (28 days of bank statements showing £1,334/month for London or £1,023/month outside London), ATAS certificate if applicable (science/tech subjects), TB test certificate (if stayed in India 6+ months). Total timeline from CAS receipt: 6–8 weeks recommended buffer. You can enter the UK 1 week before your course starts (if course is 6+ months long). WeHive's UK visa team pre-checks your financial evidence before you submit.

Q: How long does the Canada student permit take from India?
A: Canada Study Permit processing timeline for Indian applicants: Online application (IRCC portal): Processing time: 8–12 weeks (standard, 2025 estimate). SDS (Student Direct Stream): Faster — target 20 calendar days for eligible applicants. SDS eligibility: Indian citizens enrolled in a DLI, IELTS 6.0+ overall, paid tuition upfront, GIC (Guaranteed Investment Certificate) of CAD $10,000+. Biometrics: Required after application submission; appointment at VFS Global India: 1–3 weeks wait. Letter of Introduction (approval): Issued before you travel; exchange for actual permit at port of entry. Timeline recommendation: Apply immediately after receiving your Letter of Acceptance (LOA); 3–4 months before program start is ideal. Port of entry: Bring original LOA, proof of funds, accommodation letter; permit is stamped on arrival. Common delays: Missing biometrics, incomplete financial proof, medical exam not completed. WeHive handles SDS applications — 20-day processing vs. standard 8–12 weeks.

Q: What is 221(g) administrative processing for US visas and how long does it take?
A: 221(g) Administrative Processing: Issued when the consular officer cannot immediately approve your visa and needs additional review. Types: (1) Missing documents — resolve quickly (days to weeks) by submitting requested docs to the embassy. (2) Security/background check (Visa Mantis for STEM fields) — can take 2–12 weeks; nothing you can do to speed it up. (3) Name check — 2–8 weeks. Common triggers for Indian applicants: CS/ECE/AI/ML programs at US universities (Visa Mantis for dual-use tech), prior US visa rejections, travel to certain countries, name matches on security lists. What to do: Track at ceac.state.gov with your case number and interview date. After 60 days with no update, email the embassy: [city]NIV@state.gov (e.g., ChennaiNIV@state.gov). After 90 days, contact your MP/senator or use VFS escalation. Reapplication: Do NOT reapply — it resets the process. Your F1 start date: Contact your DSO (Designated School Official) immediately; most universities allow a deferred start or grace period for 221(g) cases. WeHive has a 221(g) tracker and connects you with immigration attorneys for escalation after 60 days.

Q: How does the US visa slot monitoring work and how can I get an appointment faster?
A: US visa appointment slots in India are released unpredictably — typically in batches early morning (5–7 AM IST) or late night (11 PM – 1 AM IST). Strategies to get a slot faster: (1) Check directly at ustraveldocs.com — log in and check the calendar daily, multiple times. (2) Use WeHive's slot monitor — notifies you via WhatsApp/SMS the moment a slot opens in your city. (3) Check multiple consulate cities — if you're in Hyderabad, check Chennai and Mumbai too; the nearest city isn't always fastest. (4) OFC (Off-site Facilitation Center) appointments are separate from interview appointments — book OFC first, then interview. (5) Cancellations: When someone cancels, their slot opens immediately — highest release at 10 AM and 3 PM IST. (6) Date flexibility: If you can travel to another city, cast a wider net — book the earliest available nationally. Emergency appointments: Available at the consulate's discretion only for genuine emergencies with documentation. Paid services: Multiple third-party slot-notifier services exist — WeHive's is free for premium members. Key rule: Never pay someone who claims to "guarantee" a visa appointment slot — it's a scam.

Q: How long does the Germany student visa take from India?
A: Germany Student Visa (National Visa, Type D) processing timeline from India: Application centre: VFS Global or German consulate/embassy in India (Delhi, Mumbai, Chennai, Kolkata, Bangalore, Hyderabad). Current processing time: 6–12 weeks from submission (2025). Steps: (1) Book VFS appointment: 2–6 week wait depending on city. (2) Submit documents at VFS: Passport, university admission letter, APS certificate, proof of funds (blocked account €11,208 + health insurance), language certificate, academic transcripts. (3) VFS sends to German consulate for processing: 6–12 weeks. (4) Visa sticker in passport: Collect from VFS. Key requirement: APS (Akademische Prüfstelle) certificate — mandatory for Indian applicants; validates your academic credentials; takes 4–8 weeks; apply at aps-india.de. Blocked account: Open a Sperrkonto (blocked account) at Deutsche Bank, Fintiba, or Coracle before applying for the visa — this is your proof of funds (€11,208 for 12 months). Total timeline from admission: APS (4–8 weeks) + Visa appointment wait (2–6 weeks) + Processing (6–12 weeks) = Plan for 5–6 months minimum. WeHive Germany desk coordinates APS and Sperrkonto setup — two most common delays for Indian students.

Q: How long does the Australia student visa (subclass 500) take?
A: Australia Student Visa (Subclass 500) processing timeline from India: Online application through ImmiAccount. Processing time (2025): 75% of applications: 29 days. 90% of applications: 42 days. Biometrics: Required at a VFS Global centre in India. Health examination: Required — book with a panel physician listed on the Department of Home Affairs website; results upload automatically. Financial requirement: Proof of AUD $21,041/year (2025 rate) for yourself, AUD $7,362 for a partner, AUD $3,152 per child. GTE (Genuine Temporary Entrant) statement: Required — explain why you're studying in Australia and why you'll return home after. English requirement: IELTS 5.5+ overall (some universities require 6.0+). Grant notification: Email from DIBP — visa label no longer stamped in passport; use VEVO (Visa Entitlement Verification Online) to confirm. When to apply: Can apply up to 12 months before course start; recommended 3–4 months before. You can enter Australia up to 90 days before your course starts. WeHive pre-screens GTE statements — a weak GTE is the #1 reason for Australian student visa refusal.

Q: What is the processing time for Schengen visa for Indian students going to Europe?
A: Schengen visa processing for Indian students (for countries like France, Netherlands, Sweden, Italy — not Germany long-stay): Type: Short-stay Schengen (Type C) for visits up to 90 days; for study programs over 90 days, apply for a national long-stay visa (Type D) at that country's embassy. Processing time: 15 calendar days (standard); up to 45 days for complex cases; up to 60 days in exceptional circumstances. Application: Apply at the embassy/consulate of your primary destination country in India. Earliest: 6 months before travel; latest: 15 working days before departure. Key documents: Admission/acceptance letter, financial proof (€100/day recommended), travel insurance (€30,000 minimum coverage), accommodation proof, return ticket, bank statements 3–6 months. Current Schengen appointment wait in India (2025): 4–12 weeks — book early. Country-specific long-stay visas: France (VLS-TS): 2–3 months. Netherlands MVV: 4–6 weeks. Sweden residence permit: 4–8 weeks. Italy study visa: 2–4 months. Important: For most European master's programs (1–2 years), you need the national long-stay D-visa, not a Schengen C-visa. WeHive advises on which visa type applies to your specific program and country.

Q: What documents do I need for a US F1 visa interview?
A: Complete US F1 visa interview document checklist: Mandatory: DS-160 confirmation page (barcode page), appointment confirmation letter, SEVIS fee payment receipt (I-901), valid passport (valid 6 months beyond intended stay), one 2x2 inch photo (white background, within 6 months), I-20 form (signed by you and DSO). Supporting financial documents: Bank statements (last 3–6 months), Fixed Deposit certificates, Property documents, Salary slips (if parent is employed), IT returns (last 2–3 years), CA letter certifying net worth, Loan sanction letter (if using education loan). Academic documents (carry but usually not checked): Transcripts, degree certificates, GRE/GMAT scores, TOEFL/IELTS scores, acceptance letter. Ties to home country: Property documents in India, parents' employment letters, sibling enrollment in Indian institutions. What NOT to bring: Originals of all documents (keep at home); carry clear photocopies organized in a folder. Interview tips: Answer in English; be confident about your program choice; clearly state your intention to return after studies; know your program name, university location, and start date. Most F1 interviews last 2–5 minutes. WeHive conducts mock F1 interviews with 500+ commonly asked questions.

Q: My US visa was rejected under 214(b). Can I reapply and how?
A: 214(b) refusal means the officer was not convinced you have sufficient ties to India and will return after your studies. It is the most common US visa rejection reason. Can you reapply? Yes — there is no waiting period for F1 student visas (unlike tourist visas). However, reapplying without addressing the 214(b) reason typically results in another rejection. What to do before reapplying: (1) Understand why — common reasons: vague answers about post-study plans, weak financial evidence, first time leaving India, no property/family ties, applying to a low-ranked or unknown university. (2) Strengthen your profile: Get a stronger financial affidavit, add co-sponsor if needed, obtain a job offer letter from an Indian company confirming your position after return, secure a letter from a family business. (3) Improve your answers: Practice answers to "Why this university?", "Why this program?", "What will you do after graduation?", "Who is sponsoring you?". (4) Choose a different interview officer if possible: Book at a different consulate city. (5) Timing: Wait at least 2–4 months; immediate reapplication looks desperate. Second attempt success rate: If you materially improve your financial evidence and ties, success rate is high. Strong GPA + ranked university + clear career plan = strongest case. WeHive's mock interview coaches have helped 1,000+ students overturn 214(b) rejections.

---

## 32. WEHIVE-FINANCIAL-AID NAMESPACE

**Namespace:** `wehive-financial-aid`
**Purpose:** Education loans for Indian students studying abroad — lenders, amounts, interest rates, collateral rules, moratorium periods, disbursement timelines, forex/remittance, blocked accounts, financial proof requirements per country, and WeHive loan partner referrals.

---

Q: Which banks give education loans for studying abroad without collateral in India?
A: Unsecured (collateral-free) education loans for Indian students studying abroad: (1) HDFC Credila: Up to ₹75 lakh unsecured; interest rate 11–13% p.a.; processing fee 1–1.25%; loan for tuition + living + travel + books; margin: 0%; requires co-applicant (parent/guardian); repayment starts 6 months after course completion or 12 months after first disbursement (whichever is earlier). (2) Avanse Financial Services: Up to ₹75 lakh unsecured; rate 11–13.5%; covers tuition, living, health insurance; margin: 0%; fast processing 5–7 days; co-applicant required. (3) InCred: Up to ₹60 lakh; rate 12–14%; faster disbursal; covers all study-related expenses; top-up loan available. (4) Auxilo (HDFC-backed): Up to ₹65 lakh; rate 11–13%; covers all expenses including laptop; strong for US/Canada/UK/Australia. (5) MPOWER Financing (USA-based, no co-signer needed): For students already in the US/Canada; up to $100,000; no collateral or co-signer needed; rate ~13–15%; great for mid-program funding. (6) Prodigy Finance (UK/Europe-based): For international students at top 750 global universities; no co-signer; rate SOFR + 6–8%; available at 750+ partner universities. Key: For top-10 US universities (MIT, Stanford, CMU), most banks offer larger unsecured amounts. WeHive is a referral partner for HDFC Credila, Avanse, and Auxilo — get preferential rates through WeHive.

Q: What is the interest rate on SBI education loan for studying abroad?
A: SBI (State Bank of India) education loan for abroad studies: Product name: SBI Global Ed-Vantage. Loan amount: ₹7.5 lakh to ₹1.5 crore. Interest rate: Currently MCLR + 1.5% = approximately 10.15–10.65% p.a. (2025); rate is floating — changes with RBI policy. Collateral: Mandatory for loans above ₹7.5 lakh — immovable property (land/house), FD, LIC policy, NSC, or government securities. Margin: 0% (SBI covers 100% of the loan amount). Moratorium period: Course duration + 6 months (no EMI during this period; only simple interest accrues). Repayment: Up to 15 years after moratorium. Tax benefit: Section 80E income tax deduction on interest paid — for 8 years. Processing fee: Nil. Eligible expenses: Tuition, living, books, equipment, travel (one way), study tours, project work. Branch requirement: Apply at the SBI branch nearest to your permanent address. Documents: Admission letter, I-20/CAS/CoE, fee structure, collateral documents, last 3 years IT returns. Processing time: 2–4 weeks. Tip: SBI rates are lower than NBFCs (Credila, Avanse) but require collateral for large amounts. Use SBI if you have property; use NBFCs for faster processing without collateral. WeHive helps compare SBI vs. NBFC based on your collateral situation and destination.

Q: How much money do I need to show for a US F1 student visa?
A: Financial proof required for US F1 student visa: You must show funds to cover your FIRST YEAR of study + living expenses. What to show: First year tuition (as stated in your I-20) + First year living expenses (as estimated in your I-20) = Total first-year cost. Example: If your I-20 shows $55,000/year tuition + $20,000 living = Show $75,000+ in available funds. Acceptable financial documents: Bank statements (liquid funds — savings, current account, FD) showing the full amount for at least 3–6 months. Fixed Deposit receipts. Loan sanction letter from a bank (sanctioned amount must cover total program cost). Property documents (land/house) as supporting evidence. Sponsor letter + financial documents if a relative/employer is sponsoring. Important rules: Funds should be in the sponsor's name (parent/guardian), not the student's. Joint accounts are acceptable. The amount should be consistently maintained — a sudden large deposit 1–2 weeks before the interview raises red flags ("parking money"). FDs must be liquid (not locked for longer than your program). FDs in USD or EUR don't need currency conversion. WeHive's financial document review service checks your fund evidence before you go to the interview.

Q: What is a blocked account (Sperrkonto) for Germany and how do I open one?
A: Sperrkonto (blocked account) for Germany Student Visa: A Sperrkonto is a German bank account where you deposit a fixed amount before your visa application as proof of financial self-sufficiency. Required amount: €11,208 (2025 figure — updated annually by the German government; divide by 12 = €934/month living allowance). How it works: You deposit the full amount; it's "blocked" — you can withdraw only €934/month after you arrive in Germany; the German embassy can see the balance when processing your visa. Providers (open online from India — no Germany trip needed): (1) Fintiba (fintech, most popular): Open in 1–3 days; annual fee €89; IBAN issued immediately; accepted by all German embassies. (2) Coracle (fintech): Open in 1–2 days; fee €79; IBAN immediately. (3) Deutsche Bank (traditional bank): Requires in-person visit in Germany; most universities' first choice but impractical from India. (4) Expatrio: Similar to Fintiba; fee €89; includes health insurance option. Process: (1) Register on Fintiba/Coracle website. (2) Upload passport and admission letter. (3) Transfer €11,208 from your Indian bank (use SWIFT transfer; ~2–3 days). (4) Receive IBAN and balance certificate. (5) Submit balance certificate with visa application. Timing: Open at least 4–6 weeks before your visa appointment. WeHive's Germany desk walks you through Fintiba/Coracle account opening step-by-step.

Q: What is the GIC requirement for Canada student visa and how do I buy one?
A: GIC (Guaranteed Investment Certificate) for Canada Study Permit (SDS stream): Required amount: CAD $10,000 (for 2025; covers first year living expenses). What it is: A fixed-term investment at a Canadian bank, similar to an FD, that proves financial self-sufficiency. Providers in India: (1) CIBC (Canadian Imperial Bank of Commerce): Most popular for GIC; fee ~CAD $150; processing 3–5 business days; open online from India. (2) Scotiabank: Student GIC program; fee ~CAD $200; available online. (3) SBI Canada: New entrant; may suit Indian applicants with SBI existing relationship. Process: (1) Apply online at bank's international student GIC portal. (2) Upload passport and university acceptance letter. (3) Transfer CAD $10,000 via SWIFT from Indian bank (approximately ₹6.2–6.5 lakh at current rates). (4) Receive GIC certificate within 5–7 business days. (5) Submit GIC certificate with study permit application. After arrival: Open a local bank account; GIC releases CAD $833/month (CAD $10,000 ÷ 12). SDS vs. standard stream: With GIC + IELTS 6.0 + upfront tuition payment = SDS stream = target 20-day processing. Without GIC = standard stream = 8–12 weeks. WeHive coordinates GIC applications and verifies documents before submission.

Q: What forex options do Indian students have to send money abroad for tuition?
A: Forex/remittance options for Indian students paying tuition abroad: RBI LRS (Liberalised Remittance Scheme): Indians can remit up to $250,000/year abroad per person under LRS for education. TCS (Tax Collected at Source): 0.5% TCS on remittances above ₹7 lakh/year for education purposes (claimable as tax credit later); 20% TCS if PAN not provided. Options to send money: (1) Bank wire transfer (SWIFT): SBI, HDFC, ICICI — rate: Bank's TT selling rate (typically ₹1–2 more than market rate per USD); processing: 2–3 business days; limit: Up to $250,000/year; best for large tuition payments; fee: ₹500–₹2,500 per transaction. (2) Thomas Cook / Forex dealers: Marginally better rates for smaller amounts; physical visit required. (3) Wise (TransferWise): Near mid-market rate; fee ~0.5%; online; fast (1–2 days); best for smaller amounts (living expenses); limit: $1,000/transaction initially. (4) BookMyForex: Rate lock feature; competitive rates; branch pickup or door delivery; good for forex cash and travel cards. (5) Flywire: Used directly by many universities (USA/UK/Canada) to pay tuition in INR at locked exchange rates; no wire fee; popular for MIT, Stanford, etc. Recommendation: Use Flywire for tuition (university uses it directly). Use Wise for monthly living allowance top-ups. Use bank SWIFT for large one-time transfers. WeHive partners with Flywire — students get a locked rate guarantee on tuition payments.

Q: What is the financial proof requirement for UK Student visa?
A: UK Student visa financial requirement (2025): You must show funds to cover tuition fees for your first year + living costs. Living costs: London: £1,334/month × 9 months = £12,006. Outside London: £1,023/month × 9 months = £9,207. Tuition fees: The first year's fees as shown in your CAS (Confirmation of Acceptance for Studies). Total example: £28,000 tuition + £12,006 living (London) = £40,006 needed in your bank account. Rules: Funds must be held for 28 consecutive days immediately before your visa application date. Day 1 of the 28-day period: The balance must meet the full required amount on this day. The amount must not fall below the required level on any of the 28 days. Whose bank account: Your own, your parent's, or an official financial sponsor's (government/university scholarship). Acceptable evidence: Personal/joint bank statements, building society statements, savings account statements — all from a regulated financial institution. Not accepted: Loan sanction letters (unlike USA), investment statements (unless from regulated institutions), promises of income. Official financial sponsorship letter: If sponsored by a government or university, this replaces the bank statement requirement. WeHive's UK visa team reviews your 28-day bank statement pattern before submission.

Q: How much does it cost to study MS CS in USA including living expenses for Indian students?
A: Total cost of MS CS in USA for Indian students (2025–26 estimates): Tuition (per year): Top-5 (MIT, Stanford, CMU): $55,000–$65,000. Top 10–25 (Cornell, UIUC, UW): $30,000–$55,000. Top 25–50 (USC, Northeastern, ASU): $25,000–$40,000. Living expenses (per year): New York City / San Francisco: $25,000–$35,000. Boston / Seattle / Los Angeles: $20,000–$28,000. Mid-cities (Austin, Pittsburgh, Columbus): $15,000–$20,000. Small college towns (Amherst, Champaign): $12,000–$16,000. Other costs: Health insurance: $2,000–$4,000/year (some universities include it; check if SHIP is mandatory). Books/supplies: $500–$1,500/year. Laptop: $1,000–$2,000 (one-time). Travel India↔USA: $1,200–$2,000 (round trip). Total 2-year MS cost range: Budget universities (ASU, FIU): $60,000–$80,000 total. Mid-tier (UIUC, UW, Purdue): $100,000–$140,000 total. Top-5: $160,000–$200,000 total. TA/RA offset: Full TA/RA covers tuition + $18,000–$22,000 stipend/year — total savings $70,000–$100,000 over 2 years. ROI: Average starting salary after MS CS in USA: $110,000–$145,000. Break-even on loan (at 12% interest, $100,000 borrowed): ~3 years of US employment. WeHive's ROI calculator shows loan repayment timeline vs. expected salary for your target universities.

Q: Can I get an education loan if my parents don't have property as collateral?
A: Yes — multiple options exist for collateral-free education loans: NBFCs (Non-Banking Financial Companies): HDFC Credila, Avanse, Auxilo, InCred — all offer unsecured loans up to ₹60–75 lakh for reputed universities. Assessment based on: University ranking (top 200 QS = higher unsecured limit), program (STEM > Arts), co-applicant income (parent/guardian salary or business income), student's academic profile (GPA, GRE/GMAT scores). International lenders (no Indian collateral needed): MPOWER Financing: For students already enrolled or admitted to 400+ eligible US/Canada universities; no co-signer; no collateral; up to $100,000; rate ~13–15%. Prodigy Finance: For postgrad students at 750+ partner universities globally; no co-signer; repayment starts after graduation; rate SOFR + 6–8%. Government schemes: Vidya Lakshmi Portal (vidyalakshmi.co.in): Central government portal aggregating education loans from 38 banks; some schemes offer collateral-free up to ₹7.5 lakh. Dr. Ambedkar Interest Subsidy Scheme: For OBC/EBC students — interest subsidy during moratorium period. Key factors that help get a larger unsecured loan: Admission to a top-100 QS-ranked university (stronger the university, higher the unsecured limit), strong co-applicant income (₹8 lakh+ annual income helps), good academic record (8.0+ GPA on 10-point scale). WeHive works with 6 lenders and matches you to the right one based on your university and co-applicant profile.

Q: What is the financial requirement for Australia Student Visa?
A: Australia Student Visa (Subclass 500) financial requirement (2025): You must demonstrate ability to cover: Tuition fees: First year's tuition amount (as shown in your CoE — Confirmation of Enrolment). Living costs: AUD $21,041/year for the student. AUD $7,362/year for a spouse/de facto partner. AUD $3,152/year for each dependent child. Return airfare: AUD $2,000–$4,000 (economy, India–Australia). Acceptable financial evidence: Personal/parent bank statements (last 3–6 months). Fixed deposits. Scholarship award letters. Education loan sanction letter from a recognized financial institution. Evidence of Australian government/university scholarship. GTE (Genuine Temporary Entrant) statement: Critically evaluated alongside financial evidence — must demonstrate you have genuine reasons to study in Australia and will return home. Note: Unlike UK (28-day rule), Australia doesn't specify a minimum holding period for funds — but sudden deposits are viewed suspiciously. Processing officer has discretion on what's "sufficient." Recommended buffer: Show 20–30% more than the minimum to reduce scrutiny. WeHive pre-assesses your financial documents against GTE requirements before you lodge.

---

## 33. WEHIVE-APPLICATION-BUILDER NAMESPACE

**Namespace:** `wehive-application-builder`
**Purpose:** Step-by-step university application guidance — Common App vs. university portals, LOR strategy, deferral/waitlist handling, reapplication after rejection, scholarship negotiation, application timeline planning, and WeHive's AI application review.

---

Q: What is the Common App and which universities use it?
A: Common App (Common Application): A single online platform at commonapp.org that allows students to apply to 1,000+ colleges and universities worldwide with one application. Key features: One Common App essay (650 words max) submitted to all Common App member schools. Up to 20 school-specific supplemental essays in addition to the main essay. Recommenders submit LORs directly through Common App — students add their recommenders' emails and the platform invites them. Test scores submitted directly from College Board (SAT) or ACT to each school. Official transcripts sent by your school counselor/registrar. Which US universities use Common App: Most top US universities — Harvard, Yale, Princeton, Columbia, UPenn, Dartmouth, Brown, Cornell (Ivy League); Stanford, MIT (also MIT's own portal), Duke, Northwestern, Georgetown, Emory, UC schools (UC has its own system), Johns Hopkins, NYU, USC, Boston University, Northeastern, Tufts. Which do NOT use Common App (own portals): MIT (mit.edu/apply), UT Austin (MyStatus portal), U of Michigan (own portal), Georgia Tech (GT Admissions portal), UIUC (own portal), Purdue (own portal). Strategy: Start your Common App account in August for September 1 opening; submit to EA/ED schools by November 1/15; RD deadline typically January 1–15. WeHive reviews your Common App essays and supplements — average 3 rounds of revision before submission.

Q: How many letters of recommendation do I need for US graduate school applications?
A: LOR (Letter of Recommendation) requirements for US MS applications: Typical requirement: 3 LORs for most programs. Some programs: 2 LORs minimum; some elite programs (Stanford, MIT) prefer 3 strong over 4 average. Who should write your LORs: Ideal: 2 academic (professors who taught you in relevant courses), 1 professional (manager from internship/job). Acceptable: 3 academic if you have no work experience. Avoid: Family friends, relatives, school principals who don't know your academic work, professors from irrelevant subjects. How to ask for LORs: Ask 2–3 months before the deadline. Email: "Dear Professor [Name], I am applying for MS CS at [universities]. You taught me [course] where I [achievement]. Would you be able to write a strong letter of recommendation for me?" Provide: Your resume, SOP draft, unofficial transcript, list of universities + deadlines, a brief summary of what you'd like highlighted. Waiving your right: Always waive your right to see the letter — admissions committees trust non-waived letters less. Following up: Send reminders 4 weeks, 2 weeks, and 3 days before each deadline. Submitting: LORs are submitted directly through the application portal — your recommender gets an email with a unique link. LOR strategy: One letter should speak to your research potential; one to your technical/analytical skills; one to your leadership and teamwork. WeHive's LOR template package gives recommenders a framework with bullets they can personalise.

Q: What should my Statement of Purpose (SOP) include for MS CS applications?
A: SOP (Statement of Purpose) for MS CS — structure and content: Typical length: 500–1,000 words (follow each university's specific word/page limit). Paragraph 1 — Hook + motivation (100 words): What problem or question drives you? Why CS? Avoid clichés like "I was fascinated by computers since childhood." Start with a specific experience — a project, a failure, a realization. Paragraph 2 — Undergraduate experience (150 words): Relevant coursework, GPA context, research projects, thesis work. Be specific: "In my distributed systems course, I built a Raft consensus implementation that reduced leader election time by 40%." Paragraph 3 — Professional/internship experience (150 words): What you built, what you learned, what gap you identified. Connect your work to why you need this degree now. Paragraph 4 — Research interests + faculty (150 words): Name 2–3 specific professors at this university whose work aligns with yours. "Professor X's work on [specific paper] addresses the scalability problem I encountered at [company]." This proves you've done your homework. Paragraph 5 — Why this program (100 words): Specific courses, labs, resources at THIS university. Not "your excellent reputation." Paragraph 6 — Career goals (100 words): What will you do after graduation? Specific industry, role, problem you'll solve. Connect back to your opening. Common mistakes: Too personal/emotional (admissions wants research fit), too technical (avoid code/math notation), generic (same SOP for all schools), poor structure. WeHive's SOP review service: 3-round review with line-by-line feedback; average applicant improves admit rate by 23% (internal data).

Q: I got waitlisted at my dream university. What should I do?
A: Waitlist strategy for US graduate admissions: First, check if the school accepts waitlist updates: Some universities explicitly say "no further materials"; others welcome a letter of continued interest. Step 1 — Letter of Continued Interest (LOCI): Send within 1 week of waitlist notification. Format: 200–300 words; reaffirm your strong interest in THIS program specifically; provide one meaningful update (new grade, publication accepted, promotion, award, completed project); express that if admitted, you WILL attend. Do NOT: Repeat your entire application; send multiple updates; be emotional or desperate. Step 2 — Provide a new strong update: A paper accepted for publication, a significant work achievement, a new award — send this when it happens, not speculatively. Step 3 — Contact the admissions committee: One polite email to the program coordinator (not the department chair) stating your continued interest and asking if there's anything else you can provide. Step 4 — Decision: Keep your other offers' deposit deadlines in mind. If you get off the waitlist after depositing elsewhere, you will forfeit your deposit (typically $500–$2,000) — factor this into your decision. Timeline: Most US programs resolve waitlists by mid-May to early June. Probability: Depends heavily on the program; top programs admit 5–30% of their waitlist. Advice: Treat other offers as real options; don't turn everything down waiting for one school. WeHive tracks historical waitlist conversion rates for 100+ US programs.

Q: My visa got rejected. Can I still reapply for a different country or defer my university admission?
A: Options after a visa rejection: Option 1 — Reapply for the same visa: US F1: No waiting period; reapply after strengthening your profile. UK Student: Can reapply immediately after addressing the refusal reason. Canada: Can reapply; fix the documentation gap that caused refusal. Australia: Can reapply; fix the GTE statement if that was the issue. Germany: Can reapply after addressing the specific reason. Option 2 — Request a deferral from your university: Email the admissions office IMMEDIATELY after rejection (before the semester starts). Most universities grant 1-year deferral for genuine visa issues — provide your visa rejection letter. Some universities (especially top US schools) have strict no-deferral policies (Stanford, MIT); others are flexible (USC, Northeastern, ASU). Option 3 — Pivot to a different country: If US F1 is rejected, Canada or Germany are excellent pivots — similar programs, lower fees, faster visa processing. WeHive specializes in "pivot counseling" — mapping your profile to the best alternative destination quickly. Option 4 — Upgrade your profile and reapply: Use 1 year to gain work experience, improve GRE/GMAT, publish research, or get a stronger LOR. Option 5 — Alternative programs in India: IITs, IISc, BITS for MS; top IIMs for MBA — not giving up, restrategizing. WeHive's rejection recovery service: 48-hour assessment of what went wrong and a revised action plan.

Q: How do I negotiate a merit scholarship after getting an admission offer?
A: Scholarship negotiation strategy after US graduate admission: Who can negotiate: Most private universities are open to negotiation; public universities (UIUC, UW, UMass) have more rigid scholarship committees. When to negotiate: After receiving the admission offer and financial aid package; before the decision deadline (usually April 15 for most US programs). How to negotiate: Step 1 — Get competing offers in writing. If you have a better financial offer from a comparable or higher-ranked program, use it as leverage: "I have been admitted to [Program X] with a $15,000 merit scholarship. [Your University] is my first choice — is there any flexibility in the aid package?" Step 2 — Write a professional email to the financial aid office or admissions coordinator. Keep it polite, specific, and brief (200–300 words). Step 3 — Provide documentation: Attach the competing offer letter. Step 4 — Highlight what makes you valuable to them: strong GRE, high GPA, research experience, published paper — anything that justifies investment. What to realistically expect: $2,000–$10,000 additional scholarship is common; some programs match competing offers entirely. Red flags: Don't bluff — if you say you have a better offer, you must actually have it. Don't be aggressive or threaten to reject them. Success rate: ~40–60% of negotiation attempts yield some improvement. WeHive has template scholarship negotiation emails and coaches students through the conversation.

Q: What is the timeline for applying to US universities for Fall 2026 intake?
A: Complete timeline for US Fall 2026 university applications (starting now): June–July 2025: Finalize GRE/GMAT prep; take exam if not done. Shortlist 12–15 universities (3–4 safe, 4–5 target, 2–3 reach). August 2025: Request LORs from professors and supervisors (give 3 months). Start SOP drafts. Create Common App account (opens September 1). September 2025: Finalize university list. Start supplemental essays per university. Take GRE if not done. October 2025: Complete TOEFL/IELTS if needed. Finalize SOP (school-specific versions). Send transcripts (WES evaluation if needed — 4–8 weeks). November 1–15, 2025: EA/ED deadlines for priority consideration. Submit to early deadline schools. December 1–15, 2025: Most competitive program deadlines (CMU, MIT, Stanford, Cornell). January 1–15, 2026: Regular decision deadlines (USC, Purdue, NCSU, UMass, ASU). February–March 2026: Interview invitations from some programs (CMU, UPenn). March–April 2026: Admission decisions released. April 15, 2026: Universal reply deadline — accept one offer, decline others. May–June 2026: I-20 request, SEVIS payment, visa appointment booking. August 2026: Program begins. WeHive's application tracker manages this entire timeline — personal reminders 2 weeks before each deadline.

Q: How does the Common App essay differ from the SOP for graduate school?
A: Common App personal essay vs. Graduate SOP: Common App personal essay: Who uses it: Undergraduate applicants. Length: 650 words (strict limit). Purpose: Tells the admissions committee WHO you are as a person — your character, values, growth, identity. Focus: Personal narrative — a story that reveals something meaningful about you. Prompts: 7 options (background, belief challenged, time, problem solved, accomplishment, idea that captivates you, free choice). Tone: Personal, reflective, human — not academic. What NOT to include: Grades, test scores, achievements lists — save those for the activities section. Graduate SOP (Statement of Purpose): Who uses it: MS, MBA, PhD applicants. Length: 500–1,000 words. Purpose: Tells the committee WHY you want this specific program and HOW your background prepares you for it. Focus: Research interests, academic background, professional experience, faculty alignment, career goals. Tone: Professional, focused, analytical. What NOT to include: Emotional personal stories unrelated to academic/professional development. Key insight: The Common App essay is "Why I am who I am" — the SOP is "Why I am ready for this program and what I will contribute." An undergraduate applying to US colleges through Common App needs the personal essay; a graduate applicant submits an SOP through the university's own portal (or sometimes Common App for graduate programs that use it). WeHive's writing team helps with both — different coaches for undergrad vs. graduate applications.

Q: What is the WES evaluation and do I need it for US universities?
A: WES (World Education Services) credential evaluation for US applications: What it is: WES is a non-profit organization that evaluates international academic credentials and converts them to US equivalents. A WES evaluation report tells US universities, employers, and immigration authorities what your degree is equivalent to. Do you need it: For US Graduate Admissions: Most universities do NOT require WES at the application stage — they accept your unofficial transcripts initially; WES is often required only after admission for enrollment confirmation. Exceptions: Some universities require WES with the application (check each school's requirements). For US employment/immigration (H-1B, Green Card): Yes, WES is commonly required. For Canadian immigration (Express Entry, PNP): WES evaluation (specifically ECA — Educational Credential Assessment) is mandatory. Types of WES evaluation: Basic (Document-by-Document): Faster (~7 weeks standard, ~3 weeks rush), cheaper (~$100); evaluates each document separately. Course-by-Course: Standard for US graduate admissions (~7 weeks, $205); converts every course and grade to US equivalents. Processing time: Standard: 7 business days after documents received. Rush (7 days): Additional $100. Express (3 days): Additional $180. How to start: Create account at wes.org; enter your institution; WES contacts your university directly for transcripts (or you arrange for a sealed transcript to be sent). For Indian students: Most Indian universities send transcripts to WES directly upon your request through the WES portal. WeHive's document team helps initiate WES requests and tracks completion.

Q: How can I improve my US graduate application profile if my GPA is below 3.0?
A: Strategies to compensate for a low GPA (below 3.0 / below 7.5 on 10-point scale) in US graduate applications: Understand what committees see: A 3.0 GPA (or 7.5/10) is below the mean for most top-30 programs but doesn't disqualify you if other components are strong. Strategy 1 — Strong GRE compensates significantly: Quant 167+ with a 3.0 GPA is more competitive than Quant 155 with a 3.5 GPA for STEM programs. Strategy 2 — Research experience: A co-authored paper, a strong research internship (IIT/IIIT lab, industry research), or a thesis with notable results can outweigh GPA. Strategy 3 — Upward trend: If your GPA improved each year (6.5 → 7.0 → 8.0 → 9.0), explicitly mention this trajectory in your SOP and additional information section. Strategy 4 — Professional experience: 2+ years of relevant work at a strong company (Google, Microsoft, top startup) shifts the committee's focus from academic GPA to applied ability. Strategy 5 — Targetted university selection: Universities where GPA is less emphasized: NCSU, UMass Amherst, University of Florida, ASU, Stony Brook, Stevens — focus your reach universities on Top 10, but build a strong safe list. Strategy 6 — Address it directly: In the "additional information" section of the application, explain any extenuating circumstances (health issues, family situation, working part-time to fund studies). Strategy 7 — Take online graduate-level courses (Coursera, edX) and earn certificates in ML, Systems, etc. — demonstrates current ability. WeHive's profile evaluator identifies your compensating strengths and recommends the right university tier mix for your actual GPA.

---

## 34. WEHIVE-HEALTH-INSURANCE NAMESPACE

**Namespace:** `wehive-health-insurance`
**Purpose:** Student health insurance requirements by country and university — SHIP waivers, private plan options, NHS surcharge UK, OHIP Ontario, Germany public health insurance (TK/AOK/Barmer), costs, coverage comparison, and how to stay compliant.

---

Q: Do I need health insurance as an international student in the USA?
A: Health insurance for international students in the USA: Is it mandatory? Yes — virtually all US universities require international students to have health insurance. Most universities automatically enroll you in their SHIP (Student Health Insurance Plan) and charge it with your tuition. SHIP costs: $1,500–$4,000/year depending on university. Examples: MIT: ~$4,000/year. UCLA: ~$3,200/year. Georgia Tech: ~$2,200/year. ASU: ~$1,800/year. SHIP waiver: If you already have comparable private insurance, you can apply to waive the SHIP. Waiver requirements: Coverage must be comparable to SHIP (same or better deductible, out-of-pocket maximum, mental health coverage). Waiver application deadline: Usually first 2–4 weeks of each semester. Private alternatives (if waiving SHIP): ISO Student Health Insurance (isoa.org): $50–$150/month, popular for international students. Cigna Global Student: $80–$200/month. Seven Corners: $40–$120/month. IMG Global: $50–$150/month. Recommendation: For most students, keeping the university SHIP is easier and safer — it's integrated with the campus health center. Only waive if you're significantly better off financially with a private plan. F1 visa: Health insurance is not a visa requirement (unlike some other countries) but is a university enrollment requirement. WeHive's insurance guide lists SHIP costs at 100+ US universities.

Q: What is the NHS surcharge for UK Student visa?
A: NHS (National Health Service) Immigration Health Surcharge for UK Student visa: What it is: A mandatory surcharge paid when applying for a UK Student visa that gives you access to the NHS (UK's free public healthcare system) during your stay. Current rate (2025): £776 per year (increased from £624). Who pays: Every international student applying for a UK Student visa. When paid: At the time of online visa application (before biometrics appointment). How calculated: Duration of your visa × £776/year. Example: 1-year MSc program + 4 months pre-stay = 16 months visa = £776 × 16/12 = £1,035. Example: 2-year MSc + 4 months = 28 months = £776 × 28/12 = £1,811. Payment: Credit/debit card during the online application; cannot pay in installments. What it gives you: Full access to NHS — GP (general practitioner/family doctor) registration, NHS hospital treatment, NHS mental health services, emergency care — all free at point of use after paying the surcharge. What it doesn't cover: Dental treatment (separate; NHS dental is partially subsidized), eye tests (separate), some specialist medications. Spouse/dependents: Each family member also pays £776/year. Important: The surcharge is non-refundable if your visa is refused. WeHive UK visa cost breakdowns always include IHS in total cost estimates.

Q: What health insurance do I need as an international student in Canada?
A: Health insurance for international students in Canada: Provincial health insurance (OHIP, MSP, AHCIP): Some Canadian provinces cover international students on provincial health insurance after a waiting period; others require private insurance throughout. Province-by-province: Ontario (OHIP): International students on a study permit of 6+ months are eligible for OHIP; 3-month waiting period from arrival — buy private insurance for first 3 months; after that OHIP covers most health services free. British Columbia (MSP): International students eligible; 3-month waiting period; $0/month premium (since 2020); apply online at hibc.gov.bc.ca. Alberta (AHCIP): Students on study permits of 12+ months eligible immediately; no waiting period. Quebec: International students NOT eligible for RAMQ (Quebec provincial health); must buy private insurance throughout stay — university plan typically mandatory. Manitoba, Saskatchewan, Nova Scotia, New Brunswick: International students not eligible for provincial health; must maintain private insurance. University health plans: Most Canadian universities offer mandatory student health plans ($500–$1,200/year) covering dental, vision, prescription drugs, and supplemental health — covers gaps in provincial insurance. Private options if not covered: Guard.me International Insurance: popular for Canadian international students. Studentcare: University-partner plan. manulife/Sunlife student plans. Cost: $600–$1,500/year for comprehensive private coverage. WeHive Canada advisors explain exactly what coverage you need for your specific province and university.

Q: What is health insurance like for students in Germany?
A: Health insurance for international students in Germany: Is it mandatory? Yes — you cannot enroll at a German university without proof of health insurance. Two types: (1) Public (statutory) health insurance (Gesetzliche Krankenversicherung — GKV): For students under 30 years old studying in Germany: Eligible to join German public health insurance. Cost: ~€120–130/month (2025). Providers: TK (Techniker Krankenkasse) — most popular for international students; AOK; Barmer; DAK. Coverage: Full German healthcare — doctors, hospitals, prescriptions, mental health. How to join: Register with TK (easiest — English-friendly app and website); fill in form online; provide passport, enrollment certificate, German address. The insurer gives you a "Versicherungsbescheinigung" (insurance certificate) which you submit to the university. (2) Private health insurance (Private Krankenversicherung — PKV): For students over 30 or those who opt out of GKV. Providers: MAWISTA, Care Concept, Allianz — international student plans. Cost: €50–100/month for basic coverage; less comprehensive than GKV. Important: TK public insurance is generally recommended for most international students — same coverage as German citizens, €120–130/month is reasonable, and it satisfies all visa and enrollment requirements. Germany requires proof of insurance for your visa application — get the TK Versicherungsbescheinigung before applying. WeHive Germany desk helps you register with TK before your visa appointment.

Q: What health insurance do I need for Australia Student visa?
A: Health insurance for international students in Australia: OSHC (Overseas Student Health Cover): Mandatory for all international students on a Student visa (Subclass 500) for the entire duration of your visa. When to buy: Before applying for your Student visa — your CoE (Confirmation of Enrolment) will specify if the university arranges it or if you buy independently. Cost (2025 approx): Single student: AUD $600–900/year. Student + spouse: AUD $1,400–2,000/year. Student + family: AUD $2,500–3,500/year. Providers (all OSHC-registered): Medibank (most popular — accepted by most universities). Bupa Australia. AHM (Bupa subsidiary). NIB. CBHS. Some universities pre-arrange OSHC with a specific provider — check your CoE. Coverage includes: Doctor visits (GP), public hospital treatment, limited pharmaceuticals (PBS listed). Does NOT cover: Dental, optical, most specialist visits (partially), ambulance in some states. Add-on cover: Many providers offer extras cover for dental/optical at additional cost (~AUD $200–400/year more). Reciprocal Health Agreements: Australia has agreements with Belgium, Finland, Italy, Malta, Netherlands, New Zealand, Norway, Republic of Ireland, Slovenia, Sweden, UK — students from these countries may access Medicare; Indian students do NOT qualify. WeHive includes OSHC cost in all Australia package quotes.

Q: How does health insurance work for students in Ireland?
A: Health insurance for international students in Ireland: Ireland does NOT have mandatory student health insurance for all international students, but: University health centres: All Irish universities have on-campus health centres — free basic GP consultations for enrolled students. Public healthcare (HSE): International students on a valid Irish Residence Permit are entitled to use public healthcare services (GP visits are not free — typically €50–70 per visit; emergency department is free if referred by GP). Private health insurance (recommended): Not legally mandatory but strongly recommended. Providers: Laya Healthcare, VHI Healthcare, Irish Life Health (previously Aviva Health). Student plans: ~€300–700/year. Covers: Private hospital rooms, specialist consultations, some dental/optical. EHIC (European Health Insurance Card): Students from EU/EEA countries can use their EHIC for healthcare access in Ireland — but Indian students do NOT have an EHIC. SUSI grant recipients: If you receive the Irish government's SUSI grant, it may include a healthcare component. Cost without insurance: GP visit: €50–70. Emergency department: ~€100 (if not admitted). Specialist consultation: €150–300. Prescription: €2.50 per item (Drugs Payment Scheme after €80/month limit). Recommendation for Indian students in Ireland: Buy a basic private health plan — Laya or VHI student plans are €400–600/year and worth it for specialist access. WeHive Ireland desk recommends health insurance providers alongside your student visa guidance.

Q: What mental health support is available for Indian students abroad?
A: Mental health resources for Indian students studying abroad: On-campus resources (all countries): All major universities have a Counseling and Psychological Services (CAPS or similar) office — typically free for enrolled students. Services: Individual therapy, group therapy, crisis intervention, psychiatry referrals. Wait times: Can be 2–6 weeks for non-urgent appointments at large US universities; UK and Canadian universities typically faster. US-specific: CAPS at most universities — free up to 6–8 sessions; referrals to community therapists after limit. Crisis line: 988 Suicide & Crisis Lifeline (call or text 988 in the US). NAMI Helpline: 1-800-950-6264. UK-specific: NHS talking therapies — free but wait can be 3–6 months; BACP-registered counselors (private: £50–80/session). Samaritans: 116 123 (24/7 crisis line, UK/Ireland). Canada-specific: CAMH (Centre for Addiction and Mental Health) — Toronto students; Good2Talk student helpline: 1-866-925-5454. Australia-specific: Beyond Blue: 1300 22 4636. headspace centres near universities. Telehealth: Better Help, Talkspace, iCall (India-linked English-speaking therapists) — accessible globally with insurance. India-specific support for students abroad: iCall (iCall.helpline@tiss.edu): TISS-run, free counseling. Vandrevala Foundation: 1860-2662-345 (24/7). Snehi: 91-22-2772-6771. Cultural consideration: Many Indian students delay seeking help due to stigma; most university counselors are trained in cross-cultural issues. WeHive's student support guide includes a mental health resource directory for each destination country.

Q: Can I use my Indian health insurance policy abroad as a student?
A: Indian health insurance abroad for students: Standard Indian health insurance (LIC, Star Health, ICICI Lombard domestic plans): Generally does NOT cover treatment abroad. Standard policies cover only treatment in India. Emergency cover: Some domestic policies have a small emergency cover abroad ($5,000–$25,000) — useful for acute emergencies only; not adequate for full student health needs. Travel insurance (short-term): Products like HDFC ERGO Travel Suraksha, Bajaj Allianz Travel Care cover medical emergencies abroad for up to 90–180 days — adequate for tourists, not for 1–2 year students. International student insurance from India: Some Indian insurers offer dedicated overseas student policies: Reliance General Insurance Overseas Student Insurance: Up to $500,000 medical; covers USA/UK/Canada/Australia/Europe; annual premium ₹15,000–40,000 depending on country and coverage. HDFC ERGO Student Suraksha: Covers medical + study interruption + baggage. New India Assurance Overseas Mediclaim: Covers students in US/UK/Canada. Key issue: Many US and UK universities do NOT accept Indian insurance policies for their mandatory health insurance requirement — they require you to enroll in their SHIP or an equivalent plan that meets their coverage benchmarks. Check your university's health insurance waiver criteria carefully before relying on an Indian policy. Recommendation: Indian student insurance policies are a useful supplement but rarely replace the university's required SHIP or equivalent. WeHive advises on which Indian policies meet specific university waiver requirements.

---

## 35. WEHIVE-TRAVEL-AND-ARRIVAL NAMESPACE

**Namespace:** `wehive-travel-and-arrival`
**Purpose:** Pre-departure checklist, port of entry tips for F1/student visas, first-week survival guide (bank, SIM, SSN/SIN, housing move-in, university orientation, driving licence), customs rules, and city-specific arrival tips for USA, UK, Canada, Germany, Australia, Ireland.

---

Q: What should I do in the first week after arriving in the USA as an F1 student?
A: First week in the USA on F1 student visa — complete checklist: Day 1 — Report to DSO: Report to your university's International Students Office (ISO/ISSS) within 30 days of your program start date (your I-20 specifies your report date). Bring your passport, visa, I-20, and SEVIS receipt. Your DSO will activate your SEVIS record — this is mandatory. Day 2–3 — Bank account: Open a US bank account: Best for students: Chase College Checking (no fees for 5 years for students under 24), Wells Fargo Student Checking, Bank of America Advantage Banking. Required: Passport + I-20 + university acceptance/enrollment letter + local US address. Some banks allow you to open before arriving (Wise, Revolut) — useful to have a US account number immediately. Day 3–4 — SIM card: Best prepaid SIM options for students: Mint Mobile (T-Mobile network): $15/month for 4GB. Google Fi: $20/month + $10/GB. T-Mobile Prepaid: $25/month unlimited. Cricket Wireless: $25–30/month unlimited. Get a SIM at Walmart, Target, or the carrier's store — no SSN required for prepaid. Day 4–5 — SSN (Social Security Number): Apply only if you have an on-campus job offer or a CPT/OPT authorization — not before. Visit the nearest Social Security Administration (SSA) office; bring I-20, passport, visa, I-94 printout from cbp.dhs.gov, and employer letter (if applying for work). Processing: 2–4 weeks. Day 5–7 — University orientation, housing move-in, find grocery store (Indian grocery: Patel Brothers, India Bazaar), locate campus buildings. WeHive's city-specific arrival guides have addresses of nearest Indian grocery, halal/vegetarian restaurants, and temple for 20+ US cities.

Q: What documents should I carry when entering the USA on F1 visa?
A: Documents to carry at the US port of entry on F1 visa: Primary (mandatory — carry in hand luggage, NOT checked baggage): Valid passport with F1 visa stamp. Original I-20 signed by you AND your DSO (Designated School Official). SEVIS fee payment receipt (I-901 receipt from fmjfee.com). University acceptance letter (if available). Supporting (carry, may be checked by CBP officer): Financial proof: Bank statements, FD certificates, loan sanction letter — same documents used for visa interview. University contact information: Your DSO's name, email, and phone number. Accommodation address in the USA: Your on-campus dorm address or off-campus housing address — must have this before landing. Return ticket (not strictly required but can help establish intent to maintain F1 status). Health insurance documents (if SHIP or private insurance is already purchased). Emergency contacts: Parent/guardian's phone number in India + US emergency contact. At the CBP (US Customs and Border Protection) counter: Officer will scan your passport and take biometrics (fingerprints, photo). Be honest and concise. Common questions: "What will you study?", "Where?", "Who is paying for your education?", "Do you have family in the US?". Your I-94 record (admission record) is electronic — check it at i94.cbp.dhs.gov within 3 days of arrival and make sure it says "F-1" and "D/S" (Duration of Status). If your visa is D/S, you can stay as long as you're a student — no fixed expiry date. WeHive sends you a port of entry prep guide 3 days before your flight.

Q: What should I carry in my checked baggage vs. cabin bag when flying to the USA for studies?
A: Packing guide for Indian students flying to USA for studies: Cabin bag (carry-on — 7–10 kg): All travel documents (passport, I-20, visa, SEVIS receipt, university letter). Laptop and phone + chargers. Valuables: jewelry, external hard drives. Medications (with prescriptions, in original packaging). Money: ₹10,000–15,000 cash + USD $200–300 in cash for first few days. Credit/debit card that works internationally (HDFC Forex, Niyo Global, IndusInd Indie card). One change of clothes (in case checked baggage is delayed). Checked baggage (typically 2 bags × 23 kg on international student fares with Air India, Emirates, etc.): Indian food: Spices (turmeric, cumin, coriander — powders okay), MTR ready-to-eat meals (US customs allows commercially sealed packaged food, NOT fresh produce, meat, or dairy). Home comforts: Pressure cooker (2L), mixer/blender (but US uses 110V; bring a transformer or buy a US one). Clothes: Indian ethnic wear is harder to find in the US; bring enough for 6 months. Toiletries: Coconut oil, Indian soaps, brands you prefer — hard to find in smaller cities. Medicines: 3-month supply of any prescription medications + common OTC (Dolo 650, ORS, digestive tablets). Bedding: Towels, pillow covers — save money vs. buying in the US. What NOT to bring: Fresh fruits, vegetables, meat, dairy, seeds, plants (US customs prohibits; you'll have to discard at the airport). More than $10,000 cash (must declare). Duty-free limits: $800 of goods duty-free; alcohol (21+ only). Airlines for students: Air India, Emirates, Qatar Airways, Lufthansa, Turkish Airlines — most have 2×23kg + 7kg cabin bag for economy.

Q: How do I open a bank account in the UK as an international student?
A: Opening a bank account in the UK as an international student: Why it's difficult: Most high street banks (Barclays, HSBC, NatWest, Lloyds) require a UK address proof, which you may not have on day 1. Options: Option 1 — Digital banks (fastest, no address proof needed): Monzo: Open the app before arriving; full UK bank account (sort code + account number); debit card posted to your UK address; no fees; most popular for international students. Starling Bank: Similar to Monzo; excellent app; recommended. Revolut: Opens in minutes; multi-currency; not a full UK bank but works for most purposes. Option 2 — Student bank accounts (high street banks): Barclays Student Account: Visit branch with passport, BRP (Biometric Residence Permit), and university enrollment letter. HSBC Student Account: Similar requirements. NatWest Student Account: Requires 3 months of waiting in most cases. Santander 123 Student: Popular for cashback on bills. Requirements typically: Valid passport. BRP (you collect this within 10 days of arriving). University enrollment letter / confirmation of studies. UK address proof (can use university-provided accommodation letter initially). Timeline: Open a digital bank account (Monzo) on day 1 — you'll have a UK account number within 48 hours. Switch to a high street student account after 2–4 weeks when your BRP arrives and you have stable UK address proof. WeHive UK arrival guide has step-by-step Monzo setup screenshots.

Q: How do I get a SIM card in the UK, Canada, Germany, and Australia as a new arrival?
A: SIM cards for international students by country: UK: Best prepaid options: giffgaff (O2 network): Free SIM, £10/month for 10GB + unlimited calls; order a SIM to your pre-arrival address or collect from Asda. Smarty (Three network): £15/month for unlimited data; no contract. Lebara: Excellent for international calls; £5–15/month; data and India calling bundles. Lycamobile: Good international call rates to India. Get a SIM at airport, Argos, ASDA, Tesco, or online. Canada: Best options: Public Mobile (Telus network): $34/month for 15GB + unlimited Canada/US calling; best value. Koodo Mobile: $40–55/month. Lucky Mobile: Budget option. PhoneBox: Popular with international students; SIM mailed before you arrive. Get a SIM at Walmart Canada, Best Buy, or mobile carrier stores. Germany: Options: Aldi Talk or Lidl Connect: ~€10–15/month for 10GB + EU roaming; buy at supermarkets. Congstar (Telekom): €17/month for 10GB. Lebara Germany: Good for India calls; €10–15/month. Important: German SIMs require registration with a German address — buy after you have your dorm address. Australia: Options: Boost Mobile (Telstra network — best coverage): AUD $20–30/month for 20–40GB. Optus Prepaid: AUD $20–30/month. Woolworths Mobile: AUD $15–25/month. Buy at airport, Woolworths, Coles, JB Hi-Fi. WeHive's city arrival kit recommends specific plans and pickup locations for each arrival city.

Q: How do I get my driving licence converted in the USA, UK, Canada, and Australia?
A: Converting Indian driving licence to a local licence by country: USA: Indian licence is NOT directly convertible — you must pass a driving test in your US state. Process: Get a Learner's Permit (written test, ~$30 fee, at DMV). Practice driving (right-hand traffic if from India — adjustment needed!). Take a road test. Get your US driver's licence (valid 4–8 years depending on state). Indian licence validity: Most US states accept an Indian licence for 1–3 months as a visitor — after that, you must have a local licence for legal driving. International Driving Permit (IDP): Get one from Indian Automobile Association before leaving India (₹1,500, valid 1 year) — accepted in the USA as a supplement to your Indian licence for up to 1 year. UK: Direct conversion possible (but NOT from India currently — UK only converts from EU/EEA, Australia, Canada, etc.). Indian licence: Valid for 1 year from arrival for driving in the UK. After 1 year: Must take UK driving test (Theory test + Hazard Perception + Practical test). Practical test waiting time: 3–6 months; book early on gov.uk. Canada (Ontario): Can exchange Indian licence directly for Ontario licence without a road test (reciprocal agreement as of 2022). Submit: Application, Indian licence, IDP, identity proof, $90 fee at ServiceOntario. British Columbia: Must pass road test; no direct conversion. Australia: Can drive on Indian licence for 3 months after arrival. After 3 months: Must convert to state licence — some states (NSW, VIC) require a driving test; others (QLD) allow direct conversion with Indian licence. International Driving Permit (IDP): Get from Indian Automobile Association before departure — required alongside your Indian licence in most countries.

Q: What is the customs declaration process when arriving in the USA from India?
A: US customs declaration for students arriving from India: CBP Declaration Form (Form 6059B): All arriving passengers complete this form (or digital CBP One app/APC kiosk). What to declare: Cash or monetary instruments over $10,000 (total in all currencies combined). Food items: All food — even packaged; officer decides if it can enter. Commercial goods, gifts, items you plan to sell. Medications (over 90-day supply or controlled substances). Farm/agricultural products. Prohibited items (never bring): Fresh fruits, vegetables, meat (cooked or raw), dairy, eggs, live plants, seeds. Violations: Up to $10,000 fine for undeclared items. What's allowed: Commercially packaged dry spices (unopened), dry lentils/grains (sealed packages), MTR/Haldiram packaged ready meals (commercially sealed, labeled). Gold jewelry (declare if over $800 duty-free threshold). I-94 record: Your admission record is electronic — check at i94.cbp.dhs.gov within 72 hours of arrival; print it and save a PDF. What to expect: Short CBP interview (2–5 minutes); answer honestly; don't joke about terrorism/drugs. If flagged for secondary inspection: Remain calm; it's common; CBP checks bags; typically 30–60 minutes; not a rejection of entry. WeHive's pre-departure guide has a printable customs checklist and list of allowed vs. prohibited items from India.

Q: What Indian food ingredients can I bring from India to the UK, USA, Canada, and Australia?
A: Indian food items allowed when travelling from India: USA (USDA rules): ALLOWED: Commercially packaged dry spices (sealed, labelled), dried lentils/rice/dal (sealed), MTR/Haldiram/Aashirvaad sealed ready-to-eat meals, dried fruits (commercial packaging), candy/sweets (commercially sealed), dried tea, coffee, chocolate, nuts (roasted, commercially packed). NOT ALLOWED: Fresh fruits, fresh vegetables, fresh meat, dairy, eggs, live plants, unprocessed grains, fresh bread with potato or meat filling, fresh coconut with husk. Declare everything — CBP officer makes final call. UK (APHA rules): ALLOWED: Commercially packaged sealed food (spices, rice, lentils, ready meals). NOT ALLOWED: Fresh fruit, vegetables, meat, dairy products from non-EU countries (post-Brexit rules restrict Indian food imports more strictly than US). Checked carefully at Heathrow — spices in original sealed packaging are generally fine. Canada (CFIA rules): ALLOWED: Most commercially packaged processed foods (spices, ready meals, packaged sweets). NOT ALLOWED: Fresh produce, meat, dairy — very strict. Australia (DAFF rules): STRICTEST of all countries. ALLOWED: Commercially sealed packaged dry food, dried spices in sealed packets — subject to biosecurity X-ray and inspection. NOT ALLOWED: Fresh produce, meat, dairy, seeds, fresh herbs, wooden items. Declare everything — Australia's fines are up to AUD $10,000 for undeclared items. General advice: Keep all food in original sealed commercial packaging; bring the minimum needed for first month; Indian grocery stores exist in all major university cities within the first few miles.

Q: How do I set up everything in my first month in Canada as an international student?
A: First month setup checklist for international students in Canada: Week 1 — Essential admin: Report to your university's International Student Services office; bring passport, study permit, acceptance letter. Get a Canadian SIM card (Public Mobile, Koodo, PhoneBox). Open a bank account: Scotiabank, TD Bank, or RBC have dedicated newcomer accounts with no monthly fee for 1 year; bring passport, study permit, and university letter. Week 2 — Healthcare + government: Apply for provincial health insurance: Ontario (OHIP) — apply at Service Ontario; 3-month wait, so get private insurance (university plan) first. BC (MSP) — apply at hibc.gov.bc.ca. Get a Social Insurance Number (SIN): Apply at Service Canada or online at canada.ca; bring passport and study permit; your SIN lets you work legally in Canada. Register with your campus health and dental plan — check opt-out deadline (usually first few weeks). Week 3 — Housing settlement: If in off-campus housing, set up utilities (electricity, internet — Rogers, Bell, Telus are major ISPs). Buy a transit card (Presto in Ontario, Compass in BC). Explore Indian grocery stores (Patel Brothers, Indian stores on main Indian corridors in Toronto's Brampton, Surrey BC, etc.). Week 4 — Academic settlement: Get your student ID, library card, gym access, campus email. Connect with Indian student association and study groups. Set up academic calendar, professor office hours, assignment tracker. Tax: File Canadian tax return (T1) by April 30 each year even as a student — you may get a refund on tuition tax credit. WeHive's Canada newcomer kit has printable checklists for each province.

---

## 36. WEHIVE-AMADEUS-TRAVEL NAMESPACE

**Namespace:** `wehive-amadeus-travel`
**Purpose:** Travel planning for students — flights, hotels, points of interest, price alerts, delay prediction, and safe-place recommendations powered by the Amadeus API. Covers the HolidayPlanner and MapView features.

---

Q: How do I find cheap flights as an international student traveling home or on a holiday?
A: Finding cheap student flights with WeHive's Holiday Planner (powered by Amadeus): Step 1 — Use the "Holiday Planner" tab in WeHive. Enter your origin, destination, and travel dates. The planner searches Amadeus's live flight inventory across 400+ airlines. Step 2 — Price calendar view: Shows the cheapest fares across a 30-day window — shift your departure by 1–3 days to save ₹5,000–₹20,000 on India–US routes. Step 3 — Price alerts: Set a target price; WeHive notifies you via WhatsApp/SMS when the fare drops to your target. Amadeus price analysis shows whether the current price is "low," "typical," or "high" vs. historical data for the same route. Best time to book: India–US: 6–10 weeks in advance; avoid booking within 14 days. India–UK: 4–8 weeks. India–Canada: 6–10 weeks. India–Australia: 6–8 weeks. Tips: Tuesday/Wednesday departures are typically 10–15% cheaper than Friday/Sunday. Use IXC (indirect connections) for major savings — a layover in Doha, Abu Dhabi, or Frankfurt often cuts the fare by 30–40% vs. direct flights. Student discounts: STA Travel and StudentUniverse (accessible via WeHive partners tab) offer exclusive student fares not available on public sites. WeHive's delay predictor (Amadeus Flight Delay Prediction API) tells you the probability of a delay before you book — useful when planning tight connection times.

Q: How does WeHive's flight delay prediction work?
A: WeHive's flight delay predictor uses Amadeus's Flight Delay Prediction API to forecast whether your flight will likely be on time, delayed 30–60 mins, delayed 60–120 mins, or delayed 120+ mins. How it works: Input your flight number and date (or select from search results). The model uses historical on-time performance, origin/destination airport congestion, aircraft type, airline, day of week, and season. Output: Probability score for each delay category — e.g., "78% chance on-time, 15% chance delayed 30–60 min." When to use it: Planning connections with less than 2 hours layover — check both legs. When your layover is in a congested hub (Frankfurt, Heathrow, JFK, Chicago O'Hare). To decide whether to book travel insurance for a specific trip. Reliability: Best for well-operated routes with 2+ years of historical data; less reliable for new routes or small regional airlines. If your flight is predicted to delay and it does: U.S. domestic — airlines owe you rebooking at no cost if delay is 3+ hours. EU/UK flights — EC 261/2004 provides €250–€600 compensation for delays 3+ hours. India (DGCA rules) — airlines must provide meals for delays 2+ hours and hotel for overnight delays.

Q: What hotels near my university should I book for move-in or guest stays?
A: WeHive's MapView Hotel Search (Amadeus Hotel Search API): Open MapView in WeHive and enter your university name or address. The map shows hotels within 1–5 km radius, filterable by star rating, price/night, and amenities. What the data shows: Real-time availability and price from Amadeus GDS (Global Distribution System) — same inventory as Expedia/Booking.com. Star ratings, amenities (breakfast, wifi, parking, gym). Distance from campus in walking minutes. Best use cases for international students: Pre-arrival accommodation (first 1–2 weeks while finding housing). Parents visiting for graduation or orientation. Short university breaks when dorms close. Tips for finding student-friendly options: Filter for hotels with weekly rates — often 20–30% cheaper than 7× nightly rate. Check if the university has a campus hotel or guest house (usually cheapest option for guests). For move-in weekend: Book 3–4 months in advance — hotel demand spikes during September (US/UK) and January/September (Canada) intake seasons. WeHive hotel search also shows ratings and distance from Indian restaurants and grocery stores — useful for parents visiting from India.

Q: How do I find points of interest near my university city?
A: WeHive's MapView POI (Points of Interest) feature, powered by Amadeus Points of Interest API: How to use: Open MapView, click "Places" tab, enter a city or neighbourhood. Filter by category: Restaurants, Shopping, Sightseeing, Nightlife, Parks. What it returns: Top-rated POIs with name, category, Amadeus score (0–10), and map pin. For new international students, most useful POIs: Indian restaurants: Search "Indian restaurant" — MapView clusters them by neighbourhood so you can identify the Indian food corridor in your city (Devon Ave in Chicago, Gerrard St in Toronto, Southall in London). Grocery stores: Desi grocery stores near campus. Hospitals and urgent care: Nearest hospital with ER and walk-in clinics. Public transport: Nearest subway/metro/bus stop. Safe areas: MapView's Safe Place feature (see next) helps you identify safe residential areas. Weekend travel: Use the Holiday Planner to combine flights + POI discovery for weekend trips within your host country (e.g., Boston → NYC, London → Edinburgh, Toronto → Niagara Falls).

Q: How does WeHive's "Safe Place" feature work for finding safe accommodation areas?
A: WeHive's Safe Place (Amadeus Safe Place Score API): What it does: For any neighbourhood or city, the Amadeus safety score API returns a composite safety score (0–100) based on crime rates, walkability, and public safety data. How to access: In MapView, toggle "Safety" overlay. Hover over any neighbourhood to see its safety score. Filter neighbourhoods with score 70+ for student housing search. What the score covers: Crime index (violent and property crime rates), street lighting, walkability safety at night, public transport connectivity. How to use it for housing: When shortlisting off-campus apartments, check the neighbourhood safety score before visiting. Combine with: Google Street View (check the street visually), Facebook/Reddit groups for your university (local student reviews), university's off-campus housing list (pre-vetted landlords). City benchmarks (indicative): Most university neighbourhoods score 65–85. Downtown cores often score 50–70 (higher foot traffic but also higher crime). Suburban areas typically score 80–95. Limitations: Safety scores are aggregated — a high score doesn't mean zero risk. Always visit the neighbourhood in person at different times of day. For Indian students: Connect with Indian student associations who maintain safety reputation knowledge about specific streets and landlords.

Q: How do I use WeHive to plan a holiday trip within my host country?
A: Holiday planning workflow on WeHive: Step 1 — Open Holiday Planner. Enter origin city (your university city), destination (e.g., "Paris" for London-based students, "New York" for Boston students). Select travel dates and number of travellers. Step 2 — Flight search: WeHive (via Amadeus) returns available flights with price, duration, layovers, and price rating (cheap/typical/expensive vs. historical). Step 3 — Hotel search: After selecting flights, WeHive shows available hotels at your destination. Step 4 — POI discovery: MapView shows top attractions, restaurants, and activities at your destination. Budgeting: WeHive estimates total trip cost (flight + hotel + estimated daily spend) so you can plan within your budget. Popular student holiday routes from UK: London → Amsterdam (budget flights from £50 return), London → Barcelona (£60–£120 return), London → Edinburgh (£40–£80 return). From US: Boston → NYC (Megabus $1–$20, Amtrak $30–$80), New York → Washington DC (Amtrak $50–$100). From Canada: Toronto → Niagara Falls (2-hour drive), Vancouver → Victoria (ferry). Visa reminder: WeHive reminds you if the destination requires a separate visa (e.g., Schengen visa from UK for European travel as a non-EU student).

---

## 37. WEHIVE-COMMUNITY-HIVE NAMESPACE

**Namespace:** `wehive-community-hive`
**Purpose:** Student community Q&A, peer experience sharing, stories, study buddy matching, Telegram groups, and hive (forum) discussions. Powers the Hive, Community, and Stories features.

---

Q: What is the WeHive community Hive and how does it work?
A: The WeHive Hive is a peer-to-peer community forum where students ask questions, share experiences, and help each other through the study abroad journey. How it works: Post a question: Go to "Hive" tab, click "Ask the Hive." Your question is categorised by topic (visa, accommodation, university life, career, etc.) and visible to the WeHive community. Answer questions: Help peers by answering questions in your areas of experience. Upvote helpful answers. Hive karma: Active contributors earn WeHive karma — high-karma members are featured as "Hive Experts" and get access to exclusive Q&A sessions with alumni. Topics covered: Visa and immigration experiences, campus accommodation reviews, university course and professor feedback, job hunt experiences, city life tips, friendship and social connection, mental health and homesickness, food and Indian community, travel and holidays. Moderation: WeHive moderates the Hive for respectful, constructive content. No spam, no misleading advice. Official WeHive responses (tagged "WeHive Official") are verified by the team. Best use of Hive: Search before asking — most common questions are already answered. Add your specific details (university name, intake year, nationality) for more relevant answers. Use the "Verified Experience" tag to share your first-hand visa/accommodation/job experience — these posts get boosted visibility.

Q: How do I connect with other Indian students at my university on WeHive?
A: WeHive Community features for connecting with fellow students: University-specific groups: Every major university has a WeHive community group. Join your university's group to connect with batchmates, seniors, and alumni. How to join: Go to Community tab → search your university → "Join Group." WhatsApp/Telegram integration: WeHive links to official (student-run, WeHive-verified) WhatsApp and Telegram groups for your university and intake year. These are separate from WeHive's platform — group admins are community members. How to get the link: Community tab → your university → "Groups" → Telegram/WhatsApp link. Study buddy matching: In Community tab, enable "Study Buddy" mode. Enter your course/subject. WeHive matches you with students in the same course at the same university who also want study partners. Seniors network: Find seniors (1+ years ahead of you) at your university via Community → "Seniors." Message them directly for course advice, accommodation tips, and career guidance. Indian Student Association (ISA): Most universities have an ISA. WeHive lists ISA contact details and event calendars for 200+ universities. Privacy: Your full profile is visible only to people in your groups by default. Adjust visibility in Settings → Privacy.

Q: How do I share my study abroad story on WeHive?
A: WeHive Stories: A dedicated section for longer-form student narratives — visa journeys, first days abroad, culture shock, career wins, and life abroad. How to write a Story: Stories tab → "Write Your Story." Choose a category: Visa Journey, University Life, Job Search, Living Abroad, Return to India. Add your university, destination country, and intake year (helps future students find your story). Write in your own voice — WeHive Stories are authentic peer narratives, not formal blog posts. Add photos (campus, your city, events). Featured Stories: WeHive curates top stories monthly — featured stories reach 10,000+ views and earn the author WeHive badges and karma. What makes a good story: Specific details (which consulate, which apartment service, which professor) are more useful than generic advice. Include the difficult moments — authentically sharing struggles (visa rejection, homesickness, job rejections) helps others prepare. What to include in a visa journey story: Timeline (I-20 receipt date → appointment date → visa date), any complications (221g, slot hunting), what documents you brought, interview questions asked. Stories are searchable: Future students finding "MS CS UT Austin 2025 visa story" will find yours — a direct way to help the next batch.

Q: What are the WeHive Telegram groups and how do I join them?
A: WeHive Telegram Groups directory: WeHive maintains a directory of student-run Telegram groups for universities, cities, and intake cohorts. Types of groups listed: University-specific: e.g., "UT Austin Indian Students Fall 2025," "University of Toronto MS Fall 2025." City-specific: e.g., "Indian Students Boston," "London Indian Students." Country-specific: e.g., "Indian Students USA," "Indian Students UK." Subject-specific: e.g., "MS CS 2025 Admits," "MBA Indian Students 2025." How to find groups: WeHive app → Community → Telegram Groups → filter by university/city/intake year. All listed groups are verified by WeHive as authentic student communities (not spam or scam groups). Group rules (standard across WeHive-listed groups): No spam, no job scam postings, no sharing of personal visa documents. Mutual respect and support. Real identity (no anonymous accounts). Group admins: Volunteer students; WeHive provides community management guidelines. Joining: Click the Telegram link in the WeHive app → opens Telegram → "Join Group." Note: Once you join Telegram groups, communication is outside WeHive's platform — WeHive is not responsible for individual advice in external Telegram groups. Always verify information from Telegram with official sources or WeHive's verified content.

Q: How do I ask a question in the WeHive Hive and get good answers?
A: Tips for getting great answers on WeHive Hive: Structure your question well: Bad: "When will I get my F1 visa?" Good: "Applied for F1 visa at Chennai consulate on Oct 15, 2025. Still in administrative processing (221g). It's been 45 days. My program starts Jan 15. What should I do?" Specific details that help: Consulate/city name, application date, visa type, program start date, university name, any prior visa history. Choose the right category: Visa & Immigration, Accommodation, University Life, Career, Finance, City Life, Community. Tag your post: Add tags like #f1visa #221g #Chennai #UTAustin — makes your post discoverable for future students with the same situation. Add "Seeking: Personal experience" or "Seeking: Official guidance" — helps responders know what kind of answer you want. Follow up: When you get your visa/apartment/job, come back and mark the best answer + add your outcome as a comment — future students will see what actually worked. Upvote: Upvote helpful answers to boost them to the top. Avoid: Asking for advice that requires a lawyer or official (e.g., "Should I reapply after 214b?") — WeHive Hive is peer advice, not legal counsel. Bookmark: Save helpful posts for later reference.

---

## 38. WEHIVE-AGENT-PORTAL NAMESPACE

**Namespace:** `wehive-agent-portal`
**Purpose:** WeHive's concierge counsellor and agent workflows — how agents handle student consultations, advance concierge services, training playbooks, and escalation paths. Powers AgentPortal.jsx, AgentTraining.jsx, and concierge routes.

---

Q: What is WeHive's concierge service and how does it work?
A: WeHive Concierge is a premium, end-to-end guided service where a dedicated WeHive counsellor (concierge agent) manages your entire study abroad journey — from university shortlisting to post-arrival support. How it works: Intake consultation (/concierge/start): 60-minute video call with a WeHive concierge agent. Agent reviews your academic profile (GPA, test scores, work experience), goals, budget, and destination preferences. Agent creates a personalised roadmap with university shortlist, application timeline, and action items. Ongoing support (/concierge/advance): After intake, your assigned agent is reachable via WeHive's in-app chat (response within 4 business hours). Advance sessions: 30-minute video calls for milestone check-ins (application review, visa prep, pre-departure). Services covered: University shortlisting and application strategy, SOP/LOR review and feedback, visa documentation checklist and review, scholarship identification, accommodation search support, pre-departure checklist. Concierge tiers: Essential Concierge: 1 intake + 3 advance sessions. Full Journey: Unlimited sessions throughout your application cycle. Elite: Full Journey + priority agent, visa document review, and guaranteed 2-hour response time. Pricing: Shown at wehive.in/pricing. How to start: Dashboard → "Start Concierge" or direct link /concierge/start.

Q: What documents does a WeHive agent review during a concierge session?
A: WeHive concierge agents are trained to review the following document categories: Academic documents: Transcripts (check for consistency across all semesters, no missing marksheets), degree certificates or provisional certificates, backlog certificates (if applicable). Standardised test scores: GRE/GMAT score reports, IELTS/TOEFL/PTE score reports — check validity (GRE valid 5 years, IELTS valid 2 years). Financial documents: Bank statements (last 6 months, sufficient balance for tuition + living costs), loan sanction letter, scholarship letters, sponsor declaration (if applicable). Application materials: SOP (Statement of Purpose) — agents check structure, specificity, gap explanations, research alignment. LOR (Letters of Recommendation) — agents check tone, specificity, recommender seniority, and whether they address academic vs. professional competence appropriately. Visa documents: I-20 / CAS / Letter of Acceptance, SEVIS payment receipt, DS-160 confirmation page, financial proof meeting destination country requirements. Agent protocol: All documents shared through WeHive's secure portal (end-to-end encrypted). Agents do not retain copies after the session without explicit student consent. Feedback is provided as in-app annotations and a written summary within 24 hours.

Q: How does WeHive's agent training program work?
A: WeHive Agent Training Program (AgentTraining portal): WeHive agents are trained through a structured 4-week onboarding program before handling student consultations. Training modules: Week 1 — Product knowledge: WeHive platform deep-dive, RAG knowledge base, all destination country visa processes (US F1, UK Student, Canada, Australia, Germany, Netherlands), university admission requirements. Week 2 — Consultation skills: Mock consultation simulations, SOP/LOR review practice, active listening and empathy training for handling student anxiety, escalation protocols. Week 3 — Compliance and documentation: GDPR/data privacy compliance, document handling protocols, what agents can and cannot advise on (legal boundary training), referral protocols for immigration attorneys. Week 4 — Live shadowing: Shadow 5 real consultations with a senior agent, then conduct 3 supervised consultations, then solo consultations. Ongoing training: Weekly team sync with updates on visa policy changes, new university admission requirements, scholarship opportunities. Quarterly recertification on compliance. Performance metrics: Agent score based on student satisfaction ratings (NPS), response time adherence, document feedback quality, escalation accuracy. Agent portal (/agent-portal): Shows assigned students, upcoming sessions, document review queue, and performance dashboard.

Q: How does escalation work if a student has a complex immigration situation?
A: WeHive Escalation Protocol for complex cases: Level 1 — Concierge agent handles: Routine visa process questions, document checklist review, timeline planning, university application strategy, SOP/LOR feedback. Level 2 — Senior agent review: Triggered for: Prior visa rejections (especially 214b, refusal under Section 4(2), etc.), previous overstay or immigration violation, criminal record or security-related concerns, complex family situation affecting financial proof. Process: Concierge agent flags case in agent portal → Senior agent joins the next session. Level 3 — Immigration attorney referral: Triggered for: Cases requiring legal advice (pending deportation, complex status change, DACA, asylum, etc.), 221g stuck beyond 90 days, J-1/F-1 status violation, employment authorization questions. WeHive Partner Attorneys: WeHive has a panel of AILA-member immigration attorneys in the US and UK. Agents provide referrals (not recommendations) — the student engages the attorney directly. Level 4 — Emergency escalation: For time-critical situations (visa expiring, emergency travel, ICE encounter): Agent contacts WeHive's 24/7 emergency support line. Agent logs the emergency in the portal with a 1-hour resolution target. Key rule: WeHive agents are not immigration attorneys and cannot provide legal advice. All guidance is informational. For legal matters, always refer to a qualified immigration attorney.

Q: What is the WeHive advance concierge session and what happens in it?
A: WeHive Advance Concierge Session (/concierge/advance): A 30-minute focused session with your assigned concierge agent at a key milestone in your journey. When to book an advance session: SOP/LOR ready for final review (4–6 weeks before application deadline). Visa documents compiled (2–4 weeks before visa appointment). Pre-departure (1–2 weeks before departure). Post-arrival settlement (first 2 weeks in your host country). What happens in each: SOP/LOR review session: Agent shares screen and annotates your SOP in real time. Highlights: Opening hook, why-this-university specificity, career goal clarity, research fit (for research programs), gap explanations. LOR: checks tone, recommender credibility, specific examples cited. Visa prep session: Agent walks through your complete visa document checklist. Flags missing documents or evidence gaps. Reviews financial proof sufficiency (bank statement balances, loan letters). Dry-runs potential interview questions (F1 interview, UK Student visa credibility interview). Pre-departure session: Packing list and baggage allowance optimisation. First week in host country checklist (bank account, SIM card, university registration). Cultural preparation — what to expect in the first month. Post-arrival session: Troubleshoot any issues (SSN delays, bank account problems, university registration issues). Connect to WeHive community groups at your university. How to book: In-app chat with your agent → "Book Advance Session" → calendar picker shows agent's availability.

---

## 39. WEHIVE-POST-ARRIVAL NAMESPACE

**Namespace:** `wehive-post-arrival`
**Purpose:** Post-visa approval and post-arrival support — mandatory university registrations, emergency care guidance, settlement tasks, mental health resources, and the post-approval hub. Powers PostApprovalHub.jsx, EmergencyCare.jsx, and the /mandatory route.

---

Q: What should I do immediately after my student visa is approved?
A: Post-visa approval action list (within 48 hours of approval): Notify your university's international office: Email them with your visa approval date and travel dates — required at most universities to hold your enrolment. Book your flight: Check your I-20/CAS/LOA for the earliest permitted entry date. US F1: Can enter max 30 days before program start date. UK Student: Can enter max 1 week (short course) or 1 month (long course) before start. Canada: Arrive by the date on your study permit/Letter of Introduction. Australia: No specific restriction, but before the course starts. Accommodation confirmation: If you haven't already, finalise on-campus or off-campus housing. Complete pre-arrival university tasks: Most universities have a pre-arrival checklist — housing selection, IT account setup, immunisation records, orientation registration. Pre-departure checklist (WeHive /mandatory route): WeHive's mandatory items tracker shows all actions required before departure, categorised by urgency. Download copies of all key documents to your phone (iCloud/Google Drive): Passport, visa, I-20/CAS, university acceptance letter, financial proof, health insurance certificate. Currency: Carry USD $200–$500 / GBP £150–£300 / CAD $300–$500 cash for immediate expenses. Forex card: Get a multi-currency forex card (Niyo, BookMyForex, Thomas Cook India) for better exchange rates. Inform family: Share your flight details, university address, emergency contacts, and university's international office number with family.

Q: What are the mandatory tasks after arriving at a US university on F1?
A: Mandatory F1 arrival checklist — complete all within the first 2 weeks: SEVIS check-in with DSO (most important, Day 1): Report to your international student office with your passport and I-20. DSO (Designated School Official) activates your SEVIS record. Without this, you are technically in violation of your F1 status. Timing: Must report by the program start date on your I-20 — do not delay. SSN (Social Security Number): Apply at Social Security Administration (SSA) office 10 days after your program start date (SEVIS must be activated first). Required for: on-campus employment, some bank accounts, credit building. US phone number: Get a US SIM card (T-Mobile, AT&T, Mint Mobile, Google Fi) — needed for 2FA on bank accounts and university systems. Bank account: Open within the first week. Best options for F1 students with no SSN: Chase, Bank of America, and Wells Fargo accept passport + I-20 + university ID. Some universities have on-campus bank branches — most convenient. Health insurance: Enrol in the university's SHIP (Student Health Insurance Plan) at registration, or submit a waiver with your own comparable insurance. Enrolling in classes: Maintain full-time enrolment (12 credits undergraduate, 9 credits graduate) — required for F1 status. Dropping below without authorisation is a status violation. Driver's licence: Not mandatory, but useful. Most states: Get a State ID or Driver's Licence with passport + I-20 + university letter + proof of address. CPT/OPT awareness: If you plan to work off-campus, understand CPT (Curricular Practical Training) and OPT (Optional Practical Training) rules — working without authorisation is a serious immigration violation.

Q: What should I do in a medical emergency as an international student abroad?
A: Medical emergency guide for international students (WeHive EmergencyCare): In the US: Call 911 for life-threatening emergencies (ambulance, fire, police). Go to an ER (Emergency Room) for serious but non-life-threatening issues (broken bones, high fever, chest pain). Go to Urgent Care for non-emergency but same-day care (minor injuries, infections, flu) — much cheaper than ER (ER visit copay: $150–$500 with SHIP; Urgent Care: $30–$75 with SHIP). Your university's Student Health Center is cheapest for non-urgent care — book appointments in advance. Health insurance card: Carry your SHIP card at all times. Show it at any campus health or partnered off-campus clinic. In the UK: Call 999 for emergencies. NHS 111 for urgent medical advice (free, 24/7). NHS GP (General Practitioner): Register with a local NHS GP in your first week — it's free as a Student visa holder. Hospital A&E (Accident & Emergency): Free for Student visa holders who paid NHS surcharge. In Canada: Call 911 for emergencies. Provincial health insurance (OHIP/MSP/AHCIP): Covers most medical care after the waiting period (3 months in Ontario). During the wait: Use the university's health plan. Telehealth: Babylon (Canada), Teladoc (US/UK), Push Doctor (UK) — virtual doctor visits, 24/7. Mental health emergencies: US: Call 988 (Suicide and Crisis Lifeline). UK: Call 116 123 (Samaritans) or 999 for immediate danger. Canada: Crisis Services Canada: 1-833-456-4566. WeHive EmergencyCare page has country-specific emergency contact cards downloadable for offline use.

Q: How do I access mental health support as an international student?
A: Mental health resources for international students: University counselling services: All major universities in US, UK, Canada, and Australia offer free counselling for enrolled students. US: Look for "Counseling and Psychological Services" (CAPS) at your university. Typically 6–10 free individual sessions per year. UK: University Wellbeing Service or Student Services — free CBT and counselling. Canada: Most universities offer 3–5 free sessions then refer to community services. Teletherapy: BetterHelp, Talkspace (US/UK) — $60–$90/week, SHIP/student insurance may cover. Headspace: Free for students at many universities via university subscription. Crisis lines (24/7): US: 988 Suicide and Crisis Lifeline (call or text 988). UK: Samaritans: 116 123. Canada: Crisis Services Canada: 1-833-456-4566. Australia: Lifeline: 13 11 14. India-specific counsellors abroad: iCall (India-based online counselling, bilingual Hindi/English): icallhelpline.org. SNEHI (India): Available for NRI students virtually. Commonalities for Indian international students: Homesickness, cultural adjustment, academic pressure, financial stress, loneliness, and identity questions are extremely common — especially in the first 3–6 months. Seeking support is not weakness. Many Indian students find it easier to connect with a therapist who understands South Asian cultural context — WeHive community can connect you with peers who have recommendations. WeHive's post-arrival hub (/mandatory and PostApprovalHub) links directly to your university's mental health services page.

Q: What does the WeHive Post-Approval Hub offer and how do I use it?
A: WeHive Post-Approval Hub (/mandatory, PostApprovalHub): A guided dashboard that activates after your visa is approved and guides you through every step until you're fully settled at your university. Dashboard sections: Pre-departure checklist: Tracked to-do list with deadlines — flight booking, accommodation confirmation, document copies, forex card, packing essentials, family emergency contacts. Arrival week checklist: University-specific tasks — SEVIS check-in (US), bank account, SIM card, student ID, health insurance enrolment. First month tasks: SSN application (US), provincial health card (Canada), NHS GP registration (UK), driving licence, council tax exemption letter (UK). Community connections: Your university's Telegram/WhatsApp group link, ISA contact, WeHive community group. Mandatory compliance alerts: Alerts for time-sensitive tasks (e.g., "SEVIS check-in due in 3 days," "OHIP 3-month wait begins today," "OPT application opens 90 days before graduation"). How to use: Each item has a status toggle (To-do → In Progress → Done). WeHive sends reminders via WhatsApp for overdue mandatory items. Sharing: Export the checklist as a PDF to share with parents. University-specific customisation: The checklist adapts based on your university, intake date, and destination country — a University of Toronto student sees different tasks than a UT Austin student. Agent integration: Your concierge agent can see your Hub status and proactively flag items you haven't completed before your departure date.

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

"""SOP Template Library — 1000+ Statement of Purpose templates.

Generated programmatically from country × program matrices with unique,
field-specific sample text for each combination.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Raw metadata used to generate templates
# ---------------------------------------------------------------------------

_COUNTRY_META: dict[str, dict] = {
    "us": {
        "name": "United States",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "MIT, Stanford, Carnegie Mellon, UC Berkeley, Harvard",
        "system_note": "F-1 visa; emphasise research fit and career ROI",
        "extra_tags": ["OPT", "STEM-OPT", "CPT"],
    },
    "gb": {
        "name": "United Kingdom",
        "visa": "student",
        "tone_default": "academic",
        "uni_examples": "Oxford, Cambridge, Imperial, UCL, Edinburgh",
        "system_note": "Tier-4 / Student visa; structured personal statement",
        "extra_tags": ["UCAS", "Russell-Group"],
    },
    "ca": {
        "name": "Canada",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "Toronto, UBC, McGill, Waterloo, Alberta",
        "system_note": "Study permit; highlight post-grad work permit pathway",
        "extra_tags": ["PGWP", "CRS-points"],
    },
    "au": {
        "name": "Australia",
        "visa": "student",
        "tone_default": "compelling",
        "uni_examples": "Melbourne, Sydney, ANU, UNSW, Monash",
        "system_note": "Subclass 500; genuine temporary entrant (GTE) statement",
        "extra_tags": ["GTE", "post-study-work"],
    },
    "de": {
        "name": "Germany",
        "visa": "student",
        "tone_default": "technical",
        "uni_examples": "TU Munich, RWTH Aachen, Heidelberg, TU Berlin, LMU",
        "system_note": "National visa; many tuition-free programmes; motivation letter",
        "extra_tags": ["tuition-free", "Studienkolleg", "blocked-account"],
    },
    "fr": {
        "name": "France",
        "visa": "student",
        "tone_default": "personal",
        "uni_examples": "Sorbonne, Sciences Po, HEC Paris, École Polytechnique, INSEAD",
        "system_note": "Campus France procedure; lettre de motivation",
        "extra_tags": ["Campus-France", "Grandes-Écoles"],
    },
    "ie": {
        "name": "Ireland",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "Trinity College Dublin, UCD, NUI Galway, DCU, UL",
        "system_note": "Stamp 2; emphasise tech-sector alignment",
        "extra_tags": ["Stamp-2", "tech-hub"],
    },
    "nz": {
        "name": "New Zealand",
        "visa": "student",
        "tone_default": "personal",
        "uni_examples": "Auckland, Otago, Victoria, Canterbury, Massey",
        "system_note": "Student visa; demonstrate genuine intent to study",
        "extra_tags": ["post-study-work", "points-system"],
    },
    "nl": {
        "name": "Netherlands",
        "visa": "student",
        "tone_default": "academic",
        "uni_examples": "Delft, Amsterdam, Leiden, Eindhoven, Erasmus Rotterdam",
        "system_note": "MVV + residence permit; motivation letter required",
        "extra_tags": ["Nuffic", "orientation-year"],
    },
    "sg": {
        "name": "Singapore",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "NUS, NTU, SMU, SUTD, SIT",
        "system_note": "Student pass; highlight ASEAN career goals",
        "extra_tags": ["Student-Pass", "ASEAN-hub"],
    },
    "jp": {
        "name": "Japan",
        "visa": "student",
        "tone_default": "academic",
        "uni_examples": "Tokyo, Kyoto, Osaka, Tohoku, Waseda",
        "system_note": "CoE + student visa; research plan often required",
        "extra_tags": ["MEXT", "research-plan"],
    },
    "kr": {
        "name": "South Korea",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "Seoul National, KAIST, Yonsei, Korea, POSTECH",
        "system_note": "D-2 visa; study plan emphasising Korean industry ties",
        "extra_tags": ["TOPIK", "GKS-scholarship"],
    },
    "it": {
        "name": "Italy",
        "visa": "student",
        "tone_default": "creative",
        "uni_examples": "Bocconi, Politecnico di Milano, Bologna, Sapienza, Domus Academy",
        "system_note": "Type D visa; pre-enrolment via Universitaly",
        "extra_tags": ["Universitaly", "design-capital"],
    },
    "es": {
        "name": "Spain",
        "visa": "student",
        "tone_default": "personal",
        "uni_examples": "Barcelona, Complutense Madrid, IE Business School, Navarra, Salamanca",
        "system_note": "Student visa (estancia); carta de motivación",
        "extra_tags": ["NIE", "carta-de-motivación"],
    },
    "se": {
        "name": "Sweden",
        "visa": "student",
        "tone_default": "academic",
        "uni_examples": "KTH, Lund, Uppsala, Chalmers, Stockholm",
        "system_note": "Residence permit for studies; tuition for non-EU",
        "extra_tags": ["SI-scholarship", "residence-permit"],
    },
    "ch": {
        "name": "Switzerland",
        "visa": "student",
        "tone_default": "technical",
        "uni_examples": "ETH Zurich, EPFL, St Gallen, Zurich, EHL",
        "system_note": "Cantonal student visa; strong research focus",
        "extra_tags": ["cantonal-permit", "hospitality-capital"],
    },
    "at": {
        "name": "Austria",
        "visa": "student",
        "tone_default": "academic",
        "uni_examples": "Vienna, TU Wien, Innsbruck, Graz, Salzburg",
        "system_note": "Residence permit student; motivationsschreiben",
        "extra_tags": ["OeAD", "motivationsschreiben"],
    },
    "dk": {
        "name": "Denmark",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "Copenhagen, DTU, Aarhus, CBS, Aalborg",
        "system_note": "Residence permit for study; motivational essay",
        "extra_tags": ["Danish-Agency", "green-card"],
    },
    "fi": {
        "name": "Finland",
        "visa": "student",
        "tone_default": "academic",
        "uni_examples": "Helsinki, Aalto, Tampere, Turku, Oulu",
        "system_note": "Residence permit type B; motivation letter",
        "extra_tags": ["Finnish-Immigration", "tuition-waiver"],
    },
    "no": {
        "name": "Norway",
        "visa": "student",
        "tone_default": "personal",
        "uni_examples": "Oslo, Bergen, NTNU, Tromsø, BI Norwegian",
        "system_note": "Study permit; tuition-free public universities",
        "extra_tags": ["tuition-free", "Quota-scheme"],
    },
    "be": {
        "name": "Belgium",
        "visa": "student",
        "tone_default": "academic",
        "uni_examples": "KU Leuven, Ghent, ULB, VUB, Antwerp",
        "system_note": "Type D student visa; lettre de motivation",
        "extra_tags": ["Solvay", "EU-capital"],
    },
    "pt": {
        "name": "Portugal",
        "visa": "student",
        "tone_default": "personal",
        "uni_examples": "Lisbon, Porto, Coimbra, Nova SBE, ISCTE",
        "system_note": "Residence visa for study; growing tech scene",
        "extra_tags": ["CPLP", "golden-visa"],
    },
    "cz": {
        "name": "Czech Republic",
        "visa": "student",
        "tone_default": "academic",
        "uni_examples": "Charles, Czech Technical, Masaryk, Palacký, Brno UT",
        "system_note": "Long-term visa for study; tuition-free in Czech",
        "extra_tags": ["Nostrification", "affordable"],
    },
    "pl": {
        "name": "Poland",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "Warsaw, Jagiellonian, AGH, Wrocław, Gdańsk Tech",
        "system_note": "National visa type D; affordable tuition",
        "extra_tags": ["NAWA", "affordable"],
    },
    "in": {
        "name": "India",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "IITs, IIMs, AIIMS, JNU, Delhi University",
        "system_note": "Student visa; for international students coming to India",
        "extra_tags": ["ICCR", "Study-in-India"],
    },
    "cn": {
        "name": "China",
        "visa": "student",
        "tone_default": "academic",
        "uni_examples": "Tsinghua, Peking, Fudan, Zhejiang, Shanghai Jiao Tong",
        "system_note": "X1/X2 student visa; CSC scholarship focus",
        "extra_tags": ["CSC", "HSK"],
    },
    "hk": {
        "name": "Hong Kong",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "HKU, HKUST, CUHK, PolyU, CityU",
        "system_note": "Student visa/entry permit; global finance hub",
        "extra_tags": ["IANG", "finance-hub"],
    },
    "ae": {
        "name": "UAE",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "NYU Abu Dhabi, UOWD, Khalifa, AUS, Zayed",
        "system_note": "Student residence visa; branch campuses",
        "extra_tags": ["Knowledge-Village", "branch-campus"],
    },
    "my": {
        "name": "Malaysia",
        "visa": "student",
        "tone_default": "professional",
        "uni_examples": "Malaya, UTM, UPM, Monash Malaysia, Nottingham Malaysia",
        "system_note": "Student pass; affordable and multicultural",
        "extra_tags": ["EMGS", "affordable"],
    },
    "ph": {
        "name": "Philippines",
        "visa": "student",
        "tone_default": "personal",
        "uni_examples": "UP Diliman, Ateneo, De La Salle, UST, Mapúa",
        "system_note": "Special study permit / student visa 9(f)",
        "extra_tags": ["medical-school", "affordable"],
    },
}

_PROGRAM_META: dict[str, dict] = {
    "ms": {
        "label": "Master of Science",
        "fields": [
            ("Computer Science", "cs", ["AI", "machine-learning", "software", "algorithms"]),
            ("Data Science", "ds", ["big-data", "analytics", "statistics", "ML"]),
            ("Electrical Engineering", "ee", ["circuits", "VLSI", "signal-processing", "power"]),
            ("Mechanical Engineering", "me", ["CAD", "thermodynamics", "robotics", "automotive"]),
            ("Civil Engineering", "civil", ["structures", "geotechnical", "sustainability"]),
            ("Biotechnology", "biotech", ["genomics", "pharma", "bioinformatics"]),
            ("Finance", "fin", ["quantitative-finance", "risk", "fintech"]),
            ("Public Health", "ph", ["epidemiology", "health-policy", "biostatistics"]),
            ("Environmental Science", "env", ["climate", "sustainability", "ecology"]),
            ("Information Systems", "is", ["ERP", "cybersecurity", "IT-management"]),
        ],
        "visa": "student",
        "sections_template": "ms",
    },
    "mba": {
        "label": "MBA",
        "fields": [
            ("General MBA", "gen", ["leadership", "strategy", "consulting"]),
            ("MBA Finance", "fin", ["investment-banking", "PE", "corporate-finance"]),
            ("MBA Marketing", "mktg", ["brand-management", "digital-marketing", "consumer"]),
            ("MBA Technology Management", "tech", ["product-management", "tech-strategy", "SaaS"]),
            ("MBA Healthcare", "health", ["hospital-admin", "health-policy", "pharma-management"]),
            ("Executive MBA", "exec", ["C-suite", "board-governance", "transformation"]),
        ],
        "visa": "student",
        "sections_template": "mba",
    },
    "phd": {
        "label": "PhD / Doctoral",
        "fields": [
            ("PhD Computer Science", "cs", ["deep-learning", "NLP", "systems", "theory"]),
            ("PhD Physics", "phys", ["quantum", "astrophysics", "condensed-matter"]),
            ("PhD Chemistry", "chem", ["organic", "materials", "computational-chemistry"]),
            ("PhD Biology", "bio", ["molecular-biology", "neuroscience", "genetics"]),
            ("PhD Economics", "econ", ["microeconomics", "development", "econometrics"]),
            ("PhD Engineering", "eng", ["nano", "energy", "biomedical-engineering"]),
            ("PhD Mathematics", "math", ["pure-math", "applied-math", "combinatorics"]),
            ("PhD Psychology", "psych", ["cognitive", "clinical", "social-psychology"]),
        ],
        "visa": "research",
        "sections_template": "phd",
    },
    "bachelors": {
        "label": "Bachelor's Degree",
        "fields": [
            ("BSc Computer Science", "cs", ["programming", "algorithms", "software-dev"]),
            ("BEng Engineering", "eng", ["design", "innovation", "problem-solving"]),
            ("BA Business", "bus", ["entrepreneurship", "management", "global-business"]),
            ("BSc Biology", "bio", ["pre-med", "research", "ecology"]),
            ("BA Liberal Arts", "la", ["critical-thinking", "interdisciplinary", "writing"]),
            ("BFA Fine Arts", "art", ["studio-art", "portfolio", "creativity"]),
        ],
        "visa": "student",
        "sections_template": "bachelors",
    },
    "diploma": {
        "label": "Diploma / PG Diploma",
        "fields": [
            ("PG Diploma in Business", "bus", ["practical-skills", "industry-ready"]),
            ("Diploma in IT", "it", ["networking", "cloud", "web-development"]),
            ("Diploma in Hospitality", "hosp", ["hotel-management", "tourism", "F&B"]),
            ("Diploma in Healthcare", "health", ["patient-care", "clinical", "aged-care"]),
        ],
        "visa": "student",
        "sections_template": "diploma",
    },
    "certificate": {
        "label": "Certificate Program",
        "fields": [
            ("Certificate in Project Management", "pm", ["PMP", "agile", "scrum"]),
            ("Certificate in Digital Marketing", "dm", ["SEO", "SEM", "content-marketing"]),
            ("Certificate in Data Analytics", "da", ["Excel", "SQL", "Tableau"]),
        ],
        "visa": "student",
        "sections_template": "certificate",
    },
    "exchange": {
        "label": "Exchange / Semester Abroad",
        "fields": [
            ("Semester Exchange — Engineering", "eng", ["cross-cultural", "labs", "collaboration"]),
            ("Semester Exchange — Business", "bus", ["global-network", "case-studies"]),
            ("Semester Exchange — Liberal Arts", "la", ["language-immersion", "culture"]),
        ],
        "visa": "exchange",
        "sections_template": "exchange",
    },
    "research": {
        "label": "Research Fellowship",
        "fields": [
            ("Research Fellowship — STEM", "stem", ["lab-work", "publication", "grant"]),
            ("Research Fellowship — Social Sciences", "ss", ["fieldwork", "policy", "ethnography"]),
            ("Research Fellowship — Humanities", "hum", ["archives", "manuscript", "theory"]),
        ],
        "visa": "research",
        "sections_template": "research",
    },
    "medical": {
        "label": "Medical / Healthcare",
        "fields": [
            ("MBBS / MD", "md", ["clinical", "anatomy", "patient-care"]),
            ("Dentistry", "dent", ["oral-surgery", "prosthodontics", "orthodontics"]),
            ("Pharmacy", "pharm", ["pharmacology", "drug-design", "clinical-trials"]),
            ("Physiotherapy", "physio", ["rehabilitation", "sports-medicine", "musculoskeletal"]),
        ],
        "visa": "student",
        "sections_template": "medical",
    },
    "law": {
        "label": "Law / LLM",
        "fields": [
            ("LLM International Law", "intl", ["human-rights", "trade-law", "arbitration"]),
            ("LLM Corporate Law", "corp", ["M&A", "securities", "compliance"]),
            ("LLM Intellectual Property", "ip", ["patents", "trademarks", "copyright"]),
            ("JD — Juris Doctor", "jd", ["bar-exam", "litigation", "constitutional"]),
        ],
        "visa": "student",
        "sections_template": "law",
    },
    "arts": {
        "label": "Arts / Design / Media",
        "fields": [
            ("MFA Fine Arts", "mfa", ["portfolio", "studio-practice", "critique"]),
            ("MA Film & Media", "film", ["directing", "screenwriting", "production"]),
            ("MA Design", "design", ["UX", "industrial-design", "typography"]),
            ("MA Music", "music", ["performance", "composition", "musicology"]),
            ("MA Architecture", "arch", ["urban-planning", "sustainable-design", "BIM"]),
        ],
        "visa": "student",
        "sections_template": "arts",
    },
    "engineering": {
        "label": "Engineering (specialised)",
        "fields": [
            ("Aerospace Engineering", "aero", ["aerodynamics", "propulsion", "avionics"]),
            ("Chemical Engineering", "chem", ["process-design", "catalysis", "polymers"]),
            ("Biomedical Engineering", "bme", ["implants", "medical-devices", "tissue-eng"]),
            ("Robotics & Automation", "robo", ["ROS", "control-systems", "computer-vision"]),
            ("Industrial Engineering", "ie", ["operations-research", "lean", "supply-chain"]),
        ],
        "visa": "student",
        "sections_template": "engineering",
    },
    "data_science": {
        "label": "Data Science / AI / ML",
        "fields": [
            ("MSc Data Science", "ds", ["Python", "deep-learning", "big-data"]),
            ("MSc Artificial Intelligence", "ai", ["NLP", "computer-vision", "reinforcement-learning"]),
            ("MSc Machine Learning", "ml", ["neural-networks", "generative-AI", "MLOps"]),
            ("MSc Business Analytics", "ba", ["BI", "predictive-modelling", "dashboards"]),
        ],
        "visa": "student",
        "sections_template": "data_science",
    },
    "nursing": {
        "label": "Nursing",
        "fields": [
            ("BSc Nursing", "bsc", ["clinical-placement", "patient-care", "community-health"]),
            ("MSc Nursing", "msc", ["advanced-practice", "nurse-practitioner", "research"]),
            ("Midwifery", "mid", ["maternal-health", "neonatal", "antenatal"]),
        ],
        "visa": "student",
        "sections_template": "nursing",
    },
    "hospitality": {
        "label": "Hospitality & Tourism",
        "fields": [
            ("Hospitality Management", "hm", ["hotel-ops", "revenue-management", "guest-experience"]),
            ("Culinary Arts", "cul", ["gastronomy", "food-science", "restaurant-management"]),
            ("Tourism & Event Management", "tem", ["destination-marketing", "event-planning", "sustainable-tourism"]),
        ],
        "visa": "student",
        "sections_template": "hospitality",
    },
}

# ---------------------------------------------------------------------------
# Section templates per program family
# ---------------------------------------------------------------------------

_SECTIONS: dict[str, list[dict]] = {
    "ms": [
        {"heading": "Academic Background", "hint": "Describe your undergraduate degree, GPA, key courses, and academic projects.", "target_words": 200},
        {"heading": "Research & Technical Experience", "hint": "Internships, research papers, technical projects, or open-source contributions.", "target_words": 250},
        {"heading": "Why This Program & University", "hint": "Connect specific faculty, labs, or curriculum features to your interests.", "target_words": 200},
        {"heading": "Career Goals", "hint": "Short-term (2-3 yr) and long-term (5-10 yr) professional objectives.", "target_words": 150},
        {"heading": "Why This Country", "hint": "Industry ecosystem, research culture, or personal reasons for choosing this destination.", "target_words": 100},
    ],
    "mba": [
        {"heading": "Professional Journey", "hint": "Career trajectory, leadership roles, key accomplishments, and promotions.", "target_words": 250},
        {"heading": "Why MBA Now", "hint": "The skills gap you want to fill and why this is the right time.", "target_words": 150},
        {"heading": "Why This School", "hint": "Specific courses, clubs, alumni, or teaching methodology that attract you.", "target_words": 200},
        {"heading": "Post-MBA Goals", "hint": "Concrete career plan: industry, role, geography. Show the MBA is the bridge.", "target_words": 200},
        {"heading": "What You'll Contribute", "hint": "Unique perspective, diversity, extracurriculars you will bring to the cohort.", "target_words": 100},
    ],
    "phd": [
        {"heading": "Research Motivation", "hint": "The big question or gap in the field that drives your curiosity.", "target_words": 200},
        {"heading": "Academic & Research Background", "hint": "Degrees, GPA, publications, conference presentations, research assistantships.", "target_words": 250},
        {"heading": "Proposed Research Direction", "hint": "Specific topic, methodology, expected contribution to the field.", "target_words": 250},
        {"heading": "Faculty & Lab Fit", "hint": "Name professors whose work aligns; reference their recent papers.", "target_words": 150},
        {"heading": "Long-term Academic Goals", "hint": "Tenure-track, industry R&D, or policy — where does this PhD lead?", "target_words": 100},
    ],
    "bachelors": [
        {"heading": "Who I Am", "hint": "Personal story, curiosity, formative experiences that led to this field.", "target_words": 200},
        {"heading": "Academic Preparation", "hint": "High school coursework, grades, competitions, and achievements.", "target_words": 200},
        {"heading": "Why This University & Program", "hint": "Specific attractions: campus, courses, opportunities.", "target_words": 200},
        {"heading": "Extracurriculars & Community", "hint": "Leadership, volunteering, sports, arts — show your whole self.", "target_words": 150},
        {"heading": "Future Aspirations", "hint": "What do you hope to become? How does this degree enable that?", "target_words": 100},
    ],
    "diploma": [
        {"heading": "Background & Motivation", "hint": "Current qualifications, why you need this practical credential.", "target_words": 200},
        {"heading": "Relevant Experience", "hint": "Work, internships, or projects in the field.", "target_words": 200},
        {"heading": "Program Fit", "hint": "Specific modules, industry partnerships, placement opportunities.", "target_words": 200},
        {"heading": "Career Outcome", "hint": "Job role you're targeting and how the diploma bridges the gap.", "target_words": 150},
    ],
    "certificate": [
        {"heading": "Current Situation", "hint": "Your role, industry, and what skill you need.", "target_words": 150},
        {"heading": "Why This Certificate", "hint": "What drew you to this particular program.", "target_words": 150},
        {"heading": "Expected Impact", "hint": "How the credential will change your work or career.", "target_words": 150},
    ],
    "exchange": [
        {"heading": "About Me & My Home University", "hint": "Degree, year, current focus area.", "target_words": 150},
        {"heading": "Why This Exchange Destination", "hint": "Cultural, academic, or language reasons.", "target_words": 200},
        {"heading": "Academic Plan Abroad", "hint": "Courses you'll take and how they complement your home degree.", "target_words": 200},
        {"heading": "Personal Growth Goals", "hint": "Independence, cross-cultural skills, network.", "target_words": 100},
    ],
    "research": [
        {"heading": "Research Background", "hint": "Publications, lab experience, methodology skills.", "target_words": 250},
        {"heading": "Proposed Research Agenda", "hint": "Topic, hypothesis, methods, expected output.", "target_words": 300},
        {"heading": "Host Lab / Supervisor Fit", "hint": "Why this specific lab and supervisor.", "target_words": 150},
        {"heading": "Post-Fellowship Plans", "hint": "How the fellowship advances your long-term research career.", "target_words": 100},
    ],
    "medical": [
        {"heading": "Motivation for Medicine", "hint": "Personal experience or calling that led you to healthcare.", "target_words": 200},
        {"heading": "Academic & Clinical Preparation", "hint": "Coursework, clinical rotations, volunteering in healthcare.", "target_words": 250},
        {"heading": "Why This Program & Country", "hint": "Curriculum structure, hospital affiliations, clinical exposure.", "target_words": 200},
        {"heading": "Specialisation & Career Vision", "hint": "Which speciality and the kind of practice you envision.", "target_words": 150},
    ],
    "law": [
        {"heading": "Why Law", "hint": "The issue, case, or event that sparked your interest in legal studies.", "target_words": 200},
        {"heading": "Academic & Professional Background", "hint": "Undergraduate degree, moot courts, internships at law firms or NGOs.", "target_words": 200},
        {"heading": "Why This Law School", "hint": "Clinics, journals, faculty, alumni network.", "target_words": 200},
        {"heading": "Career Goals in Law", "hint": "Litigation, corporate counsel, public interest, international bodies.", "target_words": 150},
    ],
    "arts": [
        {"heading": "Creative Journey", "hint": "When and how your artistic practice began.", "target_words": 200},
        {"heading": "Portfolio Highlights", "hint": "Key works, exhibitions, performances, or publications.", "target_words": 200},
        {"heading": "Why This Program", "hint": "Faculty mentors, facilities, artistic community.", "target_words": 200},
        {"heading": "Artistic Vision", "hint": "The themes, media, or questions you want to explore.", "target_words": 150},
    ],
    "engineering": [
        {"heading": "Technical Background", "hint": "Degree, key courses, hands-on projects, lab work.", "target_words": 200},
        {"heading": "Industry & Research Experience", "hint": "Internships, publications, patents, competitions.", "target_words": 250},
        {"heading": "Why This Specialisation & University", "hint": "Curriculum depth, lab facilities, industry partnerships.", "target_words": 200},
        {"heading": "Professional Trajectory", "hint": "Where you see yourself in industry or academia.", "target_words": 150},
    ],
    "data_science": [
        {"heading": "Quantitative Background", "hint": "Math, stats, CS coursework; programming languages.", "target_words": 200},
        {"heading": "Projects & Experience", "hint": "Kaggle, internships, industry ML projects, publications.", "target_words": 250},
        {"heading": "Why This Program", "hint": "Specific courses, capstone, industry connections, faculty.", "target_words": 200},
        {"heading": "Career Vision in Data/AI", "hint": "ML engineer, data scientist, research scientist — be specific.", "target_words": 150},
    ],
    "nursing": [
        {"heading": "Calling to Nursing", "hint": "Personal or family experience that drew you to patient care.", "target_words": 200},
        {"heading": "Clinical & Academic Preparation", "hint": "Clinical hours, certifications, relevant coursework.", "target_words": 200},
        {"heading": "Why This Program & Country", "hint": "Clinical placement quality, healthcare system, registration pathway.", "target_words": 200},
        {"heading": "Career in Nursing", "hint": "Specialisation goals: ICU, community health, nurse practitioner.", "target_words": 150},
    ],
    "hospitality": [
        {"heading": "Passion for Hospitality", "hint": "Formative travel, family restaurant, hotel internship.", "target_words": 200},
        {"heading": "Industry Experience", "hint": "Roles in hotels, F&B, events, or tourism.", "target_words": 200},
        {"heading": "Why This Program", "hint": "Practical training, hotel partners, culinary facilities.", "target_words": 200},
        {"heading": "Career Aspirations", "hint": "General manager, F&B director, own venture.", "target_words": 150},
    ],
}

# ---------------------------------------------------------------------------
# Sample text generators — unique per (country, program, field)
# ---------------------------------------------------------------------------

def _opening(country_name: str, field_name: str, program_label: str, uni_examples: str) -> str:
    """Generate a unique opening paragraph."""
    _openings = {
        "ms": (
            f"Having completed my undergraduate studies with a strong foundation in {field_name.lower()}, "
            f"I am eager to pursue a {program_label} in {field_name} in {country_name}. "
            f"The opportunity to study at institutions such as {uni_examples.split(',')[0].strip()} represents "
            f"the next natural step in my academic and professional journey."
        ),
        "mba": (
            f"After several years of professional growth in {field_name.lower()}, I have reached a pivotal point "
            f"where an MBA from {country_name} will equip me with the strategic acumen and global network "
            f"needed to lead at the highest level. The calibre of programmes at schools like "
            f"{uni_examples.split(',')[0].strip()} aligns perfectly with my ambitions."
        ),
        "phd": (
            f"My passion for advancing the frontiers of {field_name.lower()} has led me to seek a doctoral "
            f"programme in {country_name}, where cutting-edge research infrastructure and world-renowned "
            f"faculty at universities such as {uni_examples.split(',')[0].strip()} can support my "
            f"investigation into unanswered questions in the field."
        ),
    }
    key = program_label.lower()
    for k, v in _openings.items():
        if k in key:
            return v
    return (
        f"I am writing to express my strong interest in pursuing {field_name} studies in {country_name}. "
        f"With a proven academic record and clear professional goals, I believe the academic environment "
        f"at institutions like {uni_examples.split(',')[0].strip()} will provide the ideal setting for my growth."
    )


def _body(country_name: str, field_name: str, program_label: str, tags: list[str], system_note: str) -> str:
    """Generate a unique body — 2-3 paragraphs."""
    tag_str = ", ".join(tags[:3]) if tags else "core concepts"
    return (
        f"During my previous studies, I developed a deep understanding of {tag_str} through rigorous "
        f"coursework, laboratory projects, and independent study. A particularly formative experience "
        f"was my capstone project, which required me to synthesise theoretical knowledge with practical "
        f"problem-solving — a combination that {field_name} programmes in {country_name} are renowned for nurturing.\n\n"
        f"Beyond academics, I have sought every opportunity to apply my skills in real-world settings. "
        f"My internship experience allowed me to work on industry-relevant challenges, collaborate with "
        f"cross-functional teams, and appreciate the gap between textbook learning and professional practice. "
        f"These experiences confirmed that advanced study in {country_name} — where {system_note.lower()} — "
        f"is the right path to bridge that gap.\n\n"
        f"I am particularly drawn to the interdisciplinary approach of {field_name} programmes in "
        f"{country_name}, which combine technical depth with exposure to diverse perspectives. The chance "
        f"to engage with peers from varied cultural and professional backgrounds will enrich my learning "
        f"and prepare me for a global career."
    )


def _closing(country_name: str, field_name: str) -> str:
    """Generate a closing statement."""
    return (
        f"I am confident that studying {field_name} in {country_name} will equip me with the knowledge, "
        f"skills, and professional network to make a meaningful contribution to my field. I look forward "
        f"to the opportunity to grow both personally and academically in this world-class environment."
    )


def _tips(program_key: str, country_code: str, field_name: str) -> list[str]:
    """Generate 3-5 writing tips specific to the program and country."""
    base = [
        f"Research the programme's curriculum and name specific modules that excite you — generic statements are easily spotted.",
        f"Quantify your achievements (GPA percentile, project impact, team size) rather than using vague adjectives.",
        f"Show why {field_name} specifically, not just 'I am passionate about learning' — admissions committees read hundreds of SOPs.",
    ]
    country_tips = {
        "us": "For US applications, demonstrate 'research fit' — mention faculty by name and reference their recent publications.",
        "gb": "UK personal statements are concise (max 4,000 characters for UCAS). Every sentence must earn its place.",
        "ca": "Mention post-graduation work permit (PGWP) awareness without making immigration the sole motivation.",
        "au": "Address the Genuine Temporary Entrant (GTE) requirement — explain why you'll return home or contribute to Australia.",
        "de": "German motivation letters should be technical and precise; avoid overly emotional language.",
        "fr": "The French lettre de motivation values personal narrative — connect your life story to academic choice.",
        "ch": "Swiss programmes (ETH, EPFL) expect strong quantitative reasoning even in the SOP.",
        "jp": "If applying via MEXT, align your research plan with Japan's national research priorities.",
        "nl": "Dutch programmes value practical orientation — connect your SOP to industry placement opportunities.",
    }
    if country_code in country_tips:
        base.append(country_tips[country_code])
    program_tips = {
        "mba": "Answer 'Why MBA now?' convincingly — show the gap between where you are and where you want to be.",
        "phd": "Lead with your research question, not your biography. The first sentence should signal intellectual depth.",
        "medical": "Demonstrate clinical empathy alongside academic strength — admissions seek well-rounded future doctors.",
        "law": "Reference landmark cases or legal developments that shaped your interest — specificity signals genuine passion.",
        "arts": "Your SOP should reflect your creative voice. Don't write a corporate cover letter for an MFA application.",
        "nursing": "Emphasise clinical hours and patient interaction — programmes value hands-on experience over grades alone.",
        "hospitality": "Demonstrate operational understanding (revenue management, guest satisfaction metrics) beyond just 'I love travel'.",
    }
    if program_key in program_tips:
        base.append(program_tips[program_key])
    return base[:5]


# ---------------------------------------------------------------------------
# Tone modifiers — each tone tweaks the word count and adds a tag
# ---------------------------------------------------------------------------

_TONES = ["professional", "academic", "personal", "compelling", "technical", "creative"]

def _tone_for(program_key: str, country_code: str, idx: int) -> str:
    """Rotate tones so templates within the same group vary."""
    cm = _COUNTRY_META.get(country_code, {})
    default = cm.get("tone_default", "professional")
    # Use the default for index 0, then rotate through others
    if idx == 0:
        return default
    shifted = [t for t in _TONES if t != default]
    return shifted[(idx - 1) % len(shifted)]


# ---------------------------------------------------------------------------
# Priority matrix — how many templates each (country, program) gets
# ---------------------------------------------------------------------------

# Top countries get more templates per program
_COUNTRY_WEIGHT: dict[str, int] = {
    "us": 3, "gb": 3, "ca": 2, "au": 2, "de": 2,
    "fr": 1, "ie": 1, "nz": 1, "nl": 1, "sg": 1,
    "jp": 1, "kr": 1, "it": 1, "es": 1, "se": 1,
    "ch": 1, "at": 1, "dk": 1, "fi": 1, "no": 1,
    "be": 1, "pt": 1, "cz": 1, "pl": 1, "in": 1,
    "cn": 1, "hk": 1, "ae": 1, "my": 1, "ph": 1,
}


# ---------------------------------------------------------------------------
# Template generation
# ---------------------------------------------------------------------------

SOP_TEMPLATES: list[dict] = []

_counter: dict[str, int] = {}  # country_code -> running count for id uniqueness

for country_code, cmeta in _COUNTRY_META.items():
    _counter[country_code] = 0
    weight = _COUNTRY_WEIGHT.get(country_code, 1)

    for program_key, pmeta in _PROGRAM_META.items():
        fields = pmeta["fields"]
        sections_key = pmeta.get("sections_template", program_key)
        sections = _SECTIONS.get(sections_key, _SECTIONS["ms"])

        # Each field generates `weight` templates (different tones)
        for field_name, field_code, field_tags in fields:
            for tone_idx in range(weight):
                _counter[country_code] += 1
                num = _counter[country_code]
                tid = f"sop-{country_code}-{program_key}-{field_code}-{num:03d}"
                tone = _tone_for(program_key, country_code, tone_idx)
                base_wc = 900 + (hash(tid) % 600)  # 900-1499

                all_tags = (
                    [program_key, field_code, country_code, tone]
                    + field_tags
                    + cmeta.get("extra_tags", [])
                )

                template = {
                    "id": tid,
                    "title": f"{field_name} — {cmeta['name']}",
                    "country": country_code,
                    "country_name": cmeta["name"],
                    "program_type": program_key,
                    "visa_type": pmeta.get("visa", "student"),
                    "tone": tone,
                    "word_count": base_wc,
                    "tags": all_tags,
                    "sections": [dict(s) for s in sections],  # copy
                    "sample_opening": _opening(
                        cmeta["name"], field_name, pmeta["label"], cmeta["uni_examples"]
                    ),
                    "sample_body": _body(
                        cmeta["name"], field_name, pmeta["label"],
                        field_tags, cmeta["system_note"],
                    ),
                    "sample_closing": _closing(cmeta["name"], field_name),
                    "tips": _tips(program_key, country_code, field_name),
                }
                SOP_TEMPLATES.append(template)


# ---------------------------------------------------------------------------
# Indexes and lookup helpers
# ---------------------------------------------------------------------------

COUNTRIES_WITH_TEMPLATES: list[str] = sorted({t["country"] for t in SOP_TEMPLATES})
PROGRAM_TYPES: list[str] = sorted({t["program_type"] for t in SOP_TEMPLATES})

# Fast lookup by id
_BY_ID: dict[str, dict] = {t["id"]: t for t in SOP_TEMPLATES}


def get_template(template_id: str) -> dict | None:
    """Return a single template by id, or None."""
    return _BY_ID.get(template_id)


def get_templates(
    *,
    country: str | None = None,
    program_type: str | None = None,
    visa_type: str | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    """Filter, search, and paginate templates.

    Returns ``{"items": [...], "total": int, "page": int, "pages": int}``.
    """
    results = SOP_TEMPLATES

    if country:
        c = country.lower()
        results = [t for t in results if t["country"] == c]
    if program_type:
        p = program_type.lower()
        results = [t for t in results if t["program_type"] == p]
    if visa_type:
        v = visa_type.lower()
        results = [t for t in results if t["visa_type"] == v]
    if search:
        q = search.lower()
        results = [
            t for t in results
            if q in t["title"].lower()
            or q in t["country_name"].lower()
            or any(q in tag for tag in t["tags"])
        ]

    total = len(results)
    pages = max(1, -(-total // limit))  # ceil division
    page = max(1, min(page, pages))
    start = (page - 1) * limit

    return {
        "items": results[start : start + limit],
        "total": total,
        "page": page,
        "pages": pages,
    }

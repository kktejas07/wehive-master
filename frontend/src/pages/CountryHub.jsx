import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, GraduationCap, ShieldCheck, Briefcase, FileText, Compass, Clock, Coins, ArrowRight, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import NotFound from './NotFound';

const COUNTRY_DATA = {
  ca: {
    name: 'Canada',
    flag: '🇨🇦',
    capital: 'Ottawa',
    currency: 'CAD ($)',
    desc: 'The top choice for permanent residency, high-quality education, and family-friendly immigration paths.',
    visas: {
      pr: {
        title: 'Permanent Residency (Express Entry & PNP)',
        timeline: '6 - 8 Months',
        fees: 'Starting from $1,525 CAD',
        desc: 'Canada Express Entry is the fastest pathway to permanent residency for skilled workers. Federal Skilled Worker, Canadian Experience Class, and Provincial Nominee Programs (PNPs) offer multiple routes.',
        requirements: [
          'Educational Credential Assessment (ECA)',
          'IELTS General Training (CLB 9 recommended)',
          'Proof of funds for primary applicants',
          'Skilled work experience (TEER 0, 1, 2, or 3)',
        ],
      },
      student: {
        title: 'Study Permit (SDS & Non-SDS)',
        timeline: '4 - 6 Weeks',
        fees: '$150 CAD',
        desc: 'Study at world-class Canadian Designated Learning Institutions (DLIs). The Student Direct Stream (SDS) offers expedited processing for students from India, China, and selected countries.',
        requirements: [
          'Letter of Acceptance (LOA) from DLI',
          'GIC (Guaranteed Investment Certificate) of $20,635 CAD',
          'Academic transcripts & language test (IELTS 6.0+ or PTE)',
          'Medical examination & police clearance',
        ],
      },
      work: {
        title: 'Work Permits (LMIA & Open Work Permits)',
        timeline: '2 - 3 Months',
        fees: '$155 CAD',
        desc: 'Work in Canada temporarily. Post-Graduation Work Permits (PGWP) allow international graduates to gain valuable Canadian experience that counts towards PR.',
        requirements: [
          'Valid job offer from a Canadian employer (for LMIA)',
          'Positive Labour Market Impact Assessment (LMIA) from employer',
          'Proof of qualification matching job description',
          'Open work permit eligibility (e.g., spouses of students)',
        ],
      },
      tourist: {
        title: 'Visitor Visa (Temporary Resident Visa)',
        timeline: '10 - 20 Days',
        fees: '$100 CAD',
        desc: 'Explore Canada for tourism, visiting family, or business meetings. Visas are typically granted for up to 10 years or passport expiry.',
        requirements: [
          'Valid passport with at least 6 months validity',
          'Proof of financial support (bank statements)',
          'Travel itinerary & return flight reservation',
          'Ties to home country (job letter, property docs)',
        ],
      },
    },
  },
  gb: {
    name: 'United Kingdom',
    flag: '🇬🇧',
    capital: 'London',
    currency: 'GBP (£)',
    desc: 'Access historically renowned universities, professional work routes, and a multicultural European hub.',
    visas: {
      pr: {
        title: 'Indefinite Leave to Remain (ILR)',
        timeline: '5 Years Residency',
        fees: '£2,885 per applicant',
        desc: 'ILR grants permanent settlement in the UK. Typically achieved after 5 continuous years on a Skilled Worker Visa or other qualifying pathways.',
        requirements: [
          '5 years continuous residence in the UK',
          'Passed Life in the UK test',
          'Meet English language requirements (B1 level or degree)',
          'No breach of immigration laws',
        ],
      },
      student: {
        title: 'Student Visa (formerly Tier 4)',
        timeline: '3 - 4 Weeks',
        fees: '£490 + Immigration Health Surcharge (£776/year)',
        desc: 'Study at prestigious UK universities. The Graduate Visa route allows international students to stay and work for 2 years (3 years for PhD) after graduating.',
        requirements: [
          'Confirmation of Acceptance for Studies (CAS) from sponsor',
          'Proof of funds to cover tuition fees and monthly living costs',
          'TB test certificate (where applicable)',
          'English language capability (typically IELTS Academic)',
        ],
      },
      work: {
        title: 'Skilled Worker Visa',
        timeline: '3 - 8 Weeks',
        fees: '£719 - £1,500 depending on duration',
        desc: 'Work in the UK for an approved employer in an eligible skilled occupation. Offers a direct pathway to settlement (ILR).',
        requirements: [
          'Certificate of Sponsorship (CoS) from a licensed UK employer',
          'Job role on the eligible occupations list',
          'Minimum salary threshold met (£38,700 or going rate)',
          'English language proficiency at level B1',
        ],
      },
      tourist: {
        title: 'Standard Visitor Visa',
        timeline: '3 Weeks',
        fees: '£115 (6 months duration)',
        desc: 'Visit the UK for leisure, business meetings, short courses, or family visits. Options are available for 2, 5, or 10 years.',
        requirements: [
          'Valid travel documents & passport',
          'Proof of financial capability to self-fund the trip',
          'Proof of accommodation and travel plans',
          'Proof of employment or study in home country',
        ],
      },
    },
  },
  us: {
    name: 'United States',
    flag: '🇺🇸',
    capital: 'Washington, D.C.',
    currency: 'USD ($)',
    desc: 'The world\'s leading hub for technological innovation, premium Ivy League research, and business opportunity.',
    visas: {
      pr: {
        title: 'Green Card (EB-1, EB-2, EB-3)',
        timeline: '1 - 3 Years (Varies by country of birth)',
        fees: '$1,225 + Attorney Fees',
        desc: 'Permanent residency through employment-based pathways. Highly skilled professionals with advanced degrees or extraordinary abilities can secure permanent residency.',
        requirements: [
          'Approved PERM Labor Certification (for EB-2/EB-3)',
          'Approved I-140 Immigrant Petition',
          'Academic credentials matching advanced degree status',
          'Employer sponsorship or National Interest Waiver (NIW)',
        ],
      },
      student: {
        title: 'F-1 Student Visa',
        timeline: '2 - 3 Weeks',
        fees: '$185 DS-160 fee + $350 SEVIS fee',
        desc: 'Attend US universities, colleges, and English programs. Includes Optional Practical Training (OPT) allowing 1-3 years of work in the US after graduation.',
        requirements: [
          'Valid Form I-20 issued by a SEVP-approved school',
          'Paid SEVIS fee and DS-160 application confirmation',
          'Proof of sufficient funds to cover first-year expenses',
          'Proof of strong ties to home country (non-immigrant intent)',
        ],
      },
      work: {
        title: 'H-1B Specialty Occupations',
        timeline: 'Cap lottery in March; processing 2-6 months',
        fees: '$460 filing fee + Employer fees',
        desc: 'Work in specialty occupations requiring highly specialized knowledge and a bachelor\'s degree or higher. Subject to an annual lottery system.',
        requirements: [
          'Bachelor\'s degree or equivalent in the specific specialty',
          'Sponsorship by an approved US employer',
          'Labor Condition Application (LCA) certified by Dept. of Labor',
          'Job offer in a specialty field paying prevailing wage',
        ],
      },
      tourist: {
        title: 'B-1/B-2 Visitor Visa',
        timeline: 'Varies widely (Interview wait times range 2-60 days)',
        fees: '$185',
        desc: 'B1 (Business) and B2 (Tourism/Medical) combined visa for temporary travel. Typically issued as a 10-year multiple-entry visa for eligible applicants.',
        requirements: [
          'DS-160 visa application confirmation',
          'Interview at US embassy/consulate',
          'Evidence of purpose of trip (business meetings/holiday)',
          'Demonstrated financial capability & intent to return home',
        ],
      },
    },
  },
  au: {
    name: 'Australia',
    flag: '🇦🇺',
    capital: 'Canberra',
    currency: 'AUD ($)',
    desc: 'A gorgeous lifestyle, strong points-based skilled migration, and top-ranked universities in major coastal cities.',
    visas: {
      pr: {
        title: 'Skilled Independent Visa (Subclass 189/190)',
        timeline: '8 - 12 Months',
        fees: 'Starting from $4,640 AUD',
        desc: 'Points-tested permanent residency for skilled workers who are not sponsored by an employer. State nomination (190) offers extra points and paths.',
        requirements: [
          'Skills Assessment by relevant Australian authority',
          'Expression of Interest (EOI) submitted through SkillSelect',
          'Minimum points score of 65 (higher recommended)',
          'Age under 45 years at time of invitation',
        ],
      },
      student: {
        title: 'Student Visa (Subclass 500)',
        timeline: '4 - 8 Weeks',
        fees: '$710 AUD',
        desc: 'Study full-time in recognized courses. Post-Study Work stream (485) grants 2-5 years of working rights depending on qualification level.',
        requirements: [
          'Confirmation of Enrolment (CoE) in a CRICOS-registered course',
          'Genuine Student (GS) requirement met',
          'Overseas Student Health Cover (OSHC)',
          'Proof of English capability (IELTS 6.0+ or PTE 50+)',
        ],
      },
      work: {
        title: 'Employer Sponsored Visa (Subclass 482)',
        timeline: '4 - 12 Weeks',
        fees: '$1,455 - $3,035 AUD',
        desc: 'Temporary Skill Shortage (TSS) visa allows employers to sponsor overseas workers for positions they cannot fill locally.',
        requirements: [
          'Nomination by an approved business sponsor',
          'At least 2 years relevant skilled work experience',
          'Relevant qualification for the occupation',
          'English language proficiency (IELTS 5.0+ or equivalent)',
        ],
      },
      tourist: {
        title: 'Visitor Visa (Subclass 600)',
        timeline: '10 - 25 Days',
        fees: '$190 AUD',
        desc: 'Visit Australia for holidays, cruise travel, or seeing family. Available for stays up to 3, 6, or 12 months.',
        requirements: [
          'Proof of sufficient funds to cover stay (bank statements)',
          'Detailed travel itinerary & local contact info',
          'Employment details proving intent to return',
          'Health insurance for applicants over 70',
        ],
      },
    },
  },
  de: {
    name: 'Germany',
    flag: '🇩🇪',
    capital: 'Berlin',
    currency: 'EUR (€)',
    desc: 'Europe\'s powerhouse offering tuition-free public universities, Opportunity Cards, and high industrial work demand.',
    visas: {
      pr: {
        title: 'Permanent Settlement Permit (Niederlassungserlaubnis)',
        timeline: '2 - 5 Years of Working',
        fees: '€113',
        desc: 'Granted to foreign nationals who have held a German residence permit for employment for a specified period (fast-tracked to 21-27 months for Blue Card holders).',
        requirements: [
          'At least 60 months of pension contributions (24 for Blue Card)',
          'Sufficient command of the German language (level B1)',
          'Secured livelihood with no public fund dependencies',
          'Basic knowledge of legal and social systems in Germany',
        ],
      },
      student: {
        title: 'Student Visa & Blocked Account',
        timeline: '6 - 12 Weeks',
        fees: '€75',
        desc: 'Study at Germany\'s public universities offering free or nominal tuition. Requires demonstrating living costs via a secured Blocked Account.',
        requirements: [
          'Letter of Admission from a German university',
          'Blocked Account (Sperrkonto) with €11,208 for one year',
          'Proof of Health Insurance coverage (Statutory or Private)',
          'English or German language proficiency certificate',
        ],
      },
      work: {
        title: 'Opportunity Card (Chancenkarte) & Jobseeker',
        timeline: '4 - 8 Weeks',
        fees: '€75',
        desc: 'Germany\'s new points-based jobseeker permit. Allows skilled workers to enter Germany to search for employment for up to 1 year while working part-time.',
        requirements: [
          'University degree or vocational training qualification',
          'Basic German (A1) or fluent English (B2) skills',
          'Minimum of 6 points under the Opportunity Card calculator',
          'Proof of secure livelihood (approx. €1,027/month)',
        ],
      },
      tourist: {
        title: 'Schengen Visitor Visa',
        timeline: '15 Days',
        fees: '€85',
        desc: 'Enables travel to Germany and all other 28 Schengen member countries for tourism or short business trips of up to 90 days.',
        requirements: [
          'Schengen Visa application form & photos',
          'Travel itinerary showing dates and accommodations',
          'Schengen travel insurance with min. €30,000 coverage',
          'Proof of employment, business ownership, or student status',
        ],
      },
    },
  },
};

export default function CountryHub() {
  const { countryId } = useParams();
  const country = COUNTRY_DATA[countryId];
  const [activeVisa, setActiveVisa] = useState('pr');

  if (!country) return <NotFound />;

  const renderRegularIcon = (key, className = "w-5 h-5") => {
    switch (key) {
      case 'pr':
      case 'shield':
        return <ShieldCheck className={className} />;
      case 'student':
        return <GraduationCap className={className} />;
      case 'work':
        return <Briefcase className={className} />;
      case 'tourist':
      case 'globe':
        return <Globe className={className} />;
      case 'clock':
        return <Clock className={className} />;
      case 'coins':
        return <Coins className={className} />;
      default:
        return null;
    }
  };

  const visaTabs = [
    { id: 'pr', label: 'PR Pathway', icon: ShieldCheck },
    { id: 'student', label: 'Student Visa', icon: GraduationCap },
    { id: 'work', label: 'Work Visa', icon: Briefcase },
    { id: 'tourist', label: 'Tourist Visa', icon: Globe },
  ];

  const currentVisa = country.visas[activeVisa];
  const Icon = visaTabs.find(v => v.id === activeVisa)?.icon || ShieldCheck;

  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]">
      <Navbar />
      <main className="pt-28 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          
          {/* Back button */}
          <Link to="/" className="inline-flex items-center gap-1 min-h-[44px] text-[14px] font-semibold text-[hsl(var(--blue-700))] hover:underline mb-4">
            ← Back to Destinations
          </Link>

          {/* Hero Banner Section */}
          <div className="rounded-2xl bg-[hsl(var(--blue-900))] text-white p-6 sm:p-12 relative overflow-hidden mb-10">
            
            <div className="relative z-10 max-w-2xl">
              <span className="text-5xl sm:text-6xl block mb-4">{country.flag}</span>
              <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-200))] mb-2">
                Destination Hub
              </div>
              <h1 className="font-display font-bold text-[36px] sm:text-[52px] tracking-[-0.02em] leading-tight">
                Immigrate to {country.name}
              </h1>
              <p className="mt-4 text-[16px] sm:text-[18px] text-white/80 leading-relaxed">
                {country.desc} Explore requirements, timelines, and fees across study, settlement, work, and visit pathways.
              </p>
              
              <div className="mt-6 flex flex-wrap gap-4 text-[14px] font-medium text-white/80">
                <div>Capital: <span className="font-bold text-white">{country.capital}</span></div>
                <div className="hidden sm:block text-white/30">|</div>
                <div>Currency: <span className="font-bold text-white">{country.currency}</span></div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-2 content-start">
              <div className="col-span-2 lg:col-span-1 text-[12px] uppercase tracking-[0.14em] font-bold text-muted-foreground px-1 mb-1">
                Pathway Hubs
              </div>
              {visaTabs.map((tab) => {
                const TabIcon = tab.icon;
                const active = activeVisa === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveVisa(tab.id)}
                    aria-pressed={active}
                    className={`w-full flex items-center gap-3 px-4 min-h-[48px] rounded-xl border text-left text-[14px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--blue-700))] ${
                      active
                        ? 'bg-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))] text-white'
                        : 'bg-white border-[hsl(var(--border))] hover:border-[hsl(var(--blue-200))] text-[hsl(var(--blue-900))]'
                    }`}
                  >
                    {renderRegularIcon(tab.id, `w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[hsl(var(--blue-700))]'}`)}
                    {tab.label}
                  </button>
                );
              })}

              <div className="col-span-2 lg:col-span-1 pt-4">
                <div className="rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] p-5 text-center">
                  <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">Check Eligibility</div>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                    Calculate your visa points and admission scores for {country.name} now.
                  </p>
                  <Link 
                    to="/assessment" 
                    className="mt-4 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-white border border-[hsl(var(--border))] text-[hsl(var(--blue-900))] hover:border-[hsl(var(--blue-700))] hover:text-[hsl(var(--blue-700))] font-semibold text-[14px] h-11 px-4 transition-colors"
                  >
                    Start Points Test <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeVisa}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl bg-white border border-[hsl(var(--border))] p-6 sm:p-10 shadow-sm space-y-6"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-10 w-10 rounded-xl bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-700))] inline-flex items-center justify-center">
                      {renderRegularIcon(activeVisa, "w-5 h-5")}
                    </span>
                    <div>
                      <h2 className="text-[22px] font-display font-bold leading-tight text-[hsl(var(--blue-900))]">
                        {currentVisa.title}
                      </h2>
                    </div>
                  </div>

                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    {currentVisa.desc}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] flex items-start gap-3">
                      {renderRegularIcon('clock', "w-5 h-5 text-[hsl(var(--blue-700))] shrink-0 mt-0.5")}
                      <div>
                        <div className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Processing Time</div>
                        <div className="text-[16px] font-bold text-[hsl(var(--blue-900))] mt-0.5">{currentVisa.timeline}</div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-[hsl(var(--soft-bg))] border border-[hsl(var(--border))] flex items-start gap-3">
                      {renderRegularIcon('coins', "w-5 h-5 text-[hsl(var(--blue-700))] shrink-0 mt-0.5")}
                      <div>
                        <div className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Government Fee</div>
                        <div className="text-[16px] font-bold text-[hsl(var(--blue-900))] mt-0.5">{currentVisa.fees}</div>
                      </div>
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div className="pt-4 border-t border-[hsl(var(--border))]">
                    <h3 className="text-[16px] font-bold text-[hsl(var(--blue-900))] mb-4 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[hsl(var(--blue-700))]" /> Key Requirements Checklist
                    </h3>
                    
                    <div className="grid sm:grid-cols-2 gap-3">
                      {currentVisa.requirements.map((req, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-[hsl(var(--border))] bg-white">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-[14px] font-medium text-[hsl(var(--blue-900))]">{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Direct application trigger */}
                  <div className="pt-6 border-t border-[hsl(var(--border))] flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Ready to file for {country.name}?</div>
                      <p className="text-[12px] text-muted-foreground">Get complete documents reviewed by our certified experts.</p>
                    </div>
                    <Link
                      to="/assessment"
                      className="inline-flex items-center gap-2 rounded-xl btn-accent text-white text-[15px] font-semibold px-6 h-12 transition-colors"
                    >
                      Start Filing Now <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

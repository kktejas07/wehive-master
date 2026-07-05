import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, GraduationCap, ShieldCheck, Briefcase, FileText, Compass, Clock, Coins, ArrowRight, Checklist } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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
  const country = COUNTRY_DATA[countryId] || COUNTRY_DATA.ca;
  const [activeVisa, setActiveVisa] = useState('pr');

  const renderDashedIcon = (key, className = "w-5 h-5") => {
    switch (key) {
      case 'pr':
      case 'shield':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M12 2.75c-2.59 0-4.93 1.06-6.61 2.77 -.29.29-.77.3-1.07.01 -.3-.29-.31-.77-.02-1.07 1.95-1.99 4.66-3.23 7.67-3.23 5.93 0 10.75 4.81 10.75 10.75 0 5.93-4.82 10.75-10.75 10.75 -5.94 0-10.75-4.82-10.75-10.75 0-.74.07-1.46.21-2.15 .08-.41.47-.67.88-.59 .4.08.66.47.58.88 -.13.59-.19 1.21-.19 1.85 0 5.1 4.14 9.25 9.25 9.25 5.1 0 9.25-4.15 9.25-9.25 0-5.11-4.15-9.25-9.25-9.25Z"/>
              <path d="M1.75 15c0-.42.33-.75.75-.75h5c1.24 0 2.25 1 2.25 2.25 0 .41.33.75.75.75H12c1.51 0 2.75 1.23 2.75 2.75v1.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V20c0-.7-.56-1.25-1.25-1.25h-1.5c-1.25 0-2.25-1.01-2.25-2.25 0-.42-.34-.75-.75-.75h-5c-.42 0-.75-.34-.75-.75Z"/>
              <path d="M13.43 1.88c.33.23.42.2.18.54l-2.82 4.02c-.27.37-.3.86-.1 1.27l.98 1.96c.32.65 1.15.89 1.78.5l.37-.24c1.32-.83 3.07-.39 3.84.96l.39.68c.22.38.63.62 1.08.62h2.83c.41 0 .25.33.25.75 0 .41.16.75-.25.75h-2.84c-.99 0-1.9-.53-2.39-1.39l-.4-.69c-.36-.62-1.15-.82-1.75-.44l-.38.23c-1.38.85-3.2.34-3.92-1.11l-.99-1.97c-.46-.91-.38-1.99.2-2.81l2.81-4.03c.23-.34.7.07 1.04.31Z"/>
            </g>
          </svg>
        );
      case 'student':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M1.25 4.34c0-1.18 1.13-2.02 2.25-1.68l8.71 2.61c.31.09.53.38.53.71v16c0 .23-.12.46-.31.6 -.2.14-.44.18-.67.11L2.47 19.9c-.75-.23-1.25-.91-1.25-1.68V4.3Zm1.82-.24c-.17-.05-.33.07-.33.23v13.91c0 .11.07.2.17.23l8.32 2.49V6.52L3.05 4.06Z"/>
              <path d="M22.75 4.34c0-1.18-1.13-2.02-2.26-1.68l-8.72 2.61c-.32.09-.54.38-.54.71v16c0 .23.11.46.3.6 .19.14.43.18.66.11l9.28-2.79c.74-.23 1.24-.91 1.24-1.68V8.96c0-.42-.34-.75-.75-.75 -.42 0-.75.33-.75.75v.256c0 .11-.08.2-.18.23l-8.33 2.49V6.5l8.17-2.46c.16-.05.32.07.32.23v.65c0 .41.33.75.75.75 .41 0 .75-.34.75-.75v-.66Z"/>
              <path d="M7 9.75c-.42 0-.75.33-.75.75 0 .41.33.75.75.75 .41 0 .75-.34.75-.75 0-.42-.34-.75-.75-.75Zm-2.25.75c0-1.25 1-2.25 2.25-2.25 1.24 0 2.25 1 2.25 2.25 0 1.24-1.01 2.25-2.25 2.25 -1.25 0-2.25-1.01-2.25-2.25Z"/>
              <path d="M7 14.75c-.97 0-1.75.78-1.75 1.75 0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75 0-1.8 1.45-3.25 3.25-3.25 1.79 0 3.25 1.45 3.25 3.25 0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75 0-.97-.79-1.75-1.75-1.75Z"/>
              <path d="M14.25 10c0-.42.33-.75.75-.75h4c.41 0 .75.33.75.75 0 .41-.34.75-.75.75h-4c-.42 0-.75-.34-.75-.75Z"/>
              <path d="M14.25 14c0-.42.33-.75.75-.75h4c.41 0 .75.33.75.75 0 .41-.34.75-.75.75h-4c-.42 0-.75-.34-.75-.75Z"/>
            </g>
          </svg>
        );
      case 'work':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M1.25 7c0-.97.78-1.75 1.75-1.75h18c.96 0 1.75.78 1.75 1.75v13c0 .96-.79 1.75-1.75 1.75h-2c-.42 0-.75-.34-.75-.75 0-.42.33-.75.75-.75h2c.13 0 .25-.12.25-.25V7c0-.14-.12-.25-.25-.25H3c-.14 0-.25.11-.25.25v13c0 .13.11.25.25.25h12c.41 0 .75.33.75.75 0 .41-.34.75-.75.75H3c-.97 0-1.75-.79-1.75-1.75V7Z"/>
              <path d="M1.25 7c0-.97.78-1.75 1.75-1.75h18c.96 0 1.75.78 1.75 1.75v4c0 .34-.24.64-.57.72l-8.06 2.01c-1.4.34-2.86.34-4.25 0l-8.06-2.02c-.34-.09-.57-.39-.57-.73v-4ZM3 6.75c-.14 0-.25.11-.25.25v3.41l7.49 1.87c1.15.28 2.36.28 3.51 0l7.49-1.88V6.98c0-.14-.12-.25-.25-.25h-18Z"/>
              <path d="M6.25 4c0-.97.78-1.75 1.75-1.75h8c.96 0 1.75.78 1.75 1.75v2c0 .41-.34.75-.75.75H7c-.42 0-.75-.34-.75-.75V4ZM8 3.75c-.14 0-.25.11-.25.25v1.25h8.5V4c0-.14-.12-.25-.25-.25H8Z"/>
              <path d="M12 11.25c-.42 0-.75.33-.75.75v3c0 .41.33.75.75.75 .41 0 .75-.34.75-.75v-3c0-.42-.34-.75-.75-.75ZM9.75 12c0-1.25 1-2.25 2.25-2.25 1.24 0 2.25 1 2.25 2.25v3c0 1.24-1.01 2.25-2.25 2.25 -1.25 0-2.25-1.01-2.25-2.25v-3Z"/>
            </g>
          </svg>
        );
      case 'tourist':
      case 'globe':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M3.46 6.46c.14-.15.33-.22.53-.22h4.99c.14 0 .29.04.41.12l1.08.72 1.08-.73c.12-.09.26-.13.41-.13h8c.19 0 .38.07.53.21l2 2c.14.14.21.33.21.53v6c0 .19-.08.38-.22.53l-2.01 2c-.15.14-.34.21-.54.21h-8c-.15 0-.3-.05-.42-.13l-1.09-.73 -1.09.72c-.13.08-.27.12-.42.12h-5c-.2 0-.39-.08-.54-.22l-2.01-2c-.15-.15-.22-.34-.22-.54l0-1c0-.42.33-.75.75-.75 .41 0 .74.33.74.75l-.01.68 1.56 1.56h4.46l1.31-.88c.25-.17.58-.17.83 0l1.31.87h7.46l1.56-1.57V9.2l-1.57-1.57h-7.47l-1.32.87c-.26.16-.59.16-.84 0l-1.32-.88H4.12L2.55 9.18l-.01.68c-.01.41-.34.75-.76.75s-.75-.34-.75-.76l0-1c0-.2.07-.39.21-.54l2-2Z"/>
              <path d="M10.5 9.75c.41 0 .75.33.75.75v3c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-3c0-.42.33-.75.75-.75Z"/>
              <path d="M13.25 10c0-.42.33-.75.75-.75h4c.41 0 .75.33.75.75 0 .41-.34.75-.75.75h-4c-.42 0-.75-.34-.75-.75Z"/>
              <path d="M13.25 13c0-.42.33-.75.75-.75h5c.41 0 .75.33.75.75 0 .41-.34.75-.75.75h-5c-.42 0-.75-.34-.75-.75Z"/>
            </g>
          </svg>
        );
      case 'clock':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M1.25 6c0-1.52 1.23-2.75 2.75-2.75h16c1.51 0 2.75 1.23 2.75 2.75v4c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V6c0-.7-.56-1.25-1.25-1.25H4c-.7 0-1.25.55-1.25 1.25v14.5c0 .69.55 1.25 1.25 1.25h16c.69 0 1.25-.56 1.25-1.25V14c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v6.5c0 1.51-1.24 2.75-2.75 2.75H4c-1.52 0-2.75-1.24-2.75-2.75V6Z"/>
              <path d="M7.25 15c0-.97.78-1.75 1.75-1.75h6c.96 0 1.75.78 1.75 1.75v4c0 .96-.79 1.75-1.75 1.75H9c-.97 0-1.75-.79-1.75-1.75v-4ZM9 14.75c-.14 0-.25.11-.25.25v4c0 .13.11.25.25.25h6c.13 0 .25-.12.25-.25v-4c0-.14-.12-.25-.25-.25H9Z"/>
              <path d="M1.25 6c0-1.52 1.23-2.75 2.75-2.75h16c1.51 0 2.75 1.23 2.75 2.75v3c0 .41-.34.75-.75.75H2c-.42 0-.75-.34-.75-.75V6ZM4 4.75c-.7 0-1.25.55-1.25 1.25v2.25h18.5V6c0-.7-.56-1.25-1.25-1.25H4Z"/>
              <path d="M5 1.25c.41 0 .75.33.75.75v3.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V2c0-.42.33-.75.75-.75Z"/>
              <path d="M12 1.25c.41 0 .75.33.75.75v3.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V2c0-.42.33-.75.75-.75Z"/>
              <path d="M19 1.25c.41 0 .75.33.75.75v3.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V2c0-.42.33-.75.75-.75Z"/>
              <path d="M7.25 16.407c.05-.42.42-.71.83-.66l3.9.48 3.9-.49c.41-.06.78.24.83.65 .05.41-.25.78-.66.83l-4 .5c-.07 0-.13 0-.19 0l-4-.5c-.42-.06-.71-.43-.66-.84Z"/>
              <path d="M11 12.25c-.14 0-.25.11-.25.25v1c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-1c0-.97.78-1.75 1.75-1.75h2c.96 0 1.75.78 1.75 1.75v1c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-1c0-.14-.12-.25-.25-.25h-2Z"/>
            </g>
          </svg>
        );
      case 'coins':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M17.5 2.75c-2.08 0-3.75 1.67-3.75 3.75 0 2.07 1.67 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-2.08-1.68-3.75-3.75-3.75ZM12.25 6.5c0-2.9 2.35-5.25 5.25-5.25 2.89 0 5.25 2.35 5.25 5.25 0 2.89-2.36 5.25-5.25 5.25 -2.9 0-5.25-2.36-5.25-5.25Z"/>
              <path d="M6.5 13.75c-2.08 0-3.75 1.67-3.75 3.75 0 2.07 1.67 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-.42.33-.75.75-.75 .41 0 .75.33.75.75 0 2.89-2.36 5.25-5.25 5.25 -2.9 0-5.25-2.36-5.25-5.25 0-2.9 2.35-5.25 5.25-5.25 1.07 0 2.08.32 2.91.88 .34.23.43.69.2 1.04 -.24.34-.7.43-1.05.2 -.6-.4-1.32-.64-2.09-.64Z"/>
              <path d="M19 14.25c.41 0 .75.33.75.75v5c0 .41-.34.75-.75.75h-4c-.42 0-.75-.34-.75-.75 0-.42.33-.75.75-.75h3.25V15c0-.42.33-.75.75-.75Z"/>
              <path d="M18.61 14.35c.24-.15.55-.15.79.01l2.32 1.5c.34.22.44.68.22 1.03 -.23.34-.69.44-1.04.22l-1.93-1.25 -2.1 1.25c-.36.21-.82.09-1.029-.26 -.22-.36-.1-.82.25-1.029l2.5-1.5Z"/>
              <path d="M5.32 9.75c-.42 0-.75-.34-.75-.75V4c0-.42.33-.75.75-.75h4c.41 0 .75.33.75.75 0 .41-.34.75-.76.75H6.06V9c0 .41-.34.75-.75.75Z"/>
              <path d="M5.7 9.64c-.25.14-.56.14-.8-.02l-2.33-1.5c-.35-.23-.45-.69-.23-1.04 .22-.35.68-.45 1.037-.23l1.92 1.24 2.09-1.26c.35-.22.81-.1 1.02.25 .21.35.09.81-.26 1.02l-2.5 1.5Z"/>
            </g>
          </svg>
        );
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
      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          
          {/* Back button */}
          <Link to="/" className="inline-flex items-center gap-1 text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline mb-6">
            ← Back to Destinations
          </Link>

          {/* Hero Banner Section */}
          <div className="rounded-[32px] bg-[hsl(var(--blue-900))] text-white p-8 sm:p-12 relative overflow-hidden mb-10 shadow-xl">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-[hsl(var(--accent))]/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl">
              <span className="text-5xl sm:text-6xl block mb-4">{country.flag}</span>
              <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] mb-2 font-mono">
                Destination Hub
              </div>
              <h1 className="font-display font-extrabold text-[38px] sm:text-[54px] tracking-[-0.03em] leading-tight">
                Immigrate to {country.name}
              </h1>
              <p className="mt-4 text-[16px] sm:text-[18px] text-white/80 leading-relaxed">
                {country.desc} Explore requirements, timelines, and fees across study, settlement, work, and visit pathways.
              </p>
              
              <div className="mt-6 flex flex-wrap gap-4 text-[13px] font-medium text-white/70">
                <div>Capital: <span className="font-bold text-white">{country.capital}</span></div>
                <div className="hidden sm:block text-white/30">|</div>
                <div>Currency: <span className="font-bold text-white">{country.currency}</span></div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[hsl(var(--blue-900))]/40 px-3 mb-3">
                Pathway Hubs
              </div>
              {visaTabs.map((tab) => {
                const TabIcon = tab.icon;
                const active = activeVisa === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveVisa(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left text-[14px] font-bold transition-all ${
                      active 
                        ? 'bg-[hsl(var(--blue-900))] text-white shadow-md' 
                        : 'bg-white border border-black/5 hover:border-black/10 text-[hsl(var(--blue-900))]/80'
                    }`}
                  >
                    {renderDashedIcon(tab.id, `w-4 h-4 ${active ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--blue-700))]'}`)}
                    {tab.label}
                  </button>
                );
              })}

              <div className="pt-6">
                <div className="rounded-2xl bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] p-5 text-center">
                  <div className="font-bold text-[14px] text-[hsl(var(--blue-900))]">Check Eligibility</div>
                  <p className="text-[12px] text-[hsl(var(--blue-900))]/60 mt-1 leading-relaxed">
                    Calculate your visa points and admission scores for {country.name} now.
                  </p>
                  <Link 
                    to="/assessment" 
                    className="mt-4 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-[hsl(var(--accent))] text-white font-bold text-[12px] h-10 px-4 hover:opacity-90 transition"
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
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-3xl bg-white border border-black/5 p-6 sm:p-10 shadow-lg shadow-blue-900/5 space-y-6"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-10 w-10 rounded-xl bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-700))] inline-flex items-center justify-center">
                      {renderDashedIcon(activeVisa, "w-5 h-5")}
                    </span>
                    <div>
                      <h2 className="text-[22px] font-display font-black leading-tight text-[hsl(var(--blue-900))]">
                        {currentVisa.title}
                      </h2>
                    </div>
                  </div>

                  <p className="text-[15px] text-[hsl(var(--blue-900))]/65 leading-relaxed">
                    {currentVisa.desc}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 flex items-start gap-3">
                      {renderDashedIcon('clock', "w-5 h-5 text-[hsl(var(--accent))] shrink-0 mt-0.5")}
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[hsl(var(--blue-900))]/40 font-bold font-mono">Processing Time</div>
                        <div className="text-[16px] font-bold text-[hsl(var(--blue-900))] mt-0.5">{currentVisa.timeline}</div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 flex items-start gap-3">
                      {renderDashedIcon('coins', "w-5 h-5 text-[hsl(var(--accent))] shrink-0 mt-0.5")}
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[hsl(var(--blue-900))]/40 font-bold font-mono">Government Fee</div>
                        <div className="text-[16px] font-bold text-[hsl(var(--blue-900))] mt-0.5">{currentVisa.fees}</div>
                      </div>
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div className="pt-4 border-t border-black/5">
                    <h3 className="text-[16px] font-bold text-[hsl(var(--blue-900))] mb-4 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[hsl(var(--blue-700))]" /> Key Requirements Checklist
                    </h3>
                    
                    <div className="grid sm:grid-cols-2 gap-3">
                      {currentVisa.requirements.map((req, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-black/5 bg-white">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-[13px] font-medium text-[hsl(var(--blue-900))]/80">{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Direct application trigger */}
                  <div className="pt-6 border-t border-black/5 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Ready to file for {country.name}?</div>
                      <p className="text-[12px] text-[hsl(var(--blue-900))]/60">Get complete documents reviewed by our certified experts.</p>
                    </div>
                    <Link
                      to="/assessment"
                      className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--blue-700))] text-white text-[13px] font-bold px-6 h-11 hover:bg-[hsl(var(--blue-800))] transition"
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

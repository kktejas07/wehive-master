import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, Award, ClipboardCheck, Users, HelpCircle, FileText, Sparkles, Send, ShieldCheck, GraduationCap } from 'lucide-react';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const COUNTRIES = [
  { id: 'ca', name: 'Canada', flag: '🇨🇦' },
  { id: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { id: 'us', name: 'United States', flag: '🇺🇸' },
  { id: 'au', name: 'Australia', flag: '🇦🇺' },
  { id: 'de', name: 'Germany', flag: '🇩🇪' },
];

export default function VisaAssessment() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [pathway, setPathway] = useState(''); // 'pr' or 'student'
  
  // PR Pathway fields
  const [prAge, setPrAge] = useState('25-29');
  const [prEdu, setPrEdu] = useState('masters');
  const [prLanguage, setPrLanguage] = useState('clb9'); // IELTS CLB 9+
  const [prExp, setPrExp] = useState('3plus');
  
  // Student Pathway fields
  const [studentCountry, setStudentCountry] = useState('ca');
  const [studentEdu, setStudentEdu] = useState('bachelors');
  const [studentGpa, setStudentGpa] = useState('80'); // Percentage/GPA
  const [studentBudget, setStudentBudget] = useState('mid'); // 'low', 'mid', 'high'
  
  // Contact details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic calculations
  const calculateCRS = () => {
    let score = 0;
    
    // Age Points
    if (prAge === '18-24') score += 105;
    else if (prAge === '25-29') score += 110;
    else if (prAge === '30-34') score += 95;
    else if (prAge === '35-39') score += 75;
    else score += 45; // 40+
    
    // Education Points
    if (prEdu === 'phd') score += 150;
    else if (prEdu === 'masters') score += 135;
    else if (prEdu === 'bachelors') score += 120;
    else score += 98; // 2-year college
    
    // Language Points
    if (prLanguage === 'clb9') score += 136;
    else if (prLanguage === 'clb8') score += 116;
    else if (prLanguage === 'clb7') score += 92;
    else score += 68;
    
    // Experience Points
    if (prExp === '3plus') score += 80;
    else if (prExp === '2years') score += 50;
    else if (prExp === '1year') score += 35;
    else score += 0;
    
    // Add dummy adaptability/bonus points for realistic Express Entry scale (out of 600)
    score += 50; 
    
    return score;
  };

  const getStudentMatchStrength = () => {
    const budget = studentBudget;
    const gpa = Number(studentGpa);
    
    if (studentCountry === 'de') {
      if (gpa >= 80 && budget === 'low') return { level: 'High Match', color: 'text-emerald-500 bg-emerald-50', pct: 92, text: 'Germany has low tuition but requires high GPAs.' };
      if (gpa >= 70) return { level: 'Good Match', color: 'text-emerald-600 bg-emerald-50', pct: 78, text: 'Strong eligibility for German public & private universities.' };
      return { level: 'Moderate Match', color: 'text-amber-500 bg-amber-50', pct: 60, text: 'Public universities might be competitive; private is likely.' };
    }
    
    if (studentCountry === 'us' || studentCountry === 'gb') {
      if (budget === 'high' && gpa >= 75) return { level: 'High Match', color: 'text-emerald-500 bg-emerald-50', pct: 95, text: 'Great profiles for US/UK private institutions and scholarships.' };
      if (budget === 'mid' && gpa >= 65) return { level: 'Good Match', color: 'text-emerald-600 bg-emerald-50', pct: 82, text: 'Strong fit for regional and public universities.' };
      return { level: 'Needs Review', color: 'text-rose-500 bg-rose-50', pct: 45, text: 'Budget or GPA might restrict options. Let us find scholarships.' };
    }

    // Default CA/AU
    if (gpa >= 70 && budget !== 'low') return { level: 'High Match', color: 'text-emerald-500 bg-emerald-50', pct: 88, text: 'Excellent prospects for college and university programs.' };
    return { level: 'Good Match', color: 'text-emerald-600 bg-emerald-50', pct: 75, text: 'Standard requirements met. Visa approval probability is high.' };
  };

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Split full name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Build assessment message
    const message = pathway === 'pr' 
      ? `Visa Assessment Pathway: Permanent Residency (PR)
Age Group: ${prAge}
Education: ${prEdu}
Language Level: ${prLanguage}
Work Experience: ${prExp}
Estimated CRS Score: ${calculateCRS()} / 600
Phone: ${phone}`
      : `Visa Assessment Pathway: Student Visa
Target Country: ${COUNTRIES.find(c => c.id === studentCountry)?.name || studentCountry}
Current Education: ${studentEdu}
Academic Score: ${studentGpa}%
Budget: ${studentBudget}
Match: ${getStudentMatchStrength().level} (${getStudentMatchStrength().pct}%)
Phone: ${phone}`;

    try {
      await axios.post(`${API}/leads`, {
        name: firstName,
        surname: lastName,
        email: email,
        message: message,
      });
      setSubmitted(true);
    } catch (err) {
      toast({ title: 'Submission failed', description: typeof err?.response?.data?.detail === 'string' ? err.response.data.detail : 'Please check your details and try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-5">
          {/* Header */}
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] mb-3">
              <ClipboardCheck className="w-3.5 h-3.5" /> Eligibility Calculator
            </span>
            <h1 className="font-display font-extrabold text-[36px] sm:text-[48px] tracking-[-0.03em] text-[hsl(var(--blue-900))] leading-tight">
              Visa Eligibility Assessment
            </h1>
            <p className="mt-2.5 text-[15px] text-[hsl(var(--blue-900))]/65 max-w-lg mx-auto">
              Check your CRS Express Entry points or study visa approval probability in under 2 minutes.
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-10 shadow-xl shadow-blue-900/5 relative overflow-hidden">
            {/* Background blob */}
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[hsl(var(--accent))]/5 blur-2xl pointer-events-none" />

            {!submitted ? (
              <div>
                {/* Progress bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center text-[12px] font-bold text-[hsl(var(--blue-900))]/50 mb-2 font-mono">
                    <span>STEP {step} OF {pathway ? 4 : 2}</span>
                    <span>{Math.round((step / (pathway ? 4 : 2)) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[hsl(var(--soft-bg))] overflow-hidden">
                    <div 
                      className="h-full bg-[hsl(var(--accent))] rounded-full transition-all duration-300"
                      style={{ width: `${(step / (pathway ? 4 : 2)) * 100}%` }}
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-[20px] font-display font-black">Choose your visa pathway</h2>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => { setPathway('pr'); handleNext(); }}
                          className={`flex flex-col text-left p-6 rounded-2xl border-2 transition-all group ${
                            pathway === 'pr' ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5 shadow-sm' : 'border-black/5 hover:border-black/10'
                          }`}
                        >
                          <ShieldCheck className="w-8 h-8 text-[hsl(var(--accent))] mb-3 group-hover:scale-105 transition-transform" />
                          <div className="font-bold text-[16px]">Permanent Residency (PR)</div>
                          <div className="text-[13px] text-[hsl(var(--blue-900))]/60 mt-1">
                            Assess Express Entry CRS points for Canada PR or points-based immigration.
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPathway('student'); handleNext(); }}
                          className={`flex flex-col text-left p-6 rounded-2xl border-2 transition-all group ${
                            pathway === 'student' ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5 shadow-sm' : 'border-black/5 hover:border-black/10'
                          }`}
                        >
                          <GraduationCap className="w-8 h-8 text-[hsl(var(--accent))] mb-3 group-hover:scale-105 transition-transform" />
                          <div className="font-bold text-[16px]">Student Visa Pathway</div>
                          <div className="text-[13px] text-[hsl(var(--blue-900))]/60 mt-1">
                            Evaluate university admission profiles and visa approval chances.
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* PR Steps */}
                  {step === 2 && pathway === 'pr' && (
                    <motion.div
                      key="step2-pr"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <h2 className="text-[20px] font-display font-black">Core Demographics</h2>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-2">Age Group</label>
                          <select 
                            value={prAge} 
                            onChange={(e) => setPrAge(e.target.value)}
                            className="w-full h-12 rounded-xl border border-black/10 px-4 text-[14px] text-[hsl(var(--blue-900))] bg-white outline-none focus:border-[hsl(var(--accent))]"
                          >
                            <option value="18-24">18 - 24 years</option>
                            <option value="25-29">25 - 29 years (Max Points)</option>
                            <option value="30-34">30 - 34 years</option>
                            <option value="35-39">35 - 39 years</option>
                            <option value="40plus">40+ years</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-2">Highest Education Level</label>
                          <select 
                            value={prEdu} 
                            onChange={(e) => setPrEdu(e.target.value)}
                            className="w-full h-12 rounded-xl border border-black/10 px-4 text-[14px] text-[hsl(var(--blue-900))] bg-white outline-none focus:border-[hsl(var(--accent))]"
                          >
                            <option value="phd">PhD / Doctoral Degree</option>
                            <option value="masters">Master's Degree or Professional Degree</option>
                            <option value="bachelors">Bachelor's Degree (3+ years)</option>
                            <option value="diploma">Two-year College Diploma</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-between">
                        <button type="button" onClick={handleBack} className="inline-flex items-center gap-1 text-[14px] font-bold text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))]">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button type="button" onClick={handleNext} className="inline-flex items-center gap-1 rounded-full btn-primary text-white h-11 px-5 font-bold text-[14px]">
                          Continue <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && pathway === 'pr' && (
                    <motion.div
                      key="step3-pr"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <h2 className="text-[20px] font-display font-black">Experience & Language</h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-2">English Proficiency (IELTS Equivalent)</label>
                          <select 
                            value={prLanguage} 
                            onChange={(e) => setPrLanguage(e.target.value)}
                            className="w-full h-12 rounded-xl border border-black/10 px-4 text-[14px] text-[hsl(var(--blue-900))] bg-white outline-none focus:border-[hsl(var(--accent))]"
                          >
                            <option value="clb9">CLB 9 or higher (IELTS Listening 8.0, others 7.0)</option>
                            <option value="clb8">CLB 8 (IELTS Listening 7.5, others 6.5)</option>
                            <option value="clb7">CLB 7 (IELTS 6.0 in all bands)</option>
                            <option value="clb6">Below CLB 7</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-2">Skilled Work Experience (Outside Canada)</label>
                          <select 
                            value={prExp} 
                            onChange={(e) => setPrExp(e.target.value)}
                            className="w-full h-12 rounded-xl border border-black/10 px-4 text-[14px] text-[hsl(var(--blue-900))] bg-white outline-none focus:border-[hsl(var(--accent))]"
                          >
                            <option value="3plus">3 years or more</option>
                            <option value="2years">2 years</option>
                            <option value="1year">1 year</option>
                            <option value="none">No experience</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-between">
                        <button type="button" onClick={handleBack} className="inline-flex items-center gap-1 text-[14px] font-bold text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))]">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button type="button" onClick={handleNext} className="inline-flex items-center gap-1 rounded-full btn-primary text-white h-11 px-5 font-bold text-[14px]">
                          Calculate Score <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Student Steps */}
                  {step === 2 && pathway === 'student' && (
                    <motion.div
                      key="step2-student"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <h2 className="text-[20px] font-display font-black">Target & Background</h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-2">Target Destination</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {COUNTRIES.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setStudentCountry(c.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition ${
                                  studentCountry === c.id ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5 font-bold text-[hsl(var(--accent))]' : 'border-black/5 hover:border-black/10 text-[hsl(var(--blue-900))]'
                                }`}
                              >
                                <span className="text-xl">{c.flag}</span>
                                <span className="text-[13px]">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-2">Current Education Level</label>
                          <select 
                            value={studentEdu} 
                            onChange={(e) => setStudentEdu(e.target.value)}
                            className="w-full h-12 rounded-xl border border-black/10 px-4 text-[14px] text-[hsl(var(--blue-900))] bg-white outline-none focus:border-[hsl(var(--accent))]"
                          >
                            <option value="masters">Completed Master's Degree</option>
                            <option value="bachelors">Completed Bachelor's Degree</option>
                            <option value="highschool">Completed High School (12th grade)</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-between">
                        <button type="button" onClick={handleBack} className="inline-flex items-center gap-1 text-[14px] font-bold text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))]">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button type="button" onClick={handleNext} className="inline-flex items-center gap-1 rounded-full btn-primary text-white h-11 px-5 font-bold text-[14px]">
                          Continue <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && pathway === 'student' && (
                    <motion.div
                      key="step3-student"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <h2 className="text-[20px] font-display font-black">Academic & Budget</h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block justify-between flex text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-2">
                            <span>GPA / Academic Score (%)</span>
                            <span className="text-[hsl(var(--accent))]">{studentGpa}%</span>
                          </label>
                          <input 
                            type="range" 
                            min="50" 
                            max="100" 
                            value={studentGpa} 
                            onChange={(e) => setStudentGpa(e.target.value)}
                            className="w-full accent-[hsl(var(--accent))]"
                          />
                          <div className="flex justify-between text-[11px] text-[hsl(var(--blue-900))]/40 mt-1 font-mono">
                            <span>50% (Minimum)</span>
                            <span>100% (Perfect)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-2">Yearly Tuition Budget</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'low', label: 'Under ₹15 Lakh' },
                              { id: 'mid', label: '₹15 - ₹30 Lakh' },
                              { id: 'high', label: 'Over ₹30 Lakh' },
                            ].map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => setStudentBudget(b.id)}
                                className={`px-3 py-3 rounded-xl border text-center transition text-[13px] ${
                                  studentBudget === b.id ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5 font-bold text-[hsl(var(--accent))]' : 'border-black/5 hover:border-black/10 text-[hsl(var(--blue-900))]'
                                }`}
                              >
                                {b.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-between">
                        <button type="button" onClick={handleBack} className="inline-flex items-center gap-1 text-[14px] font-bold text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))]">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button type="button" onClick={handleNext} className="inline-flex items-center gap-1 rounded-full btn-primary text-white h-11 px-5 font-bold text-[14px]">
                          Get Matching Strength <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Contact Lead Generation Form */}
                  {step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div className="text-center mb-4">
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Calculation Completed!
                        </span>
                        <h2 className="text-[22px] font-display font-black text-[hsl(var(--blue-900))]">Reveal your assessment</h2>
                        <p className="text-[13px] text-[hsl(var(--blue-900))]/60 mt-1">
                          We will send your detailed country match analysis and customized document checklist directly to you.
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-1.5">Full Name</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="Priya Sharma" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-12 rounded-xl border border-black/10 px-4 text-[14px] outline-none focus:border-[hsl(var(--accent))]"
                          />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-1.5">Email Address</label>
                            <input 
                              required 
                              type="email" 
                              placeholder="priya@example.com" 
                              value={email} 
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full h-12 rounded-xl border border-black/10 px-4 text-[14px] outline-none focus:border-[hsl(var(--accent))]"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-bold uppercase tracking-wider text-[hsl(var(--blue-900))]/60 mb-1.5">Phone Number</label>
                            <input 
                              required 
                              type="tel" 
                              placeholder="+91 90007 34326" 
                              value={phone} 
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full h-12 rounded-xl border border-black/10 px-4 text-[14px] outline-none focus:border-[hsl(var(--accent))]"
                            />
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={loading}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--accent))] hover:opacity-90 text-white font-bold text-[15px] h-12 px-6 transition disabled:opacity-50 mt-4"
                        >
                          {loading ? 'Submitting...' : 'See My Eligibility Score'} <Send className="w-4 h-4" />
                        </button>
                      </form>

                      <div className="pt-2 flex justify-start">
                        <button type="button" onClick={handleBack} className="inline-flex items-center gap-1 text-[13px] font-bold text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))]">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Success / Results Screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-[28px] font-display font-black">Your Eligibility Analysis</h2>
                  <p className="text-[14px] text-[hsl(var(--blue-900))]/60">
                    Thanks {name}! Here are your calculated results. A visa consultant has been assigned and will contact you at {phone} within 24 hours.
                  </p>
                </div>

                {pathway === 'pr' ? (
                  <div className="max-w-md mx-auto rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 p-6 space-y-4">
                    <div className="text-[12px] uppercase tracking-wider text-[hsl(var(--blue-900))]/50 font-bold font-mono">Estimated Express Entry CRS Points</div>
                    <div className="text-[64px] font-display font-extrabold text-[hsl(var(--blue-700))] leading-none">
                      {calculateCRS()}
                      <span className="text-[16px] text-[hsl(var(--blue-900))]/40 font-bold"> / 600</span>
                    </div>
                    <div className="text-[13px] text-[hsl(var(--blue-900))]/70 leading-relaxed pt-2 border-t border-black/5">
                      Your CRS score is excellent. Current rounds range between 490-530. You are highly eligible for Express Entry PR PNP pathways.
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 p-6 space-y-4">
                    <div className="text-[12px] uppercase tracking-wider text-[hsl(var(--blue-900))]/50 font-bold font-mono">Student Matching Analysis</div>
                    
                    {(() => {
                      const match = getStudentMatchStrength();
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center gap-3">
                            <span className={`text-[13px] font-bold px-3 py-1 rounded-full ${match.color}`}>
                              {match.level}
                            </span>
                            <span className="text-[28px] font-display font-black text-[hsl(var(--blue-700))]">
                              {match.pct}%
                            </span>
                          </div>
                          <div className="text-[13px] text-[hsl(var(--blue-900))]/70 leading-relaxed pt-2 border-t border-black/5">
                            {match.text} We have matching universities and scholarships aligned with your budget.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="pt-4 flex gap-3 justify-center">
                  <button 
                    onClick={() => {
                      setStep(1);
                      setPathway('');
                      setSubmitted(false);
                    }}
                    className="rounded-full border border-black/10 hover:border-black/20 text-[13px] font-bold px-6 h-11"
                  >
                    Calculate Again
                  </button>
                  <a 
                    href="/resources" 
                    className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--blue-900))] text-white text-[13px] font-bold px-6 h-11 hover:opacity-90"
                  >
                    View Resource Guides <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

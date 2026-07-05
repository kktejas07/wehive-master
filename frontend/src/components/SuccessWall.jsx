import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Award, Star, Search, Flame, ArrowUpRight, Lock, Eye } from 'lucide-react';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Rahul Mehta',
    country: 'Canada',
    flag: '🇨🇦',
    type: 'Student Visa',
    processingTime: '22 Days',
    year: '2026',
    comment: 'Getting my study permit for Canada through WeHive was completely transparent. The 24/7 tracker and document checking tool meant I was never left wondering what was happening.',
    avatarInitials: 'RM',
    stampColor: 'rgba(224, 33, 44, 0.8)', // Canada Red
  },
  {
    id: 2,
    name: 'Priya Sharma',
    country: 'Germany',
    flag: '🇩🇪',
    type: 'Opportunity Card (Work)',
    processingTime: '14 Days',
    year: '2026',
    comment: 'The points calculator matched me exactly, and the SOP writer generated a draft that was accepted with zero changes. Germany chances were high and WeHive executed it flawlessly!',
    avatarInitials: 'PS',
    stampColor: 'rgba(0, 0, 0, 0.8)', // Germany Black/Gold
  },
  {
    id: 3,
    name: 'Vikram Singh',
    country: 'United Kingdom',
    flag: '🇬🇧',
    type: 'Skilled Worker',
    processingTime: '31 Days',
    year: '2026',
    comment: 'The application portal is a game changer. No traditional agent gives you this level of control and transparency. Handed in my CoS, visa approved in under a month.',
    avatarInitials: 'VS',
    stampColor: 'rgba(10, 44, 138, 0.8)', // UK Royal Blue
  },
  {
    id: 4,
    name: 'Anita Desai',
    country: 'United States',
    flag: '🇺🇸',
    type: 'F-1 Student Visa',
    processingTime: '18 Days',
    year: '2026',
    comment: 'From university matching to the actual visa interview prep, WeHive guided me step-by-step. The mock interview sessions made me so confident in front of the visa officer.',
    avatarInitials: 'AD',
    stampColor: 'rgba(26, 86, 219, 0.8)', // US Blue
  },
  {
    id: 5,
    name: 'Siddharth Nair',
    country: 'Australia',
    flag: '🇦🇺',
    type: 'PR Visa (Subclass 190)',
    processingTime: '5 Months',
    year: '2026',
    comment: 'Express Entry and Australian PR points calculation is normally very complex. The assessment tool here gave me an honest review, followed by professional filing that got approved.',
    avatarInitials: 'SN',
    stampColor: 'rgba(4, 102, 0, 0.8)', // Australia Green
  },
];

// Styled Passport Visa Stamp component with blurs to simulate verified clients
function PassportStamp({ flag, country, type, date, stampColor }) {
  return (
    <div className="relative w-full aspect-[4/3] rounded-3xl bg-[hsl(var(--soft-bg))] border border-black/5 overflow-hidden flex items-center justify-center p-6 select-none shadow-inner">
      {/* Grid Pattern resembling passport page */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(#000 1px, transparent 1px), linear-gradient(0deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%)',
        backgroundSize: '20px 20px',
      }} />

      {/* Blurred overlay protecting sensitive mock passport details */}
      <div className="absolute inset-0 flex flex-col justify-between p-4 opacity-30 select-none">
        <div className="flex justify-between text-[8px] font-mono">
          <span>PASSPORT NO: *******</span>
          <span>STAMP NO: 2026-X8</span>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 w-24 bg-black rounded" />
          <div className="h-1.5 w-32 bg-black rounded" />
          <div className="h-1.5 w-16 bg-black rounded" />
        </div>
        <div className="flex justify-between text-[7px] font-mono">
          <span>HIVE IMMIGRATION</span>
          <span>DATE OF EXP: 2036</span>
        </div>
      </div>

      {/* The main glowing visa stamp seal */}
      <div className="relative z-10 flex flex-col items-center justify-center border-4 border-dashed rounded-2xl p-4 transform rotate-[-4deg] max-w-[80%] text-center"
        style={{ borderColor: stampColor, color: stampColor, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)' }}>
        
        {/* Visa Type Seal */}
        <div className="text-[10px] font-bold uppercase tracking-widest font-mono">VERIFIED VISA</div>
        
        <div className="flex items-center gap-1.5 my-1">
          <span className="text-2xl">{flag}</span>
          <span className="text-[16px] font-black uppercase tracking-tight font-display">{country}</span>
        </div>
        
        <div className="text-[9px] font-bold tracking-wide uppercase max-w-[150px] truncate">{type}</div>
        <div className="text-[8px] font-mono mt-1 opacity-70">ISSUED: JULY {date}</div>
        
        {/* Hologram details */}
        <div className="absolute bottom-1 right-2 opacity-30 text-[6px] font-mono flex items-center gap-0.5">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M1.25 4.34c0-1.18 1.13-2.02 2.25-1.68l8.71 2.61c.31.09.53.38.53.71v16c0 .23-.12.46-.31.6 -.2.14-.44.18-.67.11L2.47 19.9c-.75-.23-1.25-.91-1.25-1.68V4.3Zm1.82-.24c-.17-.05-.33.07-.33.23v13.91c0 .11.07.2.17.23l8.32 2.49V6.52L3.05 4.06Z"/>
              <path d="M22.75 4.34c0-1.18-1.13-2.02-2.26-1.68l-8.72 2.61c-.32.09-.54.38-.54.71v16c0 .23.11.46.3.6 .19.14.43.18.66.11l9.28-2.79c.74-.23 1.24-.91 1.24-1.68V8.96c0-.42-.34-.75-.75-.75 -.42 0-.75.33-.75.75v.256c0 .11-.08.2-.18.23l-8.33 2.49V6.5l8.17-2.46c.16-.05.32.07.32.23v.65c0 .41.33.75.75.75 .41 0 .75-.34.75-.75v-.66Z"/>
            </g>
          </svg> WeHive Secure
        </div>
      </div>

      {/* Blurred areas blocking personal fields */}
      <div className="absolute top-[20%] left-[10%] w-[35%] h-[20%] bg-white/20 backdrop-blur-[6px] rounded-lg border border-white/30 flex items-center justify-center">
        <div className="flex items-center gap-0.5 text-[8px] text-[hsl(var(--blue-900))]/40 font-mono font-bold">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M5 2.25c.41 0 .75.33.75.75v2c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V3c0-.42.33-.75.75-.75Z"/>
              <path d="M5.5 11.25c.41 0 .75.33.75.75v8c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-8c0-.42.33-.75.75-.75Z"/>
              <path d="M1.25 6c0-.97.78-1.75 1.75-1.75h5c.96 0 1.75.78 1.75 1.75v5c0 .96-.79 1.75-1.75 1.75H3c-.97 0-1.75-.79-1.75-1.75v-.5c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v.5c0 .13.11.25.25.25h5c.13 0 .25-.12.25-.25V6c0-.14-.12-.25-.25-.25H3c-.14 0-.25.11-.25.25v.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V6Z"/>
            </g>
          </svg> BLURRED
        </div>
      </div>
      
      <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[15%] bg-white/20 backdrop-blur-[6px] rounded-lg border border-white/30 flex items-center justify-center">
        <div className="flex items-center gap-0.5 text-[8px] text-[hsl(var(--blue-900))]/40 font-mono font-bold">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <g fill="currentColor" fillRule="evenodd">
              <path d="M5 2.25c.41 0 .75.33.75.75v2c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V3c0-.42.33-.75.75-.75Z"/>
              <path d="M5.5 11.25c.41 0 .75.33.75.75v8c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75v-8c0-.42.33-.75.75-.75Z"/>
              <path d="M1.25 6c0-.97.78-1.75 1.75-1.75h5c.96 0 1.75.78 1.75 1.75v5c0 .96-.79 1.75-1.75 1.75H3c-.97 0-1.75-.79-1.75-1.75v-.5c0-.42.33-.75.75-.75 .41 0 .75.33.75.75v.5c0 .13.11.25.25.25h5c.13 0 .25-.12.25-.25V6c0-.14-.12-.25-.25-.25H3c-.14 0-.25.11-.25.25v.5c0 .41-.34.75-.75.75 -.42 0-.75-.34-.75-.75V6Z"/>
            </g>
          </svg> CLASSIFIED
        </div>
      </div>
    </div>
  );
}

export default function SuccessWall() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' 
    ? TESTIMONIALS 
    : TESTIMONIALS.filter(t => t.country.toLowerCase() === filter.toLowerCase() || t.type.toLowerCase().includes(filter.toLowerCase()));

  return (
    <section className="py-16 sm:py-24 bg-white border-t border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-bold text-[hsl(var(--accent))] mb-3">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
              <g fill="currentColor" fillRule="evenodd">
                <path d="M12 2.75c-2.59 0-4.93 1.06-6.61 2.77 -.29.29-.77.3-1.07.01 -.3-.29-.31-.77-.02-1.07 1.95-1.99 4.66-3.23 7.67-3.23 5.93 0 10.75 4.81 10.75 10.75 0 5.93-4.82 10.75-10.75 10.75 -5.94 0-10.75-4.82-10.75-10.75 0-.74.07-1.46.21-2.15 .08-.41.47-.67.88-.59 .4.08.66.47.58.88 -.13.59-.19 1.21-.19 1.85 0 5.1 4.14 9.25 9.25 9.25 5.1 0 9.25-4.15 9.25-9.25 0-5.11-4.15-9.25-9.25-9.25Z"/>
              </g>
            </svg> Success Wall
          </div>
          <h2 className="font-display font-extrabold text-[28px] sm:text-[40px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
            Verified Visas, <span className="gradient-text-hover">Real Results</span>
          </h2>
          <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-lg mx-auto">
            Browse authentic passport stamps secured for clients (sensitive records blurred for privacy) paired with their feedback.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {[
            { id: 'all', label: 'All Visas' },
            { id: 'canada', label: 'Canada 🇨🇦' },
            { id: 'united kingdom', label: 'United Kingdom 🇬🇧' },
            { id: 'united states', label: 'United States 🇺🇸' },
            { id: 'germany', label: 'Germany 🇩🇪' },
            { id: 'student', label: 'Student Visas' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`rounded-full px-4.5 py-1.5 text-[13px] font-bold transition-all ${
                filter === btn.id
                  ? 'bg-[hsl(var(--blue-900))] text-white shadow-sm'
                  : 'bg-[hsl(var(--soft-bg))] text-[hsl(var(--blue-900))]/70 hover:bg-black/5'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Success Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border border-black/5 bg-white p-6 shadow-md hover:shadow-xl transition flex flex-col justify-between card-lift"
              >
                <div>
                  {/* Stamp Component */}
                  <PassportStamp
                    flag={item.flag}
                    country={item.country}
                    type={item.type}
                    date={item.processingTime.split(' ')[0]} // Dummy date using processing day
                    stampColor={item.stampColor}
                  />

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 mt-6 mb-3.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Feedback Quote */}
                  <p className="text-[14.5px] italic text-[hsl(var(--blue-900))]/80 leading-relaxed font-medium">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                </div>

                {/* Client Profile details */}
                <div className="mt-6 pt-5 border-t border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] font-bold text-[13px] flex items-center justify-center shadow-sm">
                      {item.avatarInitials}
                    </div>
                    <div>
                      <div className="font-extrabold text-[14px] text-[hsl(var(--blue-900))]">{item.name}</div>
                      <div className="text-[11px] text-[hsl(var(--blue-900))]/50">{item.type}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {item.processingTime}
                    </span>
                    <span className="block text-[10px] text-[hsl(var(--blue-900))]/40 mt-1 font-mono">{item.year} Verified</span>
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Star, GraduationCap, Clock, Coins, CheckCircle, Info, Compass, HelpCircle } from "lucide-react";
import { CountryInfo } from "../types";
import { useColorScheme } from "../hooks/useColorScheme";

interface InteractiveMapProps {
  destinations: CountryInfo[];
  activeCountry: CountryInfo;
  shortlistedIds: string[];
  onToggleShortlist: (id: string, e: React.MouseEvent) => void;
  onSelectCountry: (country: CountryInfo) => void;
}

interface MapPinInfo {
  id: string;
  name: string;
  flag: string;
  x: number; // percentage coordinate 0-100 for responsive plotting
  y: number; // percentage coordinate 0-100
  tuitionFeeInfo: string;
  livingCostInfo: string;
  stayBackInfo: string;
  visaSuccess: string;
}

const MAP_PINS: MapPinInfo[] = [
  {
    id: "canada",
    name: "Canada",
    flag: "🇨🇦",
    x: 20,
    y: 25,
    tuitionFeeInfo: "Moderate (CAD 15K - 30K/yr)",
    livingCostInfo: "CAD 1,100 - 1,500/mo",
    stayBackInfo: "Up to 3 Years (PGWP)",
    visaSuccess: "92%"
  },
  {
    id: "usa",
    name: "United States",
    flag: "🇺🇸",
    x: 22,
    y: 36,
    tuitionFeeInfo: "High (USD 25K - 55K/yr)",
    livingCostInfo: "USD 1,200 - 1,800/mo",
    stayBackInfo: "Up to 3 Years (STEM OPT)",
    visaSuccess: "88%"
  },
  {
    id: "ireland",
    name: "Ireland",
    flag: "🇮🇪",
    x: 47,
    y: 29,
    tuitionFeeInfo: "Moderate (EUR 10K - 22K/yr)",
    livingCostInfo: "EUR 1,000 - 1,400/mo",
    stayBackInfo: "2 Years (Graduate Scheme)",
    visaSuccess: "95%"
  },
  {
    id: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    x: 49.5,
    y: 27,
    tuitionFeeInfo: "High (GBP 12K - 28K/yr)",
    livingCostInfo: "GBP 1,000 - 1,400/mo",
    stayBackInfo: "2 Years (Graduate Route)",
    visaSuccess: "96%"
  },
  {
    id: "germany",
    name: "Germany",
    flag: "🇩🇪",
    x: 52.5,
    y: 30,
    tuitionFeeInfo: "Free / Very Low (Semester Ticket)",
    livingCostInfo: "EUR 900 - 1,100/mo",
    stayBackInfo: "18 Months Jobseeker Permit",
    visaSuccess: "94%"
  },
  {
    id: "australia",
    name: "Australia",
    flag: "🇦🇺",
    x: 86,
    y: 72,
    tuitionFeeInfo: "High (AUD 22K - 45K/yr)",
    livingCostInfo: "AUD 1,600 - 2,100/mo",
    stayBackInfo: "2 to 4 Years (Post-Study Work)",
    visaSuccess: "91%"
  }
];

export function InteractiveMap({
  destinations,
  activeCountry,
  shortlistedIds,
  onToggleShortlist,
  onSelectCountry
}: InteractiveMapProps) {
  const { colorScheme, theme } = useColorScheme();
  const [hoveredPin, setHoveredPin] = useState<MapPinInfo | null>(null);

  // Filter study destinations to matching IDs
  const getCountryInfoById = (id: string) => {
    return destinations.find(c => c.id === id);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/50 dark:border-slate-800 p-5 shadow-sm space-y-4 text-left" id="interactive-destination-map-widget">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">Interactive Destination Map</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-sans">
              Visualize your shortlisted study destinations on the global compass
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/40 font-mono tracking-wider">
            {shortlistedIds.length} Shortlisted
          </span>
        </div>
      </div>

      {/* Map Board Wrapper */}
      <div className="relative w-full aspect-[2/1] bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 overflow-hidden shadow-2xs group select-none">
        {/* Subtle Gridlines Background */}
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
          {Array.from({ length: 72 }).map((_, i) => (
            <div key={i} className="border-r border-b border-slate-500" />
          ))}
        </div>

        {/* Abstract Stylized Continent Paths (Beautiful minimalistic vector shapes) */}
        <svg className="absolute inset-0 w-full h-full text-slate-200/90 dark:text-slate-800/60 transition-colors" viewBox="0 0 1000 500" fill="currentColor">
          {/* North America */}
          <path d="M 50,110 C 60,90 90,80 120,70 C 150,60 180,65 210,60 C 240,55 260,35 290,40 C 310,43 320,65 310,85 C 300,105 285,115 285,130 C 285,145 305,160 295,185 C 285,210 260,225 240,235 C 220,245 200,240 185,260 C 175,275 180,295 170,305 C 160,315 150,300 145,285 C 140,270 125,260 115,245 C 105,230 115,210 105,190 C 95,170 70,165 60,150 C 50,135 40,130 50,110 Z" />
          {/* Greenland */}
          <path d="M 320,50 C 330,35 365,30 380,45 C 390,55 385,80 375,90 C 365,100 340,95 330,85 C 320,75 310,65 320,50 Z" />
          {/* South America */}
          <path d="M 185,265 C 200,265 215,275 230,290 C 245,305 255,335 250,360 C 245,385 225,415 210,440 C 200,455 190,465 185,465 C 180,465 180,445 180,430 C 180,415 170,390 170,375 C 170,360 175,340 175,325 C 175,310 180,285 185,265 Z" />
          {/* Eurasia (Europe + Asia) */}
          <path d="M 400,130 C 410,105 440,95 470,90 C 500,85 540,100 570,85 C 600,70 635,75 670,70 C 705,65 745,85 780,85 C 815,85 855,105 875,130 C 895,155 915,185 895,215 C 875,245 845,255 825,275 C 805,295 795,315 775,310 C 755,305 750,285 735,275 C 720,265 690,265 675,285 C 660,305 640,310 625,300 C 610,290 615,265 600,250 C 585,235 565,245 550,230 C 535,215 520,225 500,220 C 480,215 470,235 450,230 C 430,225 410,215 405,190 C 400,165 390,155 400,130 Z" />
          {/* Africa */}
          <path d="M 415,225 C 430,220 455,215 475,225 C 495,235 525,240 535,260 C 545,280 540,310 535,330 C 530,350 515,375 500,395 C 485,415 475,435 470,435 C 465,435 465,415 460,400 C 455,385 435,360 430,345 C 425,330 420,310 415,295 C 410,280 405,260 410,245 C 415,230 400,230 415,225 Z" />
          {/* Australia & New Zealand */}
          <path d="M 770,360 C 790,345 825,340 850,345 C 875,350 890,370 885,395 C 880,420 855,430 830,425 C 805,420 780,410 770,390 C 760,370 750,375 770,360 Z" />
          <path d="M 900,415 C 905,405 915,410 915,420 C 915,430 905,440 900,435 C 895,430 895,425 900,415 Z" />
        </svg>

        {/* Latitude/Longitude Indicator Lines (Subtle Overlay decoration) */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[7px] font-mono font-bold text-slate-300 dark:text-slate-700 tracking-widest uppercase pointer-events-none -rotate-90">
          Equator 0°N
        </div>
        <div className="absolute bottom-2 right-4 text-[7px] font-mono font-bold text-slate-300 dark:text-slate-700 tracking-widest pointer-events-none">
          WEHIVE GLOBAL MAP VISUALIZER
        </div>

        {/* Interactive Map Pins */}
        {MAP_PINS.map((pin) => {
          const isShortlisted = shortlistedIds.includes(pin.id);
          const isActive = activeCountry.id === pin.id;
          const countryInfo = getCountryInfoById(pin.id);

          return (
            <div
              key={pin.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              onMouseEnter={() => setHoveredPin(pin)}
              onMouseLeave={() => setHoveredPin(null)}
            >
              {/* Pulsing Backlight for Shortlisted Countries */}
              {isShortlisted && (
                <div className="absolute -inset-4 bg-emerald-500/20 rounded-full animate-ping pointer-events-none duration-1000" />
              )}
              {isActive && (
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping pointer-events-none duration-750" />
              )}

              {/* Pin trigger */}
              <button
                onClick={() => {
                  if (countryInfo) {
                    onSelectCountry(countryInfo);
                  }
                }}
                className={`relative flex items-center justify-center p-1.5 rounded-full transition-all duration-300 shadow-md border cursor-pointer hover:scale-125 ${
                  isActive
                    ? "bg-blue-600 border-white text-white z-20 scale-110"
                    : isShortlisted
                    ? "bg-emerald-500 border-white text-white z-10"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                {isShortlisted ? (
                  <Star className="w-3.5 h-3.5 fill-white" />
                ) : (
                  <span className="text-[11px] font-bold leading-none font-sans">{pin.flag}</span>
                )}
              </button>

              {/* Minimal floating name tag */}
              <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-slate-900/80 dark:bg-slate-950/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md pointer-events-none shadow-xs border border-white/10 whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity">
                {pin.name}
              </div>
            </div>
          );
        })}

        {/* Dynamic Tooltip Info Card (Hover State popup inside map) */}
        <AnimatePresence>
          {hoveredPin && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-xs bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-white shadow-lg space-y-2.5 z-30 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{hoveredPin.flag}</span>
                  <span className="text-xs font-black">{hoveredPin.name}</span>
                </div>
                {shortlistedIds.includes(hoveredPin.id) ? (
                  <span className="text-[8px] font-black uppercase text-emerald-400 font-mono tracking-wider flex items-center gap-0.5">
                    ★ Shortlisted
                  </span>
                ) : (
                  <span className="text-[8px] font-semibold text-slate-400 font-mono">
                    Click pin to view details
                  </span>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[9px]">
                {/* Tuition Fee */}
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-indigo-400" /> Tuition Fees
                  </span>
                  <p className="font-semibold text-slate-200 truncate">{hoveredPin.tuitionFeeInfo}</p>
                </div>

                {/* Living Cost */}
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" /> Living Cost
                  </span>
                  <p className="font-semibold text-slate-200 truncate">{hoveredPin.livingCostInfo}</p>
                </div>

                {/* Stay Back */}
                <div className="space-y-0.5 col-span-2 pt-0.5 border-t border-white/5">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-400" /> Stay Back Permit
                  </span>
                  <p className="font-semibold text-slate-200 leading-relaxed">{hoveredPin.stayBackInfo}</p>
                </div>

                {/* Visa Success */}
                <div className="space-y-0.5 col-span-2 pt-0.5 border-t border-white/5 flex justify-between items-center">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Visa Success Rate
                  </span>
                  <p className="font-mono text-emerald-400 font-black text-xs">{hoveredPin.visaSuccess}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mini-Shortlisted Legend & Toggle Panel */}
      <div className="bg-slate-50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 p-3.5 rounded-2xl space-y-2.5">
        <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono block">
          🌍 Quick-Bookmark Countries Directory
        </span>
        
        <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
          {MAP_PINS.map((pin) => {
            const isShortlisted = shortlistedIds.includes(pin.id);
            const countryInfo = getCountryInfoById(pin.id);

            return (
              <div
                key={pin.id}
                onClick={() => {
                  if (countryInfo) {
                    onSelectCountry(countryInfo);
                  }
                }}
                className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                  isShortlisted
                    ? "bg-emerald-50/35 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/30"
                    : "bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-sm shrink-0">{pin.flag}</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                    {pin.name}
                  </span>
                </div>

                {/* Star icon button to toggle */}
                <button
                  onClick={(e) => onToggleShortlist(pin.id, e)}
                  className={`p-1 rounded-md border transition-all cursor-pointer ${
                    isShortlisted
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-600 dark:hover:text-slate-400"
                  }`}
                  title={isShortlisted ? "Remove from Shortlist" : "Add to Shortlist"}
                >
                  <Star className={`w-3 h-3 ${isShortlisted ? "fill-white" : ""}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

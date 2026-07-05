import React, { useState, useEffect } from "react";
import { ArrowLeft, Clock, GraduationCap, Coins, Milestone, Landmark, ShieldCheck, Sparkles, Search, X, CloudSun, WifiOff, BookOpen, Volume2, Languages, CheckSquare, Square, VolumeX, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CountryInfo } from "../types";
import { useColorScheme } from "../hooks/useColorScheme";
import { getCachedCountryGuides, isAppOffline } from "../utils/offlineCache";
import { InteractiveMap } from "./InteractiveMap";

interface Phrase {
  original: string;
  meaning: string;
  pronunciation: string;
  category: string;
  context: string;
}

const COUNTRY_PHRASES: Record<string, Phrase[]> = {
  uk: [
    {
      original: "Cheers!",
      meaning: "Thank you, goodbye, or toast",
      pronunciation: "cheerz",
      category: "Greeting",
      context: "Used constantly in everyday interactions like buying groceries or stepping off a bus."
    },
    {
      original: "Quid",
      meaning: "One pound (£1 sterling)",
      pronunciation: "kwid",
      category: "Survival",
      context: "Colloquial term for British currency. E.g., 'That coffee was three quid'."
    },
    {
      original: "Uni",
      meaning: "University",
      pronunciation: "yoo-nee",
      category: "Academic",
      context: "Students rarely say 'college'; they almost always refer to university as 'Uni'."
    },
    {
      original: "Fancy a cuppa?",
      meaning: "Would you like a cup of tea?",
      pronunciation: "fan-see uh kup-uh",
      category: "Social",
      context: "The ultimate social invitation and bonding ritual in British culture."
    },
    {
      original: "Fortnight",
      meaning: "Two weeks (fourteen nights)",
      pronunciation: "fort-nyt",
      category: "Survival",
      context: "Frequently used in academic schedules, lease agreements, and job payments."
    },
    {
      original: "Gutted",
      meaning: "Extremely disappointed or devastated",
      pronunciation: "gut-id",
      category: "Social",
      context: "Used when something doesn't go your way, like failing an exam or missing a train."
    }
  ],
  usa: [
    {
      original: "Syllabus",
      meaning: "Course outline and grading policy",
      pronunciation: "sil-uh-buhs",
      category: "Academic",
      context: "Distributed on the first day of class ('Syllabus Week'). Crucial for tracking due dates."
    },
    {
      original: "Dorm",
      meaning: "Student residence / dormitory",
      pronunciation: "dorm",
      category: "Housing",
      context: "On-campus housing buildings where undergraduate students live and socialize."
    },
    {
      original: "TA (Teaching Assistant)",
      meaning: "Graduate student assistant",
      pronunciation: "tee-ay",
      category: "Academic",
      context: "They grade papers and lead discussion sessions. Often easier to reach than professors."
    },
    {
      original: "GPA (Grade Point Average)",
      meaning: "Academic grading scale out of 4.0",
      pronunciation: "jee-pee-ay",
      category: "Academic",
      context: "Your cumulative grade score. Extremely important for internships and graduation."
    },
    {
      original: "Midterm",
      meaning: "Major exam midway through semester",
      pronunciation: "mid-term",
      category: "Academic",
      context: "Expect heavy study loads and library sessions around week 7 or 8."
    },
    {
      original: "For real",
      meaning: "Honestly, seriously, or in agreement",
      pronunciation: "for reel",
      category: "Social",
      context: "Extremely common casual phrase used to confirm truth or express strong agreement."
    }
  ],
  canada: [
    {
      original: "Eh?",
      meaning: "Don't you agree? / Right?",
      pronunciation: "ay",
      category: "Social",
      context: "Classic Canadian tag added to the end of sentences to turn them into questions."
    },
    {
      original: "Loonie & Toonie",
      meaning: "$1 coin (Loonie) and $2 coin (Toonie)",
      pronunciation: "loo-nee & too-nee",
      category: "Survival",
      context: "Named after the common loon bird depicted on the gold-colored $1 coin."
    },
    {
      original: "Toque",
      meaning: "Knit winter cap / beanie",
      pronunciation: "tohk",
      category: "Survival",
      context: "An absolute Canadian necessity for staying warm during sub-zero winters."
    },
    {
      original: "Timmies / Double-Double",
      meaning: "Tim Hortons coffee with 2 creams & 2 sugars",
      pronunciation: "tim-eez / dub-uhl dub-uhl",
      category: "Social",
      context: "Tim Hortons is Canada's iconic coffee chain; 'Double-Double' is the standard order."
    },
    {
      original: "Bonjour & Merci",
      meaning: "Hello and Thank you (French)",
      pronunciation: "bohn-zhoor & mair-see",
      category: "Greeting",
      context: "Canada is bilingual. Even outside Quebec, simple French courtesy is highly appreciated."
    },
    {
      original: "Sublet",
      meaning: "Renting a room from an existing tenant",
      pronunciation: "sub-let",
      category: "Housing",
      context: "Very common for students during summer breaks or co-op work terms."
    }
  ],
  australia: [
    {
      original: "G'day",
      meaning: "Hello / Good day",
      pronunciation: "guh-day",
      category: "Greeting",
      context: "The iconic, ultra-friendly Australian greeting. Perfect for casual conversations."
    },
    {
      original: "Arvo",
      meaning: "Afternoon",
      pronunciation: "ar-voh",
      category: "Survival",
      context: "Australians love abbreviating words. 'See you this arvo' means see you this afternoon."
    },
    {
      original: "No worries",
      meaning: "You're welcome / It's alright",
      pronunciation: "noh wuh-reez",
      category: "Social",
      context: "Reflects the relaxed Aussie attitude. Used in place of 'thank you' or 'no problem'."
    },
    {
      original: "Uni",
      meaning: "University",
      pronunciation: "yoo-nee",
      category: "Academic",
      context: "Just like the UK, university is strictly called 'Uni'."
    },
    {
      original: "Brekkie",
      meaning: "Breakfast",
      pronunciation: "brek-ee",
      category: "Social",
      context: "Australia has a world-famous breakfast and cafe culture. E.g. 'Grab some brekkie'."
    },
    {
      original: "Tuckshop",
      meaning: "School or university food kiosk",
      pronunciation: "tuk-shop",
      category: "Academic",
      context: "A small shop selling snacks and quick lunch items on campus."
    }
  ],
  germany: [
    {
      original: "Guten Tag",
      meaning: "Hello / Good day",
      pronunciation: "goo-ten tahg",
      category: "Greeting",
      context: "A polite, standard greeting used in formal situations and shop entrances."
    },
    {
      original: "Danke schön",
      meaning: "Thank you very much",
      pronunciation: "dahn-keh shoen",
      category: "Greeting",
      context: "The standard way to show gratitude. Respond with 'Bitte schön' (You're welcome)."
    },
    {
      original: "Sprechen Sie Englisch?",
      meaning: "Do you speak English?",
      pronunciation: "shpreh-khen zee eng-lish",
      category: "Survival",
      context: "Ask this politely before starting a conversation in English with locals."
    },
    {
      original: "Wo ist die Universität?",
      meaning: "Where is the university?",
      pronunciation: "voh ist dee oo-nee-vehr-zee-teht",
      category: "Academic",
      context: "Essential question for navigating your new campus city."
    },
    {
      original: "WG (Wohngemeinschaft)",
      meaning: "Shared flat / roommate housing",
      pronunciation: "veh-geh",
      category: "Housing",
      context: "By far the most popular and affordable way for students to live in Germany."
    },
    {
      original: "Mensa",
      meaning: "University student cafeteria",
      pronunciation: "men-sah",
      category: "Academic",
      context: "Offers heavily subsidized, healthy hot meals for registered students."
    },
    {
      original: "Ein Ticket, bitte",
      meaning: "One ticket, please",
      pronunciation: "yn tik-et, bit-teh",
      category: "Transit",
      context: "Helpful when buying train or bus tickets, though most students get a Semesterticket."
    }
  ],
  ireland: [
    {
      original: "Craic",
      meaning: "Fun, gossip, or good times",
      pronunciation: "krak",
      category: "Social",
      context: "An Irish cultural pillar. 'What's the craic?' means 'What's the news / how are you?'"
    },
    {
      original: "Grand",
      meaning: "Fine, okay, or perfectly good",
      pronunciation: "grand",
      category: "Social",
      context: "The most versatile Irish word. 'That's grand' means everything is perfectly fine."
    },
    {
      original: "Slán",
      meaning: "Goodbye",
      pronunciation: "slawn",
      category: "Greeting",
      context: "The traditional Irish language (Gaeilge) farewell. Widely used casually."
    },
    {
      original: "Go raibh maith agat",
      meaning: "Thank you",
      pronunciation: "guh rev mah ag-ut",
      category: "Greeting",
      context: "Traditional Irish phrase for expressing thanks. Pronounced phonetically."
    },
    {
      original: "Cheers",
      meaning: "Thanks or Cheers",
      pronunciation: "cheerz",
      category: "Social",
      context: "Also used as a friendly sign-off or thanking drivers when exiting a bus."
    },
    {
      original: "Yoke",
      meaning: "Any item, gadget, or thing",
      pronunciation: "yohk",
      category: "Survival",
      context: "Used when you can't remember the name of an object. 'Pass me that yoke over there'."
    }
  ]
};

interface CountryMetric {
  tuitionScore: number;
  livingScore: number;
  visaSpeedScore: number;
  visaSuccessScore: number;
  workPermitScore: number;
  tuitionLabel: string;
  livingLabel: string;
  visaSpeedLabel: string;
  visaSuccessLabel: string;
  workPermitLabel: string;
}

const COMPARISON_DATA: Record<string, CountryMetric> = {
  uk: {
    tuitionScore: 40,
    livingScore: 40,
    visaSpeedScore: 85,
    visaSuccessScore: 95,
    workPermitScore: 70,
    tuitionLabel: "£16,000 - £24,000 / Yr",
    livingLabel: "£1,000 - £1,400 / Mo",
    visaSpeedLabel: "15 - 21 Days",
    visaSuccessLabel: "95% Approval",
    workPermitLabel: "2 Years"
  },
  usa: {
    tuitionScore: 20,
    livingScore: 30,
    visaSpeedScore: 75,
    visaSuccessScore: 82,
    workPermitScore: 95,
    tuitionLabel: "$22,000 - $38,000 / Yr",
    livingLabel: "$1,200 - $1,800 / Mo",
    visaSpeedLabel: "20 - 30 Days",
    visaSuccessLabel: "82% Approval",
    workPermitLabel: "Up to 3 Years (STEM OPT)"
  },
  canada: {
    tuitionScore: 60,
    livingScore: 55,
    visaSpeedScore: 50,
    visaSuccessScore: 85,
    workPermitScore: 95,
    tuitionLabel: "CAD 18,000 - 30,000 / Yr",
    livingLabel: "CAD 1,100 - 1,500 / Mo",
    visaSpeedLabel: "45 - 60 Days",
    visaSuccessLabel: "85% Approval",
    workPermitLabel: "Up to 3 Years"
  },
  australia: {
    tuitionScore: 35,
    livingScore: 35,
    visaSpeedScore: 70,
    visaSuccessScore: 90,
    workPermitScore: 90,
    tuitionLabel: "AUD 22,000 - 35,000 / Yr",
    livingLabel: "AUD 1,600 - 2,100 / Mo",
    visaSpeedLabel: "25 - 35 Days",
    visaSuccessLabel: "90% Approval",
    workPermitLabel: "2 - 4 Years"
  },
  germany: {
    tuitionScore: 100,
    livingScore: 70,
    visaSpeedScore: 35,
    visaSuccessScore: 96,
    workPermitScore: 60,
    tuitionLabel: "€0 / Yr (Free Public Uni)",
    livingLabel: "€900 - €1,100 / Mo",
    visaSpeedLabel: "60 - 90 Days",
    visaSuccessLabel: "96% Approval",
    workPermitLabel: "18 Months Stay back"
  },
  ireland: {
    tuitionScore: 50,
    livingScore: 45,
    visaSpeedScore: 65,
    visaSuccessScore: 93,
    workPermitScore: 70,
    tuitionLabel: "€12,000 - €22,000 / Yr",
    livingLabel: "€1,000 - €1,400 / Mo",
    visaSpeedLabel: "30 - 45 Days",
    visaSuccessLabel: "93% Approval",
    workPermitLabel: "2 Years"
  }
};

interface ExploreTabProps {
  selectedCountryId: string | null;
  onClearSelectedCountry: () => void;
  onSelectCountry: (countryId: string) => void;
  onNavigateToEvaluator: () => void;
  onNavigateToChat: () => void;
}

export default function ExploreTab({
  selectedCountryId,
  onClearSelectedCountry,
  onSelectCountry,
  onNavigateToEvaluator,
  onNavigateToChat
}: ExploreTabProps) {
  const [destinations, setDestinations] = useState<CountryInfo[]>(() => getCachedCountryGuides());
  const [offlineActive, setOfflineActive] = useState<boolean>(() => isAppOffline());

  // Interactive Map Shortlist State & Toggle
  const [shortlistedCountryIds, setShortlistedCountryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("wehive_shortlisted_countries");
      return saved ? JSON.parse(saved) : ["germany", "uk"];
    } catch {
      return ["germany", "uk"];
    }
  });

  const handleToggleShortlist = (countryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShortlistedCountryIds(prev => {
      const updated = prev.includes(countryId)
        ? prev.filter(id => id !== countryId)
        : [...prev, countryId];
      try {
        localStorage.setItem("wehive_shortlisted_countries", JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  // Quick Phrases Widget States & Logic
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState<string>("All");
  const [learnedPhrases, setLearnedPhrases] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("wehive_learned_phrases");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [speakingPhrase, setSpeakingPhrase] = useState<string | null>(null);

  const toggleLearned = (countryId: string, phraseText: string) => {
    setLearnedPhrases(prev => {
      const current = prev[countryId] || [];
      const updatedList = current.includes(phraseText)
        ? current.filter(p => p !== phraseText)
        : [...current, phraseText];
      
      const updated = { ...prev, [countryId]: updatedList };
      try {
        localStorage.setItem("wehive_learned_phrases", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const speakPhrase = (text: string, countryCode: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    setSpeakingPhrase(text);

    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice language based on country code
    if (countryCode === "DE") {
      utterance.lang = "de-DE";
    } else if (countryCode === "GB") {
      utterance.lang = "en-GB";
    } else if (countryCode === "AU") {
      utterance.lang = "en-AU";
    } else if (countryCode === "IE") {
      utterance.lang = "en-IE";
    } else if (countryCode === "CA") {
      utterance.lang = "en-CA";
    } else {
      utterance.lang = "en-US";
    }

    utterance.onend = () => {
      setSpeakingPhrase(null);
    };

    utterance.onerror = () => {
      setSpeakingPhrase(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const [showComparison, setShowComparison] = useState(false);
  const [compareA, setCompareA] = useState<string>("uk");
  const [compareB, setCompareB] = useState<string>("usa");
  const [comparisonData, setComparisonData] = useState(COMPARISON_DATA);
  const [countryPhrases, setCountryPhrases] = useState(COUNTRY_PHRASES);

  useEffect(() => {
    setDestinations(getCachedCountryGuides());
    setOfflineActive(isAppOffline());
    fetch("/api/destinations").then(r => r.json()).then(data => {
      if (data.destinations) setDestinations(data.destinations);
      if (data.comparison) setComparisonData(data.comparison);
      if (data.phrases) setCountryPhrases(data.phrases);
    }).catch(() => {});
  }, [selectedCountryId]);

  const [activeCountry, setActiveCountry] = useState<CountryInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("wehive_explore_search_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const addToSearchHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("wehive_explore_search_history", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const removeFromSearchHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== term);
      try {
        localStorage.setItem("wehive_explore_search_history", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const clearAllSearchHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSearchHistory([]);
    try {
      localStorage.removeItem("wehive_explore_search_history");
    } catch (e) {
      console.error(e);
    }
  };

  const { colorScheme, theme } = useColorScheme();

  const [isLoading, setIsLoading] = useState(true);

  // Filter and Sorting state
  const [selectedClimate, setSelectedClimate] = useState<string>("All");
  const [selectedCost, setSelectedCost] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("default");
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Initial mount simulated fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  // Filter and Search simulated refetch to show off the skeleton loaders
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedClimate, selectedCost, sortBy]);

  useEffect(() => {
    if (selectedCountryId) {
      const match = destinations.find((c) => c.id === selectedCountryId);
      if (match) setActiveCountry(match);
    } else {
      setActiveCountry(null);
    }
  }, [selectedCountryId, destinations]);

  const handleCountryClick = (c: CountryInfo) => {
    addToSearchHistory(c.name);
    onSelectCountry(c.id);
  };

  const handleBack = () => {
    onClearSelectedCountry();
  };

  // Filter the destinations based on selected climate and cost of living
  const filteredDestinations = destinations.filter((country) => {
    if (selectedClimate !== "All" && country.climateType !== selectedClimate) {
      return false;
    }
    if (selectedCost !== "All" && country.costOfLivingLevel !== selectedCost) {
      return false;
    }
    return true;
  });

  // Fuzzy search algorithm with score calculations on filtered destinations
  let processedResults = filteredDestinations.map((country) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return {
        country,
        score: 0,
        matchedUniversities: [] as string[],
        matchedCourses: [] as string[],
        matchedFields: [] as string[]
      };
    }

    let score = 0;
    const matchedUniversities: string[] = [];
    const matchedCourses: string[] = [];
    const matchedFields: string[] = [];

    // Match country name
    if (country.name.toLowerCase().includes(query)) {
      score += 10;
      matchedFields.push("Country Name");
    }

    // Match description
    if (country.description.toLowerCase().includes(query)) {
      score += 2;
      matchedFields.push("Overview");
    }

    // Match universities
    country.universities.forEach((uni) => {
      if (uni.toLowerCase().includes(query)) {
        score += 5;
        matchedUniversities.push(uni);
      }
    });

    // Match courses
    country.popularCourses.forEach((course) => {
      if (course.toLowerCase().includes(query)) {
        score += 5;
        matchedCourses.push(course);
      }
    });

    // Match visaType
    if (country.visaType.toLowerCase().includes(query)) {
      score += 3;
      matchedFields.push("Visa Type");
    }

    return {
      country,
      score,
      matchedUniversities,
      matchedCourses,
      matchedFields
    };
  }).filter(result => searchQuery.trim() === "" || result.score > 0);

  // Apply sorting
  if (sortBy === "name") {
    processedResults.sort((a, b) => a.country.name.localeCompare(b.country.name));
  } else if (sortBy === "climate") {
    processedResults.sort((a, b) => a.country.climateType.localeCompare(b.country.climateType));
  } else if (sortBy === "cost_low_high") {
    const costWeight = { "Low": 1, "Moderate": 2, "High": 3 };
    processedResults.sort((a, b) => costWeight[a.country.costOfLivingLevel] - costWeight[b.country.costOfLivingLevel]);
  } else if (sortBy === "cost_high_low") {
    const costWeight = { "Low": 1, "Moderate": 2, "High": 3 };
    processedResults.sort((a, b) => costWeight[b.country.costOfLivingLevel] - costWeight[a.country.costOfLivingLevel]);
  } else {
    // Default: Sort by search relevance score if query is present, otherwise preserve order
    if (searchQuery.trim() !== "") {
      processedResults.sort((a, b) => b.score - a.score);
    }
  }

  const searchResults = processedResults;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 animate-fade-in h-full">
      <div className="flex-1 overflow-y-auto pb-12 flex flex-col">
        {/* Title / Header with integrated search bar */}
      <div className={`${theme.primaryBg} px-5 pt-8 pb-6 rounded-b-[24px] shadow-sm text-white relative overflow-visible z-30 transition-colors duration-500`}>
        {/* WeHive small brand tag */}
        <div className="flex items-center justify-between mb-2.5 opacity-90">
          <div className="flex items-center gap-1.5">
            <div className={`w-4.5 h-4.5 rounded flex items-center justify-center font-bold text-white text-[10px] shadow transition-colors duration-500 ${theme.accentBg}`}>W</div>
            <span className="text-[10px] font-bold tracking-wider text-blue-100">WEHIVE BRAND PARTNERS</span>
          </div>
          {offlineActive && (
            <span className="text-[8px] bg-amber-500/25 text-amber-300 font-mono font-bold border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1.5 animate-pulse shadow-sm shadow-amber-950/20">
              <WifiOff className="w-3 h-3 text-amber-400" />
              OFFLINE CACHED
            </span>
          )}
        </div>
        <h1 className="text-xl font-black">Explore Destinations</h1>
        <p className={`text-xs ${colorScheme === "forced-navy" ? "text-blue-300" : "text-red-300"} mt-1 transition-colors duration-500`}>
          Select WeHive global partner countries to view visa pathways
        </p>

        {/* Global Search Bar with Local Search History Dropdown */}
        <div className="mt-4 relative z-40">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-300" />
          </div>
          <input
            type="text"
            placeholder="Search country, university or program..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addToSearchHistory(searchQuery);
                setIsSearchFocused(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full pl-9 pr-9 py-2 bg-white/15 hover:bg-white/20 focus:bg-white text-xs text-slate-100 focus:text-slate-900 placeholder-slate-300 focus:placeholder-slate-400 rounded-xl border border-white/10 focus:border-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearchFocused(true);
              }}
              className="absolute inset-y-0 right-3 flex items-center justify-center text-slate-300 hover:text-slate-100 focus:text-slate-900 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Local Search History Dropdown Overlay */}
          <AnimatePresence>
            {isSearchFocused && searchHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-[18px] shadow-2xl z-50 overflow-hidden divide-y divide-slate-100"
              >
                <div className="px-3.5 py-2.5 bg-slate-50 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">
                    Recent Searches
                  </span>
                  <button
                    onMouseDown={(e) => clearAllSearchHistory(e)}
                    className="text-[9px] font-black text-slate-400 hover:text-red-600 transition-colors cursor-pointer font-mono uppercase"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                  {searchHistory.map((item, idx) => (
                    <div
                      key={idx}
                      onMouseDown={() => {
                        setSearchQuery(item);
                        addToSearchHistory(item);
                        setIsSearchFocused(false);
                      }}
                      className="px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {item}
                        </span>
                      </div>
                      <button
                        onMouseDown={(e) => removeFromSearchHistory(item, e)}
                        className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Filters and sorting panel */}
      <div className="bg-white px-5 py-3.5 border-b border-slate-200/50 shadow-xs flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-colors bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-xl cursor-pointer"
          >
            <CloudSun className="w-3.5 h-3.5 text-sky-500" />
            <span>Refine & Sort</span>
            <span className="w-4.5 h-4.5 rounded-full bg-slate-200 text-[8px] flex items-center justify-center font-bold text-slate-700 font-mono">
              {(selectedClimate !== "All" ? 1 : 0) + (selectedCost !== "All" ? 1 : 0) + (sortBy !== "default" ? 1 : 0)}
            </span>
          </button>

          {/* Reset Filters Option if active */}
          {(selectedClimate !== "All" || selectedCost !== "All" || sortBy !== "default") && (
            <button
              onClick={() => {
                setSelectedClimate("All");
                setSelectedCost("All");
                setSortBy("default");
              }}
              className="text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer font-mono"
            >
              <X className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>

        {/* Expandable filter sections */}
        <div className={`grid grid-cols-1 gap-3 pt-1 transition-all duration-300 ${showFilters ? "block" : "hidden"}`}>
          {/* Climate Filter */}
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 font-mono">
              <CloudSun className="w-3 h-3 text-sky-500" /> Climate Environment
            </span>
            <div className="flex flex-wrap gap-1">
              {["All", "Cold", "Temperate", "Tropical", "Diverse"].map((climate) => (
                <button
                  key={climate}
                  onClick={() => setSelectedClimate(climate)}
                  className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    selectedClimate === climate
                      ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                  }`}
                >
                  {climate === "All" ? "☀️ Any Climate" : climate === "Cold" ? "❄️ Cold" : climate === "Temperate" ? "⛅ Temperate" : climate === "Tropical" ? "🌴 Tropical" : "🗺️ Diverse"}
                </button>
              ))}
            </div>
          </div>

          {/* Cost of Living Filter */}
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 font-mono">
              <Coins className="w-3 h-3 text-emerald-500" /> Cost of Living
            </span>
            <div className="flex flex-wrap gap-1">
              {["All", "Low", "Moderate", "High"].map((cost) => (
                <button
                  key={cost}
                  onClick={() => setSelectedCost(cost)}
                  className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    selectedCost === cost
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                  }`}
                >
                  {cost === "All" ? "💰 Any Cost" : cost === "Low" ? "📉 Low" : cost === "Moderate" ? "📊 Moderate" : "📈 High"}
                </button>
              ))}
            </div>
          </div>

          {/* Sorting Option */}
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 font-mono">
              🔄 Sort Destinations By
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "default", label: "🔍 Best Match" },
                { id: "name", label: "🔤 Name (A-Z)" },
                { id: "climate", label: "⛅ Climate Type" },
                { id: "cost_low_high", label: "💵 Cost: Low to High" },
                { id: "cost_high_low", label: "💰 Cost: High to Low" }
              ].map((sortOption) => (
                <button
                  key={sortOption.id}
                  onClick={() => setSortBy(sortOption.id)}
                  className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    sortBy === sortOption.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                  }`}
                >
                  {sortOption.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Side-by-Side Comparison Tool */}
        <div className="bg-white rounded-[24px] border border-slate-200/50 p-4.5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${colorScheme === "forced-navy" ? "bg-blue-100 text-blue-600" : "bg-red-50 text-red-600"} flex items-center justify-center shrink-0 shadow-xs`}>
                <Milestone className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800">Side-by-Side Comparison</h3>
                <p className="text-[10px] text-slate-400 font-medium">Select any two destinations and compare index metrics</p>
              </div>
            </div>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs shrink-0 ${
                showComparison
                  ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  : `${theme.accentBg} text-white`
              }`}
            >
              {showComparison ? "Hide Comparison" : "Compare Countries"}
            </button>
          </div>

          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden space-y-4 pt-4.5 border-t border-slate-100"
              >
                {/* Country Dropdowns */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block font-mono">Compare Country A</label>
                    <select
                      value={compareA}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompareA(val);
                        if (val === compareB) {
                          const nextOpt = Object.keys(comparisonData).find((k) => k !== val) || "usa";
                          setCompareB(nextOpt);
                        }
                      }}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      {destinations.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block font-mono">With Country B</label>
                    <select
                      value={compareB}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompareB(val);
                        if (val === compareA) {
                          const nextOpt = Object.keys(comparisonData).find((k) => k !== val) || "uk";
                          setCompareA(nextOpt);
                        }
                      }}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      {destinations.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {compareA === compareB ? (
                  <div className="text-center p-4 text-[11px] text-amber-700 bg-amber-50 border border-amber-100/60 rounded-xl font-mono font-medium">
                    ⚠️ Please select two different countries to compare.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Radar Chart Container */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3.5 flex flex-col items-center">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono mb-2.5">Academic & Visa Index Balance</span>
                      <div className="w-full h-60 min-h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={[
                            {
                              subject: "Tuition Affordability",
                              A: comparisonData[compareA]?.tuitionScore || 50,
                              B: comparisonData[compareB]?.tuitionScore || 50
                            },
                            {
                              subject: "Living Affordability",
                              A: comparisonData[compareA]?.livingScore || 50,
                              B: comparisonData[compareB]?.livingScore || 50
                            },
                            {
                              subject: "Visa Speed",
                              A: comparisonData[compareA]?.visaSpeedScore || 50,
                              B: comparisonData[compareB]?.visaSpeedScore || 50
                            },
                            {
                              subject: "Visa Success",
                              A: comparisonData[compareA]?.visaSuccessScore || 50,
                              B: comparisonData[compareB]?.visaSuccessScore || 50
                            },
                            {
                              subject: "Post-Study Stay",
                              A: comparisonData[compareA]?.workPermitScore || 50,
                              B: comparisonData[compareB]?.workPermitScore || 50
                            }
                          ]}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 8, fontWeight: 700 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 7 }} />
                            <Radar
                              name={destinations.find(c => c.id === compareA)?.name || "Country A"}
                              dataKey="A"
                              stroke={colorScheme === "forced-navy" ? "#2563eb" : "#dc2626"}
                              fill={colorScheme === "forced-navy" ? "#3b82f6" : "#ef4444"}
                              fillOpacity={0.3}
                            />
                            <Radar
                              name={destinations.find(c => c.id === compareB)?.name || "Country B"}
                              dataKey="B"
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.3}
                            />
                            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[8px] text-slate-400 font-mono text-center mt-2 px-3 leading-relaxed">
                        *Values are relative index scores where higher is more favorable (e.g. higher affordability = lower actual costs; higher visa speed = faster processing time).
                      </p>
                    </div>

                    {/* Comparison Metrics Table */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-xs">
                      <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 p-2.5 text-[9px] font-black uppercase text-slate-400 font-mono tracking-wider">
                        <div>Metric Index</div>
                        <div className="text-center truncate font-bold text-slate-700">{destinations.find(c => c.id === compareA)?.flag} {destinations.find(c => c.id === compareA)?.name}</div>
                        <div className="text-center truncate font-bold text-slate-700">{destinations.find(c => c.id === compareB)?.flag} {destinations.find(c => c.id === compareB)?.name}</div>
                      </div>

                      <div className="divide-y divide-slate-100 text-[10px]">
                        {/* Tuition */}
                        <div className="grid grid-cols-3 p-2.5 items-center hover:bg-slate-50/40">
                          <div className="font-bold text-slate-500">Tuition Expenses</div>
                          <div className="text-center font-mono text-slate-700 font-medium">{comparisonData[compareA]?.tuitionLabel}</div>
                          <div className="text-center font-mono text-slate-700 font-medium">{comparisonData[compareB]?.tuitionLabel}</div>
                        </div>

                        {/* Living Cost */}
                        <div className="grid grid-cols-3 p-2.5 items-center hover:bg-slate-50/40">
                          <div className="font-bold text-slate-500">Living Cost</div>
                          <div className="text-center font-mono text-slate-700 font-medium">{comparisonData[compareA]?.livingLabel}</div>
                          <div className="text-center font-mono text-slate-700 font-medium">{comparisonData[compareB]?.livingLabel}</div>
                        </div>

                        {/* Visa Speed */}
                        <div className="grid grid-cols-3 p-2.5 items-center hover:bg-slate-50/40">
                          <div className="font-bold text-slate-500">Visa Processing</div>
                          <div className="text-center font-mono text-slate-700 font-medium">{comparisonData[compareA]?.visaSpeedLabel}</div>
                          <div className="text-center font-mono text-slate-700 font-medium">{comparisonData[compareB]?.visaSpeedLabel}</div>
                        </div>

                        {/* Visa Success */}
                        <div className="grid grid-cols-3 p-2.5 items-center hover:bg-slate-50/40">
                          <div className="font-bold text-slate-500">Visa Success</div>
                          <div className="text-center font-bold text-emerald-600 font-mono">{comparisonData[compareA]?.visaSuccessLabel}</div>
                          <div className="text-center font-bold text-emerald-600 font-mono">{comparisonData[compareB]?.visaSuccessLabel}</div>
                        </div>

                        {/* Stay Duration */}
                        <div className="grid grid-cols-3 p-2.5 items-center hover:bg-slate-50/40">
                          <div className="font-bold text-slate-500">Stay Duration</div>
                          <div className="text-center text-slate-700 font-bold">{comparisonData[compareA]?.workPermitLabel}</div>
                          <div className="text-center text-slate-700 font-bold">{comparisonData[compareB]?.workPermitLabel}</div>
                        </div>
                      </div>
                    </div>

                    {/* Summary insights block */}
                    <div className={`p-3 rounded-2xl border text-[10px] leading-relaxed ${
                      colorScheme === "forced-navy" ? "bg-blue-50/30 border-blue-100/50 text-blue-900/80" : "bg-red-50/30 border-red-100/50 text-red-900/80"
                    }`}>
                      <span className="font-black">📊 Index Comparison:</span> 
                      {` Comparing `}<strong>{destinations.find(c => c.id === compareA)?.name}</strong>{` and `}<strong>{destinations.find(c => c.id === compareB)?.name}</strong>{` reveals `}<strong>
                        {comparisonData[compareA].tuitionScore > comparisonData[compareB].tuitionScore ? destinations.find(c => c.id === compareA)?.name : destinations.find(c => c.id === compareB)?.name}
                      </strong>{` is more budget-friendly for tuition fees, whereas `}<strong>
                        {comparisonData[compareA].workPermitScore > comparisonData[compareB].workPermitScore ? destinations.find(c => c.id === compareA)?.name : destinations.find(c => c.id === compareB)?.name}
                      </strong>{` offers a longer post-study work allowance.`}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Interactive World Map & Pin Visualizer */}
        <div className="mb-2">
          <InteractiveMap
            destinations={destinations}
            activeCountry={activeCountry || destinations[0]}
            shortlistedIds={shortlistedCountryIds}
            onToggleShortlist={handleToggleShortlist}
            onSelectCountry={handleCountryClick}
          />
        </div>

        {(searchQuery.trim() !== "" || selectedClimate !== "All" || selectedCost !== "All") && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono">
              Destinations Found ({searchResults.length})
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedClimate("All");
                setSelectedCost("All");
                setSortBy("default");
              }}
              className={`text-[9px] font-bold underline cursor-pointer hover:opacity-80 transition-opacity ${theme.accentText}`}
            >
              Reset all filters
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4" id="explore-skeleton-loader">
            {[1, 2].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/50 shadow-xs overflow-hidden flex flex-col animate-pulse"
              >
                {/* Simulated Minimal Banner */}
                <div className="h-28 bg-slate-200/80 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-300/40 via-slate-200/10 to-transparent" />
                  <div className="absolute bottom-3.5 left-3.5 flex items-center gap-2">
                    {/* Simulated Flag */}
                    <div className="w-6 h-6 rounded-full bg-slate-300/85" />
                    {/* Simulated Name */}
                    <div className="h-4.5 w-28 bg-slate-300/85 rounded-lg" />
                  </div>
                </div>

                {/* Simulated Bottom brief info */}
                <div className="p-3 pb-1.5 flex justify-between items-center">
                  <div className="h-3 w-28 bg-slate-200/70 rounded-md" />
                  <div className="h-4.5 w-16 bg-slate-200/70 rounded-md" />
                </div>

                {/* Simulated Climate & Cost badges */}
                <div className="px-3 pb-3 pt-0 flex gap-1.5 flex-wrap">
                  <div className="h-5 w-28 bg-slate-100 rounded-md" />
                  <div className="h-5 w-32 bg-slate-100 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : searchResults.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-100">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">No Destinations Found</h3>
              <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto mt-1 leading-relaxed">
                We couldn't find any matches for your selected search or filters. Try adjusting your climate or cost settings.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedClimate("All");
                setSelectedCost("All");
                setSortBy("default");
              }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-colors mx-auto block ${theme.accentBg}`}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          searchResults.map((result) => {
            const c = result.country;
            return (
              <div
                key={c.id}
                onClick={() => handleCountryClick(c)}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden flex flex-col hover:border-blue-900 transition-all hover:scale-[1.01] cursor-pointer"
              >
                {/* Minimal Banner */}
                <div className="h-28 relative">
                  <img
                    src={c.banner}
                    alt={c.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {/* Bookmark Button Overlay */}
                  <button
                    onClick={(e) => handleToggleShortlist(c.id, e)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 transition-all text-white cursor-pointer group/bookmark z-10"
                    title={shortlistedCountryIds.includes(c.id) ? "Remove from shortlist" : "Add to shortlist"}
                  >
                    <Star className={`w-3.5 h-3.5 ${shortlistedCountryIds.includes(c.id) ? "fill-emerald-400 text-emerald-400" : "text-white/80 group-hover/bookmark:text-white"}`} />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl filter drop-shadow-sm">{c.flag}</span>
                      <h3 className="text-sm font-black text-white">{c.name}</h3>
                    </div>
                  </div>
                </div>

                {/* Bottom brief info */}
                <div className="p-3 pb-1.5 bg-white flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span className="truncate max-w-[150px]">{c.visaType}</span>
                  <span className={`px-2 py-0.5 rounded border ${
                    colorScheme === "forced-navy" 
                      ? "bg-blue-50 text-blue-900 border-blue-100" 
                      : colorScheme === "forced-red"
                      ? "bg-stone-100 text-stone-800 border-stone-200"
                      : "bg-blue-50 text-blue-900 border-blue-100"
                  }`}>
                    {c.workPermit.split(" (")[0]}
                  </span>
                </div>

                {/* Climate & Cost of Living meta-badges */}
                <div className="px-3 pb-3 pt-0 bg-white flex gap-1.5 flex-wrap">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 flex items-center gap-1">
                    ⛅ {c.climateType} Climate
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                    c.costOfLivingLevel === "Low"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : c.costOfLivingLevel === "Moderate"
                      ? "bg-amber-50 text-amber-700 border-amber-100"
                      : "bg-rose-50 text-rose-700 border-rose-100"
                  }`}>
                    💰 {c.costOfLivingLevel} Cost of Living
                  </span>
                </div>

                {/* Matching search elements if any */}
                {(result.matchedUniversities.length > 0 || result.matchedCourses.length > 0) && (
                  <div className="p-3 bg-slate-50/80 border-t border-slate-100/60 space-y-2.5">
                    {result.matchedUniversities.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block font-mono">Matched Universities:</span>
                        <div className="flex flex-wrap gap-1">
                          {result.matchedUniversities.map((uni, uIdx) => (
                            <span key={uIdx} className={`text-[9px] font-bold px-2 py-0.5 rounded-md border bg-white ${
                              colorScheme === "forced-navy" ? "text-blue-600 border-blue-100" : "text-red-600 border-red-100"
                            }`}>
                              🏫 {uni}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.matchedCourses.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block font-mono">Matched Programs:</span>
                        <div className="flex flex-wrap gap-1">
                          {result.matchedCourses.map((course, cIdx) => (
                            <span key={cIdx} className="text-[9px] font-bold px-2 py-0.5 rounded-md border bg-white text-slate-700 border-slate-200">
                              🎓 {course}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      </div>

      {/* Overlay Modal with AnimatePresence */}
      <AnimatePresence>
        {activeCountry && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4" id="country-overlay-modal">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleBack}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85%] border border-slate-100 relative z-10"
            >
              {/* Banner / Header */}
              <div className="relative h-36 shrink-0">
                <img
                  src={activeCountry.banner}
                  alt={activeCountry.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl filter drop-shadow-md">{activeCountry.flag}</span>
                    <div>
                      <h2 className="text-md font-black text-white leading-tight">{activeCountry.name}</h2>
                      <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider block">WeHive Partner Destination</span>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleBack}
                  className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white cursor-pointer transition-colors z-20"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scrollable details */}
              <div className="p-4 space-y-4 overflow-y-auto flex-1 text-slate-700">
                {/* Overview Description */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block font-mono">About {activeCountry.name}</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{activeCountry.description}</p>
                </div>

                {/* Climate Info Card (Requested) */}
                <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-800">
                    <CloudSun className="w-4 h-4 text-sky-500 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Climate & Living Conditions</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    {activeCountry.climate}
                  </p>
                </div>

                {/* Cost of Living Info Card (Requested) */}
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <Coins className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Estimated Cost of Living</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    {activeCountry.livingCost}
                  </p>
                </div>

                {/* Top Partner Universities (Requested) */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Landmark className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Top Partner Universities</span>
                  </div>
                  <div className="space-y-1.5 pl-0.5">
                    {activeCountry.universities.map((uni, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 font-medium leading-tight">
                        <span className="text-indigo-500 font-black">✓</span>
                        <span>{uni}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Academic Details (Visa, Intakes, Careers) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-slate-100 p-2.5 rounded-lg">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Visa Type</span>
                    <span className="text-[10px] font-bold text-slate-700 leading-tight block mt-0.5">{activeCountry.visaType}</span>
                  </div>
                  <div className="bg-white border border-slate-100 p-2.5 rounded-lg">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Post-Study Work</span>
                    <span className="text-[10px] font-bold text-slate-700 leading-tight block mt-0.5">{activeCountry.workPermit.split(" (")[0]}</span>
                  </div>
                  <div className="bg-white border border-slate-100 p-2.5 rounded-lg col-span-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Main Admissions Intakes</span>
                    <span className="text-[10px] font-bold text-slate-700 leading-tight block mt-0.5">{activeCountry.intakes}</span>
                  </div>
                </div>

                {/* Popular High-Salary Courses */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block font-mono">In-Demand Careers</span>
                  <div className="flex flex-wrap gap-1">
                    {activeCountry.popularCourses.map((c, idx) => (
                      <span key={idx} className="bg-slate-50 text-slate-700 text-[9px] font-bold px-2 py-1 rounded-md border border-slate-100">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Phrases Widget */}
                {(() => {
                  const phrases = countryPhrases[activeCountry.id] || [];
                  if (phrases.length === 0) return null;

                  const phraseCategories = ["All", ...Array.from(new Set(phrases.map(p => p.category)))];
                  const filteredPhrases = selectedPhraseCategory === "All"
                    ? phrases
                    : phrases.filter(p => p.category === selectedPhraseCategory);

                  const learnedForCountry = learnedPhrases[activeCountry.id] || [];
                  const progressPercent = phrases.length > 0
                    ? Math.round((learnedForCountry.length / phrases.length) * 100)
                    : 0;

                  return (
                    <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800/60 pt-4.5" id="quick-phrases-widget">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Languages className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">Quick Phrases & Slang</span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30 font-mono">
                          {phrases.length} Essential Phrases
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                        Familiarize yourself with crucial vocabulary, student terminology, and pronunciation to help prep for your move!
                      </p>

                      {/* Progress Tracker */}
                      <div className="bg-slate-50/70 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl space-y-1.5 shadow-2xs">
                        <div className="flex justify-between items-center text-[9px] font-bold">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            🎓 Mastery Level
                          </span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            {learnedForCountry.length} of {phrases.length} learned ({progressPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Category Horizontal Filter Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                        {phraseCategories.map((cat) => {
                          const isActive = selectedPhraseCategory === cat;
                          return (
                            <button
                              key={cat}
                              onClick={() => setSelectedPhraseCategory(cat)}
                              className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border shrink-0 transition-all cursor-pointer ${
                                isActive
                                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                  : "bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>

                      {/* Phrase Cards List */}
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {filteredPhrases.map((phrase, pIdx) => {
                          const isLearned = learnedForCountry.includes(phrase.original);
                          const isSpeaking = speakingPhrase === phrase.original;

                          return (
                            <div 
                              key={pIdx}
                              className={`p-3 rounded-xl border transition-all ${
                                isLearned 
                                  ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/20"
                                  : "bg-slate-50/50 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700/60"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{phrase.original}</span>
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                                      {phrase.category}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 italic block">
                                    Pronunciation: <strong className="text-slate-500 dark:text-slate-400 font-semibold font-mono">[{phrase.pronunciation}]</strong>
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Listen button */}
                                  <button
                                    onClick={() => speakPhrase(phrase.original, activeCountry.code)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isSpeaking
                                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                                    title="Listen Pronunciation"
                                  >
                                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? "scale-110" : ""}`} />
                                  </button>

                                  {/* Learned checkbox */}
                                  <button
                                    onClick={() => toggleLearned(activeCountry.id, phrase.original)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isLearned
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-500"
                                    }`}
                                    title={isLearned ? "Mark as Unlearned" : "Mark as Learned"}
                                  >
                                    {isLearned ? (
                                      <CheckSquare className="w-3.5 h-3.5" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 font-semibold">
                                {phrase.meaning}
                              </p>

                              {phrase.context && (
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 bg-slate-50/80 dark:bg-slate-900/30 p-1.5 rounded-lg border border-slate-100/50 dark:border-slate-800/40 italic leading-relaxed">
                                  💡 {phrase.context}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    onNavigateToEvaluator();
                    handleBack();
                  }}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-800 font-bold text-[10px] py-2.5 rounded-xl border border-slate-200 text-center shadow-xs cursor-pointer transition-colors"
                >
                  Assess Eligibility
                </button>
                <button
                  onClick={() => {
                    onNavigateToChat();
                    handleBack();
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-2.5 rounded-xl text-center shadow-xs cursor-pointer transition-colors"
                >
                  Consult AI Guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

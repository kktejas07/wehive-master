import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import {
  GraduationCap, Globe2, Clock, Award, Users, Star,
  Search, ChevronDown, ChevronUp, X, Check,
  BookOpen, DollarSign, Calendar, MapPin, ArrowRight,
  Filter, Loader2, TrendingUp, Shield, Zap,
  Atom, Cog, Briefcase, Heart, Scale, Palette, BookMarked,
  LayoutGrid, List, Table2, BarChart3, ArrowUpDown,
  TrendingDown, Minus, ChevronRight, Crown, Target,
  Calculator, Sparkles, SlidersHorizontal, Bookmark,
  Share2, Copy, Trash2, ExternalLink, FileText,
  Square, CheckSquare,
} from 'lucide-react';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { inr } from '../lib/utils';
import MultiUniversityApplyModal from '../components/MultiUniversityApplyModal';

const COURSE_CATEGORIES = [
  { id: 'stem', label: 'STEM', icon: Atom },
  { id: 'engineering', label: 'Engineering', icon: Cog },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'medicine', label: 'Medicine', icon: Heart },
  { id: 'law', label: 'Law', icon: Scale },
  { id: 'arts', label: 'Arts', icon: Palette },
  { id: 'social', label: 'Social Sciences', icon: BookMarked },
];

const COURSE_ID_TO_NAME = {
  stem: 'STEM',
  engineering: 'Engineering',
  business: 'Business',
  medicine: 'Medicine',
  law: 'Law',
  arts: 'Arts',
  social: 'Social Sciences',
};

function getDisplayCourses(popularCourses = []) {
  return (popularCourses || []).map(c => COURSE_ID_TO_NAME[c] || c);
}

function safeEmploymentRate(uni) {
  return uni?.就业率 || uni?.employment_rate || 'N/A';
}

function safeAvgSalary(uni) {
  const val = uni?.avg_salary_usd;
  if (val == null || val === '') return 'N/A';
  return `$${Number(val).toLocaleString()}`;
}

function safeScholarships(uni) {
  return !!(uni?.scholarships || uni?.[' scholarships']);
}


const STUDENT_COUNTRIES = [
  { id: 'us', name: 'United States', flag: '🇺🇸' },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧' },
  { id: 'de', name: 'Germany', flag: '🇩🇪' },
  { id: 'it', name: 'Italy', flag: '🇮🇹' },
  { id: 'es', name: 'Spain', flag: '🇪🇸' },
  { id: 'pl', name: 'Poland', flag: '🇵🇱' },
  { id: 'at', name: 'Austria', flag: '🇦🇹' },
  { id: 'pt', name: 'Portugal', flag: '🇵🇹' },
  { id: 'gr', name: 'Greece', flag: '🇬🇷' },
  { id: 'hr', name: 'Croatia', flag: '🇭🇷' },
];

function UniversityCard({ uni, onCompare, isComparing, isSaved, onSave, isSelected, onToggleSelect }) {
  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden group transition-all duration-300 bg-white border flex flex-col h-full min-h-[420px]",
      isSelected
        ? "border-[hsl(var(--blue-700))] shadow-xl shadow-[hsl(var(--blue-700))]/10"
        : "border-black/5 hover:shadow-xl hover:shadow-[hsl(var(--blue-700))]/10 hover:border-[hsl(var(--blue-700))]/20"
    )}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] opacity-0 group-hover:opacity-100 transition-opacity" />
      <button
        onClick={() => onToggleSelect(uni)}
        className={cn(
          "absolute top-4 left-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all",
          isSelected ? "bg-[hsl(var(--blue-700))] text-white" : "bg-white/80 text-[hsl(var(--blue-900))]/40 hover:bg-[hsl(var(--blue-50))] hover:text-[hsl(var(--blue-700))]"
        )}
        title={isSelected ? "Deselect" : "Select for application"}
      >
        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
      </button>
      <button
        onClick={() => onSave(uni)}
        className={cn(
          "absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all",
          isSaved ? "bg-emerald-500 text-white" : "bg-white/80 text-[hsl(var(--blue-900))]/40 hover:bg-emerald-50 hover:text-emerald-600"
        )}
        title={isSaved ? "Remove from shortlist" : "Add to shortlist"}
      >
        <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
      </button>

      <div className="relative z-10 p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-2xl shadow-lg shadow-[hsl(var(--blue-700))]/20 shrink-0">
              {uni.flag}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[hsl(var(--blue-900))] truncate">{uni.short_name}</h3>
              <p className="text-[13px] text-[hsl(var(--blue-900))]/60 truncate">{uni.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] text-white text-[11px] font-bold shadow">
              #{uni.rank}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Badge className="bg-gradient-to-r from-[hsl(var(--blue-100))] to-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] text-[11px] border-0 shrink-0">
            {uni.type}
          </Badge>
          <Badge className={safeScholarships(uni) ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 text-[11px] border-0 shrink-0' : 'bg-gray-100 text-gray-600 text-[11px] border-0 shrink-0'}>
            {safeScholarships(uni) ? 'Scholarships' : 'No scholarships'}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--accent))]/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-[hsl(var(--accent))]" />
            </div>
            <div className="min-w-0">
              <span className="text-[hsl(var(--blue-900))]/50 text-[11px] block">Tuition</span>
              <span className="font-bold text-[hsl(var(--blue-900))] block truncate">
                {uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--blue-100))] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[hsl(var(--blue-700))]" />
            </div>
            <div className="min-w-0">
              <span className="text-[hsl(var(--blue-900))]/50 text-[11px] block">Intl Students</span>
              <span className="font-bold text-[hsl(var(--blue-900))] block truncate">{uni.intl_students?.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--blue-100))] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-[hsl(var(--blue-700))]" />
            </div>
            <div className="min-w-0">
              <span className="text-[hsl(var(--blue-900))]/50 text-[11px] block">IELTS</span>
              <span className="font-bold text-[hsl(var(--blue-900))] block">{uni.ielts_min}+</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[hsl(var(--blue-900))]/50 text-[11px] block">Employment</span>
              <span className="font-bold text-[hsl(var(--blue-900))] block">{safeEmploymentRate(uni)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {getDisplayCourses(uni.popular_courses || []).slice(0, 3).map((course) => (
            <span
              key={course}
              className="text-[11px] px-3 py-1 rounded-full bg-white border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] shrink-0"
            >
              {course}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-4"></div>
      </div>

      <div className="relative z-10 px-6 py-4 bg-gradient-to-r from-[hsl(var(--soft-bg))] to-white flex items-center gap-2 border-t border-black/5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "flex-1 rounded-xl transition-all duration-300",
            isComparing
              ? "border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-700))] text-white"
              : "border-black/10 hover:border-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-50))]"
          )}
          onClick={() => onCompare(uni)}
        >
          {isComparing ? <Check className="w-4 h-4 mr-1" /> : null}
          {isComparing ? 'Added' : 'Compare'}
        </Button>
        <Link
          to={`/university/${uni.id}`}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl btn-primary text-white h-10 text-[13px] font-bold shadow-lg shadow-[hsl(var(--blue-700))]/20"
        >
          View <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function UniversityListItem({ uni, onCompare, isComparing, isSaved, onSave, isSelected, onToggleSelect }) {
  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden bg-white border transition-all duration-300 min-h-[140px]",
      isSelected ? "border-[hsl(var(--blue-700))] shadow-lg shadow-[hsl(var(--blue-700))]/10" : "border-black/5 hover:border-[hsl(var(--blue-700))]/20"
    )}>
      <button
        onClick={() => onToggleSelect(uni)}
        className={cn(
          "absolute top-4 left-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all",
          isSelected ? "bg-[hsl(var(--blue-700))] text-white" : "bg-white/80 text-[hsl(var(--blue-900))]/40 hover:bg-[hsl(var(--blue-50))] hover:text-[hsl(var(--blue-700))]"
        )}
        title={isSelected ? "Deselect" : "Select for application"}
      >
        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
      </button>
      <button
        onClick={() => onSave(uni)}
        className={cn(
          "absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all",
          isSaved ? "bg-emerald-500 text-white" : "bg-white/80 text-[hsl(var(--blue-900))]/40 hover:bg-emerald-50 hover:text-emerald-600"
        )}
        title={isSaved ? "Remove from shortlist" : "Add to shortlist"}
      >
        <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
      </button>
      <div className="flex items-stretch h-full">
        <div className="w-24 sm:w-32 bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex flex-col items-center justify-center p-4 text-white shrink-0">
          <div className="text-3xl mb-1">{uni.flag}</div>
          <div className="text-[10px] font-bold text-white/70">#{uni.rank}</div>
        </div>

        <div className="flex-1 p-4 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0">
              <h3 className="font-bold text-[hsl(var(--blue-900))] text-[16px] truncate">{uni.short_name}</h3>
              <p className="text-[12px] text-[hsl(var(--blue-900))]/60 truncate">{uni.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] text-[10px] border-0">{uni.type}</Badge>
              {safeScholarships(uni) && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">Scholarship</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-auto">
            <div className="p-3 rounded-xl bg-[hsl(var(--soft-bg))]">
              <div className="text-[10px] text-[hsl(var(--blue-900))]/50 mb-1">Tuition</div>
              <div className="text-[14px] font-bold text-[hsl(var(--blue-900))] truncate">
                {uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[hsl(var(--soft-bg))]">
              <div className="text-[10px] text-[hsl(var(--blue-900))]/50 mb-1">IELTS</div>
              <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{uni.ielts_min}+</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50">
              <div className="text-[10px] text-emerald-600/70 mb-1">Employment</div>
              <div className="text-[14px] font-bold text-emerald-600">{safeEmploymentRate(uni)}</div>
            </div>
            <div className="p-3 rounded-xl bg-[hsl(--accent)/10]">
              <div className="text-[10px] text-[hsl(var(--accent))]/70 mb-1">Avg Salary</div>
              <div className="text-[14px] font-bold text-[hsl(var(--blue-900))] truncate">{safeAvgSalary(uni)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "rounded-xl transition-all shrink-0",
                isComparing
                  ? "border-[hsl(var(--blue-700))] bg-[hsl(var(--blue-700))] text-white"
                  : "border-black/10"
              )}
              onClick={() => onCompare(uni)}
            >
              {isComparing ? <Check className="w-4 h-4 mr-1" /> : null}
              {isComparing ? 'Added' : 'Compare'}
            </Button>
            <Link
              to={`/student-visa?university=${uni.id}`}
              className="inline-flex items-center gap-2 rounded-xl btn-primary text-white h-10 px-5 text-[13px] font-bold shadow-md shrink-0"
            >
              Apply <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline shrink-0">
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareTable({ universities }) {
  if (universities.length === 0) return null;

  const metrics = [
    { key: 'rank', label: 'World Rank', format: (v) => `#${v}`, icon: Target, color: 'blue' },
    { key: 'qs_rank', label: 'QS Rank', format: (v) => `#${v}`, icon: Award, color: 'blue' },
    { key: 'tuition_usd', label: 'Tuition (USD)', format: (v) => v === 0 ? 'Free' : `$${v?.toLocaleString()}`, icon: DollarSign, color: 'accent' },
    { key: 'living_cost_usd', label: 'Living Cost', format: (v) => `$${v?.toLocaleString()}`, icon: DollarSign, color: 'gray' },
    { key: 'students', label: 'Total Students', format: (v) => v?.toLocaleString(), icon: Users, color: 'gray' },
    { key: 'intl_students', label: 'Intl Students', format: (v) => v?.toLocaleString(), icon: Globe2, color: 'blue' },
    { key: 'ielts_min', label: 'Min IELTS', format: (v) => `${v}`, icon: BookOpen, color: 'green' },
    { key: 'toefl_min', label: 'Min TOEFL', format: (v) => `${v}`, icon: BookOpen, color: 'green' },
    { key: 'gre_required', label: 'GRE Required', format: (v) => v ? 'Yes' : 'No', icon: Check, color: v => v ? 'emerald' : 'gray' },
    { key: 'gmat_required', label: 'GMAT Required', format: (v) => v ? 'Yes' : 'No', icon: Check, color: v => v ? 'emerald' : 'gray' },
    { key: 'scholarships', label: 'Scholarships', format: (v) => v ? 'Yes' : 'No', icon: Crown, color: v => v ? 'amber' : 'gray' },
    { key: '就业率', label: 'Employment', format: (v) => v || 'N/A', icon: TrendingUp, color: 'emerald' },
    { key: 'avg_salary_usd', label: 'Avg Salary', format: (v) => v ? `$${Number(v).toLocaleString()}` : 'N/A', icon: TrendingUp, color: 'emerald' },
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white border border-black/5">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/5">
              <th className="text-left p-5 font-bold text-[hsl(var(--blue-900))]/60 text-[13px] bg-[hsl(var(--soft-bg))]">Metric</th>
              {universities.map((uni, idx) => (
                <th key={uni.id} className={cn(
                  "p-5 text-center min-w-[200px]",
                  idx === 0 ? "bg-[hsl(var(--blue-50))]" : idx === universities.length - 1 ? "bg-[hsl(var(--blue-50))]" : "bg-[hsl(var(--blue-50))]/50"
                )}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-2xl shadow-lg shadow-[hsl(var(--blue-700))]/30">
                        {uni.flag}
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[hsl(var(--accent))] text-white text-[10px] font-bold flex items-center justify-center shadow">
                        #{uni.rank}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-[hsl(var(--blue-900))] text-[16px]">{uni.short_name}</div>
                      <div className="text-[12px] text-[hsl(var(--blue-900))]/60">{uni.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] text-[10px] border-0">{uni.type}</Badge>
                      {safeScholarships(uni) && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">Scholarship</Badge>}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, idx) => (
              <tr key={metric.key} className={cn(
                "border-b border-black/5 transition-colors hover:bg-[hsl(var(--blue-50))]/30",
                idx % 2 === 0 ? "bg-white" : "bg-[hsl(var(--soft-bg))]/30"
              )}>
                <td className="p-4 text-[13px] text-[hsl(var(--blue-900))]/70 font-medium">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      metric.color === 'blue' && "bg-[hsl(var(--blue-100))]",
                      metric.color === 'accent' && "bg-[hsl(var(--accent))]/10",
                      metric.color === 'emerald' && "bg-emerald-100",
                      metric.color === 'amber' && "bg-amber-100",
                      metric.color === 'gray' && "bg-gray-100"
                    )}>
                      {(() => {
                        const IconComponent = metric.icon;
                        return <IconComponent className={cn(
                          "w-4 h-4",
                          metric.color === 'blue' && "text-[hsl(var(--blue-700))]",
                          metric.color === 'accent' && "text-[hsl(var(--accent))]",
                          metric.color === 'emerald' && "text-emerald-600",
                          metric.color === 'amber' && "text-amber-600",
                          metric.color === 'gray' && "text-gray-500"
                        )} />;
                      })()}
                    </div>
                    {metric.label}
                  </div>
                </td>
                {universities.map((uni) => (
                  <td key={uni.id} className="p-4 text-center">
                    <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">
                      {metric.format(uni[metric.key])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-gradient-to-r from-[hsl(var(--blue-50))] to-white">
              <td className="p-4 text-[13px] text-[hsl(var(--blue-900))]/70 font-medium">Popular Courses</td>
              {universities.map((uni) => (
                <td key={uni.id} className="p-4 text-center">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {getDisplayCourses(uni.popular_courses || []).slice(0, 3).map((c) => (
                      <span key={c} className="text-[11px] px-3 py-1 rounded-full bg-white border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))]">
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
              ))}
            </tr>
            <tr className="bg-[hsl(var(--soft-bg))]">
              <td className="p-4"></td>
              {universities.map((uni) => (
                <td key={uni.id} className="p-4 text-center">
                  <Link
                    to={`/student-visa?university=${uni.id}`}
                    className="inline-flex items-center gap-2 rounded-full btn-primary text-white h-11 px-6 text-[13px] font-bold shadow-lg shadow-[hsl(var(--blue-700))]/20"
                  >
                    Apply Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareCards({ universities }) {
  if (universities.length === 0) return null;

  const getBestValue = (key) => {
    const values = universities.map(u => u[key]).filter(v => v !== undefined && v !== null && v !== '' && v !== 'Varies');
    if (key === 'tuition_usd') {
      return Math.min(...values);
    }
    if (key === '就业率' || key === 'employment_rate' || key === 'avg_salary_usd' || key === 'ielts_min') {
      return Math.max(...values);
    }
    return null;
  };

  const isBestValue = (uni, key) => {
    const best = getBestValue(key);
    if (best === null) return false;
    return uni[key] === best;
  };

  const metrics = [
    { key: 'rank', label: 'World Rank', format: (v) => `#${v}`, higher: false },
    { key: 'tuition_usd', label: 'Tuition', format: (v) => v === 0 ? 'Free' : `$${v?.toLocaleString()}`, higher: false },
    { key: 'ielts_min', label: 'IELTS', format: (v) => `${v}`, higher: true },
    { key: '就业率', label: 'Employment', format: (v) => v || 'N/A', higher: true },
    { key: 'avg_salary_usd', label: 'Avg Salary', format: (v) => v ? `$${Number(v).toLocaleString()}` : 'N/A', higher: true },
    { key: 'intl_students', label: 'Intl Students', format: (v) => v?.toLocaleString(), higher: true },
  ];

  return (
    <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {universities.map((uni, idx) => (
        <div key={uni.id} className={cn(
          "relative rounded-2xl overflow-hidden bg-white border-2 transition-all duration-300",
          idx === 0 ? "border-[hsl(var(--blue-700))] shadow-xl shadow-[hsl(var(--blue-700))]/10" : "border-black/5 hover:border-[hsl(var(--blue-700))]/30"
        )}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))]" />

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-2xl shadow-lg">
                  {uni.flag}
                </div>
                <div>
                  <h3 className="font-bold text-[hsl(var(--blue-900))] text-[18px]">{uni.short_name}</h3>
                  <p className="text-[12px] text-[hsl(var(--blue-900))]/60">{uni.country_name}</p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] text-white text-[12px] font-bold shadow">
                #{uni.rank}
              </div>
            </div>

            <div className="space-y-3">
              {metrics.map((metric) => {
                const isBest = isBestValue(uni, metric.key);
                return (
                  <div key={metric.key} className={cn(
                    "flex items-center justify-between p-3 rounded-xl transition-colors",
                    isBest ? "bg-emerald-50 border border-emerald-200" : "bg-[hsl(var(--soft-bg))]"
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[hsl(var(--blue-900))]/60">{metric.label}</span>
                      {isBest && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <span className={cn(
                      "font-bold text-[14px]",
                      isBest ? "text-emerald-600" : "text-[hsl(var(--blue-900))]"
                    )}>
                      {metric.format(uni[metric.key])}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {getDisplayCourses(uni.popular_courses || []).slice(0, 3).map((course) => (
                <span key={course} className="text-[11px] px-3 py-1 rounded-full bg-[hsl(var(--blue-50))] border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))]">
                  {course}
                </span>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 bg-gradient-to-r from-[hsl(var(--soft-bg))] to-white border-t border-black/5">
            <Link
              to={`/student-visa?university=${uni.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl btn-primary text-white h-11 w-full text-[14px] font-bold"
            >
              Apply Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompareBars({ universities }) {
  if (universities.length === 0) return null;

  const metrics = [
    { key: 'rank', label: 'World Ranking', higher: false, max: 500 },
    { key: 'tuition_usd', label: 'Tuition Fee', higher: false, max: 60000 },
    { key: 'living_cost_usd', label: 'Living Cost', higher: false, max: 25000 },
    { key: 'ielts_min', label: 'IELTS Score', higher: true, max: 9 },
    { key: '就业率', label: 'Employment Rate', higher: true, max: 100, suffix: '%' },
    { key: 'avg_salary_usd', label: 'Avg Salary', higher: true, max: 200000 },
  ];

  const colors = [
    'from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))]',
    'from-emerald-600 to-emerald-400',
    'from-purple-600 to-purple-400',
    'from-amber-600 to-amber-400',
  ];

  return (
    <div className="space-y-6">
      {metrics.map((metric, idx) => {
        const values = universities.map(u => parseFloat(u[metric.key]) || 0);
        const maxVal = Math.max(...values);
        const normalizedMax = maxVal > 0 ? maxVal : 1;

        return (
          <div key={metric.key} className="bg-white rounded-2xl p-6 border border-black/5">
            <h4 className="text-[14px] font-bold text-[hsl(var(--blue-900))] mb-4">{metric.label}</h4>
            <div className="space-y-4">
              {universities.map((uni, uIdx) => {
                const value = parseFloat(uni[metric.key]) || 0;
                const percentage = (value / normalizedMax) * 100;
                const isBest = metric.higher ? value === Math.max(...values) : value === Math.min(...values);

                return (
                  <div key={uni.id} className="flex items-center gap-4">
                    <div className="w-20 text-[12px] font-bold text-[hsl(var(--blue-900))]">{uni.short_name}</div>
                    <div className="flex-1 relative">
                      <div className="h-8 bg-[hsl(var(--soft-bg))] rounded-lg overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-lg transition-all duration-500",
                            `bg-gradient-to-r ${colors[uIdx % colors.length]}`,
                            !metric.higher && percentage < 30 && "from-emerald-500 to-emerald-400"
                          )}
                          style={{ width: `${Math.max(percentage, 8)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className={cn(
                        "text-[14px] font-bold",
                        isBest ? "text-emerald-600" : "text-[hsl(var(--blue-900))]"
                      )}>
                        {metric.suffix === '%' ? `${value}%` : metric.key === 'avg_salary_usd' ? `$${value.toLocaleString()}` : value}
                      </span>
                      {isBest && <Crown className="inline w-3.5 h-3.5 text-amber-500 ml-1" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-4">
        {universities.map((uni) => (
          <Link
            key={uni.id}
            to={`/student-visa?university=${uni.id}`}
            className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 rounded-xl btn-primary text-white h-12 text-[14px] font-bold shadow-lg"
          >
            Apply to {uni.short_name} <ArrowRight className="w-4 h-4" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function CompareList({ universities }) {
  if (universities.length === 0) return null;

  return (
    <div className="space-y-4">
      {universities.map((uni, idx) => (
        <div key={uni.id} className={cn(
          "relative rounded-2xl overflow-hidden bg-white border transition-all duration-300",
          idx === 0 ? "border-[hsl(var(--blue-700))] shadow-lg shadow-[hsl(var(--blue-700))]/10" : "border-black/5 hover:border-[hsl(var(--blue-700))]/30"
        )}>
          <div className="flex items-stretch">
            <div className="w-24 sm:w-32 bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex flex-col items-center justify-center p-4 text-white">
              <div className="text-3xl mb-1">{uni.flag}</div>
              <div className="text-[10px] font-bold text-white/70">#{uni.rank}</div>
            </div>

            <div className="flex-1 p-4 sm:p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-[hsl(var(--blue-900))] text-[16px]">{uni.short_name}</h3>
                  <p className="text-[12px] text-[hsl(var(--blue-900))]/60">{uni.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))] text-[10px] border-0">{uni.type}</Badge>
                  {safeScholarships(uni) && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">Scholarship</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-[hsl(var(--soft-bg))]">
                  <div className="text-[10px] text-[hsl(var(--blue-900))]/50 mb-1">Tuition</div>
                  <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">
                    {uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[hsl(var(--soft-bg))]">
                  <div className="text-[10px] text-[hsl(var(--blue-900))]/50 mb-1">IELTS</div>
                  <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{uni.ielts_min}+</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50">
                  <div className="text-[10px] text-emerald-600/70 mb-1">Employment</div>
                  <div className="text-[14px] font-bold text-emerald-600">{safeEmploymentRate(uni)}</div>
                </div>
                <div className="p-3 rounded-xl bg-[hsl(--accent)/10]">
                  <div className="text-[10px] text-[hsl(var(--accent))]/70 mb-1">Avg Salary</div>
                  <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{safeAvgSalary(uni)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={`/student-visa?university=${uni.id}`}
                  className="inline-flex items-center gap-2 rounded-xl btn-primary text-white h-10 px-5 text-[13px] font-bold shadow-md"
                >
                  Apply <ArrowRight className="w-4 h-4" />
                </Link>
                <button className="text-[13px] font-bold text-[hsl(var(--blue-700))] hover:underline">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterSection({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-black/5 py-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-[14px] font-bold text-[hsl(var(--blue-900))]">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-[hsl(var(--blue-900))]/50" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--blue-900))]/50" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function ScholarshipCalculator({ onClose }) {
  const [ielts, setIelts] = useState(7.0);
  const [gre, setGre] = useState(320);
  const [gmat, setGmat] = useState(650);
  const [gpa, setGpa] = useState(80);
  const [budget, setBudget] = useState(50000);
  const [results, setResults] = useState(null);

  const calculate = () => {
    const matched = [];
    const UNIVERSITIES_DATA = [
      { id: 'mit', short_name: 'MIT', country: 'US', flag: '🇺🇸', rank: 1, tuition_usd: 55790, scholarships: true, ielts_min: 7.0, gre_required: true, gmat_required: false },
      { id: 'stanford', short_name: 'Stanford', country: 'US', flag: '🇺🇸', rank: 3, tuition_usd: 56169, scholarships: true, ielts_min: 7.0, gre_required: true, gmat_required: false },
      { id: 'harvard', short_name: 'Harvard', country: 'US', flag: '🇺🇸', rank: 2, tuition_usd: 55807, scholarships: true, ielts_min: 7.5, gre_required: false, gmat_required: true },
      { id: 'oxford', short_name: 'Oxford', country: 'UK', flag: '🇬🇧', rank: 2, tuition_usd: 35000, scholarships: true, ielts_min: 7.0, gre_required: false, gmat_required: false },
      { id: 'cambridge', short_name: 'Cambridge', country: 'UK', flag: '🇬🇧', rank: 3, tuition_usd: 34000, scholarships: true, ielts_min: 7.0, gre_required: false, gmat_required: false },
      { id: 'imperial', short_name: 'Imperial', country: 'UK', flag: '🇬🇧', rank: 10, tuition_usd: 33000, scholarships: true, ielts_min: 6.5, gre_required: false, gmat_required: false },
      { id: 'tum', short_name: 'TUM', country: 'DE', flag: '🇩🇪', rank: 50, tuition_usd: 0, scholarships: true, ielts_min: 6.5, gre_required: false, gmat_required: false },
      { id: 'lmu', short_name: 'LMU Munich', country: 'DE', flag: '🇩🇪', rank: 45, tuition_usd: 0, scholarships: true, ielts_min: 6.5, gre_required: false, gmat_required: false },
      { id: 'polimi', short_name: 'Polimi', country: 'IT', flag: '🇮🇹', rank: 145, tuition_usd: 4000, scholarships: true, ielts_min: 6.0, gre_required: false, gmat_required: false },
      { id: 'unibo', short_name: 'Unibo', country: 'IT', flag: '🇮🇹', rank: 120, tuition_usd: 4000, scholarships: true, ielts_min: 6.0, gre_required: false, gmat_required: false },
      { id: 'tuwien', short_name: 'TU Vienna', country: 'AT', flag: '🇦🇹', rank: 180, tuition_usd: 0, scholarships: true, ielts_min: 6.5, gre_required: false, gmat_required: false },
      { id: 'uniwien', short_name: 'Uni Wien', country: 'AT', flag: '🇦🇹', rank: 150, tuition_usd: 0, scholarships: true, ielts_min: 6.5, gre_required: false, gmat_required: false },
      { id: 'unide', short_name: 'UW', country: 'PL', flag: '🇵🇱', rank: 260, tuition_usd: 5000, scholarships: true, ielts_min: 6.5, gre_required: false, gmat_required: false },
      { id: 'jagiellonian', short_name: 'JU', country: 'PL', flag: '🇵🇱', rank: 240, tuition_usd: 4500, scholarships: true, ielts_min: 6.5, gre_required: false, gmat_required: false },
      { id: 'nova', short_name: 'NOVA', country: 'PT', flag: '🇵🇹', rank: 300, tuition_usd: 6000, scholarships: true, ielts_min: 6.5, gre_required: false, gmat_required: true },
    ];
    for (const uni of UNIVERSITIES_DATA) {
      let score = 0;
      let reasons = [];
      if (uni.scholarships) { score += 30; reasons.push('Has scholarships'); }
      if (ielts >= uni.ielts_min) { score += 25; reasons.push(`IELTS ${ielts} meets ${uni.ielts_min}+`); }
      else { score -= 20; reasons.push(`IELTS too low (need ${uni.ielts_min})`); }
      if (!uni.gre_required && !uni.gmat_required) { score += 15; reasons.push('No GRE/GMAT required'); }
      else if (uni.gre_required && gre >= 320) { score += 15; reasons.push(`GRE ${gre} qualifies`); }
      else if (uni.gmat_required && gmat >= 650) { score += 15; reasons.push(`GMAT ${gmat} qualifies`); }
      if (uni.tuition_usd <= budget) { score += 20; reasons.push(`Within budget ($${uni.tuition_usd?.toLocaleString()})`); }
      if (gpa >= 85) { score += 10; reasons.push('Strong academics'); }
      matched.push({ ...uni, matchScore: score, reasons });
    }
    matched.sort((a, b) => b.matchScore - a.matchScore);
    setResults(matched.slice(0, 10));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display font-extrabold text-[20px]">
            <Calculator className="w-5 h-5 text-[hsl(var(--accent))]" /> Scholarship Eligibility Calculator
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-bold text-[hsl(var(--blue-900))]">IELTS Score</label>
              <input type="range" min="5" max="9" step="0.5" value={ielts} onChange={(e) => setIelts(parseFloat(e.target.value))} className="w-full mt-1" />
              <div className="text-center text-[15px] font-bold text-[hsl(var(--blue-700))]">{ielts}</div>
            </div>
            <div>
              <label className="text-[13px] font-bold text-[hsl(var(--blue-900))]">GRE Score (out of 340)</label>
              <input type="range" min="260" max="340" step="1" value={gre} onChange={(e) => setGre(parseInt(e.target.value))} className="w-full mt-1" />
              <div className="text-center text-[15px] font-bold text-[hsl(var(--blue-700))]">{gre}</div>
            </div>
            <div>
              <label className="text-[13px] font-bold text-[hsl(var(--blue-900))]">GMAT Score (out of 800)</label>
              <input type="range" min="500" max="800" step="10" value={gmat} onChange={(e) => setGmat(parseInt(e.target.value))} className="w-full mt-1" />
              <div className="text-center text-[15px] font-bold text-[hsl(var(--blue-700))]">{gmat}</div>
            </div>
            <div>
              <label className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Academic % (or GPA)</label>
              <input type="range" min="50" max="100" step="1" value={gpa} onChange={(e) => setGpa(parseInt(e.target.value))} className="w-full mt-1" />
              <div className="text-center text-[15px] font-bold text-[hsl(var(--blue-700))]">{gpa}%</div>
            </div>
          </div>
          <div>
            <label className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Budget (USD/year)</label>
            <div className="flex items-center gap-3 mt-1">
              <input type="range" min="0" max="60000" step="1000" value={budget} onChange={(e) => setBudget(parseInt(e.target.value))} className="flex-1" />
              <span className="text-[15px] font-bold text-[hsl(var(--blue-700))] w-28 text-right">${budget.toLocaleString()}</span>
            </div>
          </div>
          <Button onClick={calculate} className="w-full rounded-xl btn-accent text-white font-bold h-11">
            <Sparkles className="w-4 h-4 mr-2" /> Find My Matching Universities
          </Button>
          {results && (
            <div className="space-y-3">
              <div className="text-[13px] font-bold text-[hsl(var(--blue-900))]/60 uppercase tracking-wider">Matching Universities</div>
              {results.map((uni) => {
                const eligible = uni.matchScore >= 50;
                return (
                  <div key={uni.id} className={cn(
                    "p-4 rounded-xl border flex items-center gap-3",
                    eligible ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
                  )}>
                    <span className="text-2xl">{uni.flag}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{uni.short_name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">{uni.matchScore}/100</span>
                        {eligible ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">Eligible</span> : <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">Partial</span>}
                      </div>
                      <div className="text-[12px] text-[hsl(var(--blue-900))]/60 mt-1">{uni.reasons.slice(0, 3).join(' · ')}</div>
                    </div>
                    <div className="text-right text-[13px] font-bold text-[hsl(var(--blue-900))]">
                      {uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UniversityComparison() {
  const { isAuthed, openAuth } = useAuth();
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [compareView, setCompareView] = useState('cards');
  const [gridView, setGridView] = useState('grid');
  const [sortBy, setSortBy] = useState('rank');
  const [currentPage, setCurrentPage] = useState(1);
  const [scholarshipOnly, setScholarshipOnly] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [shortlist, setShortlist] = useState([]);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [showShortlist, setShowShortlist] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [selectedForApply, setSelectedForApply] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const itemsPerPage = 20;

  const loadShortlist = () => {
    if (!isAuthed) return;
    setShortlistLoading(true);
    axios.get(`${API}/users/me/shortlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setShortlist(r.data || []))
      .catch(() => setShortlist([]))
      .finally(() => setShortlistLoading(false));
  };

  useEffect(() => {
    if (isAuthed) loadShortlist();
    else {
      try {
        const local = JSON.parse(localStorage.getItem('wehive_shortlist') || '[]');
        setShortlist(local.map(s => ({ ...s, university_id: s.id || s.university_id })));
      } catch { setShortlist([]); }
    }
  }, [isAuthed]);

  const toggleShortlist = async (uni) => {
    const isSaved = shortlist.some((s) => (s.university_id || s.id) === uni.id);
    if (isSaved) {
      if (isAuthed) {
        await axios.delete(`${API}/users/me/shortlist/${uni.id}`, { headers: { Authorization: `Bearer ${token}` } });
      }
      const updated = shortlist.filter((s) => (s.university_id || s.id) !== uni.id);
      setShortlist(updated);
      try { localStorage.setItem('wehive_shortlist', JSON.stringify(updated)); } catch {}
    } else {
      if (isAuthed) {
        await axios.post(`${API}/users/me/shortlist/${uni.id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      }
      const item = {
        university_id: uni.id, university_name: uni.name, short_name: uni.short_name,
        country: uni.country, flag: uni.flag, rank: uni.rank, tuition_usd: uni.tuition_usd,
      };
      const updated = [...shortlist, item];
      setShortlist(updated);
      try { localStorage.setItem('wehive_shortlist', JSON.stringify(updated)); } catch {}
    }
  };

  const createShareLink = async () => {
    if (!isAuthed) { openAuth('login'); return; }
    if (shortlist.length < 2) return;
    try {
      const r = await axios.post(`${API}/users/me/shortlist/share`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setShareUrl(window.location.origin + r.data.share_url);
    } catch {}
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  useEffect(() => {
    axios.get(`${API}/universities`, { params: { limit: 15000 } })
      .then((r) => {
        setUniversities(r.data || []);
        setLoading(false);
      })
      .catch(() => {
        setUniversities([]);
        setLoading(false);
      });
  }, []);

  const filteredUniversities = universities.filter((uni) => {
    if (search && !uni.name.toLowerCase().includes(search.toLowerCase()) && !uni.short_name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedCountry && uni.country !== selectedCountry) {
      return false;
    }
    if (selectedCourses.length > 0 && !selectedCourses.some((c) => uni.courses?.includes(c))) {
      return false;
    }
    if (scholarshipOnly && !uni.scholarships) {
      return false;
    }
    return true;
  });

  const sortedUniversities = [...filteredUniversities].sort((a, b) => {
    switch (sortBy) {
      case 'tuition_asc':
        return (a.tuition_usd || 0) - (b.tuition_usd || 0);
      case 'tuition_desc':
        return (b.tuition_usd || 0) - (a.tuition_usd || 0);
      case 'rank':
        return (a.rank || 999) - (b.rank || 999);
      case 'qs_rank':
        return (a.qs_rank || 999) - (b.qs_rank || 999);
      case 'ielts':
        return (a.ielts_min || 0) - (b.ielts_min || 0);
      case 'employment':
        const empA = parseFloat(String(safeEmploymentRate(a) || '0%').replace('%', ''));
        const empB = parseFloat(String(safeEmploymentRate(b) || '0%').replace('%', ''));
        return empB - empA;
      case 'salary':
        return (Number(b.avg_salary_usd) || 0) - (Number(a.avg_salary_usd) || 0);
      default:
        return (a.rank || 999) - (b.rank || 999);
    }
  });

  const totalPages = Math.ceil(sortedUniversities.length / itemsPerPage);
  const paginatedUniversities = sortedUniversities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelect = (uni) => {
    if (selectedForApply.find((u) => u.id === uni.id)) {
      setSelectedForApply(selectedForApply.filter((u) => u.id !== uni.id));
    } else {
      setSelectedForApply([...selectedForApply, uni]);
    }
  };

  const handleCompare = (uni) => {
    if (compareList.find((u) => u.id === uni.id)) {
      setCompareList(compareList.filter((u) => u.id !== uni.id));
    } else if (compareList.length < 4) {
      setCompareList([...compareList, uni]);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCountry(null);
    setSelectedCourses([]);
    setScholarshipOnly(false);
    setCurrentPage(1);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const hasFilters = search || selectedCountry || selectedCourses.length > 0 || scholarshipOnly;

  return (
    <div className="bg-white">
      <Navbar />

      <section className="pt-28 pb-16 bg-gradient-to-br from-[hsl(var(--blue-900))] to-[hsl(var(--blue-700))] text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-white/70 mb-4">
            <GraduationCap className="w-4 h-4" />
            University Finder
          </div>
          <h1 className="font-display font-extrabold text-[42px] sm:text-[56px] leading-[1.0] tracking-[-0.03em]">
            Find your perfect<br />
            <span className="text-[hsl(var(--accent))]">university.</span>
          </h1>
          <p className="mt-4 text-[16px] text-white/70 max-w-xl">
            Compare tuition fees, admission requirements, and outcomes across {universities.length}+ world-class universities.
          </p>
        </div>
      </section>

      <section className="py-8 bg-[hsl(var(--soft-bg))] border-b border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--blue-900))]/40" />
              <Input
                placeholder="Search universities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 rounded-xl border-black/10 bg-white shadow-sm focus:shadow-md focus:shadow-[hsl(var(--blue-700))]/10 transition-shadow"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-12 px-4 rounded-xl border-black/10 bg-white shadow-sm hover:shadow-md transition-shadow"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2 text-[hsl(var(--blue-700))]" />
                <span className="text-[hsl(var(--blue-900))]">Filters</span>
                {hasFilters && (
                  <Badge className="ml-2 bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--red-600))] text-white text-[10px] h-5 w-5 rounded-full p-0 items-center justify-center shadow-sm">
                    {selectedCourses.length + (selectedCountry ? 1 : 0) + (scholarshipOnly ? 1 : 0)}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-12 px-4 rounded-xl border-black/10 bg-white shadow-sm hover:shadow-md transition-shadow"
                onClick={() => setShowCalculator(true)}
              >
                <Calculator className="w-4 h-4 mr-2 text-[hsl(var(--accent))]" />
                <span className="text-[hsl(var(--blue-900))]">Scholarship Fit</span>
              </Button>
              {hasFilters && (
                <Button variant="ghost" className="h-12 px-4 rounded-xl" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 rounded-2xl border border-black/5 p-6 overflow-hidden relative" style={{
              background: 'linear-gradient(135deg, #ffffff 0%, hsl(var(--blue-50)/50%) 100%)',
            }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[hsl(var(--accent))]/5 to-transparent rounded-bl-full" />
              <div className="relative z-10 grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-[14px] font-bold text-[hsl(var(--blue-900))] mb-4">Country</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCountry(null)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[13px] font-bold transition-all shadow-sm",
                        !selectedCountry
                          ? "bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] text-white shadow-md"
                          : "bg-white text-[hsl(var(--blue-900))]/70 hover:bg-[hsl(var(--blue-50))] border border-black/5"
                      )}
                    >
                      All Countries
                    </button>
                    {STUDENT_COUNTRIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCountry(c.id === selectedCountry ? null : c.id)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 shadow-sm",
                          selectedCountry === c.id
                            ? "bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] text-white shadow-md"
                            : "bg-white text-[hsl(var(--blue-900))]/70 hover:bg-[hsl(var(--blue-50))] border border-black/5"
                        )}
                      >
                        <span>{c.flag}</span> {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[14px] font-bold text-[hsl(var(--blue-900))] mb-4">Course Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {COURSE_CATEGORIES.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => {
                          if (selectedCourses.includes(course.id)) {
                            setSelectedCourses(selectedCourses.filter((c) => c !== course.id));
                          } else {
                            setSelectedCourses([...selectedCourses, course.id]);
                          }
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 shadow-sm",
                          selectedCourses.includes(course.id)
                            ? "bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] text-white shadow-md"
                            : "bg-white text-[hsl(var(--blue-900))]/70 hover:bg-[hsl(var(--blue-50))] border border-black/5"
                        )}
                      >
                        <course.icon className="w-4 h-4" />
                        {course.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[14px] font-bold text-[hsl(var(--blue-900))] mb-4">Scholarship</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setScholarshipOnly(!scholarshipOnly)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[13px] font-bold transition-all shadow-sm flex items-center gap-2",
                        scholarshipOnly
                          ? "bg-gradient-to-r from-emerald-600 to-emerald-400 text-white shadow-md"
                          : "bg-white text-[hsl(var(--blue-900))]/70 hover:bg-emerald-50 border border-black/5"
                      )}
                    >
                      <Crown className="w-4 h-4" />
                      Scholarships Only {scholarshipOnly && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {compareList.length > 0 && (
        <section className="py-6 bg-[hsl(var(--blue-900))] text-white sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[14px] font-bold text-white/70">Comparing ({compareList.length}/4):</span>
                <div className="flex gap-2">
                  {compareList.map((uni) => (
                    <div key={uni.id} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                      <span>{uni.flag}</span>
                      <span className="text-[13px] font-bold">{uni.short_name}</span>
                      <button onClick={() => handleCompare(uni)} className="hover:bg-white/10 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => setCompareList([])}
                variant="ghost"
                className="text-white/70 hover:text-white"
              >
                Clear all
              </Button>
            </div>
          </div>
        </section>
      )}

      {compareList.length >= 2 && (
        <section className="py-8 bg-white border-b border-black/5">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
                Comparison View
              </h2>
              <div className="flex items-center gap-2 p-1 rounded-xl bg-[hsl(var(--soft-bg))]">
                <button
                  onClick={() => setCompareView('cards')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    compareView === 'cards' ? "bg-white shadow-sm text-[hsl(var(--blue-700))]" : "text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-900))]"
                  )}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCompareView('bars')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    compareView === 'bars' ? "bg-white shadow-sm text-[hsl(var(--blue-700))]" : "text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-900))]"
                  )}
                  title="Bar Chart View"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCompareView('list')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    compareView === 'list' ? "bg-white shadow-sm text-[hsl(var(--blue-700))]" : "text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-900))]"
                  )}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCompareView('table')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    compareView === 'table' ? "bg-white shadow-sm text-[hsl(var(--blue-700))]" : "text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-900))]"
                  )}
                  title="Table View"
                >
                  <Table2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {compareView === 'cards' && <CompareCards universities={compareList} />}
            {compareView === 'bars' && <CompareBars universities={compareList} />}
            {compareView === 'list' && <CompareList universities={compareList} />}
            {compareView === 'table' && <CompareTable universities={compareList} />}
          </div>
        </section>
      )}

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="font-display font-extrabold text-[24px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              {sortedUniversities.length} Universities found
            </h2>
            <div className="flex items-center gap-2 p-1 rounded-xl bg-[hsl(var(--soft-bg))]">
              <button
                onClick={() => setGridView('grid')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  gridView === 'grid' ? "bg-white shadow-sm text-[hsl(var(--blue-700))]" : "text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-900))]"
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridView('list')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  gridView === 'list' ? "bg-white shadow-sm text-[hsl(var(--blue-700))]" : "text-[hsl(var(--blue-900))]/50 hover:text-[hsl(var(--blue-900))]"
                )}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--blue-700))]" />
            </div>
          ) : sortedUniversities.length === 0 ? (
            <div className="text-center py-20">
              <GraduationCap className="w-12 h-12 text-[hsl(var(--blue-900))]/30 mx-auto" />
              <h3 className="mt-4 text-[18px] font-bold text-[hsl(var(--blue-900))]">No universities found</h3>
              <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60">Try adjusting your filters</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : gridView === 'grid' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedUniversities.map((uni) => (
                <UniversityCard
                  key={uni.id}
                  uni={uni}
                  onCompare={handleCompare}
                  isComparing={!!compareList.find((u) => u.id === uni.id)}
                  isSelected={!!selectedForApply.find((u) => u.id === uni.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUniversities.map((uni) => (
                <UniversityListItem
                  key={uni.id}
                  uni={uni}
                  onCompare={handleCompare}
                  isComparing={!!compareList.find((u) => u.id === uni.id)}
                  isSelected={!!selectedForApply.find((u) => u.id === uni.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}

          {selectedForApply.length > 0 && (
            <div className="sticky bottom-4 mt-6 z-30">
              <div className="mx-auto max-w-lg rounded-2xl bg-[hsl(var(--blue-900))] text-white shadow-2xl shadow-[hsl(var(--blue-900))]/30 p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[14px] font-bold">{selectedForApply.length} universit{selectedForApply.length === 1 ? 'y' : 'ies'} selected</span>
                  <div className="text-[11px] text-white/60 mt-0.5">
                    {selectedForApply.length <= 3
                      ? 'Flat ₹20,000 application fee'
                      : `₹20,000 + ₹${(selectedForApply.length - 3) * 3000} for extras`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedForApply([])}
                    className="text-[12px] text-white/60 hover:text-white px-2"
                  >
                    Clear
                  </button>
                  <Button
                    onClick={() => setShowApplyModal(true)}
                    className="rounded-xl bg-white text-[hsl(var(--blue-900))] hover:bg-white/90 font-bold h-10 px-5"
                  >
                    Apply now <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-10 w-10 p-0 rounded-lg border-black/10 disabled:opacity-50"
              >
                <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "h-10 w-10 rounded-lg text-[14px] font-bold transition-all",
                      currentPage === pageNum
                        ? "bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] text-white shadow-md"
                        : "bg-white text-[hsl(var(--blue-900))]/70 hover:bg-[hsl(var(--blue-50))] border border-black/10"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-10 w-10 p-0 rounded-lg border-black/10 disabled:opacity-50"
              >
                <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </Button>
            </div>
          )}

          {totalPages > 1 && (
            <p className="mt-4 text-center text-[13px] text-[hsl(var(--blue-900))]/60">
              Page {currentPage} of {totalPages} — Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedUniversities.length)} of {sortedUniversities.length} universities
            </p>
          )}
        </div>
      </section>

      <section className="py-16 bg-[hsl(var(--soft-bg))] border-y border-black/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-8">
            <h2 className="font-display font-extrabold text-[28px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              More tools for your journey
            </h2>
            <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/60">
              Explore additional resources to help you study abroad.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Sparkles, label: 'Visa Interview Simulator', desc: 'Practice mock embassy interviews', href: '/visa-interview', color: 'bg-violet-500' },
              { icon: Calculator, label: 'Scholarship Matcher', desc: 'Find matching scholarships', href: '#', color: 'bg-amber-500' },
              { icon: Calculator, label: 'Cost of Living', desc: 'Calculate expenses per city', href: '#', color: 'bg-emerald-500' },
              { icon: FileText, label: 'AI SOP / LOR Writer', desc: 'Generate application documents', href: '#', color: 'bg-purple-500' },
            ].map(tool => (
              <Link
                key={tool.label}
                to={tool.href}
                className="rounded-2xl bg-white border border-black/5 p-5 hover:border-[hsl(var(--blue-700))]/20 hover:shadow-lg transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center text-white shadow-lg`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-3 font-bold text-[15px] text-[hsl(var(--blue-900))]">{tool.label}</h3>
                <p className="mt-1 text-[13px] text-[hsl(var(--blue-900))]/60">{tool.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[hsl(var(--blue-900))] text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--accent))]">
                <Zap className="w-4 h-4" />
                Student Visa
              </div>
              <h2 className="mt-3 font-display font-extrabold text-[36px] tracking-[-0.025em]">
                Ready to apply to your dream university?
              </h2>
              <p className="mt-4 text-[15px] text-white/70">
                We help you with everything from university selection to visa application. Our experts guide you through every step.
              </p>
            </div>
            <div className="bg-white/5 rounded-2xl p-7">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[14px]">University shortlisting</div>
                    <div className="text-[12px] text-white/60 mt-0.5">Based on your profile and preferences</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[14px]">Application support</div>
                    <div className="text-[12px] text-white/60 mt-0.5">SOP, recommendation letters, and more</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Globe2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[14px]">Visa processing</div>
                    <div className="text-[12px] text-white/60 mt-0.5">End-to-end visa application management</div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => isAuthed ? null : openAuth('signup')}
                className="mt-6 w-full btn-accent h-12 font-bold"
              >
                Start your journey <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      {showCalculator && <ScholarshipCalculator onClose={() => setShowCalculator(false)} />}
      {showApplyModal && (
        <MultiUniversityApplyModal
          universities={selectedForApply}
          onClose={() => { setShowApplyModal(false); setSelectedForApply([]); }}
        />
      )}
    </div>
  );
}
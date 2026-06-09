import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  GraduationCap, Globe2, Clock, Award, Users, Star,
  Search, ChevronDown, ChevronUp, X, Check,
  BookOpen, DollarSign, Calendar, MapPin, ArrowRight,
  Filter, Loader2, TrendingUp, Shield, Zap,
  Atom, Cog, Briefcase, Heart, Scale, Palette, BookMarked,
  LayoutGrid, List, Table2, BarChart3, ArrowUpDown,
  TrendingDown, Minus, ChevronRight, Crown, Target,
} from 'lucide-react';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { inr } from '../lib/utils';

const COURSE_CATEGORIES = [
  { id: 'stem', label: 'STEM', icon: Atom },
  { id: 'engineering', label: 'Engineering', icon: Cog },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'medicine', label: 'Medicine', icon: Heart },
  { id: 'law', label: 'Law', icon: Scale },
  { id: 'arts', label: 'Arts', icon: Palette },
  { id: 'social', label: 'Social Sciences', icon: BookMarked },
];

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

function UniversityCard({ uni, onCompare, isComparing }) {
  return (
    <div className="relative rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-[hsl(var(--blue-700))]/10 bg-white border border-black/5 hover:border-[hsl(var(--blue-700))]/20">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex items-center justify-center text-2xl shadow-lg shadow-[hsl(var(--blue-700))]/20">
              {uni.flag}
            </div>
            <div>
              <h3 className="font-bold text-[hsl(var(--blue-900))]">{uni.short_name}</h3>
              <p className="text-[13px] text-[hsl(var(--blue-900))]/60">{uni.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] text-white text-[11px] font-bold shadow">
              #{uni.rank}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Badge className="bg-gradient-to-r from-[hsl(var(--blue-100))] to-[hsl(var(--blue-50))] text-[hsl(var(--blue-700))] text-[11px] border-0">
            {uni.type}
          </Badge>
          <Badge className={uni.scholarships ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 text-[11px] border-0' : 'bg-gray-100 text-gray-600 text-[11px] border-0'}>
            {uni.scholarships ? 'Scholarships' : 'No scholarships'}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--accent))]/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[hsl(var(--accent))]" />
            </div>
            <div>
              <span className="text-[hsl(var(--blue-900))]/50 text-[11px]">Tuition</span>
              <span className="font-bold text-[hsl(var(--blue-900))] block">
                {uni.tuition_usd === 0 ? 'Free' : `$${uni.tuition_usd?.toLocaleString()}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--blue-100))] flex items-center justify-center">
              <Users className="w-4 h-4 text-[hsl(var(--blue-700))]" />
            </div>
            <div>
              <span className="text-[hsl(var(--blue-900))]/50 text-[11px]">Intl Students</span>
              <span className="font-bold text-[hsl(var(--blue-900))] block">{uni.intl_students?.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--blue-100))] flex items-center justify-center">
              <Award className="w-4 h-4 text-[hsl(var(--blue-700))]" />
            </div>
            <div>
              <span className="text-[hsl(var(--blue-900))]/50 text-[11px]">IELTS</span>
              <span className="font-bold text-[hsl(var(--blue-900))] block">{uni.ielts_min}+</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <span className="text-[hsl(var(--blue-900))]/50 text-[11px]">Employment</span>
              <span className="font-bold text-[hsl(var(--blue-900))] block">{uni.就业率}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {uni.popular_courses?.slice(0, 3).map((course) => (
            <span
              key={course}
              className="text-[11px] px-3 py-1 rounded-full bg-white border border-[hsl(var(--blue-100))] text-[hsl(var(--blue-700))]"
            >
              {course}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 px-6 py-4 bg-gradient-to-r from-[hsl(var(--soft-bg))] to-white flex items-center gap-2 border-t border-black/5">
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
          to={`/student-visa?university=${uni.id}`}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl btn-primary text-white h-10 text-[13px] font-bold shadow-lg shadow-[hsl(var(--blue-700))]/20"
        >
          Apply <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function UniversityListItem({ uni, onCompare, isComparing }) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-white border border-black/5 hover:border-[hsl(var(--blue-700))]/20 transition-all duration-300">
      <div className="flex items-stretch">
        <div className="w-24 sm:w-32 bg-gradient-to-br from-[hsl(var(--blue-700))] to-[hsl(var(--blue-500))] flex flex-col items-center justify-center p-4 text-white shrink-0">
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
              {uni.scholarships && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">Scholarship</Badge>}
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
              <div className="text-[14px] font-bold text-emerald-600">{uni.就业率}</div>
            </div>
            <div className="p-3 rounded-xl bg-[hsl(--accent)/10]">
              <div className="text-[10px] text-[hsl(var(--accent))]/70 mb-1">Avg Salary</div>
              <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">${uni.avg_salary_usd?.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "rounded-xl transition-all",
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
    { key: '就业率', label: 'Employment', format: (v) => v, icon: TrendingUp, color: 'emerald' },
    { key: 'avg_salary_usd', label: 'Avg Salary', format: (v) => `$${v?.toLocaleString()}`, icon: TrendingUp, color: 'emerald' },
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
                      {uni.scholarships && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">Scholarship</Badge>}
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
                    {uni.popular_courses?.slice(0, 3).map((c) => (
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
    if (key === '就业率' || key === 'avg_salary_usd' || key === 'ielts_min') {
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
    { key: '就业率', label: 'Employment', format: (v) => v, higher: true },
    { key: 'avg_salary_usd', label: 'Avg Salary', format: (v) => `$${v?.toLocaleString()}`, higher: true },
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
              {uni.popular_courses?.slice(0, 3).map((course) => (
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
                  {uni.scholarships && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">Scholarship</Badge>}
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
                  <div className="text-[14px] font-bold text-emerald-600">{uni.就业率}</div>
                </div>
                <div className="p-3 rounded-xl bg-[hsl(--accent)/10]">
                  <div className="text-[10px] text-[hsl(var(--accent))]/70 mb-1">Avg Salary</div>
                  <div className="text-[14px] font-bold text-[hsl(var(--blue-900))]">${uni.avg_salary_usd?.toLocaleString()}</div>
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

  useEffect(() => {
    axios.get(`${API}/universities`, { params: { limit: 100 } })
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
    return true;
  });

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
  };

  const hasFilters = search || selectedCountry || selectedCourses.length > 0;

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
                    {selectedCourses.length + (selectedCountry ? 1 : 0)}
                  </Badge>
                )}
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-extrabold text-[24px] tracking-[-0.025em] text-[hsl(var(--blue-900))]">
              {filteredUniversities.length} Universities found
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
          ) : filteredUniversities.length === 0 ? (
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
              {filteredUniversities.map((uni) => (
                <UniversityCard
                  key={uni.id}
                  uni={uni}
                  onCompare={handleCompare}
                  isComparing={!!compareList.find((u) => u.id === uni.id)}
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
                />
              ))}
            </div>
          )}
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
    </div>
  );
}
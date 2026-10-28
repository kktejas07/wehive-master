import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ChevronLeft, Copy, Download, Check } from 'lucide-react';

const SECTIONS = [
  { id: 'academic', label: 'Academic Background', target: 150, hint: 'Describe your education, grades and key achievements.' },
  { id: 'why', label: 'Why This Country & Program', target: 200, hint: 'Explain why you chose this destination and course.' },
  { id: 'work', label: 'Work Experience & Skills', target: 150, hint: 'Relevant internships, jobs or projects.' },
  { id: 'goals', label: 'Future Goals', target: 100, hint: 'What will you do after graduating?' },
];

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function WordBadge({ count, target }) {
  const ratio = count / target;
  const cls =
    ratio >= 1 ? 'bg-emerald-50 text-emerald-700' :
    ratio >= 0.8 ? 'bg-amber-50 text-amber-700' :
    'bg-red-50 text-red-600';
  return (
    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${cls}`}>
      {count} / {target} words
    </span>
  );
}

export default function SOPBuilder() {
  const [texts, setTexts] = useState({ academic: '', why: '', work: '', goals: '' });
  const [copied, setCopied] = useState(false);

  const fullSOP = SECTIONS
    .map((s) => `## ${s.label}\n\n${texts[s.id] || '(not written yet)'}`)
    .join('\n\n---\n\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullSOP);
    } catch {
      // clipboard blocked; silently ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullSOP], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statement-of-purpose.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#F8FAFF] min-h-screen">
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#1B2B5E] mb-4"
            >
              <ChevronLeft className="w-4 h-4" /> Back to account
            </Link>
            <h1 className="font-display font-bold text-[28px] sm:text-[34px] tracking-[-0.02em] text-[#1B2B5E]">
              Statement of Purpose Builder
            </h1>
            <p className="mt-1 text-[14px] text-gray-500">
              Write each section, hit your word targets, then copy or download your complete SOP.
            </p>
          </div>

          <div className="space-y-5">
            {SECTIONS.map((s) => {
              const count = wordCount(texts[s.id]);
              return (
                <div key={s.id} className="bg-white border border-[#E8EDF8] rounded-2xl p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div>
                      <div className="text-[15px] font-bold text-[#1B2B5E]">{s.label}</div>
                      <div className="text-[12px] text-gray-500 mt-0.5">{s.hint}</div>
                    </div>
                    <WordBadge count={count} target={s.target} />
                  </div>
                  <textarea
                    value={texts[s.id]}
                    onChange={(e) => setTexts((t) => ({ ...t, [s.id]: e.target.value }))}
                    rows={6}
                    placeholder={`Write your ${s.label.toLowerCase()} here…`}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8EDF8] bg-[#F8FAFF] focus:border-[#011CB5] outline-none text-[14px] text-[#1B2B5E] placeholder:text-gray-400 resize-y transition"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 bg-[#011CB5] text-white rounded-xl px-5 h-11 text-[13px] font-semibold hover:bg-[#0015A0] transition"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy full SOP'}
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 bg-white border border-[#E8EDF8] text-[#1B2B5E] rounded-xl px-5 h-11 text-[13px] font-semibold hover:bg-[#F0F4FF] transition"
            >
              <Download className="w-4 h-4" /> Download .txt
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

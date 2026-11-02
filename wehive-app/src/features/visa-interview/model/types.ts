export interface InterviewQuestion {
  id: string;
  question: string;
  tips: string;
}

export interface InterviewSet {
  id: string;
  label: string;
  flag: string;
  questions: InterviewQuestion[];
}

export interface ScoreItem {
  question: string;
  answer: string;
  score: number;
  feedback?: string;
}

export interface ScoreResult {
  method: 'ai' | 'rubric';
  total: number;
  criteria: { clarity: number; specificity: number; confidence: number; preparation: number };
  items: ScoreItem[];
  error?: boolean;
}

export const INTERVIEW_SETS: InterviewSet[] = [
  {
    id: 'us',
    label: 'US F-1 Student Visa',
    flag: '\u{1F1FA}\u{1F1F8}',
    questions: [
      { id: 'q1', question: 'Why did you choose this particular university and program?', tips: 'Mention specific courses, faculty, research opportunities.' },
      { id: 'q2', question: 'What are your plans after graduation?', tips: 'Discuss OPT, career trajectory, ties to home country.' },
      { id: 'q3', question: 'How will you fund your education and living expenses?', tips: 'Be prepared with specific figures for scholarships, loans, family.' },
      { id: 'q4', question: 'Why study in the US instead of your home country?', tips: 'Focus on program quality and international exposure.' },
      { id: 'q5', question: 'Do you have any relatives in the United States?', tips: 'Be honest. Emphasize your intent to return home.' },
    ],
  },
  {
    id: 'uk',
    label: 'UK Tier 4 Student Visa',
    flag: '\u{1F1EC}\u{1F1E7}',
    questions: [
      { id: 'q1', question: 'Why did you choose to study in the UK?', tips: 'Academic reputation, shorter programs, research strengths.' },
      { id: 'q2', question: 'What are your career plans after completing studies?', tips: 'Mention Graduate Route visa and long-term plans.' },
      { id: 'q3', question: 'Can you explain your chosen course?', tips: 'Show understanding of modules and assessments.' },
    ],
  },
  {
    id: 'canada',
    label: 'Canada Study Permit',
    flag: '\u{1F1E8}\u{1F1E6}',
    questions: [
      { id: 'q1', question: 'Why did you choose Canada for your studies?', tips: 'Quality of education, multicultural environment, PGWP.' },
      { id: 'q2', question: 'Do you have sufficient funds for tuition and living?', tips: 'Show GIC if applicable. Discuss all funding sources.' },
      { id: 'q3', question: 'What are your intentions after completing the program?', tips: 'Mention PGWP and potential PR pathways.' },
    ],
  },
  {
    id: 'australia',
    label: 'Australia Student Visa (500)',
    flag: '\u{1F1E6}\u{1F1FA}',
    questions: [
      { id: 'q1', question: 'Why did you choose Australia for your studies?', tips: 'Program quality, lifestyle, post-study work options.' },
      { id: 'q2', question: 'What is your genuine temporary entrant statement?', tips: 'Show strong ties to home country and genuine study intent.' },
      { id: 'q3', question: 'How will you fund your stay in Australia?', tips: 'Show sufficient funds for tuition + living.' },
    ],
  },
  {
    id: 'schengen',
    label: 'Schengen Student Visa',
    flag: '\u{1F1EA}\u{1F1FA}',
    questions: [
      { id: 'q1', question: 'Why did you choose this European country?', tips: 'Program quality, cultural aspects, EU recognition.' },
      { id: 'q2', question: 'How will you support yourself financially?', tips: 'Proof of funds. Mention blocked accounts if applicable.' },
      { id: 'q3', question: 'What language will you use for daily communication?', tips: 'Discuss language proficiency and prep courses.' },
    ],
  },
];

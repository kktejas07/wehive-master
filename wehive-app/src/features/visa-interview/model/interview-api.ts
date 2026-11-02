import { api } from '@/core/api/client';

import type { ScoreResult } from './types';

export { INTERVIEW_SETS } from './types';
export type { InterviewQuestion, InterviewSet, ScoreItem, ScoreResult } from './types';

export const interviewApi = {
  score: (visa: string, items: { question: string; answer: string }[]) =>
    api<ScoreResult>('/interview/score', { method: 'POST', body: { visa, items } }),
};

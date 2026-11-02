import { api } from '@/core/api/client';

import type { Interview, InterviewQuestion, Story, VisaType } from './types';

export const communityApi = {
  stories: (signal?: AbortSignal) => api<Story[]>('/community/stories', { signal }),
  interviews: (signal?: AbortSignal) => api<Interview[]>('/community/interviews', { signal }),
  interviewQuestions: (signal?: AbortSignal) => api<InterviewQuestion[]>('/community/interview-questions', { signal }),
  visaTypes: (signal?: AbortSignal) => api<VisaType[]>('/community/visa-types', { signal }),
};

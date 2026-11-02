import { api } from '@/core/api/client';

export interface UniversityRecommendation {
  university: string;
  country: string;
  program?: string;
  ranking?: number;
  tuition_range?: string;
  notes?: string;
}

export const studentVisaApi = {
  recommendations: (country: string, track: string, signal?: AbortSignal) =>
    api<UniversityRecommendation[]>('/intakes/recommendations', { query: { country, track }, signal }),
};

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../../../context/AuthContext';

export interface University {
  id: string;
  name: string;
  short_name?: string;
  country: string;
  country_name?: string;
  flag?: string;
  rank?: number;
  tuition_usd?: number;
  ielts_min?: number;
  has_scholarship?: boolean;
  image_url?: string;
  description?: string;
  website?: string;
  [key: string]: unknown;
}

export interface Program {
  id: string;
  name: string;
  degree?: string;
  duration_years?: number;
  tuition_usd?: number;
  ielts_min?: number;
  [key: string]: unknown;
}

export interface UniversityReview {
  id: string;
  rating: number;
  body: string;
  author?: string;
  created_at: string;
}

export function useUniversityDetailViewModel(universityId: string | undefined) {
  const [uni, setUni] = useState<University | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [reviews, setReviews] = useState<UniversityReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [translated, setTranslated] = useState<University | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const fetchUniversity = useCallback(async () => {
    if (!universityId) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API}/universities/${universityId}`);
      setUni(r.data);
      // Fetch programs and reviews in parallel (best-effort)
      const [programsRes, reviewsRes] = await Promise.allSettled([
        axios.get(`${API}/universities/${universityId}/programs`),
        axios.get(`${API}/universities/${universityId}/reviews`),
      ]);
      if (programsRes.status === 'fulfilled') setPrograms(programsRes.value.data?.items ?? programsRes.value.data ?? []);
      if (reviewsRes.status === 'fulfilled') setReviews(reviewsRes.value.data?.items ?? reviewsRes.value.data ?? []);
    } catch {
      setUni(null);
    } finally {
      setLoading(false);
    }
  }, [universityId]);

  useEffect(() => { fetchUniversity(); }, [fetchUniversity]);

  const translate = useCallback(async (lang: string) => {
    if (!universityId) return;
    try {
      const r = await axios.get(`${API}/universities/${universityId}/translate`, { params: { lang } });
      setTranslated(r.data);
    } catch {
      setTranslated(null);
    }
  }, [universityId]);

  return {
    uni,
    programs,
    reviews,
    loading,
    saved, setSaved,
    translated, setTranslated,
    translate,
    showApplyModal, setShowApplyModal,
    refetch: fetchUniversity,
  };
}

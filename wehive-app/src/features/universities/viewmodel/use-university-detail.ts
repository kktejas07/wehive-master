import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { universitiesApi } from '@/features/universities/model/universities';

export function useUniversityDetail(id: string) {
  const q = useQuery({
    queryKey: ['university', id],
    queryFn: () => universitiesApi.get(id),
    enabled: !!id,
    staleTime: 10 * 60_000,
  });

  const view = useMemo(() => {
    const u = q.data;
    if (!u) return null;
    return {
      name: u.name,
      shortName: u.short_name ?? null,
      country: u.country_name ?? u.country,
      flag: u.flag ?? '',
      city: u.city ?? null,
      rank: u.qs_rank ?? u.rank ?? null,
      tuition: u.tuition_usd ? `$${u.tuition_usd.toLocaleString('en-US')}/yr` : null,
      students: u.students ? u.students.toLocaleString('en-US') : null,
      ielts: u.ielts_min ? `${u.ielts_min}+` : null,
      toefl: u.toefl_min ? `${u.toefl_min}+` : null,
      gre: u.gre_required ?? null,
      gmat: u.gmat_required ?? null,
      acceptance: u.acceptance_rate ? `${u.acceptance_rate}%` : null,
      salary: u.avg_salary_usd ? `$${u.avg_salary_usd.toLocaleString('en-US')}` : null,
      scholarships: u.scholarships ?? false,
      courses: u.courses ?? [],
      intakes: u.intakes ?? [],
      website: u.website ?? null,
    };
  }, [q.data]);

  return { view, loading: q.isPending, error: q.error ? (q.error as Error).message : null, refresh: () => q.refetch() };
}

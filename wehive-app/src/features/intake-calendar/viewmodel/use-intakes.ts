import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { intakeApi } from '../model/intake-api';
import type { CountryIntake } from '../model/types';

const FALLBACK: CountryIntake[] = [
  {
    country: 'Canada', flag: '\u{1F1E8}\u{1F1E6}',
    tracks: {
      'Engineering & Masters': [
        { name: 'Fall / September', months: 'Sep-Dec', apply_start: 'Jan', apply_end: 'Jun', popular: true },
        { name: 'Winter / January', months: 'Jan-Apr', apply_start: 'Sep', apply_end: 'Nov', popular: false },
      ],
    },
    notes: 'Fall is the primary intake. Most universities open applications 6-9 months in advance.',
  },
  {
    country: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}',
    tracks: {
      'Engineering & Masters': [
        { name: 'September / October', months: 'Sep-Dec', apply_start: 'Oct (prev yr)', apply_end: 'Jun', popular: true },
      ],
    },
    notes: 'Apply via UCAS for undergraduate. Postgraduate applications go directly to universities.',
  },
  {
    country: 'United States', flag: '\u{1F1FA}\u{1F1F8}',
    tracks: {
      'Engineering & Masters': [
        { name: 'Fall Intake', months: 'Aug-Dec', apply_start: 'Nov', apply_end: 'Jan', popular: true },
        { name: 'Spring Intake', months: 'Jan-May', apply_start: 'Jun', apply_end: 'Aug', popular: false },
      ],
    },
    notes: 'Most major universities prioritize the Fall intake for scholarships.',
  },
  {
    country: 'Australia', flag: '\u{1F1E6}\u{1F1FA}',
    tracks: {
      'Engineering & Masters': [
        { name: 'Semester 1', months: 'Feb-Jun', apply_start: 'Sep', apply_end: 'Dec', popular: true },
        { name: 'Semester 2', months: 'Jul-Nov', apply_start: 'Mar', apply_end: 'May', popular: false },
      ],
    },
    notes: 'Semester 1 in February is the primary intake for Australia.',
  },
  {
    country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}',
    tracks: {
      'Engineering & Masters': [
        { name: 'Winter Semester', months: 'Oct-Mar', apply_start: 'Dec', apply_end: 'Jul', popular: true },
        { name: 'Summer Semester', months: 'Apr-Sep', apply_start: 'Jun', apply_end: 'Jan', popular: false },
      ],
    },
    notes: 'Winter semester is the main intake. Apply through uni-assist for most universities.',
  },
];

export function useIntakes() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['intakes', 'calendar'],
    queryFn: ({ signal }) => intakeApi.calendar(signal),
    staleTime: 30 * 60_000,
  });

  const data = useMemo(() => (q.data?.length ? q.data : FALLBACK), [q.data]);
  const countries = useMemo(() => data.map((c) => ({ name: c.country, flag: c.flag })), [data]);

  const activeCountry = useMemo(
    () => data.find((c) => c.country === selectedCountry) ?? data[0] ?? null,
    [data, selectedCountry],
  );

  const tracks = useMemo(() => (activeCountry ? Object.keys(activeCountry.tracks) : []), [activeCountry]);
  const activeTrack = selectedTrack && tracks.includes(selectedTrack) ? selectedTrack : tracks[0] ?? null;

  const intakes = useMemo(
    () => (activeCountry && activeTrack ? activeCountry.tracks[activeTrack] ?? [] : []),
    [activeCountry, activeTrack],
  );

  return {
    countries, data,
    selectedCountry: activeCountry?.country ?? null,
    setSelectedCountry,
    tracks,
    selectedTrack: activeTrack,
    setSelectedTrack,
    intakes,
    notes: activeCountry?.notes ?? '',
    loading: q.isPending,
    error: q.error ? (q.error as Error).message : null,
    refreshing: q.isRefetching,
    refresh: () => q.refetch(),
  };
}

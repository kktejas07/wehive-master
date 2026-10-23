import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  BASIS_LABEL, decisionWindow, destinationsApi, requirementBadge, RULE_BASIS_LABEL,
} from '@/features/destinations/model/destinations';

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** ViewModel: everything the country page shows, already shaped for display. */
export function useCountry(id: string) {
  const q = useQuery({ queryKey: ['country', id], queryFn: () => destinationsApi.get(id), enabled: !!id, staleTime: 10 * 60_000 });
  const c = q.data;

  const view = useMemo(() => {
    if (!c) return null;
    const p = c.processing;
    const t = p?.time ?? null;
    const win = t ? decisionWindow(t) : null;
    return {
      name: c.name,
      flag: c.flag ?? '',
      badge: requirementBadge(p),
      requirementLabel: p?.requirement_label ?? '',
      note: p?.note ?? null,
      restricted: p?.requirement === 'restricted',
      onArrival: p?.requirement === 'on_arrival',
      time: t && win ? {
        label: t.label,
        basis: BASIS_LABEL[t.basis],
        basisKey: t.basis,
        isAppointment: t.metric === 'appointment_wait',
        window: t.min_days === t.max_days ? `Around ${fmt(win.latest)}` : `${fmt(win.earliest)} – ${fmt(win.latest)}`,
        source: t.source_url ? { name: t.source_name ?? 'Source', url: t.source_url, updated: t.updated ?? null } : null,
      } : null,
      rules: (c.applicant_rules ?? []).map((r) => ({ ...r, badge: RULE_BASIS_LABEL[r.basis] })),
      visaTypes: Object.entries(c.categories ?? {}).map(([type, v]) => ({
        type,
        name: v.name,
        fee: v.fees_inr ? `₹${v.fees_inr.toLocaleString('en-IN')}` : null,
        validity: v.validity ?? null,
        documents: v.documents ?? [],
      })),
      serviceFee: c.application_fee ? `₹${c.application_fee.toLocaleString('en-IN')}` : null,
      feeNote: c.fee_disclaimer ?? null,
    };
  }, [c]);

  return { view, loading: q.isPending, error: q.error ? (q.error as Error).message : null, refresh: () => q.refetch() };
}

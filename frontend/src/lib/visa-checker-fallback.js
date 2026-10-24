// When the live visa provider is unavailable, answer from WeHive's own rules
// (checked daily for Indian passport holders) instead of inventing fees or stays.
const OUTCOME = {
  visa_free: 'VISA_NOT_REQUIRED',
  on_arrival: 'VISA_ON_ARRIVAL',
  evisa: 'EVISA_AVAILABLE',
  evisa_or_on_arrival: 'EVISA_AVAILABLE',
  visa: 'VISA_REQUIRED',
  restricted: 'VISA_REQUIRED',
};

export function fromWehiveRules(country, ctx) {
  const p = country?.processing || {};
  const t = p.time;
  const ruleSources = (country?.applicant_rules || [])
    .filter((r) => r.source_url)
    .map((r) => ({ title: r.source_name, url: r.source_url }));
  const req = p.requirement_source ? [{ title: `${p.requirement_source.name} (checked ${p.requirement_source.checked})`, url: p.requirement_source.url }] : [];
  const sources = [...new Map([...req, ...ruleSources].map((s) => [s.url, s])).values()];
  const procedures = p.requirement && p.requirement !== 'visa_free' ? [{
    title: p.requirement_label,
    description: [p.note, t ? `Usually ${t.label}${t.basis === 'estimate' ? ' (WeHive estimate)' : ''}.` : null].filter(Boolean).join(' '),
    enforcement: p.requirement === 'restricted' ? 'MANDATORY' : p.requirement === 'visa' ? 'MANDATORY' : undefined,
    sources,
  }] : [];
  const rules = (country?.applicant_rules || []).map((r) => ({ title: r.text, description: '', sources: [] }));
  return {
    nationality: ctx.nationality,
    destination: ctx.destination,
    travelDate: ctx.travelDate,
    outcome: OUTCOME[p.requirement] || 'UNKNOWN',
    procedures: [...procedures, ...rules],
    provider: 'WeHive visa rules',
    fetchedAt: new Date().toISOString(),
  };
}

export function unknownResult(ctx) {
  return {
    ...ctx,
    outcome: 'UNKNOWN',
    procedures: [],
    provider: 'Not checked',
    fetchedAt: new Date().toISOString(),
  };
}

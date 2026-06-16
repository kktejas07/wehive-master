export type VisaOutcome =
  | "VISA_REQUIRED"
  | "EVISA_AVAILABLE"
  | "ETA_REQUIRED"
  | "VISA_ON_ARRIVAL"
  | "VISA_NOT_REQUIRED"
  | "UNKNOWN";

export type DocumentKind = "E_VISA" | "VISA" | "ETA" | "EMBASSY_VISA";

export interface MoneyAmount {
  value: number;
  currency: string;
}

export interface ProductOffer {
  name: string;
  documentKind: DocumentKind;
  price?: MoneyAmount;
  governmentFee?: MoneyAmount;
  serviceFee?: MoneyAmount;
  applyUrl?: string;
  processingHours?: number;
  provider: VisaProviderId;
}

export interface VisaProcedure {
  title: string;
  description?: string;
  enforcement?: "MANDATORY" | "RECOMMENDED" | "OPTIONAL";
  lengthOfStayDays?: number;
  offer?: ProductOffer;
  sources?: { title: string; url: string }[];
}

export interface VisaRequirementResult {
  nationality: string;
  destination: string;
  travelDate?: string;
  outcome: VisaOutcome;
  procedures: VisaProcedure[];
  provider: VisaProviderId;
  fetchedAt: string;
  raw?: unknown;
}

export type VisaProviderId = "sherpa" | "simplevisa" | "visahq";

export interface VisaProvider {
  id: VisaProviderId;
  getRequirements(input: {
    nationality: string;
    destination: string;
    travelDate?: string;
  }): Promise<VisaRequirementResult>;
}

function mapDocTypeToOutcome(docTypes: string[] = []): VisaOutcome {
  if (docTypes.includes("ETA")) return "ETA_REQUIRED";
  if (docTypes.includes("E_VISA")) return "EVISA_AVAILABLE";
  if (docTypes.includes("VISA") || docTypes.includes("EMBASSY_VISA"))
    return "VISA_REQUIRED";
  return "UNKNOWN";
}

import i18nIsoCountries from "i18n-iso-countries";

export function toAlpha3(alpha2: string): string | null {
  const code = alpha2.toUpperCase();
  try {
    return i18nIsoCountries.alpha2ToAlpha3(code) ?? null;
  } catch {
    return null;
  }
}

export function toAlpha2(alpha3: string): string | null {
  const code = alpha3.toUpperCase();
  try {
    return i18nIsoCountries.alpha3ToAlpha2(code) ?? null;
  } catch {
    return null;
  }
}

export function requireAlpha3(alpha2: string): string {
  const a3 = toAlpha3(alpha2);
  if (!a3)
    throw new Error(
      `No Alpha-3 mapping for "${alpha2}" — i18n-iso-countries returned null`
    );
  return a3;
}

export function adaptSherpaTrips(
  resp: any,
  ctx: { nationality: string; destination: string; travelDate?: string }
): VisaRequirementResult {
  const included: any[] = resp?.included ?? [];
  const procedures: VisaProcedure[] = included
    .filter((i) => i?.type === "PROCEDURE")
    .map((p) => {
      const attr = p.attributes ?? {};
      const action = (attr.actions ?? []).find((a: any) => a.intent === "apply-product");
      const product = action?.product;
      const docTypes: string[] = attr.documentTypes ?? [];

      const offer: ProductOffer | undefined = product
        ? {
            name: product.name,
            documentKind: (docTypes[0] as DocumentKind) ?? "VISA",
            price: product.price
              ? { value: product.price.value, currency: product.price.currency }
              : undefined,
            applyUrl: action?.url,
            processingHours: product.times?.applicationDeadline?.value,
            provider: "sherpa",
          }
        : undefined;

      const los = (attr.lengthOfStay ?? []).find((l: any) => l.type === "DAYS");

      return {
        title: attr.title,
        description: attr.description,
        enforcement: attr.enforcement,
        lengthOfStayDays: los?.value,
        offer,
        sources: (attr.sources ?? []).map((s: any) => ({ title: s.title, url: s.url })),
      };
    });

  const allDocTypes = procedures.flatMap((p) =>
    p.offer ? [p.offer.documentKind] : []
  );

  return {
    nationality: ctx.nationality,
    destination: ctx.destination,
    travelDate: ctx.travelDate,
    outcome: procedures.length ? mapDocTypeToOutcome(allDocTypes) : "VISA_NOT_REQUIRED",
    procedures,
    provider: "sherpa",
    fetchedAt: new Date().toISOString(),
    raw: resp,
  };
}

export function adaptSimpleVisaEligibility(
  resp: any,
  ctx: { nationality: string; destination: string; travelDate?: string }
): VisaRequirementResult {
  const eligible: boolean = resp?.eligible ?? false;
  const docType: string = resp?.document_type ?? "";
  const price = resp?.price;
  const govFee = resp?.fees?.government;
  const svcFee = resp?.fees?.service;

  const offer: ProductOffer | undefined = eligible
    ? {
        name: resp?.product_name ?? `${ctx.destination} eVisa`,
        documentKind: (docType as DocumentKind) || "E_VISA",
        price: price ? { value: price.amount, currency: price.currency } : undefined,
        governmentFee: govFee ? { value: govFee.amount, currency: govFee.currency } : undefined,
        serviceFee: svcFee ? { value: svcFee.amount, currency: svcFee.currency } : undefined,
        applyUrl: resp?.apply_url,
        provider: "simplevisa",
      }
    : undefined;

  return {
    nationality: ctx.nationality,
    destination: ctx.destination,
    travelDate: ctx.travelDate,
    outcome: eligible ? "EVISA_AVAILABLE" : "UNKNOWN",
    procedures: offer ? [{ title: offer.name, offer }] : [],
    provider: "simplevisa",
    fetchedAt: new Date().toISOString(),
    raw: resp,
  };
}

export function makeSherpaProvider(apiKey: string): VisaProvider {
  return {
    id: "sherpa",
    async getRequirements(input) {
      const res = await fetch("https://api.joinsherpa.io/v2/trips", {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          citizenship: input.nationality,
          destination: input.destination,
          travelDate: input.travelDate,
        }),
      });
      if (!res.ok) throw new Error(`Sherpa ${res.status}`);
      return adaptSherpaTrips(await res.json(), input);
    },
  };
}

export function makeSimpleVisaProvider(apiKey: string, base = "https://api.simplevisa.com"): VisaProvider {
  return {
    id: "simplevisa",
    async getRequirements(input) {
      const res = await fetch(`${base}/v1/eligibility`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          nationality: requireAlpha3(input.nationality),
          destination: requireAlpha3(input.destination),
          travel_date: input.travelDate,
        }),
      });
      if (!res.ok) throw new Error(`SimpleVisa ${res.status}`);
      return adaptSimpleVisaEligibility(await res.json(), input);
    },
  };
}

export function adaptVisaHQ(
  resp: any,
  ctx: { nationality: string; destination: string; travelDate?: string }
): VisaRequirementResult {
  const required: boolean = resp?.visa_required ?? false;
  const type: string = resp?.visa_type ?? "";
  const fee = resp?.total_fee;
  const govFee = resp?.government_fee;
  const svcFee = resp?.service_fee;

  const documentKind: DocumentKind =
    type.toUpperCase().includes("ETA") ? "ETA"
    : type.toUpperCase().includes("E-VISA") || type.toUpperCase().includes("EVISA") ? "E_VISA"
    : "VISA";

  const offer: ProductOffer | undefined = required
    ? {
        name: resp?.product_name ?? `${ctx.destination} visa`,
        documentKind,
        price: fee ? { value: fee.amount, currency: fee.currency } : undefined,
        governmentFee: govFee ? { value: govFee.amount, currency: govFee.currency } : undefined,
        serviceFee: svcFee ? { value: svcFee.amount, currency: svcFee.currency } : undefined,
        applyUrl: resp?.checkout_url,
        provider: "visahq",
      }
    : undefined;

  return {
    nationality: ctx.nationality,
    destination: ctx.destination,
    travelDate: ctx.travelDate,
    outcome: !required ? "VISA_NOT_REQUIRED"
      : documentKind === "ETA" ? "ETA_REQUIRED"
      : documentKind === "E_VISA" ? "EVISA_AVAILABLE"
      : "VISA_REQUIRED",
    procedures: offer ? [{ title: offer.name, offer }] : [],
    provider: "visahq",
    fetchedAt: new Date().toISOString(),
    raw: resp,
  };
}

export function makeVisaHQProvider(
  apiKey: string,
  base = "https://api.visahq.com"
): VisaProvider {
  return {
    id: "visahq",
    async getRequirements(input) {
      const res = await fetch(`${base}/v1/requirements`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          nationality: input.nationality,
          destination: input.destination,
          travel_date: input.travelDate,
        }),
      });
      if (!res.ok) throw new Error(`VisaHQ ${res.status}`);
      return adaptVisaHQ(await res.json(), input);
    },
  };
}

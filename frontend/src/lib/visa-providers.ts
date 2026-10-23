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

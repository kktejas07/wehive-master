export interface IntakePeriod {
  name: string;
  months: string;
  apply_start: string;
  apply_end: string;
  popular: boolean;
}

export interface CountryIntake {
  country: string;
  flag: string;
  tracks: Record<string, IntakePeriod[]>;
  notes: string;
}

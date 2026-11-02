import { useState } from 'react';

import { POF_SCHEMES } from '../model/types';

const COUNTRIES = Object.keys(POF_SCHEMES);

export function useProofOfFunds() {
  const [country, setCountry] = useState(COUNTRIES[0]);
  const scheme = POF_SCHEMES[country];
  return { countries: COUNTRIES, country, setCountry, scheme };
}

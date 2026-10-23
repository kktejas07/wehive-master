// News, blog and event items use name slugs for country_id ("usa", "united-kingdom");
// visa and holiday pages use ISO2 ids ("us", "gb"). One map for both.
export const DESTINATIONS = {
  usa: { label: 'USA', name: 'United States', iso2: 'us' },
  'united-kingdom': { label: 'UK', name: 'United Kingdom', iso2: 'gb' },
  canada: { label: 'CAN', name: 'Canada', iso2: 'ca' },
  australia: { label: 'AUS', name: 'Australia', iso2: 'au' },
  'new-zealand': { label: 'NZ', name: 'New Zealand', iso2: 'nz' },
  ireland: { label: 'IRL', name: 'Ireland', iso2: 'ie' },
  germany: { label: 'GER', name: 'Germany', iso2: 'de' },
  uae: { label: 'UAE', name: 'UAE', iso2: 'ae' },
  singapore: { label: 'SG', name: 'Singapore', iso2: 'sg' },
  japan: { label: 'JPN', name: 'Japan', iso2: 'jp' },
  europe: { label: 'EU', name: 'Europe (Schengen)' },
  india: { label: 'IND', name: 'India' },
  global: { label: 'Global', name: 'Global / Online' },
};

export const destination = (countryId) => {
  const id = (countryId || '').toLowerCase();
  return DESTINATIONS[id] || { label: id.toUpperCase().substring(0, 3), name: id.replace(/-/g, ' ') };
};

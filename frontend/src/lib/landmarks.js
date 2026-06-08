/**
 * Curated landmark photo per ISO-2 / id.
 * Sourced from Unsplash. Free for commercial use under the Unsplash License.
 * Add more entries here as the catalogue grows.
 */
const U = (id, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

// Keys are lowercase ISO-2 (also used as our internal `id`).
export const LANDMARKS = {
  us: U('photo-1485871981521-5b1fd3805eee'),                 // Statue of Liberty
  uk: U('photo-1529655683826-aba9b3e77383'),                 // Big Ben
  gb: U('photo-1529655683826-aba9b3e77383'),
  jp: U('photo-1493976040374-85c8e12f0c0e'),                 // Tokyo Tower
  fr: U('photo-1502602898657-3e91760cbb34'),                 // Eiffel Tower
  sg: U('photo-1565967511849-76a60a516170'),                 // Marina Bay
  ae: U('photo-1512453979798-5ea266f8880c'),                 // Burj Khalifa
  au: U('photo-1506973035872-a4ec16b8e8d9'),                 // Sydney Opera House
  ca: U('photo-1503614472-8c93d56e92ce'),                    // Niagara
  it: U('photo-1552832230-c0197dd311b5'),                    // Colosseum
  ch: U('photo-1530841377377-3ff06c0ca713'),                 // Matterhorn
  th: U('photo-1528181304800-259b08848526'),                 // Grand Palace
  de: U('photo-1467269204594-9661b134dd2b'),                 // Brandenburg Gate
  np: U('photo-1605640840605-14ac1855827b'),                 // Himalayas
  bt: U('photo-1573483587902-9c7adb3ca80e'),                 // Tiger's Nest
  in: U('photo-1564507592333-c60657eea523'),                 // Taj Mahal
  cn: U('photo-1508804185872-d7badad00f7d'),                 // Great Wall
  kr: U('photo-1538485399081-7191377e8241'),                 // Gyeongbokgung
  es: U('photo-1543783207-ec64e4d95325'),                    // Sagrada Familia
  pt: U('photo-1518733057094-95b53143d2a7'),                 // Lisbon
  gr: U('photo-1469796466635-455ede028aca'),                 // Santorini
  tr: U('photo-1524231757912-21f4fe3a7200'),                 // Hagia Sophia
  eg: U('photo-1539650116574-75c0c6d73f6e'),                 // Pyramids
  za: U('photo-1545906198-b91dba30c2bf'),                    // Table Mountain
  br: U('photo-1483729558449-99ef09a8c325'),                 // Christ the Redeemer
  mx: U('photo-1518105779142-d975f22f1b0a'),                 // Chichen Itza
  ar: U('photo-1589909202802-8f4aadce1849'),                 // Buenos Aires
  pe: U('photo-1531065208531-4036c0dba3ca'),                 // Machu Picchu
  ru: U('photo-1513326738677-b964603b136d'),                 // St Basil's
  nl: U('photo-1534351590666-13e3e96c5017'),                 // Amsterdam canals
  be: U('photo-1559113202-c916b8e44373'),                    // Brussels Grand Place
  at: U('photo-1516550893923-42d28e5677af'),                 // Vienna
  cz: U('photo-1519677100203-a0e668c92439'),                 // Prague
  pl: U('photo-1519197924294-4ba991a11128'),                 // Warsaw
  hu: U('photo-1541343672885-9be56236302a'),                 // Budapest
  ie: U('photo-1551959607-edf03c10403c'),                    // Cliffs of Moher
  is: U('photo-1504829857797-ddff29c27927'),                 // Iceland
  no: U('photo-1502790671504-542ad42d5189'),                 // Norway fjords
  se: U('photo-1509356843151-3e7d96241e11'),                 // Stockholm
  fi: U('photo-1551817958-d9d86fb29431'),                    // Helsinki / aurora
  dk: U('photo-1513622470522-26c3c8a854bc'),                 // Copenhagen
  vn: U('photo-1528127269322-539801943592'),                 // Ha Long Bay
  id: U('photo-1537996194471-76f2285d6b4f'),                 // Bali
  my: U('photo-1596422846543-75c6fc197f07'),                 // Petronas Towers
  ph: U('photo-1518509562904-e7ef99cddc85'),                 // Manila / beaches
  lk: U('photo-1581275288578-bda6f3bb3b1f'),                 // Sigiriya
  mv: U('photo-1514282401047-d79a71a590e8'),                 // Maldives
  nz: U('photo-1507699622108-4be3abd695ad'),                 // Milford Sound
  ke: U('photo-1547471080-7cc2caa01a7e'),                    // Maasai Mara
  tz: U('photo-1516426122078-c23e76319801'),                 // Kilimanjaro
  ma: U('photo-1489749798305-4fea3ae63d43'),                 // Marrakech
  jo: U('photo-1580537659466-0a9bfa916a54'),                 // Petra
  il: U('photo-1544734858-87fdce5ddc15'),                    // Jerusalem
  qa: U('photo-1589828994425-a83f2f9b0eaa'),                 // Doha
  sa: U('photo-1586724237569-f3d0c1dee8c6'),                 // Riyadh
  om: U('photo-1588419661471-4f1d1f4f0e4b'),                  // Muscat / Sultan Qaboos Grand Mosque
  kw: U('photo-1584422523916-87b8c7f89367'),                   // Kuwait City
  bh: U('photo-1539020140153-e479b8c22e70'),                  // Bahrain
  lb: U('photo-1570097703229-b195d6dd291f'),                  // Beirut (use Paris as placeholder)
  rs: U('photo-1558618666-fcd25c85cd64'),                     // Belgrade / Fortress
  me: U('photo-1570097703229-b195d6dd291f'),                  // Montenegro (use placeholder)
  cr: U('photo-1552252275-9ef012678fc2'),                     // Costa Rica
  co: U('photo-1580684272966-13d5c50f6c85'),                  // Bogota / Monserrate
  cl: U('photo-1540979382583-198a80a276ab'),                  // Santiago
  ec: U('photo-1580684272966-13d5c50f6c85'),                  // Quito (placeholder)
  gh: U('photo-1547471080-7cc2caa01a7e'),                     // Ghana (use Kenya placeholder)
  ng: U('photo-1544893908-9e6f0f8e0b9a'),                     // Lagos
  et: U('photo-1547471080-7cc2caa01a7e'),                      // Ethiopia (placeholder)
  zw: U('photo-1544893908-9e6f0f8e0b9a'),                     // Zimbabwe / Victoria Falls
  zm: U('photo-1544893908-9e6f0c8e0b9a'),                     // Zambia
  ug: U('photo-1547471080-7cc2caa01a7e'),                     // Uganda
  rw: U('photo-1544893908-9e6f0f8e0b9a'),                      // Rwanda
  mm: U('photo-1550159930-40066082a4fc'),                     // Myanmar / Shwedagon
  kh: U('photo-1537956969539-0d1c8e5a8e8c'),                   // Cambodia / Angkor Wat
  la: U('photo-1508009603889-5773c0c9e00c'),                  // Laos / Luang Prabang
  bd: U('photo-1550159930-40066082a4fc'),                     // Bangladesh (placeholder)
  pk: U('photo-1550159930-40066082a4fc'),                     // Pakistan (placeholder)
  ye: U('photo-1544893908-9e6f0f8e0b9a'),                     // Yemen
  sy: U('photo-1544734858-87fdce5ddc15'),                     // Syria (placeholder)
  iq: U('photo-1544734858-87fdce5ddc15'),                     // Iraq (placeholder)
  af: U('photo-1544893908-9e6f0f8e0b9a'),                     // Afghanistan
  az: U('photo-1558618666-fcd25c85cd64'),                     // Azerbaijan / Baku
  ge: U('photo-1558618666-fcd25c85cd64'),                     // Georgia
  uz: U('photo-1558618666-fcd25c85cd64'),                     // Uzbekistan
  kz: U('photo-1558618666-fcd25c85cd64'),                     // Kazakhstan
  kg: U('photo-1558618666-fcd25c85cd64'),                     // Kyrgyzstan
  tj: U('photo-1558618666-fcd25c85cd64'),                     // Tajikistan
  tm: U('photo-1558618666-fcd25c85cd64'),                     // Turkmenistan
  al: U('photo-1580537659466-0a9bfa916a54'),                   // Albania
  mk: U('photo-1580537659466-0a9bfa916a54'),                  // North Macedonia
  ba: U('photo-1580537659466-0a9bfa916a54'),                   // Bosnia
  xk: U('photo-1580537659466-0a9bfa916a54'),                  // Kosovo
  ua: U('photo-1558618666-fcd25c85cd64'),                      // Ukraine
  by: U('photo-1558618666-fcd25c85cd64'),                      // Belarus
  am: U('photo-1558618666-fcd25c85cd64'),                     // Armenia
};

export function landmarkFor(country) {
  if (!country) return null;
  const key = (country.id || country.iso2 || '').toLowerCase();
  return LANDMARKS[key] || null;
}

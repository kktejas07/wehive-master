/**
 * Continent outlines for a 100×50 equirectangular viewBox.
 * Projection: x = (lon + 180) / 3.6, y = (90 - lat) / 3.6
 * Shapes are stylized but geographically aligned so hub coordinates
 * (also projected) land on the correct continents.
 */
export const CONTINENT_PATHS = [
  // North America
  'M4,7 L10,5.3 L22,5 L27,6.5 L33,8 L35.5,11 L31,12.5 L29,14.5 L28,18 L25.5,17 L23.5,21.5 L21,20 L19,17 L16.5,15.5 L15,11.5 L12,9.5 L6.5,8.5 Z',
  // Greenland
  'M38,4 L42,3 L45,4.5 L44,7 L40,8.5 L38,7 Z',
  // Central America
  'M24,21 L28,23 L31,22.5 L30,24 L27.5,23.5 L24.5,22 Z',
  // South America
  'M31.5,22 L36,22.5 L40.5,26.5 L39,29.5 L37.5,31.5 L34,35 L31,39 L30,40.5 L29,36 L28,31 L27.5,26 L28.5,23 Z',
  // Eurasia (Europe + Asia, with India & Arabia peninsulas)
  'M47,14.5 L48.5,11 L51,9 L53,7 L55,5.5 L62,5 L72,4.5 L83,5 L92,6 L98,8.5 L96,11 L93,13.5 L91,15 L89,16.5 L85,18.5 L81,20.5 L77,22.5 L74,21 L72.5,23.5 L71,25.5 L69.5,23 L67,20 L65,22.5 L62.5,21 L60,17.5 L58.5,16 L57,15 L54,14 L51,15.5 L48.5,15.5 Z',
  // British Isles
  'M48.5,9 L49.5,8.7 L50,9.8 L49.3,11 L48.3,10.5 Z',
  // Africa
  'M48.5,16.5 L53,15.8 L59,17.5 L62,19.5 L64.5,22.5 L61.5,27 L59.5,30.5 L55.5,34.5 L54,33 L53.5,28 L50.5,24 L45.3,21 L47,18 Z',
  // Madagascar
  'M60.3,29.5 L61.3,30 L61,32 L60,31.5 Z',
  // Japan
  'M87.5,13.5 L89,13 L90,15 L89,17 L87.8,17.5 L87,15.5 Z',
  // Southeast Asia / Indonesia
  'M73,23.5 L78,23 L83,24 L86,26 L84,28 L79,28 L75,26 Z',
  // Australia
  'M85.6,28.8 L90.3,29.4 L92.5,32.8 L90.8,35.6 L88,35.8 L83,34.7 L81.7,31.5 L83.5,29.2 Z',
  // New Zealand
  'M95.5,36.5 L97,37.5 L96.5,39.5 L95,40 L94.5,38 Z',
];

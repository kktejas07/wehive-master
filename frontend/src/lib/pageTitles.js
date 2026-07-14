const SITE_NAME = 'We Hive';
const DEFAULT_TITLE = `${SITE_NAME} — Your Global Journey Starts Here`;

// Static path -> title. Checked first, longest/most-specific match wins for prefixes.
const EXACT_TITLES = {
  '/': DEFAULT_TITLE,
  '/about': `About Us | ${SITE_NAME}`,
  '/pricing': `Pricing | ${SITE_NAME}`,
  '/login': `Sign In | ${SITE_NAME}`,
  '/signup': `Create Account | ${SITE_NAME}`,
  '/account': `My Account | ${SITE_NAME}`,
  '/track': `Track Your Application | ${SITE_NAME}`,
  '/assessment': `Visa Assessment | ${SITE_NAME}`,
  '/visa-interview-sandbox': `Visa Interview Sandbox | ${SITE_NAME}`,
  '/help': `Help Center | ${SITE_NAME}`,
  '/contact': `Contact Us | ${SITE_NAME}`,
  '/student-visa': `Student Visa & Universities | ${SITE_NAME}`,
  '/visa-interview': `Visa Interview Prep | ${SITE_NAME}`,
  '/universities': `Universities | ${SITE_NAME}`,
  '/map': `Explore Destinations | ${SITE_NAME}`,
  '/resources': `Student Resources | ${SITE_NAME}`,
  '/intake-calendar': `Intake Calendar | ${SITE_NAME}`,
  '/financial-tools': `Financial Tools | ${SITE_NAME}`,
  '/agent-training': `Agent Training | ${SITE_NAME}`,
  '/emergency': `Emergency Care | ${SITE_NAME}`,
  '/visa-scheduling': `Visa Scheduling | ${SITE_NAME}`,
  '/visa-checker': `Visa Checker | ${SITE_NAME}`,
  '/events': `Global Events | ${SITE_NAME}`,
  '/blog': `Blog | ${SITE_NAME}`,
  '/news': `News | ${SITE_NAME}`,
  '/hive': `The Hive | ${SITE_NAME}`,
  '/us-visa-slots': `US Visa Slot Tracker | ${SITE_NAME}`,
  '/agent-portal/login': `Agent Portal Login | ${SITE_NAME}`,
};

// Path prefix -> title, for dynamic/nested routes (checked if no exact match).
const PREFIX_TITLES = [
  ['/visa/', `Visa Details | ${SITE_NAME}`],
  ['/holiday/', `Holiday Planner | ${SITE_NAME}`],
  ['/destinations/', `Destination Guide | ${SITE_NAME}`],
  ['/university/', `University Details | ${SITE_NAME}`],
  ['/programs/', `Programs | ${SITE_NAME}`],
  ['/track/', `Track Your Application | ${SITE_NAME}`],
  ['/shared/', `Shared Shortlist | ${SITE_NAME}`],
  ['/agent', `Agent Portal | ${SITE_NAME}`],
  ['/admin', `Admin | ${SITE_NAME}`],
];

export function getPageTitle(pathname) {
  if (EXACT_TITLES[pathname]) return EXACT_TITLES[pathname];
  const prefixMatch = PREFIX_TITLES.find(([prefix]) => pathname.startsWith(prefix));
  if (prefixMatch) return prefixMatch[1];
  return DEFAULT_TITLE;
}

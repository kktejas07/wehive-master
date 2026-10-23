import { Compass, House, Newspaper, UserRound, type LucideIcon } from 'lucide-react-native';

/** One list of top-level sections, used by the mobile tab bar and the web navbar. */
export const TABS: { name: string; href: '/' | '/destinations' | '/news' | '/account'; title: string; icon: LucideIcon }[] = [
  { name: 'index', href: '/', title: 'Home', icon: House },
  { name: 'destinations', href: '/destinations', title: 'Destinations', icon: Compass },
  { name: 'news', href: '/news', title: 'News', icon: Newspaper },
  { name: 'account', href: '/account', title: 'Account', icon: UserRound },
];

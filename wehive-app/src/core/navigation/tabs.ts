import { Compass, FileStack, House, Newspaper, Send, UserRound, type LucideIcon } from 'lucide-react-native';

/** One list of top-level sections, used by the mobile tab bar and the web navbar. */
export const TABS: { name: string; href: string; title: string; icon: LucideIcon }[] = [
  { name: 'index',        href: '/',            title: 'Home',    icon: House },
  { name: 'destinations', href: '/destinations', title: 'Explore', icon: Compass },
  { name: 'apply',        href: '/apply',        title: 'Apply',   icon: Send },
  { name: 'track',        href: '/track',        title: 'Track',   icon: FileStack },
  { name: 'account',      href: '/account',      title: 'Account', icon: UserRound },
];

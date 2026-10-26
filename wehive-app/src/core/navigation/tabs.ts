import { Bell, Compass, CreditCard, FileStack, FolderOpen, House, Send, UserRound, type LucideIcon } from 'lucide-react-native';

/** One list of top-level sections, used by the mobile tab bar and the web navbar. */
export const TABS: { name: string; href: string; title: string; icon: LucideIcon }[] = [
  { name: 'index',         href: '/',               title: 'Home',          icon: House },
  { name: 'destinations',  href: '/destinations',   title: 'Explore',       icon: Compass },
  { name: 'apply',         href: '/apply',          title: 'Apply',         icon: Send },
  { name: 'applications',  href: '/applications',   title: 'Applications',  icon: FolderOpen },
  { name: 'notifications', href: '/notifications',  title: 'Alerts',        icon: Bell },
  { name: 'payments',      href: '/payments',       title: 'Payments',      icon: CreditCard },
  { name: 'account',       href: '/account',        title: 'Account',       icon: UserRound },
];

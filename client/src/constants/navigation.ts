import {
  Bell,
  Bookmark,
  Compass,
  LayoutDashboard,
  Luggage,
  Map,
  Navigation,
  Radar,
  Settings,
  User,
  HelpCircle,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

export const dashboardNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/my-trips', label: 'My trips', icon: Luggage },
  { to: '/flight-tracking', label: 'Flight tracking', icon: Radar },
  { to: '/airport-guide', label: 'Airport guide', icon: Navigation },
  { to: '/airport-explorer', label: 'Airport explorer', icon: Compass },
  { to: '/saved-flights', label: 'Saved flights', icon: Bookmark },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/help', label: 'Help', icon: HelpCircle },
];

export const mobileNav: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/my-trips', label: 'Trips', icon: Luggage },
  { to: '/airport-guide', label: 'Guide', icon: Navigation },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
];

export const mapNavItem: NavItem = { to: '/airport-explorer', label: 'Explore', icon: Map };

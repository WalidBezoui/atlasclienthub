
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Users, Send, ListChecks, Settings, Palette, ClipboardList } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Clients',
    href: '/clients',
    icon: Users,
  },
  {
    title: 'Outreach',
    href: '/outreach',
    icon: Send,
  },
  {
    title: 'Audits',
    href: '/audits',
    icon: ListChecks,
  },
  {
    title: 'Snippets',
    href: '/snippets',
    icon: ClipboardList,
  },
  {
    title: 'Brand Guide',
    href: '/brand-guide',
    icon: Palette,
  },
  // {
  //   title: 'Settings',
  //   href: '/settings',
  //   icon: Settings,
  //   disabled: true, // Example of a disabled link
  // },
];

export const APP_NAME = "Atlas Social Studio";

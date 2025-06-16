"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from '@/lib/constants';
import { Logo } from './logo';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <>
      <SidebarHeader>
        <Logo collapsed={isCollapsed} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild={false} // Ensure it's a button for tooltip to work correctly when collapsed
                  className={cn(
                    "w-full justify-start",
                    isCollapsed && "justify-center"
                  )}
                  isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                  tooltip={isCollapsed ? item.title : undefined}
                  disabled={item.disabled}
                  aria-label={item.title}
                >
                  <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-2")} />
                  {!isCollapsed && <span>{item.title}</span>}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}

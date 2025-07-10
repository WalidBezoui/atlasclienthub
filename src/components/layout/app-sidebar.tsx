
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
import { useAuth } from '@/hooks/useAuth'; 

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { user, loading: authLoading } = useAuth(); 

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  if (!user && !authLoading && (pathname === '/login' || pathname === '/signup')) {
    return (
      <>
        <SidebarHeader>
          <Logo collapsed={isCollapsed} />
        </SidebarHeader>
        <SidebarContent>
        </SidebarContent>
      </>
    );
  }
  
  if (authLoading && !(pathname === '/login' || pathname === '/signup')) {
     return (
      <>
        <SidebarHeader>
          <Logo collapsed={isCollapsed} />
        </SidebarHeader>
        <SidebarContent>
        </SidebarContent>
      </>
    );
  }


  return (
    <>
      <SidebarHeader>
        <Logo collapsed={isCollapsed} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} onClick={handleLinkClick}>
                <SidebarMenuButton
                  asChild={false} 
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

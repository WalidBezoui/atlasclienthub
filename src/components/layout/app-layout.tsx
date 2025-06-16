"use client";

import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';

export function AppLayout({ children }: { children: React.ReactNode }) {
  // The `defaultOpen` prop controls the initial state of the sidebar.
  // `true` for expanded, `false` for collapsed.
  // It reads from cookie 'sidebar_state' if available.
  const [defaultOpen, setDefaultOpen] = React.useState(true);

  React.useEffect(() => {
    // Check cookie for sidebar state on client side
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('sidebar_state='))
      ?.split('=')[1];
    if (cookieValue) {
      setDefaultOpen(cookieValue === 'true');
    }
  }, []);


  return (
    <SidebarProvider defaultOpen={defaultOpen} open={defaultOpen} onOpenChange={(open) => setDefaultOpen(open)}>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <AppSidebar />
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

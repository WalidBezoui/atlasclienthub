
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, Users, Send, ListChecks, PlusCircle, TrendingUp, CheckSquare, Rocket, Calendar, HelpCircle, BarChart3, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getDashboardOverview, getMonthlyActivityData, getDailyAgendaItems } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import type { MonthlyActivity, AgendaItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, isPast } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FileQuestion, Clock } from 'lucide-react';

const initialOverviewData = {
  activeClients: 0,
  auditsInProgress: 0,
  outreachToday: 0,
  outreachThisWeek: 0,
  outreachSentThisMonth: 0,
  newLeadsThisMonth: 0,
  awaitingQualifierReply: 0,
};

const initialChartData: MonthlyActivity[] = Array(6).fill(null).map((_, i) => ({ month: format(subMonths(new Date(), 5 - i), 'MMM'), clients: 0, outreach: 0, audits: 0 }));

const chartConfig = {
  clients: { label: "Clients", color: "hsl(var(--chart-1))", icon: Building },
  outreach: { label: "Outreach", color: "hsl(var(--chart-2))", icon: Send },
  audits: { label: "Audits", color: "hsl(var(--chart-3))", icon: ListChecks },
} satisfies ChartConfig;

const AgendaItemCard = ({ item }: { item: AgendaItem }) => {
    const { type, prospect, dueDate } = item;
    let icon, title, description, badgeText, link;
    let badgeVariant: "default" | "secondary" | "outline" | "destructive" = "default";

    const prospectIdentifier = prospect.instagramHandle || prospect.name;
    link = `/outreach?q=${encodeURIComponent(prospectIdentifier)}`;

    switch (type) {
        case 'FOLLOW_UP':
            icon = <Clock className="h-5 w-5 text-yellow-500" />;
            title = `Follow up with ${prospect.name}`;
            description = `Last status: ${prospect.status}`;
            const isOverdue = dueDate && isPast(new Date(dueDate));
            badgeText = dueDate ? `Due ${formatDistanceToNow(new Date(dueDate), { addSuffix: true })}` : 'Follow up';
            badgeVariant = isOverdue ? 'destructive' : 'secondary';
            break;
        case 'INITIAL_CONTACT':
            icon = <Send className="h-5 w-5 text-blue-500" />;
            title = `Initial outreach to ${prospect.name}`;
            description = `New prospect ready for contact.`;
            badgeText = 'To Contact';
            badgeVariant = 'outline';
            break;
        case 'SEND_QUALIFIER':
            icon = <FileQuestion className="h-5 w-5 text-purple-500" />;
            title = `Send qualifier to ${prospect.name}`;
            description = `Prospect has replied and is interested.`;
            badgeText = 'Needs Qualifier';
            badgeVariant = 'default';
            break;
        default:
            return null;
    }

    return (
        <Link href={link} className="block group">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2 rounded-full bg-background group-hover:bg-primary/10">{icon}</div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm group-hover:text-primary truncate">{title}</p>
                        <p className="text-xs text-muted-foreground truncate">{description}</p>
                    </div>
                </div>
                {badgeText && <Badge variant={badgeVariant} className="hidden sm:inline-flex">{badgeText}</Badge>}
            </div>
        </Link>
    );
};

const DashboardSkeleton = () => (
    <div className="space-y-6">
        <PageHeader title="Dashboard" description="Welcome back! Here's your smart overview for today." icon={LayoutDashboard} />
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array(4).fill(0).map((_, index) => (
                <Card key={index}><CardHeader className="pb-2"><Skeleton className="h-4 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
            ))}
        </div>
        <Card>
            <CardHeader><CardTitle>Daily Agenda</CardTitle><CardDescription>Your prioritized list of outreach tasks for today.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
                {Array(3).fill(0).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}
            </CardContent>
        </Card>
        <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader><CardTitle>Activity Overview</CardTitle></CardHeader><CardContent><Skeleton className="h-[300px] w-full"/></CardContent></Card>
            <Card><CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader><CardContent className="grid gap-4">{Array(4).fill(0).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</CardContent></Card>
        </div>
    </div>
);

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const [chartData, setChartData] = useState<MonthlyActivity[]>(initialChartData);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const [overview, monthlyActivity, dailyAgenda] = await Promise.all([
        getDashboardOverview(),
        getMonthlyActivityData(),
        getDailyAgendaItems(),
      ]);
      setOverviewData(overview);
      setChartData(monthlyActivity.length > 0 ? monthlyActivity : initialChartData);
      setAgendaItems(dailyAgenda);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    setIsClient(true); 
    if (!authLoading && user) {
        fetchDashboardData();
    }
  }, [user, authLoading, fetchDashboardData]);

  const displayOverviewData = [
    { metric: 'Active Clients', value: overviewData.activeClients, icon: Users, color: 'text-green-500' },
    { metric: 'Outreach Today', value: overviewData.outreachToday, icon: Rocket, color: 'text-blue-500' },
    { metric: 'New Leads (Month)', value: overviewData.newLeadsThisMonth, icon: TrendingUp, color: 'text-yellow-500' },
    { metric: 'Awaiting Reply', value: overviewData.awaitingQualifierReply, icon: HelpCircle, color: 'text-purple-500' },
  ];

  if (!isClient || isLoadingData || authLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's your smart overview for today."
        icon={LayoutDashboard}
        actions={
          <Link href="/outreach" passHref>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Prospect</Button>
          </Link>
        }
      />

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {displayOverviewData.map((item) => (
          <Card key={item.metric}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.metric}</CardTitle>
              <item.icon className={cn("h-4 w-4 text-muted-foreground", item.color)} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{item.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Activity Overview</CardTitle>
            <CardDescription>Monthly client, outreach, and audit trends for the current year.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.some(d => d.clients > 0 || d.outreach > 0 || d.audits > 0) ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} content={<ChartTooltipContent indicator="dot" />} />
                    <Legend />
                    <Bar dataKey="clients" fill="var(--color-clients)" radius={[4, 4, 0, 0]} name="Clients" />
                    <Bar dataKey="outreach" fill="var(--color-outreach)" radius={[4, 4, 0, 0]} name="Outreach" />
                    <Bar dataKey="audits" fill="var(--color-audits)" radius={[4, 4, 0, 0]} name="Audits" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mb-2" />
                <p className="font-semibold">No activity to display yet</p>
                <p className="text-xs">Start working to see your progress.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><ListChecks className="mr-3 h-5 w-5 text-primary" />Daily Agenda</CardTitle>
            <CardDescription>Your prioritized list of tasks for today.</CardDescription>
          </CardHeader>
          <CardContent>
            {agendaItems.length > 0 ? (
              <div className="space-y-2">
                {agendaItems.map((item, index) => <AgendaItemCard key={`${item.prospect.id}-${index}`} item={item} />)}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <CheckSquare className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-4 font-semibold">You're all caught up!</p>
                <p className="text-sm">No high-priority items on your agenda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

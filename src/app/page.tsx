
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, Users, Send, ListChecks, PlusCircle, TrendingUp, AlertTriangle, Rocket, HelpCircle, Calendar, FileQuestion, Clock, CheckSquare, BarChart3, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import Image from 'next/image';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const initialOverviewData = {
  activeClients: 0,
  auditsInProgress: 0,
  outreachToday: 0,
  outreachThisWeek: 0,
  outreachSentThisMonth: 0,
  newLeadsThisMonth: 0,
  awaitingQualifierReply: 0,
};

const initialChartData: MonthlyActivity[] = [
  { month: "Jan", clients: 0, outreach: 0, audits: 0 },
  { month: "Feb", clients: 0, outreach: 0, audits: 0 },
  { month: "Mar", clients: 0, outreach: 0, audits: 0 },
  { month: "Apr", clients: 0, outreach: 0, audits: 0 },
  { month: "May", clients: 0, outreach: 0, audits: 0 },
  { month: "Jun", clients: 0, outreach: 0, audits: 0 },
];

const chartConfig = {
  clients: {
    label: "Clients",
    color: "hsl(var(--chart-1))",
    icon: Building,
  },
  outreach: {
    label: "Outreach",
    color: "hsl(var(--chart-2))",
    icon: Send,
  },
  audits: {
    label: "Audits",
    color: "hsl(var(--chart-3))",
    icon: ListChecks,
  },
} satisfies ChartConfig;


const AgendaItemCard = ({ item }: { item: AgendaItem }) => {
    const { type, prospect, dueDate } = item;
    let icon, title, description, badgeText, link;
    let badgeVariant: "default" | "secondary" | "outline" | "destructive" = "default";
    let iconColor = "text-primary";

    const prospectIdentifier = prospect.instagramHandle || prospect.name;
    link = `/outreach?q=${encodeURIComponent(prospectIdentifier)}`;

    switch (type) {
        case 'FOLLOW_UP':
            icon = <Clock className="h-5 w-5" />;
            iconColor = "text-yellow-500";
            title = `Follow up with ${prospect.name}`;
            description = `Last status: ${prospect.status}`;
            const isOverdue = dueDate && isPast(new Date(dueDate));
            badgeText = dueDate ? `Due ${formatDistanceToNow(new Date(dueDate), { addSuffix: true })}` : 'Follow up';
            badgeVariant = isOverdue ? 'destructive' : 'secondary';
            break;
        case 'INITIAL_CONTACT':
            icon = <Send className="h-5 w-5" />;
            iconColor = "text-blue-500";
            title = `Initial outreach to ${prospect.name}`;
            description = `New prospect ready for contact.`;
            badgeText = 'To Contact';
            badgeVariant = 'outline';
            break;
        case 'SEND_QUALIFIER':
            icon = <FileQuestion className="h-5 w-5" />;
            iconColor = "text-purple-500";
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
                <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-full bg-background group-hover:bg-primary/10", iconColor)}>
                        {icon}
                    </div>
                    <div>
                        <p className="font-semibold text-sm group-hover:text-primary">{title}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {badgeText && <Badge variant={badgeVariant} className="hidden sm:inline-flex">{badgeText}</Badge>}
                </div>
            </div>
        </Link>
    );
};


const DashboardSkeleton = () => (
    <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array(4).fill(0).map((_, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-1/2" />
                    </CardContent>
                </Card>
            ))}
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center"><ListChecks className="mr-3 h-7 w-7 text-primary" />Daily Agenda</CardTitle>
                <CardDescription>Your prioritized list of outreach tasks for today. Let's get to work!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {Array(3).fill(0).map((_, index) => (
                     <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-4 w-full">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="space-y-1 w-full">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Activity Overview</CardTitle>
                    <CardDescription>Monthly client, outreach, and audit trends for the current year.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] w-full flex items-center justify-center">
                    <Skeleton className="h-full w-full"/>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Quick Actions</CardTitle>
                    <CardDescription>Get started with common tasks.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                     {Array(4).fill(0).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
                </CardContent>
            </Card>
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
    setIsLoadingData(true);
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
      // Optionally set error state and display message
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    setIsClient(true); 
    if (!authLoading) {
      if (user) {
        fetchDashboardData();
      } else {
        // AuthProvider handles redirect
      }
    }
  }, [user, authLoading, fetchDashboardData, router]);

  const displayOverviewData = [
    { metric: 'Outreach Today', value: overviewData.outreachToday, icon: Rocket, color: 'text-green-500' },
    { metric: 'Outreach This Week', value: overviewData.outreachThisWeek, icon: Calendar, color: 'text-blue-500' },
    { metric: 'New Leads This Month', value: overviewData.newLeadsThisMonth, icon: TrendingUp, color: 'text-yellow-500' },
    { metric: 'Awaiting Qualifier Reply', value: overviewData.awaitingQualifierReply, icon: HelpCircle, color: 'text-purple-500' },
  ];

  if (authLoading) {
    return <DashboardSkeleton />;
  }
  if (!user && !authLoading) {
    return null;
  }

  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's your smart overview for today."
        icon={LayoutDashboard}
        actions={
          <Link href="/outreach" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Prospect
            </Button>
          </Link>
        }
      />
    {isLoadingData ? <DashboardSkeleton /> : (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {displayOverviewData.map((item) => (
          <Card key={item.metric} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.metric}
              </CardTitle>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold font-headline">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <ListChecks className="mr-3 h-7 w-7 text-primary" />
            Daily Agenda
          </CardTitle>
          <CardDescription>
            Your prioritized list of outreach tasks for today. Let's get to work!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agendaItems.length > 0 ? (
            <div className="space-y-2">
              {agendaItems.map((item, index) => (
                <AgendaItemCard key={`${item.prospect.id}-${index}`} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <CheckSquare className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-4 font-semibold">You're all caught up!</p>
              <p className="text-sm">No high-priority items on your agenda for today. Great work!</p>
               <Button variant="outline" size="sm" className="mt-4" asChild>
                 <Link href="/outreach">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add a new prospect
                 </Link>
               </Button>
            </div>
          )}
        </CardContent>
      </Card>


      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Activity Overview</CardTitle>
            <CardDescription>Monthly client, outreach, and audit trends for the current year.</CardDescription>
          </CardHeader>
          <CardContent>
            {isClient && chartData.some(d => d.clients > 0 || d.outreach > 0 || d.audits > 0) ? (
               <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip
                        cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                        content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Legend content={({ payload }) => (
                         <div className="flex gap-4 justify-center flex-wrap mt-4">
                            {payload?.map((entry) => {
                                const config = chartConfig[entry.dataKey as keyof typeof chartConfig];
                                if (!config) return null;
                                const Icon = config.icon;
                                return (
                                    <div key={entry.value} className="flex items-center gap-1.5 text-xs">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span>{config.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )} />
                    <Bar dataKey="clients" fill="var(--color-clients)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outreach" fill="var(--color-outreach)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="audits" fill="var(--color-audits)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
                 <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mb-2" />
                    <p className="font-semibold">No activity to display yet</p>
                    <p className="text-xs">Start adding clients, outreach, or audits to see your progress.</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
             <Link href="/clients" passHref>
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" /> Manage Clients
              </Button>
            </Link>
            <Link href="/outreach" passHref>
              <Button variant="outline" className="w-full justify-start">
                <Send className="mr-2 h-4 w-4" /> Go to Outreach Board
              </Button>
            </Link>
            <Link href="/audits" passHref>
              <Button variant="outline" className="w-full justify-start">
                <ListChecks className="mr-2 h-4 w-4" /> View All Audits
              </Button>
            </Link>
             <Link href="/audits/new" passHref>
              <Button variant="default" className="w-full justify-start">
                <PlusCircle className="mr-2 h-4 w-4" /> Generate New IG Audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
    )}
    </div>
  );
}

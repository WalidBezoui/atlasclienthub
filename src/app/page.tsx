
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, Users, Send, ListChecks, Zap, PlusCircle, TrendingUp, AlertTriangle, Compass, CheckSquare, Scaling, Clock, UsersRound, Lightbulb, BrainCircuit, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import Image from 'next/image';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getDashboardOverview, getMonthlyActivityData } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import type { MonthlyActivity } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const initialOverviewData = {
  activeClients: 0,
  auditsInProgress: 0,
  outreachSentThisMonth: 0,
  newLeadsThisMonth: 0,
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
  },
  outreach: {
    label: "Outreach",
    color: "hsl(var(--chart-2))",
  },
  audits: {
    label: "Audits",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const [chartData, setChartData] = useState<MonthlyActivity[]>(initialChartData);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const [overview, monthlyActivity] = await Promise.all([
        getDashboardOverview(),
        getMonthlyActivityData(),
      ]);
      setOverviewData(overview);
      setChartData(monthlyActivity.length > 0 ? monthlyActivity : initialChartData);
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
    { metric: 'Active Clients', value: overviewData.activeClients, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    { metric: 'Audits In Progress', value: overviewData.auditsInProgress, icon: ListChecks, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
    { metric: 'Outreach This Month', value: overviewData.outreachSentThisMonth, icon: Send, color: 'text-green-500', bgColor: 'bg-green-100' },
    { metric: 'New Leads (Interested)', value: overviewData.newLeadsThisMonth, icon: Zap, color: 'text-purple-500', bgColor: 'bg-purple-100' },
  ];

  const fastlaneInsights = [
    {
      id: "control",
      icon: CheckSquare,
      title: "The Commandment of Control",
      question: "Are you building systems you own and fully control, or are you dependent on platforms and factors outside your direct influence? (e.g., client platform changes, algorithm shifts). True Fastlane businesses are built on assets you govern.",
      color: "text-sky-500",
    },
    {
      id: "entry",
      icon: Rocket,
      title: "The Commandment of Entry",
      question: "Is your service offering easily replicable by anyone, or is there a significant barrier to entry? (e.g., specialized skills, unique process, strong brand). A low barrier means high competition and commoditization.",
      color: "text-amber-500",
    },
    {
      id: "need",
      icon: Lightbulb,
      title: "The Commandment of Need",
      question: "Does your service solve a genuine, significant market need or a burning pain point for your target clients? Businesses that solve real problems thrive and command higher value.",
      color: "text-emerald-500",
    },
    {
      id: "time",
      icon: Clock,
      title: "The Commandment of Time",
      question: "Can your business operate and generate income detached from your direct time involvement? (e.g., through scalable systems, automation, delegation, productized services). Trading hours for money is the Slowlane.",
      color: "text-violet-500",
    },
    {
      id: "scale",
      icon: Scaling,
      title: "The Commandment of Scale",
      question: "Can your business effectively serve a larger audience or market (magnitude) or command a higher price point (leverage) without proportionally increasing your effort or costs? Scalability is key to wealth creation.",
      color: "text-rose-500",
    },
  ];


  if (authLoading || (isLoadingData && user && !overviewData.activeClients && !overviewData.auditsInProgress)) { // Show loader if auth loading OR data loading for user and overview is still initial
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading dashboard..." size="lg"/></div>;
  }
  if (!user && !authLoading) {
     // AuthProvider should handle redirect.
     // Return null or a minimal placeholder to avoid rendering page content before redirect.
    return null;
  }

  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back to Atlas Social Studio! Here's an overview of your agency's activities."
        icon={LayoutDashboard}
        actions={
          <Link href="/audits/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> New Audit
            </Button>
          </Link>
        }
      />
    {isLoadingData && !displayOverviewData.some(item => item.value > 0) ? ( // Show skeleton for overview cards only if data is loading AND no data is yet available
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array(4).fill(0).map((_, index) => (
                 <Card key={index} className="shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                        <div className="h-5 w-5 bg-muted rounded-full animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 bg-muted rounded w-1/2 animate-pulse"></div>
                    </CardContent>
                </Card>
            ))}
        </div>
    ) : (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {displayOverviewData.map((item) => (
          <Card key={item.metric} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.metric}
              </CardTitle>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Compass className="mr-3 h-7 w-7 text-primary" />
            Atlas Growth Compass: Fastlane Insights
          </CardTitle>
          <CardDescription>
            Navigate your agency's growth with these core principles from &quot;The Millionaire Fastlane&quot;. Reflect on these checkpoints to build a scalable and impactful business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {fastlaneInsights.map((insight) => (
              <AccordionItem value={insight.id} key={insight.id}>
                <AccordionTrigger className="text-base hover:no-underline">
                  <div className="flex items-center">
                    <insight.icon className={`mr-3 h-5 w-5 shrink-0 ${insight.color ?? 'text-primary'}`} />
                    {insight.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pl-8 pr-2 pb-4">
                  {insight.question}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-muted/50 rounded-md">
              <h4 className="font-semibold text-md flex items-center mb-1">
                <BrainCircuit className="mr-2 h-5 w-5 text-primary" />
                Producer Mindset
              </h4>
              <p className="text-sm text-muted-foreground">
                Focus on creating scalable value and systems. Shift from consuming trends to producing high-impact strategies and assets for your clients and your business.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-md">
              <h4 className="font-semibold text-md flex items-center mb-1">
                <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                Value Skew
              </h4>
              <p className="text-sm text-muted-foreground">
                Strive to deliver disproportionate value. How can your service be 10x better, faster, or significantly different from alternatives? This is how you command premium pricing and loyalty.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-md">
              <h4 className="font-semibold text-md flex items-center mb-1">
                <UsersRound className="mr-2 h-5 w-5 text-primary" />
                Process Over Event
              </h4>
              <p className="text-sm text-muted-foreground">
                Build reliable, repeatable processes for client acquisition, onboarding, service delivery, and achieving results. Sustainable success is built on systems, not isolated wins or luck.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Activity Overview</CardTitle>
            <CardDescription>Monthly client, outreach, and audit trends for the current year.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
                 <div className="h-[300px] w-full flex items-center justify-center bg-muted/30 rounded-md">
                    <LoadingSpinner text="Loading chart data..."/>
                 </div>
            ) : isClient && chartData.some(d => d.clients > 0 || d.outreach > 0 || d.audits > 0) ? (
               <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="clients" fill="var(--color-clients)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outreach" fill="var(--color-outreach)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="audits" fill="var(--color-audits)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
                 <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mb-2" />
                    <p>No activity data to display for the chart yet.</p>
                    <p className="text-xs">Start adding clients, outreach, or audits to see activity.</p>
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
                <Send className="mr-2 h-4 w-4" /> Start Outreach Campaign
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Feature Spotlight: AI Instagram Audits</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
          <div className="md:w-1/2">
            <Image 
              src="https://placehold.co/600x400.png" 
              alt="AI Audit Feature" 
              width={600} 
              height={400} 
              className="rounded-lg shadow-md"
              data-ai-hint="social media analytics" 
            />
          </div>
          <div className="md:w-1/2 space-y-4">
            <p className="text-muted-foreground">
              Leverage our AI-powered tool to generate comprehensive Instagram audits. Simply fill out a quick questionnaire, and our system will provide detailed insights on:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Profile Performance & Optimization</li>
              <li>Audience Demographics & Engagement</li>
              <li>Content Effectiveness & Strategy</li>
              <li>Actionable Areas for Improvement</li>
            </ul>
            <Link href="/audits/new" passHref>
              <Button variant="secondary">
                <TrendingUp className="mr-2 h-4 w-4" /> Try AI Audit Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

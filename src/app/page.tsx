'use client';
import { LayoutDashboard, Users, Send, ListChecks, Zap, PlusCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import Image from 'next/image';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useEffect, useState } from 'react';


const overviewData = [
  { metric: 'Active Clients', value: 12, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  { metric: 'Audits In Progress', value: 3, icon: ListChecks, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
  { metric: 'Outreach Sent (Month)', value: 156, icon: Send, color: 'text-green-500', bgColor: 'bg-green-100' },
  { metric: 'New Leads (Month)', value: 8, icon: Zap, color: 'text-purple-500', bgColor: 'bg-purple-100' },
];

const chartData = [
  { month: "Jan", clients: 5, outreach: 120, audits: 3 },
  { month: "Feb", clients: 7, outreach: 150, audits: 5 },
  { month: "Mar", clients: 6, outreach: 130, audits: 4 },
  { month: "Apr", clients: 8, outreach: 180, audits: 6 },
  { month: "May", clients: 10, outreach: 160, audits: 7 },
  { month: "Jun", clients: 12, outreach: 200, audits: 8 },
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
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back to Atlas Client Hub! Here's an overview of your agency's activities."
        icon={LayoutDashboard}
        actions={
          <Link href="/audits/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> New Audit
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {overviewData.map((item) => (
          <Card key={item.metric} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.metric}
              </CardTitle>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">{item.value}</div>
              {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Activity Overview</CardTitle>
            <CardDescription>Monthly client, outreach, and audit trends.</CardDescription>
          </CardHeader>
          <CardContent>
            {isClient && (
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

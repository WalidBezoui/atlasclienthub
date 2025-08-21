

'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, Users, Flame, UserCheck, PlusCircle, BarChart3, CheckSquare, Clock, FileQuestion, Send, UserRound, ListChecks, ArrowRight, UserPlus, Eye, MessageCircle as MessageCircleIcon, MoreVertical, Heart, MessagesSquare, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardOverview, getMonthlyActivityData, getDailyAgendaItems, getWarmUpPipelineData, updateProspect, getProspects } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import type { MonthlyActivity, AgendaItem, WarmUpPipelineData, WarmUpPipelineItem, WarmUpAction, OutreachProspect, WarmUpActivity, OutreachLeadStage } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConversationTracker } from '@/components/outreach/conversation-tracker';
import { generateContextualScript, type GenerateContextualScriptInput } from '@/ai/flows/generate-contextual-script';
import { WarmUpDialog } from '@/components/outreach/warm-up-dialog';
import { CommentGeneratorDialog } from '@/components/outreach/CommentGeneratorDialog';


const initialOverviewData = {
  activeClients: 0,
  prospectsInWarmUp: 0,
  followUpsDue: 0,
  auditsReady: 0,
};

const initialChartData: MonthlyActivity[] = Array(6).fill(null).map((_, i) => ({ month: format(subMonths(new Date(), 5 - i), 'MMM'), clients: 0, outreach: 0, audits: 0, prospects: 0 }));

const initialWarmUpData: WarmUpPipelineData = {
    totalInWarmUp: 0,
    urgent: [],
    upcoming: [],
    justStarted: [],
};

const chartConfig = {
  prospects: { label: "New Prospects", color: "hsl(var(--chart-1))" },
  outreach: { label: "Outreach", color: "hsl(var(--chart-2))" },
  audits: { label: "Audits", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;


const AgendaItemCard = ({ item }: { item: AgendaItem }) => {
    const router = useRouter();
    const { type, prospect, dueDate, description: itemDescription } = item;
    let icon, title, description, badgeText, link;
    let badgeVariant: "default" | "secondary" | "outline" | "destructive" = "default";

    const prospectIdentifier = prospect.instagramHandle || prospect.name;
    const outreachLink = `/outreach?q=${encodeURIComponent(prospectIdentifier)}`;

    switch (type) {
        case 'FOLLOW_UP':
            icon = <Clock className="h-5 w-5 text-yellow-500" />;
            title = `Follow up with ${prospect.name}`;
            description = `Last status: ${prospect.status}`;
            const isOverdue = dueDate && isPast(new Date(dueDate));
            badgeText = dueDate ? `Due ${formatDistanceToNow(new Date(dueDate), { addSuffix: true })}` : 'Follow up';
            badgeVariant = isOverdue ? 'destructive' : 'secondary';
            link = outreachLink;
            break;
        case 'WARM_UP_ACTION':
            icon = <Flame className="h-5 w-5 text-destructive" />;
            title = `Warm up ${prospect.name}`;
            description = itemDescription || 'Continue warm-up sequence.';
            badgeText = 'Warming Up';
            badgeVariant = 'secondary';
            link = outreachLink;
            break;
        case 'SEND_QUALIFIER':
            icon = <FileQuestion className="h-5 w-5 text-purple-500" />;
            title = `Send qualifier to ${prospect.name}`;
            description = itemDescription || `Prospect replied and is interested.`;
            badgeText = 'Needs Qualifier';
            badgeVariant = 'default';
            link = outreachLink;
            break;
        default:
            return null;
    }

    const handleActionClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push(link);
    };

    return (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer group" onClick={handleActionClick}>
            <div className="flex items-center gap-4 min-w-0">
                <div className="p-2 rounded-full bg-background group-hover:bg-primary/10">{icon}</div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm group-hover:text-primary truncate">{title}</p>
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
            </div>
            {badgeText && <Badge variant={badgeVariant} className="hidden sm:inline-flex">{badgeText}</Badge>}
        </div>
    );
};

const DashboardSkeleton = () => (
    <div className="space-y-6">
        <PageHeader title="Dashboard" description="Welcome back! Here's your smart overview for today." icon={LayoutDashboard} />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {Array(4).fill(0).map((_, index) => (
                <Card key={index}><CardHeader className="pb-2"><Skeleton className="h-4 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
            ))}
        </div>
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
             <Card className="xl:col-span-2"><CardHeader><CardTitle>Activity Overview</CardTitle></CardHeader><CardContent><Skeleton className="h-[300px] w-full"/></CardContent></Card>
             <Card><CardHeader><CardTitle>Daily Briefing</CardTitle><CardDescription>Your prioritized list of outreach tasks for today.</CardDescription></CardHeader>
             <CardContent className="space-y-2">
                 {Array(3).fill(0).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}
             </CardContent>
        </Card>
        </div>
    </div>
);

const WarmUpDashboardCard = ({
  item,
  onLogActivity,
  onViewConversation,
  onOpenWarmUpDialog,
}: {
  item: WarmUpPipelineItem;
  onLogActivity: (prospectId: string, action: WarmUpAction) => void;
  onViewConversation: (prospect: OutreachProspect) => void;
  onOpenWarmUpDialog: (prospect: WarmUpPipelineItem) => void;
}) => {
  
  const getUrgencyBadge = (): { text: string; variant: "destructive" | "secondary" | "outline" } => {
    if (!item.nextActionDue) return { text: "Next", variant: "secondary" };
    const dueDate = new Date(item.nextActionDue);
    if (isNaN(dueDate.getTime())) return { text: "Next", variant: "secondary" };
    if (isPast(dueDate) && !isToday(dueDate)) return { text: "Overdue", variant: "destructive" };
    if (isToday(dueDate)) return { text: "Due Today", variant: "destructive" };
    return { text: `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`, variant: "outline" };
  };

  const { text, variant } = getUrgencyBadge();

  const handleQuickAction = (e: React.MouseEvent, action: WarmUpAction) => {
    e.stopPropagation();
    onLogActivity(item.id, action);
  };
  
  const handleViewConversationClick = (e: React.MouseEvent) => {
     e.stopPropagation();
     onViewConversation(item as OutreachProspect);
  }

  const quickActionIcons: { action: WarmUpAction, icon: React.ElementType, tooltip: string, isDmAction?: boolean }[] = [
      { action: 'Liked Posts', icon: Heart, tooltip: "Log 'Liked Posts'" },
      { action: 'Viewed Story', icon: Eye, tooltip: "Log 'Viewed Story'"},
      { action: 'Replied to Story', icon: MessagesSquare, tooltip: "Reply to Story / Start DM", isDmAction: true },
  ];

  return (
    <div className="p-3 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onOpenWarmUpDialog(item)}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate text-sm hover:underline">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate">@{item.instagramHandle || 'N/A'}</p>
        </div>
         <TooltipProvider>
            <div className="flex items-center gap-1">
                 {quickActionIcons.map(({action, icon: Icon, tooltip, isDmAction}) => {
                     const isDone = item.completedActions.includes(action);
                     const isNextAction = item.nextAction === action;

                     const handleClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (isDone) return;
                        if (isDmAction) {
                            handleViewConversationClick(e);
                        } else {
                            handleQuickAction(e, action);
                        }
                     }

                     return (
                         <Tooltip key={action}>
                             <TooltipTrigger asChild>
                                <Button 
                                    variant={isDone ? 'secondary' : (isNextAction ? 'default' : 'ghost')} 
                                    size="icon" 
                                    className="h-7 w-7" 
                                    onClick={handleClick} 
                                    disabled={isDone}
                                >
                                    <Icon className={cn("h-4 w-4", isDone && 'text-muted-foreground')} />
                                </Button>
                             </TooltipTrigger>
                             <TooltipContent><p>{isDone ? `Already logged '${action}'` : tooltip}</p></TooltipContent>
                         </Tooltip>
                     );
                 })}
            </div>
        </TooltipProvider>
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="text-xs flex justify-between items-center">
            <span className="font-medium text-muted-foreground">Progress</span>
            <span className="font-semibold">{Math.round(item.progress)}%</span>
        </div>
        <Progress value={item.progress} className="h-1.5"/>
        <div className="text-xs flex justify-between pt-1">
            <span className="text-muted-foreground">Next: <span className="font-medium text-foreground">{item.nextAction}</span></span>
            <Badge variant={variant} className="text-xs">{text}</Badge>
        </div>
      </div>
    </div>
  );
};


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const [chartData, setChartData] = useState<MonthlyActivity[]>(initialChartData);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [warmUpData, setWarmUpData] = useState<WarmUpPipelineData>(initialWarmUpData);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { toast } = useToast();
  
  // State for conversation modal
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  const [currentProspectForConversation, setCurrentProspectForConversation] = useState<OutreachProspect | null>(null);
  const [conversationHistoryContent, setConversationHistoryContent] = useState<string | null>(null);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  
  // State for WarmUpDialog
  const [isWarmUpOpen, setIsWarmUpOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<OutreachProspect | null>(null);
  
  // State for CommentGeneratorDialog
  const [isCommentGeneratorOpen, setIsCommentGeneratorOpen] = useState(false);
  const [prospectForComment, setProspectForComment] = useState<OutreachProspect | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const [overview, monthlyActivity, dailyAgenda, warmUpPipeline] = await Promise.all([
        getDashboardOverview(),
        getMonthlyActivityData(),
        getDailyAgendaItems(),
        getWarmUpPipelineData(),
      ]);
      setOverviewData(overview);
      setChartData(monthlyActivity.length > 0 ? monthlyActivity : initialChartData);
      setAgendaItems(dailyAgenda);
      setWarmUpData(warmUpPipeline);
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
  
  const handleLogWarmUpActivity = useCallback(async (prospectId: string, action: WarmUpAction) => {
    const originalWarmUpData = { ...warmUpData };
    
    const updatePipeline = (pipeline: WarmUpPipelineItem[]) => pipeline.map(item => {
        if (item.id === prospectId && !item.completedActions.includes(action)) {
            const newCompletedActions = [...item.completedActions, action];
            const newProgress = (newCompletedActions.length / 4) * 100;
            return { ...item, completedActions: newCompletedActions, progress: newProgress };
        }
        return item;
    });

    setWarmUpData(prev => ({
      ...prev,
      urgent: updatePipeline(prev.urgent),
      upcoming: updatePipeline(prev.upcoming),
      justStarted: updatePipeline(prev.justStarted),
    }));

    try {
        const allProspects = await getProspects();
        const prospectData = allProspects.find(p => p.id === prospectId);
        if (!prospectData) throw new Error("Prospect not found");

        const existingWarmUp = prospectData.warmUp || [];
        
        if (existingWarmUp.some(a => a.action === action)) {
            toast({ title: 'Activity already logged.', variant: 'default' });
            return;
        }

        const newActivity: WarmUpActivity = { 
            id: crypto.randomUUID(), 
            action, 
            date: new Date().toISOString(),
            nextActionDue: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        };
        
        await updateProspect(prospectId, { warmUp: [...existingWarmUp, newActivity] });
        toast({ title: "Activity Logged!", description: `'${action}' recorded.` });
        fetchDashboardData();
    } catch (error: any) {
        toast({ title: "Logging Failed", description: error.message, variant: 'destructive' });
        setWarmUpData(originalWarmUpData);
    }
  }, [warmUpData, toast, fetchDashboardData]);

  const handleOpenConversationModal = useCallback(async (prospect: OutreachProspect | WarmUpPipelineItem) => {
    const allProspects = await getProspects();
    const fullProspect = allProspects.find(p => p.id === prospect.id);
    if (fullProspect) {
      setCurrentProspectForConversation(fullProspect);
      setConversationHistoryContent(fullProspect.conversationHistory || '');
      setIsConversationModalOpen(true);
    } else {
      toast({title: "Error", description: "Could not load prospect details.", variant: "destructive"});
    }
  }, [toast]);
  
  const handleSaveConversation = useCallback(async () => {
    if (!currentProspectForConversation || !conversationHistoryContent) return;
    setIsSavingConversation(true);
    try {
      const isFirstMessage = !currentProspectForConversation.conversationHistory;
      const warmUpActivities = new Set(currentProspectForConversation.warmUp?.map(a => a.action));

      const updates: Partial<OutreachProspect> = {
        conversationHistory: conversationHistoryContent,
        lastContacted: new Date().toISOString()
      };

      if ((isFirstMessage || !warmUpActivities.has('Replied to Story')) && currentProspectForConversation.status === 'Warming Up') {
        const newWarmUpActivity: WarmUpActivity = {
            id: crypto.randomUUID(),
            action: 'Replied to Story',
            date: new Date().toISOString(),
        };
        updates.warmUp = [...(currentProspectForConversation.warmUp || []), newWarmUpActivity];
      }

      await updateProspect(currentProspectForConversation.id, updates);
      toast({ title: 'Conversation Saved', description: `History for ${currentProspectForConversation.name} updated.` });
      setIsConversationModalOpen(false);
      setCurrentProspectForConversation(null);
      fetchDashboardData();
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message || 'Could not save conversation.', variant: 'destructive' });
    } finally {
      setIsSavingConversation(false);
    }
  }, [currentProspectForConversation, conversationHistoryContent, toast, fetchDashboardData]);
  
  const handleGenerateNextReply = useCallback(async (prospect: OutreachProspect, customInstructions: string): Promise<string> => {
    const input: GenerateContextualScriptInput = {
        scriptType: "Generate Next Reply",
        clientName: prospect.name?.trim() || null,
        clientHandle: prospect.instagramHandle?.trim() || null,
        businessName: prospect.businessName?.trim() || null,
        website: prospect.website?.trim() || null,
        prospectLocation: prospect.prospectLocation || null,
        clientIndustry: prospect.industry?.trim() || null,
        visualStyle: prospect.visualStyle?.trim() || null, 
        bioSummary: prospect.bioSummary?.trim() || null,
        uniqueNote: prospect.uniqueNote?.trim() || null,
        businessType: prospect.businessType || null,
        businessTypeOther: prospect.businessTypeOther?.trim() || null,
        accountStage: prospect.accountStage || null,
        followerCount: prospect.followerCount,
        postCount: prospect.postCount,
        avgLikes: prospect.avgLikes,
        avgComments: prospect.avgComments,
        painPoints: prospect.painPoints || [],
        goals: prospect.goals || [],
        leadStatus: prospect.status,
        source: prospect.source || null,
        lastTouch: prospect.lastContacted ? `Last contacted on ${new Date(prospect.lastContacted).toLocaleDateString()}` : 'No prior contact recorded',
        followUpNeeded: prospect.followUpNeeded || false,
        offerInterest: prospect.offerInterest || [],
        tonePreference: prospect.tonePreference || null,
        additionalNotes: prospect.notes?.trim() || null,
        lastMessageSnippet: prospect.lastMessageSnippet?.trim() || null,
        lastScriptSent: prospect.lastScriptSent?.trim() || null,
        linkSent: prospect.linkSent || false,
        carouselOffered: prospect.carouselOffered || false,
        nextStep: prospect.nextStep?.trim() || null,
        conversationHistory: prospect.conversationHistory?.trim() || null,
        customInstructions: customInstructions || null,
    };
    
    try {
      const result = await generateContextualScript(input);
      toast({ title: "Reply Generated", description: "Review the suggestion below." });
      return result.script;
    } catch (error) {
      console.error("Error generating next reply:", error);
      toast({
        title: "Error Generating Reply",
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
      return '';
    }
  }, [toast]);
  
  const handleOpenWarmUpDialog = async (item: WarmUpPipelineItem) => {
    const allProspects = await getProspects();
    const fullProspect = allProspects.find(p => p.id === item.id);
    if (fullProspect) {
      setEditingProspect(fullProspect);
      setIsWarmUpOpen(true);
    } else {
      toast({ title: "Error", description: "Could not load full prospect details.", variant: "destructive" });
    }
  };
  
  const handleWarmUpActivityLogged = (updatedProspect: OutreachProspect) => {
    if (editingProspect && editingProspect.id === updatedProspect.id) {
        setEditingProspect(updatedProspect);
    }
    fetchDashboardData();
  };

  const handleOpenCommentGenerator = (prospect: OutreachProspect) => {
    setProspectForComment(prospect);
    setIsCommentGeneratorOpen(true);
  };
  
  const handleStatusChange = async (id: string, newStatus: OutreachLeadStage) => {
     if (!user) return;
     try {
       await updateProspect(id, { status: newStatus });
       fetchDashboardData();
     } catch (error) {
       toast({ title: 'Error updating status', variant: 'destructive' });
     }
  };


  const displayOverviewData = [
    { metric: 'Active Clients', value: overviewData.activeClients, icon: Users, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/50' },
    { metric: 'In Warm-up', value: overviewData.prospectsInWarmUp, icon: Flame, color: 'text-destructive', bgColor: 'bg-red-100 dark:bg-red-900/50' },
    { metric: 'Follow-ups Due', value: overviewData.followUpsDue, icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50' },
    { metric: 'Ready for Audit', value: overviewData.auditsReady, icon: UserCheck, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
  ];

  if (!isClient || authLoading || isLoadingData) {
    return <DashboardSkeleton />;
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Agency Command Center"
        description="Your daily briefing for outreach and client management."
        icon={LayoutDashboard}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/audits"><ListChecks className="mr-2 h-4 w-4" /> View Audits</Link>
            </Button>
            <Button asChild>
                <Link href="/outreach"><Send className="mr-2 h-4 w-4" /> Go to Outreach</Link>
            </Button>
          </div>
        }
      />
      
       <Dialog open={isConversationModalOpen} onOpenChange={setIsConversationModalOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl h-[90vh] flex flex-col p-0">
          <DialogTitle className="sr-only">Conversation with {currentProspectForConversation?.name}</DialogTitle>
          <div className="flex-grow min-h-0">
            <ConversationTracker
              prospect={currentProspectForConversation}
              value={conversationHistoryContent}
              onChange={setConversationHistoryContent}
              onGenerateReply={handleGenerateNextReply}
              isDirty={currentProspectForConversation ? (currentProspectForConversation.conversationHistory || '') !== (conversationHistoryContent || '') : false}
            />
          </div>
          <DialogFooter className="p-4 border-t gap-2">
            <Button variant="outline" onClick={() => setIsConversationModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConversation} disabled={isSavingConversation}>
              {isSavingConversation ? <div className="animate-spin h-4 w-4 border-2 rounded-full border-t-transparent" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <WarmUpDialog
          isOpen={isWarmUpOpen}
          onClose={() => setIsWarmUpOpen(false)}
          prospect={editingProspect}
          onActivityLogged={handleWarmUpActivityLogged}
          onGenerateComment={handleOpenCommentGenerator}
          onViewConversation={handleOpenConversationModal}
          onStatusChange={handleStatusChange}
        />
        
        <CommentGeneratorDialog
            isOpen={isCommentGeneratorOpen}
            onClose={() => setIsCommentGeneratorOpen(false)}
            prospect={prospectForComment}
            onCommentAdded={handleWarmUpActivityLogged}
        />


       <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {displayOverviewData.map((item) => (
          <Card key={item.metric}>
            <CardContent className="p-4 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-sm font-medium text-muted-foreground">{item.metric}</p>
                <div className={cn("p-1.5 rounded-full", item.bgColor)}>
                  <item.icon className={cn("h-5 w-5", item.color)} />
                </div>
              </div>
              <p className="text-3xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
       <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
           <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="font-headline">Monthly Growth</CardTitle>
                <CardDescription>New prospects, outreach, and audits performed over the past 6 months.</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.some(d => d.prospects || d.outreach || d.audits) ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip cursor={{ fill: "hsl(var(--muted)/0.3)" }} content={<ChartTooltipContent indicator="dot" />} />
                        <Legend />
                        <Bar dataKey="prospects" fill="var(--color-prospects)" radius={[4, 4, 0, 0]} name="New Prospects" />
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
            
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-headline flex items-center"><ListChecks className="mr-3 h-5 w-5 text-primary" />Daily Briefing</CardTitle>
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
       
       <Card>
        <CardHeader>
            <CardTitle className="font-headline flex items-center">
                <MessageCircleIcon className="mr-3 h-5 w-5 text-primary" /> Warm-Up Command Center ({warmUpData.totalInWarmUp})
            </CardTitle>
            <CardDescription>
                A smart, categorized view of your warm-up pipeline with quick actions.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {warmUpData.totalInWarmUp > 0 ? (
                <Tabs defaultValue="urgent">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="urgent">Urgent <Badge variant="destructive" className="ml-2">{warmUpData.urgent.length}</Badge></TabsTrigger>
                        <TabsTrigger value="upcoming">Upcoming <Badge variant="secondary" className="ml-2">{warmUpData.upcoming.length}</Badge></TabsTrigger>
                        <TabsTrigger value="justStarted">Just Started <Badge variant="outline" className="ml-2">{warmUpData.justStarted.length}</Badge></TabsTrigger>
                    </TabsList>
                    <div className="mt-4">
                        <TabsContent value="urgent">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {warmUpData.urgent.map(item => <WarmUpDashboardCard key={item.id} item={item} onLogActivity={handleLogWarmUpActivity} onViewConversation={handleOpenConversationModal} onOpenWarmUpDialog={handleOpenWarmUpDialog} />)}
                            </div>
                        </TabsContent>
                        <TabsContent value="upcoming">
                           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {warmUpData.upcoming.map(item => <WarmUpDashboardCard key={item.id} item={item} onLogActivity={handleLogWarmUpActivity} onViewConversation={handleOpenConversationModal} onOpenWarmUpDialog={handleOpenWarmUpDialog} />)}
                            </div>
                        </TabsContent>
                        <TabsContent value="justStarted">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {warmUpData.justStarted.map(item => <WarmUpDashboardCard key={item.id} item={item} onLogActivity={handleLogWarmUpActivity} onViewConversation={handleOpenConversationModal} onOpenWarmUpDialog={handleOpenWarmUpDialog} />)}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <Flame className="mx-auto h-12 w-12" />
                    <p className="mt-4 font-semibold">Warm-up pipeline is empty</p>
                    <p className="text-sm">Add prospects and set their status to "Warming Up" to see them here.</p>
                </div>
            )}
        </CardContent>
       </Card>
    </div>
  );
}

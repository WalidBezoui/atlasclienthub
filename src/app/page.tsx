

'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LayoutDashboard, Users, Flame, UserCheck, PlusCircle, BarChart3, CheckSquare, Clock, FileQuestion, Send, UserRound, ListChecks, ArrowRight, UserPlus, Eye, MessageCircle as MessageCircleIcon, MoreVertical, Heart, MessagesSquare, Edit, Link as LinkIcon, RefreshCcw, BellRing, TrendingUp, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardOverview, getMonthlyActivityData, getDailyAgendaItems, getWarmUpPipelineData, updateProspect, getProspects, getFollowUpAgendaItems, getReminderAgendaItems, getRevivalAgendaItems } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import type { MonthlyActivity, AgendaItem, WarmUpPipelineData, WarmUpPipelineItem, WarmUpAction, OutreachProspect, OutreachLeadStage, StatusHistoryItem, WarmUpActivity, FollowUpAgendaItem, ReminderAgendaItem, RevivalAgendaItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, formatDistanceToNow, isPast, isToday, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { WarmUpDialog } from '@/components/outreach/warm-up-dialog';
import { CommentGeneratorDialog } from '@/components/outreach/CommentGeneratorDialog';
import { ScriptModal } from '@/components/scripts/script-modal';
import { ConversationTracker } from '@/components/outreach/conversation-tracker';
import { generateContextualScript, type GenerateContextualScriptInput } from '@/ai/flows/generate-contextual-script';
import { FollowUpCard } from '@/components/dashboard/follow-up-card';
import { ReminderCard } from '@/components/dashboard/reminder-card';
import { RevivalCard } from '@/components/dashboard/revival-card';
import { WarmUpCard } from '@/components/dashboard/warm-up-card';


const initialOverviewData = {
  activeClients: 0,
  prospectsInWarmUp: 0,
  followUpsDue: 0,
  auditsReady: 0,
};

const initialChartData: MonthlyActivity[] = Array(6).fill(null).map((_, i) => ({ month: format(subMonths(new Date(), 5 - i), 'MMM'), clients: 0, outreach: 0, audits: 0, prospects: 0 }));

const initialWarmUpData: WarmUpPipelineData = {
    totalInWarmUp: 0,
    overdue: [],
    dueToday: [],
    upcoming: [],
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


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [overviewData, setOverviewData] = useState(initialOverviewData);
  const [chartData, setChartData] = useState<MonthlyActivity[]>(initialChartData);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [warmUpData, setWarmUpData] = useState<WarmUpPipelineData>(initialWarmUpData);
  const [followUpData, setFollowUpData] = useState<FollowUpAgendaItem[]>([]);
  const [reminderData, setReminderData] = useState<ReminderAgendaItem[]>([]);
  const [revivalData, setRevivalData] = useState<RevivalAgendaItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { toast } = useToast();
  
  // State for Warm-up Dialog
  const [isWarmUpOpen, setIsWarmUpOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<OutreachProspect | null>(null);
  
  // State for Comment Generator Dialog
  const [isCommentGeneratorOpen, setIsCommentGeneratorOpen] = useState(false);
  const [prospectForComment, setProspectForComment] = useState<OutreachProspect | null>(null);

  // State for Script Modal
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [scriptModalTitle, setScriptModalTitle] = useState('Generated Script');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [currentProspectForScript, setCurrentProspectForScript] = useState<OutreachProspect | null>(null);
  const [scriptCallback, setScriptCallback] = useState<{ onReady: (script: string) => void } | null>(null);
  
  // State for Conversation History Modal
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  const [currentProspectForConversation, setCurrentProspectForConversation] = useState<OutreachProspect | null>(null);
  const [conversationHistoryContent, setConversationHistoryContent] = useState<string | null>(null);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);


  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const [overview, monthlyActivity, dailyAgenda, warmUpPipeline, followUps, reminders, revival] = await Promise.all([
        getDashboardOverview(),
        getMonthlyActivityData(),
        getDailyAgendaItems(),
        getWarmUpPipelineData(),
        getFollowUpAgendaItems(),
        getReminderAgendaItems(),
        getRevivalAgendaItems(),
      ]);
      setOverviewData(overview);
      setChartData(monthlyActivity.length > 0 ? monthlyActivity : initialChartData);
      setAgendaItems(dailyAgenda);
      setWarmUpData(warmUpPipeline);
      setFollowUpData(followUps);
      setReminderData(reminders);
      setRevivalData(revival);
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
     const allProspects = await getProspects();
     const prospectData = allProspects.find(p => p.id === prospectId);
     if (!prospectData) {
       toast({title: "Error", description: "Could not load prospect details.", variant: "destructive"});
       return;
     }

    if (action === 'Left Comment') {
      setProspectForComment(prospectData);
      setIsCommentGeneratorOpen(true);
      return;
    }
    
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
      overdue: updatePipeline(prev.overdue),
      dueToday: updatePipeline(prev.dueToday),
      upcoming: updatePipeline(prev.upcoming),
    }));

    try {
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
        toast({ title: "Logging Failed", description: error.message, variant: "destructive" });
        setWarmUpData(originalWarmUpData);
    }
  }, [warmUpData, toast, fetchDashboardData]);

  const handleGenerateScript = useCallback(async (
    prospect: OutreachProspect, 
    scriptType: GenerateContextualScriptInput['scriptType'], 
    config: {
      title: string;
      onScriptReady: (script: string) => void;
    }
  ) => {
    setCurrentProspectForScript(prospect);
    setIsGeneratingScript(true);
    setGeneratedScript('');
    setScriptModalTitle(config.title);
    setScriptCallback({ onReady: config.onScriptReady });
    setIsScriptModalOpen(true);
    
    const input: GenerateContextualScriptInput = {
        scriptType,
        clientName: prospect.name,
        clientHandle: prospect.instagramHandle,
        businessName: prospect.businessName,
        uniqueNote: prospect.uniqueNote,
        clientIndustry: prospect.industry,
        visualStyle: prospect.visualStyle,
        businessType: prospect.businessType,
        conversationHistory: prospect.conversationHistory
    };
    
    try {
        const result = await generateContextualScript(input);
        setGeneratedScript(result.script);
    } catch (error: any) {
        toast({ title: 'Script Generation Failed', description: (error as Error).message, variant: 'destructive' });
        setGeneratedScript('Failed to generate script. Please try again.');
    } finally {
        setIsGeneratingScript(false);
    }
  }, [toast]);
  
  const handleDashboardScriptConfirm = useCallback(async (scriptContent: string) => {
    if (!currentProspectForScript) return;

    const allProspects = await getProspects();
    const freshProspect = allProspects.find(p => p.id === currentProspectForScript.id);

    if (!freshProspect) {
      toast({ title: "Error", description: "Could not retrieve latest prospect data.", variant: "destructive" });
      return;
    }

    const now = new Date();
    const newActivity: WarmUpActivity = {
      id: crypto.randomUUID(),
      action: 'Replied to Story',
      date: now.toISOString(),
    };

    const existingWarmUp = freshProspect.warmUp || [];
    const updatedWarmUp = [...existingWarmUp, newActivity];
    const newStatus: OutreachLeadStage = 'Cold';
    const newHistoryEntry: StatusHistoryItem = { status: newStatus, date: now.toISOString() };
    const updatedStatusHistory = [...(freshProspect.statusHistory || []), newHistoryEntry];
    
    const updates: Partial<OutreachProspect> = {
      warmUp: updatedWarmUp,
      conversationHistory: `${freshProspect.conversationHistory || ''}${freshProspect.conversationHistory ? '\n\n' : ''}Me: ${scriptContent}`.trim(),
      lastContacted: now.toISOString(),
      lastScriptSent: "Cold Outreach DM",
      status: newStatus,
      statusHistory: updatedStatusHistory,
    };

    try {
      await updateProspect(freshProspect.id, updates);
      toast({ title: "Action Complete!", description: "Outreach logged and prospect status advanced to 'Cold'." });
      fetchDashboardData();
      setIsScriptModalOpen(false); // Close modal on success
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || 'Could not update prospect.', variant: 'destructive' });
    }
  }, [currentProspectForScript, fetchDashboardData, toast]);


  const handleFollowUpScriptConfirm = useCallback(async (scriptContent: string) => {
    if (!currentProspectForScript) return;
    
    const now = new Date().toISOString();
    const updates: Partial<OutreachProspect> = {
        conversationHistory: `${currentProspectForScript.conversationHistory || ''}${currentProspectForScript.conversationHistory ? '\n\n' : ''}Me: ${scriptContent}`.trim(),
        lastContacted: now,
        lastScriptSent: "Warm Follow-Up DM",
        followUpNeeded: false,
    };
    
    try {
        await updateProspect(currentProspectForScript.id, updates);
        toast({ title: "Follow-Up Sent!", description: "Follow-up logged and prospect updated." });
        fetchDashboardData();
    } catch(error: any) {
        toast({ title: "Update Failed", description: error.message || 'Could not update prospect.', variant: 'destructive' });
    }
  }, [currentProspectForScript, fetchDashboardData, toast]);
  
  const handleReminderScriptConfirm = useCallback(async (scriptContent: string) => {
    if (!currentProspectForScript) {
      toast({ title: "Error", description: "No prospect selected for this action.", variant: "destructive" });
      return;
    }
  
    const allProspects = await getProspects();
    const freshProspect = allProspects.find(p => p.id === currentProspectForScript.id);
  
    if (!freshProspect) {
      toast({ title: "Error", description: "Could not retrieve latest prospect data.", variant: "destructive" });
      return;
    }
  
    const now = new Date();
    const newStatus: OutreachLeadStage = 'Warm';
    const newHistoryEntry: StatusHistoryItem = { status: newStatus, date: now.toISOString() };
  
    const updates: Partial<OutreachProspect> = {
      conversationHistory: `${freshProspect.conversationHistory || ''}${freshProspect.conversationHistory ? '\n\n' : ''}Me: ${scriptContent}`.trim(),
      lastContacted: now.toISOString(),
      lastScriptSent: "Send Reminder",
      followUpNeeded: false, 
      status: newStatus,
      statusHistory: [...(freshProspect.statusHistory || []), newHistoryEntry],
    };
  
    try {
      await updateProspect(currentProspectForScript.id, updates);
      toast({ title: "Reminder Sent!", description: "Status updated to 'Warm' and prospect is no longer in reminders." });
      fetchDashboardData();
    } catch (error: any) {
      console.error("Reminder update failed:", error);
      toast({ title: "Update Failed", description: error.message || 'Could not update prospect.', variant: 'destructive' });
    }
  }, [currentProspectForScript, fetchDashboardData, toast]);


  const handleRegenerateScript = useCallback(async (customInstructions: string, input: GenerateContextualScriptInput): Promise<string | null> => {
    const updatedInput = { ...input, customInstructions };
    
    setIsGeneratingScript(true);
    setGeneratedScript('');
    try {
      const result = await generateContextualScript(updatedInput);
      setGeneratedScript(result.script);
      return result.script;
    } catch (error) {
       toast({ title: 'Regeneration Failed', variant: 'destructive' });
       return null;
    } finally {
      setIsGeneratingScript(false);
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
  
  const handleStatusChange = async (id: string, newStatus: OutreachLeadStage) => {
     if (!user) return;
     try {
       await updateProspect(id, { status: newStatus });
       fetchDashboardData();
     } catch (error) {
       toast({ title: 'Error updating status', variant: 'destructive' });
     }
  };

  const handleOpenConversationModal = async (prospect: OutreachProspect) => {
    const allProspects = await getProspects();
    const fullProspect = allProspects.find(p => p.id === prospect.id);
    if (!fullProspect) {
      toast({ title: "Error", description: "Could not load full prospect details.", variant: "destructive" });
      return;
    }
    setCurrentProspectForConversation(fullProspect);
    setConversationHistoryContent(fullProspect.conversationHistory || null);
    setIsConversationModalOpen(true);
  };
  
  const isConversationDirty = currentProspectForConversation ? (currentProspectForConversation.conversationHistory || '') !== (conversationHistoryContent || '') : false;

  const handleConversationModalCloseAttempt = () => {
    if (isConversationDirty) {
      setShowUnsavedConfirm(true);
    } else {
      setIsConversationModalOpen(false);
      setCurrentProspectForConversation(null);
    }
  };
  
  const handleSaveConversation = async () => {
    if (!currentProspectForConversation || !isConversationDirty) return;
    setIsSavingConversation(true);
    try {
      await updateProspect(currentProspectForConversation.id, { conversationHistory: conversationHistoryContent, lastContacted: new Date().toISOString() });
      fetchDashboardData();
      toast({ title: 'Conversation Saved', description: `History for ${currentProspectForConversation.name} updated.` });
      setIsConversationModalOpen(false);
      setCurrentProspectForConversation(null);
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message || 'Could not save conversation.', variant: 'destructive' });
    } finally {
      setIsSavingConversation(false);
    }
  };

  const displayOverviewData = [
    { metric: 'Active Clients', value: overviewData.activeClients, icon: Users, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/50' },
    { metric: 'In Warm-up', value: warmUpData.totalInWarmUp, icon: Flame, color: 'text-destructive', bgColor: 'bg-red-100 dark:bg-red-900/50' },
    { metric: 'Follow-ups Due', value: followUpData.length, icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50' },
    { metric: 'Ready for Audit', value: overviewData.auditsReady, icon: UserCheck, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
  ];

  if (!isClient || authLoading || isLoadingData) {
    return <DashboardSkeleton />;
  }

  const actionHubTabs = [
    { value: "warmUp", label: "Warm-Up", icon: Flame, count: warmUpData.totalInWarmUp, color: "text-destructive" },
    { value: "followUp", label: "Follow-Up", icon: RefreshCcw, count: followUpData.length, color: "text-yellow-500" },
    { value: "reminders", label: "Reminders", icon: BellRing, count: reminderData.length, color: "text-purple-500" },
    { value: "revival", label: "Revival", icon: TrendingUp, count: revivalData.length, color: "text-blue-500" },
  ];


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
      
       <ScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => {
            setIsScriptModalOpen(false);
            setScriptCallback(null);
            setCurrentProspectForScript(null);
        }}
        scriptContent={generatedScript}
        title={scriptModalTitle}
        onRegenerate={handleRegenerateScript}
        isLoadingInitially={isGeneratingScript}
        onConfirm={handleDashboardScriptConfirm}
        prospect={currentProspectForScript}
      />
      
       <WarmUpDialog
          isOpen={isWarmUpOpen}
          onClose={() => setIsWarmUpOpen(false)}
          prospect={editingProspect}
          onActivityLogged={handleWarmUpActivityLogged}
          onGenerateComment={(p) => {
            setProspectForComment(p);
            setIsCommentGeneratorOpen(true);
          }}
          onViewConversation={() => {
            if (editingProspect) {
              handleOpenConversationModal(editingProspect);
            }
          }}
          onStatusChange={handleStatusChange}
        />
        
        <CommentGeneratorDialog
            isOpen={isCommentGeneratorOpen}
            onClose={() => setIsCommentGeneratorOpen(false)}
            prospect={prospectForComment}
            onCommentAdded={handleWarmUpActivityLogged}
        />

        <Dialog open={isConversationModalOpen} onOpenChange={(open) => {
            if (!open) handleConversationModalCloseAttempt();
            else setIsConversationModalOpen(true);
        }}>
            <DialogContent className="sm:max-w-xl md:max-w-2xl h-[90vh] flex flex-col p-0">
               <DialogTitle className="sr-only">Manage Conversation with {currentProspectForConversation?.name}</DialogTitle>
               <DialogDescription className="sr-only">
                View, edit, and manage the full conversation history.
               </DialogDescription>
              <div className="flex-grow min-h-0">
                <ConversationTracker
                  prospect={currentProspectForConversation}
                  value={conversationHistoryContent}
                  onChange={setConversationHistoryContent}
                  onGenerateReply={generateContextualScript}
                  isDirty={isConversationDirty}
                />
              </div>
              <DialogFooter className="p-4 border-t gap-2">
                <Button variant="outline" onClick={handleConversationModalCloseAttempt}>Cancel</Button>
                <Button onClick={handleSaveConversation} disabled={isSavingConversation || !isConversationDirty}>
                  {isSavingConversation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>
        <AlertDialog open={showUnsavedConfirm} onOpenChange={setShowUnsavedConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes. Are you sure you want to discard them?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowUnsavedConfirm(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        setShowUnsavedConfirm(false);
                        setIsConversationModalOpen(false);
                        setCurrentProspectForConversation(null);
                    }}>
                        Discard
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


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
                <CardDescription>Your prioritized list of outreach tasks for today.</CardDescription>
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
                Action Hub
            </CardTitle>
            <CardDescription>
                Your centralized command center for all prospect engagement activities.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <Tabs defaultValue="warmUp" className="md:grid md:grid-cols-1 lg:grid-cols-[250px_1fr] lg:gap-6">
                <TabsList className="h-auto flex-wrap justify-start lg:flex lg:flex-col lg:items-stretch lg:justify-start lg:h-auto lg:w-full">
                  {actionHubTabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="justify-start gap-2 text-base md:text-sm py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/50 transition-colors">
                       <tab.icon className={cn("mr-2 h-5 w-5", tab.color)}/>
                       <span className="flex-1 text-left">{tab.label}</span>
                       <Badge variant={cn({'default': tab.value === 'warmUp', 'secondary': tab.value !== 'warmUp' })} className="ml-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{tab.count}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="mt-4 lg:mt-0">
                  <TabsContent value="warmUp">
                      {warmUpData.totalInWarmUp > 0 ? (
                           <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                             {warmUpData.overdue.map(item => <WarmUpCard key={item.id} item={item} onLogActivity={handleLogWarmUpActivity} onOpenWarmUpDialog={handleOpenWarmUpDialog} onGenerateOutreach={(prospect) => handleGenerateScript(prospect as OutreachProspect, 'Cold Outreach DM', { title: "Generate Cold Outreach DM", onScriptReady: handleDashboardScriptConfirm })} />)}
                             {warmUpData.dueToday.map(item => <WarmUpCard key={item.id} item={item} onLogActivity={handleLogWarmUpActivity} onOpenWarmUpDialog={handleOpenWarmUpDialog} onGenerateOutreach={(prospect) => handleGenerateScript(prospect as OutreachProspect, 'Cold Outreach DM', { title: "Generate Cold Outreach DM", onScriptReady: handleDashboardScriptConfirm })} />)}
                             {warmUpData.upcoming.map(item => <WarmUpCard key={item.id} item={item} onLogActivity={handleLogWarmUpActivity} onOpenWarmUpDialog={handleOpenWarmUpDialog} onGenerateOutreach={(prospect) => handleGenerateScript(prospect as OutreachProspect, 'Cold Outreach DM', { title: "Generate Cold Outreach DM", onScriptReady: handleDashboardScriptConfirm })} />)}
                           </div>
                      ) : (
                          <div className="text-center py-10 text-muted-foreground rounded-lg bg-muted/50">
                              <Flame className="mx-auto h-12 w-12" />
                              <p className="mt-4 font-semibold">Warm-up pipeline is empty</p>
                          </div>
                      )}
                  </TabsContent>
                  <TabsContent value="followUp">
                       {followUpData.length > 0 ? (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                              {followUpData.map(item => (
                                  <FollowUpCard 
                                      key={item.id} 
                                      item={item} 
                                      onGenerateFollowUp={(prospect) => handleGenerateScript(prospect, 'Warm Follow-Up DM', { title: 'Generate Follow-Up', onScriptReady: handleFollowUpScriptConfirm })}
                                  />
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-10 text-muted-foreground rounded-lg bg-muted/50">
                              <CheckSquare className="mx-auto h-12 w-12 text-green-500" />
                              <p className="mt-4 font-semibold">Follow-up inbox is clear!</p>
                          </div>
                      )}
                  </TabsContent>
                   <TabsContent value="reminders">
                      {reminderData.length > 0 ? (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                              {reminderData.map(item => (
                                  <ReminderCard 
                                      key={item.id} 
                                      item={item} 
                                      onGenerateReminder={(prospect) => handleGenerateScript(prospect as OutreachProspect, 'Send Reminder', { title: "Generate Reminder", onScriptReady: handleReminderScriptConfirm })}
                                      onViewConversation={() => handleOpenConversationModal(item)}
                                  />
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-10 text-muted-foreground rounded-lg bg-muted/50">
                              <CheckSquare className="mx-auto h-12 w-12 text-green-500" />
                              <p className="mt-4 font-semibold">No reminders needed!</p>
                          </div>
                      )}
                  </TabsContent>
                  <TabsContent value="revival">
                      {revivalData.length > 0 ? (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                              {revivalData.map(item => (
                                  <RevivalCard 
                                      key={item.id} 
                                      item={item} 
                                      onGenerateScript={(prospect, scriptType, onConfirm) => handleGenerateScript(prospect, scriptType, { title: `Generate ${scriptType}`, onScriptReady: onConfirm })}
                                      onLogActivity={async () => {
                                          await updateProspect(item.id, { lastContacted: new Date().toISOString() });
                                          toast({ title: 'Activity Logged!'});
                                          fetchDashboardData();
                                      }}
                                       onViewConversation={() => handleOpenConversationModal(item as OutreachProspect)}
                                  />
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-10 text-muted-foreground rounded-lg bg-muted/50">
                              <CheckSquare className="mx-auto h-12 w-12 text-green-500" />
                              <p className="mt-4 font-semibold">Revival pipeline is empty.</p>
                          </div>
                      )}
                  </TabsContent>
                </div>
            </Tabs>
        </CardContent>
       </Card>

    </div>
  );
}

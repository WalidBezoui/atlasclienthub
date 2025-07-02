
'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { Send, PlusCircle, Edit, Trash2, Search, Filter, ChevronDown, AlertTriangle, Bot, Loader2, Briefcase, Globe, Link as LinkIcon, Target, AlertCircle, MessageSquare, Info, Settings2, Sparkles, HelpCircle, BarChart3, RefreshCw, Palette, FileText, Star, Calendar, MessageCircle, FileUp, ListTodo, MessageSquareText, MessagesSquare, Save, FileQuestion, GraduationCap, MoreHorizontal, Wrench } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { OutreachProspect, OutreachLeadStage, StatusHistoryItem } from '@/lib/types';
import { OUTREACH_LEAD_STAGE_OPTIONS } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { addProspect, getProspects, updateProspect, deleteProspect as fbDeleteProspect, updateMissingProspectTimestamps } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { cn } from '@/lib/utils';
import { useScriptContext } from '@/contexts/ScriptContext';
import { generateContextualScript, type GenerateContextualScriptInput } from '@/ai/flows/generate-contextual-script';
import { generateQualifierQuestion, type GenerateQualifierInput } from '@/ai/flows/generate-qualifier-question';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConversationTracker } from '@/components/outreach/conversation-tracker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ProspectForm } from '@/components/outreach/prospect-form';
import { RapidProspectDialog } from '@/components/outreach/RapidProspectDialog';
import { ScriptModal } from '@/components/scripts/script-modal';
import { formatDistanceToNow } from 'date-fns';
import { ToastAction } from '@/components/ui/toast';


const ProspectTimelineTooltip = ({ prospect }: { prospect: OutreachProspect }) => {
    if (!prospect.createdAt) return null;

    const history = [
        { status: 'Added' as const, date: prospect.createdAt },
        ...(prospect.statusHistory || [])
    ];
    
    const uniqueHistoryMap = new Map<string, {status: OutreachLeadStage | 'Added', date: string}>();
    history.forEach(event => {
        // Use a more robust key to avoid merging events on the same day with the same status
        const key = `${event.status}_${new Date(event.date).toISOString()}`;
        if (!uniqueHistoryMap.has(key)) {
            uniqueHistoryMap.set(key, event);
        }
    });
    const uniqueHistory = Array.from(uniqueHistoryMap.values());

    return (
        <TooltipContent>
            <div className="p-2 space-y-1.5 text-xs w-56">
                <p className="font-bold mb-1">Prospect Timeline</p>
                <Separator />
                {uniqueHistory.map((event, index) => (
                    <div key={index} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{event.status}</span>
                        <span className="font-medium">{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                ))}
            </div>
        </TooltipContent>
    );
};


function OutreachPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setClientContext, clearContext: clearScriptContext } = useScriptContext();
  const [prospects, setProspects] = useState<OutreachProspect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<OutreachLeadStage>>(new Set(OUTREACH_LEAD_STAGE_OPTIONS));
  const [showOnlyNeedsFollowUp, setShowOnlyNeedsFollowUp] = useState(false);
  
  // State for forms
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isRapidAddOpen, setIsRapidAddOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<OutreachProspect | undefined>(undefined);
  const [prospectToDelete, setProspectToDelete] = useState<OutreachProspect | null>(null);
  
  // State for script modal
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [scriptModalTitle, setScriptModalTitle] = useState("Generated Script");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [currentProspectForScript, setCurrentProspectForScript] = useState<OutreachProspect | null>(null);
  const [currentScriptGenerationInput, setCurrentScriptGenerationInput] = useState<GenerateContextualScriptInput | null>(null);
  const [scriptModalConfig, setScriptModalConfig] = useState<any>({});
  
  // State for conversation modal
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  const [currentProspectForConversation, setCurrentProspectForConversation] = useState<OutreachProspect | null>(null);
  const [conversationHistoryContent, setConversationHistoryContent] = useState<string | null>(null);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  
  // State for Undo Delete
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, { prospect: OutreachProspect; dismissToast: () => void;}>>(new Map());
  const timeoutMapRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const { toast } = useToast();

  const scriptMenuItems: Array<{label: string, type: GenerateContextualScriptInput['scriptType']}> = [
    { label: "Cold Outreach DM", type: "Cold Outreach DM" },
    { label: "Warm Follow-Up DM", type: "Warm Follow-Up DM" },
    { label: "Audit Delivery Message", type: "Audit Delivery Message" },
    { label: "Send Reminder", type: "Send Reminder" },
    { label: "Soft Close", type: "Soft Close" },
  ];
  
  const sortProspects = (prospectList: OutreachProspect[]) => {
    return [...prospectList].sort((a, b) => {
        const aFollowUp = a.followUpNeeded || false;
        const bFollowUp = b.followUpNeeded || false;
        if (aFollowUp !== bFollowUp) {
            return aFollowUp ? -1 : 1;
        }
        
        // Handle cases where createdAt might be missing for very old prospects
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        
        return dateB.getTime() - dateA.getTime();
    });
  };


  const fetchProspects = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedProspects = await getProspects();
      setProspects(sortProspects(fetchedProspects));
    } catch (error) {
      console.error("Error fetching prospects:", error);
      toast({ title: "Error", description: "Could not fetch prospects.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);
  
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
        setSearchTerm(query);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchProspects();
    }
  }, [user, authLoading, fetchProspects]);
  
  // Effect for cleaning up timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutMapRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);


  const handleSaveProspect = useCallback(async (prospectData: Omit<OutreachProspect, 'id'|'userId'> | OutreachProspect) => {
     if (!user) {
        toast({title: "Authentication Error", description: "You must be logged in.", variant: "destructive"});
        return;
    }
    try {
        if ('id' in prospectData && prospectData.id) {
            await updateProspect(prospectData.id, prospectData as Partial<OutreachProspect>);
            toast({ title: "Success", description: `Prospect ${prospectData.name} updated.` });
        } else {
            await addProspect(prospectData as Omit<OutreachProspect, 'id'|'userId' | 'createdAt'>);
            toast({ title: "Success", description: `Prospect ${prospectData.name} added.` });
        }
        
        fetchProspects();
        setIsEditFormOpen(false);
        setIsRapidAddOpen(false);
        setEditingProspect(undefined);
    } catch (error: any) {
        console.error("Error saving prospect:", error);
        toast({ title: "Error", description: error.message || "Could not save prospect.", variant: "destructive"});
    }
  }, [user, fetchProspects, toast]);

  const handleUndoDelete = (prospectId: string) => {
    const timeoutId = timeoutMapRef.current.get(prospectId);
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutMapRef.current.delete(prospectId);
    }

    const pendingDeleteData = pendingDeletes.get(prospectId);
    if (pendingDeleteData) {
        const { prospect, dismissToast } = pendingDeleteData;
        dismissToast();

        // Add the prospect back to the list and re-sort
        setProspects(current => sortProspects([...current, prospect]));
        toast({ title: "Deletion Canceled", description: `"${prospect.name}" has been restored.` });

        // Clean up from pending deletes map
        setPendingDeletes(current => {
            const newMap = new Map(current);
            newMap.delete(prospectId);
            return newMap;
        });
    }
  };
  
 const confirmDeleteProspect = () => {
    if (!prospectToDelete) return;

    const DELETION_UNDO_DELAY = 8000;
    const prospect = { ...prospectToDelete };
    setProspectToDelete(null);

    setProspects(current => current.filter(p => p.id !== prospect.id));

    const { dismiss } = toast({
      title: "Prospect Deleted",
      description: `"${prospect.name}" will be removed permanently.`,
      duration: DELETION_UNDO_DELAY,
      action: (
        <ToastAction altText="Undo" onClick={() => handleUndoDelete(prospect.id)}>
          Undo
        </ToastAction>
      ),
    });

    const timeoutId = setTimeout(() => {
      fbDeleteProspect(prospect.id)
        .catch(err => {
          toast({ title: "Final Deletion Failed", description: `Could not delete "${prospect.name}". Restoring.`, variant: "destructive" });
          handleUndoDelete(prospect.id);
        });
      setPendingDeletes(current => {
        const newMap = new Map(current);
        newMap.delete(prospect.id);
        return newMap;
      });
      timeoutMapRef.current.delete(prospect.id);
    }, DELETION_UNDO_DELAY);

    timeoutMapRef.current.set(prospect.id, timeoutId);
    setPendingDeletes(current => new Map(current).set(prospect.id, { prospect, dismissToast: dismiss }));
  };

  const handleStatusChange = useCallback(async (prospectId: string, newStatus: OutreachLeadStage) => {
    if (!user) return;
    const prospectToUpdate = prospects.find(p => p.id === prospectId);
    if (!prospectToUpdate) return;
    
    const newLastContacted = new Date().toISOString();
    const newHistoryEntry: StatusHistoryItem = { status: newStatus, date: newLastContacted };
    const newStatusHistory = [...(prospectToUpdate.statusHistory || []), newHistoryEntry];
    
    try {
      await updateProspect(prospectId, { 
        status: newStatus,
        lastContacted: newLastContacted,
        statusHistory: newStatusHistory
      });
      fetchProspects();
      toast({ title: "Status Updated", description: `Prospect status changed to ${newStatus}.` });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
      fetchProspects(); 
    }
  }, [user, prospects, fetchProspects, toast]);

  const handleFollowUpToggle = useCallback(async (prospectId: string, currentFollowUpStatus: boolean) => {
    if (!user) return;
    const newFollowUpStatus = !currentFollowUpStatus;
    try {
        await updateProspect(prospectId, { followUpNeeded: newFollowUpStatus });
        toast({ title: "Follow-up status updated." });
        fetchProspects(); // Refetch to re-sort the list
    } catch (error) {
        console.error("Error updating follow-up status:", error);
        toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  }, [user, fetchProspects, toast]);

  const handleScriptGenerationError = (error: any, title: string) => {
    console.error(title, error);
    toast({ title, description: (error as Error).message || "Could not generate script.", variant: "destructive" });
    setScriptModalTitle(title);
    setGeneratedScript("Failed to generate script. Please try again.");
  };

  const handleGenerateScript = useCallback(async (prospect: OutreachProspect, scriptType: GenerateContextualScriptInput['scriptType']) => {
    setCurrentProspectForScript(prospect);
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    setGeneratedScript('');
    setScriptModalTitle(`Generating ${scriptType}...`);
    
    const input: GenerateContextualScriptInput = {
        scriptType,
        clientName: prospect.name?.trim() || null,
        clientHandle: prospect.instagramHandle?.trim() || null,
        businessName: prospect.businessName?.trim() || null,
        website: prospect.website?.trim() || null,
        prospectLocation: prospect.prospectLocation || null,
        clientIndustry: prospect.industry?.trim() || null,
        visualStyle: prospect.visualStyle?.trim() || null, 
        bioSummary: prospect.bioSummary?.trim() || null, 
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
    };
    
    setCurrentScriptGenerationInput(input);

    const onConfirmScript = async (scriptContent: string) => {
      if (!prospect) return;

      const currentHistory = prospect.conversationHistory || '';
      const newHistory = `${currentHistory}${currentHistory ? '\n\n' : ''}Me: ${scriptContent}`.trim();
      const contactDate = new Date().toISOString();

      const updates: Partial<OutreachProspect> = {
          conversationHistory: newHistory,
          lastContacted: contactDate,
          lastScriptSent: scriptType,
      };

      let newStatus: OutreachLeadStage | undefined;
      if (prospect.status === 'To Contact' && scriptType === 'Cold Outreach DM') {
          newStatus = 'Cold';
      } else if (prospect.status === 'Cold' && (scriptType.includes('Follow-Up') || scriptType.includes('Reminder'))) {
          newStatus = 'Warm';
      } else if (scriptType === 'Audit Delivery Message') {
          newStatus = 'Audit Delivered';
          updates.linkSent = true;
      }
      
      if (newStatus) {
          updates.status = newStatus;
          updates.statusHistory = [...(prospect.statusHistory || []), { status: newStatus, date: contactDate }];
      }
      
      try {
          await updateProspect(prospect.id, updates);
          toast({ title: "Conversation Updated", description: "Script has been saved to the conversation history and status updated." });
          setIsScriptModalOpen(false);
          fetchProspects();
      } catch (error: any) {
          toast({ title: "Update Failed", description: error.message || 'Could not update prospect history.', variant: 'destructive' });
      }
    };
    
    setScriptModalConfig({
        showConfirmButton: true,
        confirmButtonText: "Save to Conversation",
        onConfirm: onConfirmScript,
        prospect: prospect, 
    });
    
    try {
        const result = await generateContextualScript(input);
        setGeneratedScript(result.script);
        setScriptModalTitle(`${scriptType} for ${prospect.name || 'Prospect'}`);
        navigator.clipboard.writeText(result.script).then(() => {
            toast({ title: "Copied to clipboard!", description: "The generated script has been copied automatically." });
        }).catch(err => {
            console.error("Auto-copy failed: ", err);
        });
    } catch (error: any) {
        handleScriptGenerationError(error, "Error Generating Script");
    } finally {
        setIsGeneratingScript(false);
    }
  }, [fetchProspects, toast]);

  const handleSendQualifier = useCallback(async (prospect: OutreachProspect, question: string) => {
      try {
          const contactDate = new Date().toISOString();
          const newStatus = 'Qualifier Sent';
          const newHistory = `${prospect.conversationHistory || ''}${prospect.conversationHistory ? '\n\n' : ''}Me: ${question}`.trim();
          await updateProspect(prospect.id, {
              qualifierQuestion: question,
              qualifierSentAt: contactDate,
              status: newStatus,
              lastContacted: contactDate,
              statusHistory: [...(prospect.statusHistory || []), { status: newStatus, date: contactDate }],
              conversationHistory: newHistory,
          });
          toast({ title: "Qualifier Sent!", description: "Prospect status and conversation history updated." });
          fetchProspects();
          setIsScriptModalOpen(false);
      } catch (error: any) {
          console.error("Error sending qualifier:", error);
          toast({ title: "Update Failed", description: "Could not update the prospect.", variant: "destructive" });
      }
  }, [fetchProspects, toast]);

  const handleGenerateQualifier = useCallback(async (prospect: OutreachProspect) => {
    setCurrentProspectForScript(prospect);
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    setGeneratedScript('');
    setScriptModalTitle(`Generating Qualifier for ${prospect.name}...`);
    
    setScriptModalConfig({
        showConfirmButton: true,
        confirmButtonText: "Save to Conversation",
        prospect: prospect,
        onConfirm: async (scriptContent: string) => {
           if (currentProspectForScript) {
             await handleSendQualifier(currentProspectForScript, scriptContent);
           }
        }
    });

    const input: GenerateQualifierInput = {
        prospectName: prospect.name,
        igHandle: prospect.instagramHandle,
        businessType: prospect.businessType,
        lastMessage: prospect.lastMessageSnippet,
        goals: prospect.goals,
        painPoints: prospect.painPoints,
        accountStage: prospect.accountStage
    };

    try {
        const result = await generateQualifierQuestion(input);
        setGeneratedScript(result.question);
        setScriptModalTitle(`Qualifier Question for ${prospect.name}`);
        navigator.clipboard.writeText(result.question).then(() => {
            toast({ title: "Copied to clipboard!", description: "The qualifier question has been copied automatically." });
        }).catch(err => {
            console.error("Auto-copy failed: ", err);
        });
    } catch (error: any) {
        handleScriptGenerationError(error, "Error Generating Qualifier");
    } finally {
        setIsGeneratingScript(false);
    }
  }, [handleSendQualifier, toast, currentProspectForScript]);
  
  const handleGenerateNextReply = useCallback(async (prospect: OutreachProspect, customInstructions: string): Promise<string> => {
    if (!prospect) {
        toast({ title: "Error", description: "No prospect context available.", variant: "destructive" });
        return '';
    }

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
    } catch (error: any) {
      console.error("Error generating next reply:", error);
      toast({
        title: "Error Generating Reply",
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
      return '';
    }
  }, [toast]);
  
  const handleRegenerateScript = useCallback(async (): Promise<string | null> => {
    if (!currentScriptGenerationInput) {
      toast({ title: "Error", description: "No previous script context to regenerate.", variant: "destructive" });
      return null;
    }
    setIsGeneratingScript(true); 
    setGeneratedScript(''); 
    try {
      const result = await generateContextualScript(currentScriptGenerationInput);
      setGeneratedScript(result.script); 
      navigator.clipboard.writeText(result.script).then(() => {
        toast({ title: "Auto-copied to clipboard!" });
      }).catch(err => {
        console.error("Failed to auto-copy regenerated script:", err);
      });
      setIsGeneratingScript(false);
      return result.script;
    } catch (error: any) {
      console.error("Error regenerating script:", error);
      toast({ title: "Script Regeneration Failed", description: (error as Error).message || "Could not regenerate script.", variant: "destructive" });
      setGeneratedScript("Failed to regenerate script. Please try again.");
      setIsGeneratingScript(false);
      return null;
    }
  }, [currentScriptGenerationInput, toast]);

  const toggleStatusFilter = (status: OutreachLeadStage) => {
    setStatusFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const filteredProspects = prospects.filter(prospect => {
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);
    const prospectText = [
        prospect.name,
        prospect.email,
        prospect.businessName,
        prospect.industry,
        prospect.instagramHandle,
    ].join(' ').toLowerCase();

    const searchTermMatch = searchTerms.every(term => prospectText.includes(term));
    const statusMatch = (statusFilters.size === OUTREACH_LEAD_STAGE_OPTIONS.length || statusFilters.size === 0 || statusFilters.has(prospect.status));
    const followUpMatch = !showOnlyNeedsFollowUp || !!prospect.followUpNeeded;

    return searchTermMatch && statusMatch && followUpMatch;
  });

  const getStatusBadgeVariant = (status: OutreachLeadStage): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Closed - Won':
      case 'Audit Delivered':
      case 'Ready for Audit':
      case 'Replied':
      case 'Interested': return 'default';
      case 'Warm':
      case 'Qualifier Sent': return 'secondary';
      case 'Cold':
      case 'To Contact': return 'outline';
      case 'Closed - Lost':
      case 'Not Interested': return 'destructive';
      default: return 'default';
    }
  };

  const getLeadScoreBadgeVariant = (score: number | null | undefined): "default" | "secondary" | "destructive" => {
      if (score === null || score === undefined) return "secondary";
      if (score >= 60) return "default";
      if (score >= 30) return "secondary";
      return "destructive";
  };

  const getLastActivityText = (prospect: OutreachProspect): string => {
      const lastStatusEvent = prospect.statusHistory?.[prospect.statusHistory.length - 1];
      let lastEventDateString: string | undefined | null = lastStatusEvent?.date;

      if (prospect.lastContacted) {
          if (!lastEventDateString || new Date(prospect.lastContacted) > new Date(lastEventDateString)) {
              lastEventDateString = prospect.lastContacted;
          }
      }

      if (!lastEventDateString) {
          lastEventDateString = prospect.createdAt;
      }
      
      if (!lastEventDateString) return '-';
      
      try {
        const lastEventDate = new Date(lastEventDateString);
        if (isNaN(lastEventDate.getTime())) return '-';
        return formatDistanceToNow(lastEventDate, { addSuffix: true });
      } catch {
        return '-';
      }
  };

  const handleExportToCSV = () => {
    if (filteredProspects.length === 0) {
      toast({
        title: "No Data to Export",
        description: "The current view has no prospects to export.",
        variant: "destructive",
      });
      return;
    }

    const dataForCSV = filteredProspects.map(p => ({
      "Name": p.name,
      "Instagram Handle": p.instagramHandle,
      "Status": p.status,
      "Lead Score": p.leadScore,
      "Followers": p.followerCount,
      "Email": p.email,
      "Website": p.website,
      "Last Contacted": p.lastContacted ? new Date(p.lastContacted).toLocaleDateString() : 'N/A',
      "Follow-up Date": p.followUpDate ? new Date(p.followUpDate).toLocaleDateString() : 'N/A',
      "Created At": new Date(p.createdAt).toLocaleDateString(),
      "Pain Points": p.painPoints?.join(', '),
      "Goals": p.goals?.join(', '),
      "Notes": p.notes,
    }));

    const csv = papa.unparse(dataForCSV);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `prospects_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFixTimestamps = async () => {
    if (!user) return;
    try {
      const count = await updateMissingProspectTimestamps();
      if (count > 0) {
        toast({ title: 'Legacy Prospects Updated', description: `${count} older prospects have been updated and are now visible.` });
        fetchProspects();
      } else {
        toast({ title: 'No Updates Needed', description: 'All prospects already have creation dates.' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (authLoading || (isLoading && !prospects.length && user)) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading outreach prospects..." size="lg"/></div>;
  }
  
  if (!user && !authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }
  
  const handleOpenEditProspectForm = (prospect: OutreachProspect) => {
    setEditingProspect(prospect);
    setIsEditFormOpen(true);
  };

  const handleOpenConversationModal = (prospect: OutreachProspect) => {
    setCurrentProspectForConversation(prospect);
    setConversationHistoryContent(prospect.conversationHistory || null);
    setIsConversationModalOpen(true);
  };

  const handleSaveConversation = async () => {
    if (!currentProspectForConversation || !isConversationDirty) return;
    setIsSavingConversation(true);
    try {
      await updateProspect(currentProspectForConversation.id, { 
        conversationHistory: conversationHistoryContent,
        lastContacted: new Date().toISOString()
      });
      toast({ title: 'Conversation Saved', description: `History for ${currentProspectForConversation.name} updated.` });
      setIsConversationModalOpen(false);
      setCurrentProspectForConversation(null);
      fetchProspects(); // Refetch to get the latest data
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message || 'Could not save conversation.', variant: 'destructive' });
    } finally {
      setIsSavingConversation(false);
    }
  };
  
  const isConversationDirty = currentProspectForConversation ? (currentProspectForConversation.conversationHistory || '') !== (conversationHistoryContent || '') : false;

  const handleConversationModalCloseAttempt = () => {
    if (isConversationDirty) {
      setShowUnsavedConfirm(true);
    } else {
      setIsConversationModalOpen(false);
    }
  };

  const renderActions = (prospect: OutreachProspect) => {
    const canAskQualifier = ['Interested', 'Replied'].includes(prospect.status);
    const canCreateAudit = prospect.status === 'Ready for Audit';

    return (
        <TableCell className="text-right space-x-0.5">
            <TooltipProvider>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => handleOpenEditProspectForm(prospect)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Prospect
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenConversationModal(prospect)}>
                                <MessagesSquare className="mr-2 h-4 w-4" /> Manage Conversation
                            </DropdownMenuItem>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(!canCreateAudit && "cursor-not-allowed w-full")}>
                                         <DropdownMenuItem
                                            disabled={!canCreateAudit}
                                            className={cn(!canCreateAudit && "cursor-not-allowed")}
                                            onClick={() => {
                                                if (canCreateAudit) {
                                                    const buildQuestionnaireFromProspect = (p: OutreachProspect) => {
                                                        const parts = [
                                                            `Analyzing profile for: ${p.name || 'N/A'} (@${p.instagramHandle || 'N/A'})`,
                                                            `Entity ID: ${p.id}`,
                                                            `Industry: ${p.industry || 'Not specified'}`,
                                                            `Business Type: ${p.businessType || 'Not specified'}${p.businessType === 'Other' ? ` (${p.businessTypeOther || ''})` : ''}`,
                                                            `Account Stage: ${p.accountStage || 'N/A'}`,
                                                            `Follower Count: ${p.followerCount ?? 'N/A'}`,
                                                            `\n--- GOALS ---\n${p.goals && p.goals.length > 0 ? p.goals.map(g => `- ${g}`).join('\n') : 'No specific goals listed.'}`,
                                                            `\n--- PAIN POINTS ---\n${p.painPoints && p.painPoints.length > 0 ? p.painPoints.map(pp => `- ${pp}`).join('\n') : 'No specific pain points listed.'}`,
                                                            `\n--- QUALIFIER ---\nQ: ${p.qualifierQuestion || 'None sent.'}\nA: ${p.qualifierReply || 'No reply logged.'}`,
                                                            `\n--- CONVERSATION HISTORY ---\n${p.conversationHistory || 'No history logged.'}`,
                                                            `\n--- ADDITIONAL NOTES ---\n${p.notes || 'None'}`
                                                        ];
                                                        return encodeURIComponent(parts.join('\n\n'));
                                                    };
                                                    const auditLink = `/audits/new?handle=${prospect.instagramHandle || ''}&name=${prospect.name}&entityId=${prospect.id}&q=${buildQuestionnaireFromProspect(prospect)}`;
                                                    router.push(auditLink);
                                                }
                                            }}
                                        >
                                            <GraduationCap className="mr-2 h-4 w-4" /> Create Audit
                                        </DropdownMenuItem>
                                    </div>
                                </TooltipTrigger>
                                {!canCreateAudit && <TooltipContent><p>Status must be 'Ready for Audit'</p></TooltipContent>}
                            </Tooltip>
                        </DropdownMenuGroup>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuGroup>
                           <DropdownMenuLabel>Generate Scripts</DropdownMenuLabel>
                           <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(!canAskQualifier && "cursor-not-allowed w-full")}>
                                        <DropdownMenuItem
                                            disabled={!canAskQualifier}
                                            className={cn(!canAskQualifier && "cursor-not-allowed")}
                                            onClick={() => canAskQualifier && handleGenerateQualifier(prospect)}
                                        >
                                            <FileQuestion className="mr-2 h-4 w-4" /> Ask Qualifier Question
                                        </DropdownMenuItem>
                                    </div>
                                </TooltipTrigger>
                                {!canAskQualifier && <TooltipContent><p>Status must be 'Interested' or 'Replied'</p></TooltipContent>}
                            </Tooltip>
                           {scriptMenuItems.map(item => (
                                <DropdownMenuItem key={item.type} onClick={() => handleGenerateScript(prospect, item.type)}>
                                    <Bot className="mr-2 h-4 w-4" />
                                    <span>{item.label}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setProspectToDelete(prospect)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Prospect
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TooltipProvider>
        </TableCell>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center">
            <LoadingSpinner text="Fetching prospects..." />
          </TableCell>
        </TableRow>
      );
    }
    if (filteredProspects.length > 0) {
      return filteredProspects.map((prospect) => (
        <TableRow key={prospect.id} data-follow-up={!!prospect.followUpNeeded} className="data-[follow-up=true]:bg-primary/10">
          <TableCell>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Checkbox
                            checked={!!prospect.followUpNeeded}
                            onCheckedChange={() => handleFollowUpToggle(prospect.id, !!prospect.followUpNeeded)}
                            aria-label={`Mark ${prospect.name} as needs follow-up`}
                            className="h-5 w-5"
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Mark for Follow-up</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </TableCell>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              <div>
                {prospect.name}
                <br/>
                {prospect.instagramHandle ? (
                  <a 
                    href={`https://instagram.com/${prospect.instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {prospect.instagramHandle}
                    <LinkIcon className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No handle</span>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <Select 
              value={prospect.status} 
              onValueChange={(newStatus: OutreachLeadStage) => handleStatusChange(prospect.id, newStatus)}
            >
              <SelectTrigger className="h-auto py-0.5 px-2.5 border-none shadow-none [&>span]:flex [&>span]:items-center text-xs w-auto min-w-[100px]">
                <SelectValue asChild>
                  <Badge variant={getStatusBadgeVariant(prospect.status)} className="cursor-pointer text-xs whitespace-nowrap">
                    {prospect.status}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {OUTREACH_LEAD_STAGE_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </TableCell>
           <TableCell className="hidden md:table-cell">
            {prospect.leadScore !== null && prospect.leadScore !== undefined ? (
              <Badge variant={getLeadScoreBadgeVariant(prospect.leadScore)}>{prospect.leadScore}</Badge>
            ) : (
              <Badge variant="outline">-</Badge>
            )}
          </TableCell>
          <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
             <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <span className="cursor-help">{getLastActivityText(prospect)}</span>
                      </TooltipTrigger>
                      <ProspectTimelineTooltip prospect={prospect} />
                  </Tooltip>
              </TooltipProvider>
          </TableCell>
          {renderActions(prospect)}
        </TableRow>
      ));
    }
    // This case handles when there are no prospects at all OR filtered list is empty
    return (
        <TableRow>
            <TableCell colSpan={6} className="text-center h-24">
                <div className="flex flex-col items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="font-semibold">
                        {prospects.length === 0 ? "No prospects found." : "No prospects match your criteria."}
                    </p>
                    {prospects.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Start building your outreach list by <Button variant="link" className="p-0 h-auto" onClick={() => setIsRapidAddOpen(true)}>adding your first prospect</Button>!
                        </p>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
  };


  return (
    <>
      <PageHeader
        title="Outreach Manager"
        description="Track and manage your cold outreach efforts with detailed prospect information."
        icon={Send}
        actions={
          <Button onClick={() => setIsRapidAddOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Prospect
          </Button>
        }
      />

      <RapidProspectDialog
          isOpen={isRapidAddOpen}
          onClose={() => setIsRapidAddOpen(false)}
          onSave={handleSaveProspect}
      />

      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-3xl h-[90vh] flex flex-col">
          <ProspectForm 
            key={editingProspect?.id || 'new'}
            prospect={editingProspect} 
            onSave={handleSaveProspect} 
            onCancel={() => { setIsEditFormOpen(false); setEditingProspect(undefined);}} 
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!prospectToDelete} onOpenChange={(open) => { if (!open) setProspectToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the prospect "{prospectToDelete?.name}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProspect}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              onGenerateReply={handleGenerateNextReply}
              isDirty={isConversationDirty}
            />
          </div>
          <DialogFooter className="p-4 border-t gap-2">
            <Button variant="outline" onClick={handleConversationModalCloseAttempt}>Cancel</Button>
            <Button onClick={handleSaveConversation} disabled={isSavingConversation || !isConversationDirty}>
              {isSavingConversation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                    You have unsaved changes in the conversation history. Are you sure you want to discard them?
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

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search prospects by name, email, IG..." 
                className="pl-8 sm:w-[300px] md:w-[400px]" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleExportToCSV} disabled={isLoading}>
                      <FileUp className="h-4 w-4" />
                      <span className="sr-only">Export to CSV</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export current view to CSV</p>
                  </TooltipContent>
                </Tooltip>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleFixTimestamps} disabled={isLoading}>
                      <Wrench className="h-4 w-4" />
                      <span className="sr-only">Fix Legacy Prospects</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fix missing data on old prospects</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" /> Filter by Status <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {OUTREACH_LEAD_STAGE_OPTIONS.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={statusFilters.size === 0 || statusFilters.has(status)}
                      onCheckedChange={() => toggleStatusFilter(status)}
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                      checked={showOnlyNeedsFollowUp}
                      onCheckedChange={setShowOnlyNeedsFollowUp}
                  >
                    <Star className="mr-2 h-4 w-4 text-yellow-500" />
                    Needs Follow-up Only
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Follow</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Score</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderContent()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => {
            setCurrentProspectForScript(null);
            setIsScriptModalOpen(false);
        }}
        scriptContent={generatedScript}
        title={scriptModalTitle}
        onRegenerate={handleRegenerateScript}
        isLoadingInitially={isGeneratingScript && !generatedScript}
        showConfirmButton={scriptModalConfig.showConfirmButton}
        confirmButtonText={scriptModalConfig.confirmButtonText}
        onConfirm={scriptModalConfig.onConfirm ? () => scriptModalConfig.onConfirm(generatedScript) : undefined}
      />
    </>
  );
}

export default function OutreachPageWrapper() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading outreach..." size="lg"/></div>}>
            <OutreachPage/>
        </Suspense>
    )
}

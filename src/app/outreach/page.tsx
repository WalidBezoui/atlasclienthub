
'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import { Send, PlusCircle, Edit, Trash2, Search, Filter, ChevronDown, AlertTriangle, Bot, Loader2, Briefcase, Globe, Link as LinkIcon, Target, AlertCircle, MessageSquare, Info, Settings2, Sparkles, HelpCircle, BarChart3, RefreshCw, Palette, FileText, Star, Calendar, MessageCircle, FileUp, ListTodo, MessageSquareText, MessagesSquare, Save, FileQuestion, GraduationCap, MoreHorizontal, Wrench, Telescope, Users, CheckSquare, ArrowUpDown, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
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
import { DiscoveryDialog } from '@/components/outreach/DiscoveryDialog';
import { fetchInstagramMetrics } from '@/app/actions/fetch-ig-metrics';
import { qualifyProspect, type QualifyProspectInput } from '@/ai/flows/qualify-prospect';
import { CommentGeneratorDialog } from '@/components/outreach/CommentGeneratorDialog';
import { ProspectTableRow } from '@/components/outreach/prospect-table-row';
import { ProspectMobileCard } from '@/components/outreach/prospect-mobile-card';


function OutreachPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setClientContext, clearContext: clearScriptContext } = useScriptContext();
  const [prospects, setProspects] = useState<OutreachProspect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<OutreachLeadStage>>(new Set());
  const [showOnlyNeedsFollowUp, setShowOnlyNeedsFollowUp] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'lastActivity', direction: 'desc' });
  
  // State for forms
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isRapidAddOpen, setIsRapidAddOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<OutreachProspect | undefined>(undefined);
  const [prospectToDelete, setProspectToDelete] = useState<OutreachProspect | null>(null);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  
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

  // State for comment generator
  const [isCommentGeneratorOpen, setIsCommentGeneratorOpen] = useState(false);
  const [prospectForComment, setProspectForComment] = useState<OutreachProspect | null>(null);
  
  // State for Undo Delete
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, { prospect: OutreachProspect; dismissToast: () => void;}>>(new Map());
  const timeoutMapRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // State for Evaluation
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  const [evaluatingProspectIds, setEvaluatingProspectIds] = useState<Set<string>>(new Set());
  const [prospectsToBulkEvaluate, setProspectsToBulkEvaluate] = useState<OutreachProspect[] | null>(null);

  const { toast } = useToast();
  
  const sortProspects = (prospectList: OutreachProspect[]) => {
    return [...prospectList].sort((a, b) => {
        const aFollowUp = a.followUpNeeded || false;
        const bFollowUp = b.followUpNeeded || false;
        if (aFollowUp !== bFollowUp) {
            return aFollowUp ? -1 : 1;
        }
        
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
      setProspects(fetchedProspects);
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
  
  useEffect(() => {
    const timeouts = timeoutMapRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const updateProspectInState = useCallback((id: string, updates: Partial<OutreachProspect>) => {
    setProspects(current => current.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const handleEvaluateProspect = async (prospect: OutreachProspect) => {
    if (!prospect.instagramHandle) {
      toast({ title: 'Cannot Evaluate', description: 'Prospect does not have an Instagram handle.', variant: 'destructive' });
      return;
    }

    setEvaluatingProspectIds(prev => new Set(prev).add(prospect.id));
    const { id: toastId, dismiss } = toast({ title: 'Evaluating...', description: `Fetching data for @${prospect.instagramHandle}` });

    try {
      const metricsResult = await fetchInstagramMetrics(prospect.instagramHandle);
      if (metricsResult.error || !metricsResult.data) {
        throw new Error(metricsResult.error || 'Failed to fetch metrics.');
      }
      
      toast({ id: toastId, title: 'Metrics Fetched!', description: `Now analyzing @${prospect.instagramHandle}` });
      
      const qualifyInput: QualifyProspectInput = {
        instagramHandle: prospect.instagramHandle,
        followerCount: metricsResult.data.followerCount,
        postCount: metricsResult.data.postCount,
        avgLikes: metricsResult.data.avgLikes,
        avgComments: metricsResult.data.avgComments,
        biography: metricsResult.data.biography,
        userProfitabilityAssessment: ["Selling physical or digital products (e-commerce, courses)"],
        userVisualsAssessment: ["Clean but Generic (Looks like a template, lacks personality)"],
        userCtaAssessment: ['Strong, direct link to a sales page, booking site, or freebie'],
        industry: prospect.industry || 'unknown',
        userStrategicGapAssessment: ["Visuals / Branding (inconsistent grid, bad photos, messy look)"],
      };
      
      const analysisResult = await qualifyProspect(qualifyInput);

      const updates: Partial<OutreachProspect> = {
        followerCount: metricsResult.data.followerCount,
        postCount: metricsResult.data.postCount,
        avgLikes: metricsResult.data.avgLikes,
        avgComments: metricsResult.data.avgComments,
        bioSummary: metricsResult.data.biography,
        leadScore: analysisResult.leadScore,
        qualificationData: analysisResult.qualificationData,
        painPoints: analysisResult.painPoints,
        goals: analysisResult.goals,
        helpStatement: analysisResult.summary,
      };

      await updateProspect(prospect.id, updates);
      toast({ id: toastId, title: 'Evaluation Complete!', description: `@${prospect.instagramHandle} has been updated.` });
      
      updateProspectInState(prospect.id, updates);

    } catch (error: any) {
      toast({ id: toastId, title: 'Evaluation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setEvaluatingProspectIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(prospect.id);
        return newSet;
      });
    }
  };

  const handleBulkEvaluateClick = () => {
    const unscored = prospects.filter(p => (p.leadScore === null || p.leadScore === undefined) && p.instagramHandle);
    if (unscored.length === 0) {
      toast({ title: 'All Prospects Evaluated', description: 'No unscored prospects with an Instagram handle were found.' });
      return;
    }
    setProspectsToBulkEvaluate(unscored);
  };
  
  const confirmBulkEvaluate = async () => {
    if (!prospectsToBulkEvaluate) return;
    
    setIsEvaluatingAll(true);
    setProspectsToBulkEvaluate(null);
    
    let successCount = 0;
    let failCount = 0;
    const total = prospectsToBulkEvaluate.length;
    
    const { id: progressToastId, dismiss } = toast({
      title: 'Starting Bulk Evaluation...',
      description: `Preparing to evaluate ${total} prospects.`,
      duration: Infinity,
    });

    for (const [index, prospect] of prospectsToBulkEvaluate.entries()) {
        toast({
          id: progressToastId,
          title: `Evaluating ${index + 1} of ${total}`,
          description: `Processing @${prospect.instagramHandle}...`,
        });
        
        try {
            await handleEvaluateProspect(prospect);
            successCount++;
        } catch (error: any) {
            console.error(`Failed to evaluate @${prospect.instagramHandle}:`, error.message);
            failCount++;
        }
    }
    
    dismiss();
    toast({
        title: 'Bulk Evaluation Complete',
        description: `${successCount} prospects evaluated, ${failCount} failed.`,
    });
    setIsEvaluatingAll(false);
  };


  const handleSaveProspect = useCallback(async (prospectData: Omit<OutreachProspect, 'id'|'userId'> | OutreachProspect, andGenerateScript?: boolean) => {
     if (!user) {
        toast({title: "Authentication Error", description: "You must be logged in.", variant: "destructive"});
        return;
    }
    try {
        let savedProspect: OutreachProspect;
        if ('id' in prospectData && prospectData.id) {
            await updateProspect(prospectData.id, prospectData as Partial<OutreachProspect>);
            savedProspect = { ...prospects.find(p => p.id === prospectData.id)!, ...prospectData };
            toast({ title: "Success", description: `Prospect ${prospectData.name} updated.` });
        } else {
            const docId = await addProspect(prospectData as Omit<OutreachProspect, 'id'|'userId' | 'createdAt'>);
            savedProspect = { id: docId, userId: user.uid, ...prospectData, createdAt: new Date().toISOString() };
            toast({ title: "Success", description: `Prospect ${prospectData.name} added.` });
        }
        
        fetchProspects();
        setIsEditFormOpen(false);
        setIsRapidAddOpen(false);
        setEditingProspect(undefined);
        
        if (andGenerateScript) {
            handleGenerateScript(savedProspect, 'Cold Outreach DM');
        }

    } catch (error: any) {
        console.error("Error saving prospect:", error);
        toast({ title: "Error", description: error.message || "Could not save prospect.", variant: "destructive"});
    }
  }, [user, fetchProspects, toast, prospects]);

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
  
  const handleBulkDelete = async () => {
    const prospectIds = Array.from(selectedProspects);
    if (prospectIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${prospectIds.length} selected prospects? This action cannot be undone.`)) {
        return;
    }

    try {
        await Promise.all(prospectIds.map(id => fbDeleteProspect(id)));
        toast({ title: 'Bulk Delete Successful', description: `${prospectIds.length} prospects have been deleted.` });
        setSelectedProspects(new Set());
        fetchProspects();
    } catch (error: any) {
        toast({ title: 'Bulk Delete Failed', description: error.message || 'Could not delete all selected prospects.', variant: 'destructive' });
    }
  };

  const handleBulkStatusChange = async (newStatus: OutreachLeadStage) => {
    const prospectIds = Array.from(selectedProspects);
    if (prospectIds.length === 0) return;

    const contactDate = new Date().toISOString();
    
    const updatePromises = prospectIds.map(id => {
      const prospectToUpdate = prospects.find(p => p.id === id);
      const newHistoryEntry: StatusHistoryItem = { status: newStatus, date: contactDate };
      const newStatusHistory = [...(prospectToUpdate?.statusHistory || []), newHistoryEntry];
      return updateProspect(id, { status: newStatus, lastContacted: contactDate, statusHistory: newStatusHistory });
    });
    
    try {
        await Promise.all(updatePromises);
        toast({ title: 'Bulk Status Update Successful', description: `${prospectIds.length} prospects updated to "${newStatus}".` });
        setSelectedProspects(new Set());
        fetchProspects();
    } catch (error: any) {
        toast({ title: 'Bulk Status Update Failed', description: error.message || 'Could not update all selected prospects.', variant: 'destructive' });
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
    
    const updates = { 
      status: newStatus,
      lastContacted: newLastContacted,
      statusHistory: newStatusHistory
    };

    try {
      await updateProspect(prospectId, updates);
      updateProspectInState(prospectId, updates);
      toast({ title: "Status Updated", description: `Prospect status changed to ${newStatus}.` });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  }, [user, prospects, toast, updateProspectInState]);

  const handleFollowUpToggle = useCallback(async (prospectId: string, currentFollowUpStatus: boolean) => {
    if (!user) return;
    const newFollowUpStatus = !currentFollowUpStatus;
    try {
        await updateProspect(prospectId, { followUpNeeded: newFollowUpStatus });
        updateProspectInState(prospectId, { followUpNeeded: newFollowUpStatus });
        toast({ title: "Follow-up status updated." });
    } catch (error) {
        console.error("Error updating follow-up status:", error);
        toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  }, [user, toast, updateProspectInState]);

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
          updateProspectInState(prospect.id, updates);
          toast({ title: "Conversation Updated", description: "Script has been saved to the conversation history and status updated." });
          setIsScriptModalOpen(false);
      } catch (error: any) {
          toast({ title: "Update Failed", description: error.message || 'Could not update prospect history.', variant: 'destructive' });
      }
    };
    
    setScriptModalConfig({
        showConfirmButton: true,
        confirmButtonText: "Copy & Open IG",
        onConfirm: onConfirmScript,
        prospect: prospect, 
    });
    
    try {
        const result = await generateContextualScript(input);
        setGeneratedScript(result.script);
        setScriptModalTitle(`${scriptType} for ${prospect.name || 'Prospect'}`);
    } catch (error: any) {
        handleScriptGenerationError(error, "Error Generating Script");
    } finally {
        setIsGeneratingScript(false);
    }
  }, [toast, updateProspectInState]);

  const handleSendQualifier = useCallback(async (prospect: OutreachProspect, question: string) => {
      try {
          const contactDate = new Date().toISOString();
          const newStatus = 'Qualifier Sent';
          const newHistory = `${prospect.conversationHistory || ''}${prospect.conversationHistory ? '\n\n' : ''}Me: ${question}`.trim();
          const updates = {
              qualifierQuestion: question,
              qualifierSentAt: contactDate,
              status: newStatus,
              lastContacted: contactDate,
              statusHistory: [...(prospect.statusHistory || []), { status: newStatus, date: contactDate }],
              conversationHistory: newHistory,
          };
          await updateProspect(prospect.id, updates);
          updateProspectInState(prospect.id, updates);
          toast({ title: "Qualifier Sent!", description: "Prospect status and conversation history updated." });
          setIsScriptModalOpen(false);
      } catch (error: any) {
          console.error("Error sending qualifier:", error);
          toast({ title: "Update Failed", description: "Could not update the prospect.", variant: "destructive" });
      }
  }, [toast, updateProspectInState]);

  const handleGenerateQualifier = useCallback(async (prospect: OutreachProspect) => {
    setCurrentProspectForScript(prospect);
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    setGeneratedScript('');
    setScriptModalTitle(`Generating Qualifier for ${prospect.name}...`);
    
    setScriptModalConfig({
        showConfirmButton: true,
        confirmButtonText: "Copy & Open IG",
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
  
  const handleRegenerateScript = useCallback(async (customInstructions: string): Promise<string | null> => {
    if (!currentScriptGenerationInput) {
      toast({ title: "Error", description: "No previous script context to regenerate.", variant: "destructive" });
      return null;
    }
    
    const updatedInput = { ...currentScriptGenerationInput, customInstructions };
    setCurrentScriptGenerationInput(updatedInput);

    setIsGeneratingScript(true); 
    setGeneratedScript(''); 
    try {
      const result = await generateContextualScript(updatedInput);
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

  const filteredProspects = useMemo(() => {
    return prospects.filter(prospect => {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);
      const prospectText = [
          prospect.name,
          prospect.email,
          prospect.businessName,
          prospect.industry,
          prospect.instagramHandle,
      ].join(' ').toLowerCase();

      const searchTermMatch = searchTerms.every(term => prospectText.includes(term));
      const statusMatch = statusFilters.size === 0 || statusFilters.has(prospect.status);
      const followUpMatch = !showOnlyNeedsFollowUp || !!prospect.followUpNeeded;

      return searchTermMatch && statusMatch && followUpMatch;
    });
  }, [prospects, searchTerm, statusFilters, showOnlyNeedsFollowUp]);

  const sortedAndFilteredProspects = useMemo(() => {
    const { key, direction } = sortConfig;
    if (!key) return filteredProspects;

    const getLastActivity = (prospect: OutreachProspect): number => {
      const dates = [
        prospect.createdAt,
        prospect.lastContacted,
        ...(prospect.statusHistory?.map(h => h.date) || [])
      ].filter(d => d).map(d => new Date(d!).getTime());
      return Math.max(0, ...dates);
    };

    return [...filteredProspects].sort((a, b) => {
        if (a.followUpNeeded && !b.followUpNeeded) return -1;
        if (!a.followUpNeeded && b.followUpNeeded) return 1;

        const aValue = a[key as keyof OutreachProspect];
        const bValue = b[key as keyof OutreachProspect];

        if (key === 'lastActivity') {
            const comparison = getLastActivity(b) - getLastActivity(a);
            return direction === 'desc' ? comparison : -comparison;
        }

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        let comparison = 0;
        switch (key) {
            case 'createdAt':
            case 'lastContacted':
                comparison = new Date(aValue as string).getTime() - new Date(bValue as string).getTime();
                break;
            case 'leadScore':
            case 'followerCount':
                comparison = (aValue as number) - (bValue as number);
                break;
            case 'name':
                 comparison = (aValue as string).localeCompare(bValue as string);
                 break;
            default:
                return 0;
        }
        
        return direction === 'desc' ? -comparison : comparison;
    });
  }, [filteredProspects, sortConfig]);

  const existingProspectHandles = useMemo(() => new Set(prospects.map(p => p.instagramHandle).filter(Boolean)), [prospects]);

  const handleExportToCSV = () => {
    if (sortedAndFilteredProspects.length === 0) {
      toast({
        title: "No Data to Export",
        description: "The current view has no prospects to export.",
        variant: "destructive",
      });
      return;
    }

    const dataForCSV = sortedAndFilteredProspects.map(p => ({
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
  
  const handleOpenCommentGenerator = (prospect: OutreachProspect) => {
    setProspectForComment(prospect);
    setIsCommentGeneratorOpen(true);
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
      const updates = { 
        conversationHistory: conversationHistoryContent,
        lastContacted: new Date().toISOString()
      };
      await updateProspect(currentProspectForConversation.id, updates);
      updateProspectInState(currentProspectForConversation.id, updates);
      toast({ title: 'Conversation Saved', description: `History for ${currentProspectForConversation.name} updated.` });
      setIsConversationModalOpen(false);
      setCurrentProspectForConversation(null);
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

  const handleStartAudit = (prospect: OutreachProspect) => {
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
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedProspects(new Set(sortedAndFilteredProspects.map(p => p.id)));
    } else {
      setSelectedProspects(new Set());
    }
  };
  
  const handleToggleProspect = (prospectId: string) => {
    setSelectedProspects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(prospectId)) {
        newSet.delete(prospectId);
      } else {
        newSet.add(prospectId);
      }
      return newSet;
    });
  };

  const handleSortChange = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach Manager"
        description="Track and manage your cold outreach efforts with detailed prospect information."
        icon={Send}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsDiscoveryOpen(true)}>
              <Telescope className="mr-2 h-4 w-4" /> Discover Prospects
            </Button>
            <Button onClick={() => setIsRapidAddOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Prospect
            </Button>
          </div>
        }
      />

      <CommentGeneratorDialog
        isOpen={isCommentGeneratorOpen}
        onClose={() => setIsCommentGeneratorOpen(false)}
        prospect={prospectForComment}
        onCommentAdded={() => updateProspectInState(prospectForComment!.id, { ...prospectForComment })}
      />

      <DiscoveryDialog
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onProspectAdded={fetchProspects}
        existingProspectHandles={existingProspectHandles}
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

      <AlertDialog open={!!prospectsToBulkEvaluate} onOpenChange={(open) => {if (!open) setProspectsToBulkEvaluate(null)}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Evaluation</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to evaluate {prospectsToBulkEvaluate?.length || 0} unscored prospects. This will use AI credits and may take several minutes. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProspectsToBulkEvaluate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkEvaluate}>Confirm & Start</AlertDialogAction>
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

      <Card>
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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <TooltipProvider>
                 <Tooltip>
                  <TooltipTrigger asChild>
                     <Button variant="outline" onClick={handleBulkEvaluateClick} disabled={isEvaluatingAll}>
                        {isEvaluatingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                        Evaluate Unscored
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fetch data &amp; score for all prospects missing a lead score.</p>
                  </TooltipContent>
                </Tooltip>
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
                    <ArrowUpDown className="mr-2 h-4 w-4" /> Sort By
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleSortChange('lastActivity')}>Last Activity {sortConfig.key === 'lastActivity' && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortChange('createdAt')}>Date Added {sortConfig.key === 'createdAt' && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortChange('leadScore')}>Lead Score {sortConfig.key === 'leadScore' && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortChange('followerCount')}>Followers {sortConfig.key === 'followerCount' && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortChange('name')}>Name {sortConfig.key === 'name' && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                      checked={statusFilters.has(status)}
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
          <div className="md:hidden space-y-4">
              {isLoading ? (
                  <LoadingSpinner text="Fetching prospects..." />
              ) : sortedAndFilteredProspects.length > 0 ? (
                  sortedAndFilteredProspects.map(prospect => (
                      <ProspectMobileCard
                        key={prospect.id}
                        prospect={prospect}
                        isSelected={selectedProspects.has(prospect.id)}
                        onToggleSelect={handleToggleProspect}
                        onStatusChange={handleStatusChange}
                        onEdit={handleOpenEditProspectForm}
                        onViewConversation={handleOpenConversationModal}
                        onStartAudit={handleStartAudit}
                        onGenerateComment={handleOpenCommentGenerator}
                        onGenerateQualifier={handleGenerateQualifier}
                        onEvaluate={handleEvaluateProspect}
                        onDelete={setProspectToDelete}
                        onGenerateScript={handleGenerateScript}
                      />
                  ))
              ) : (
                  <div className="text-center py-10">
                    <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 font-semibold">No prospects found.</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters or search.</p>
                  </div>
              )}
          </div>
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead className="w-[50px] p-2">
                     <Checkbox 
                        checked={selectedProspects.size > 0 && selectedProspects.size === sortedAndFilteredProspects.length}
                        onCheckedChange={(checked) => handleToggleAll(!!checked)}
                      />
                  </TableHead>
                  <TableHead className="w-[50px] p-2">
                    <Star className="h-4 w-4"/>
                  </TableHead>
                  <TableHead>Prospect</TableHead>
                  <TableHead className="hidden lg:table-cell">Followers</TableHead>
                  <TableHead className="hidden lg:table-cell">Posts</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Score</TableHead>
                  <TableHead className="hidden xl:table-cell">Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <LoadingSpinner text="Fetching prospects..." />
                      </TableCell>
                    </TableRow>
                  ) : sortedAndFilteredProspects.length > 0 ? (
                    sortedAndFilteredProspects.map((prospect) => (
                       <ProspectTableRow
                          key={prospect.id}
                          prospect={prospect}
                          isSelected={selectedProspects.has(prospect.id)}
                          isEvaluating={evaluatingProspectIds.has(prospect.id)}
                          onToggleSelect={handleToggleProspect}
                          onFollowUpToggle={handleFollowUpToggle}
                          onStatusChange={handleStatusChange}
                          onEdit={handleOpenEditProspectForm}
                          onViewConversation={handleOpenConversationModal}
                          onStartAudit={handleStartAudit}
                          onGenerateComment={handleOpenCommentGenerator}
                          onGenerateQualifier={handleGenerateQualifier}
                          onGenerateScript={handleGenerateScript}
                          onEvaluate={handleEvaluateProspect}
                          onDelete={setProspectToDelete}
                        />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 font-semibold">
                          {prospects.length === 0 ? "No prospects found." : "No prospects match your criteria."}
                        </p>
                        {prospects.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Get started by <Button variant="link" className="p-0 h-auto" onClick={() => setIsRapidAddOpen(true)}>adding your first prospect</Button>!
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedProspects.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-20 md:left-auto md:bottom-4 md:right-4 md:left-auto">
              <Card className="shadow-2xl flex items-center gap-4 p-3 rounded-none md:rounded-lg">
                  <p className="text-sm font-semibold">{selectedProspects.size} selected</p>
                  <Separator orientation="vertical" className="h-6" />
                   <Select onValueChange={(value: OutreachLeadStage) => handleBulkStatusChange(value)}>
                      <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                           {OUTREACH_LEAD_STAGE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                   </Select>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                   <Button variant="ghost" size="sm" onClick={() => setSelectedProspects(new Set())}>
                      Clear
                  </Button>
              </Card>
          </div>
      )}

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
        prospect={currentProspectForScript}
      />
    </div>
  );
}

export default function OutreachPageWrapper() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading outreach..." size="lg"/></div>}>
            <OutreachPage/>
        </Suspense>
    )
}

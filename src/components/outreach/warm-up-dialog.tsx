
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Flame, Eye, Heart, MessageCircle as MessageCircleIcon, MessageSquare, AlertTriangle, Trash2, Check, ArrowRight, Bot } from 'lucide-react';
import type { OutreachProspect, WarmUpActivity, WarmUpAction, OutreachLeadStage, StatusHistoryItem } from '@/lib/types';
import { updateProspect } from '@/lib/firebase/services';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { ScriptModal } from '../scripts/script-modal';
import { generateContextualScript, GenerateContextualScriptInput } from '@/ai/flows/generate-contextual-script';


interface WarmUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: OutreachProspect | null | undefined;
  onActivityLogged: (updatedProspect: OutreachProspect) => void;
  onGenerateComment: (prospect: OutreachProspect) => void;
  onViewConversation: (prospect: OutreachProspect) => void;
  onStatusChange: (id: string, newStatus: OutreachLeadStage) => void;
}

const warmUpSteps: { action: WarmUpAction; title: string; description: string; icon: React.ElementType }[] = [
    { action: 'Liked Posts', title: 'Silent Engagement: Likes', description: 'Like a few recent, relevant posts.', icon: Heart },
    { action: 'Viewed Story', title: 'Silent Engagement: Stories', description: 'View their stories to show up in their list.', icon: Eye },
    { action: 'Left Comment', title: 'Value Engagement', description: 'Leave a high-value, non-salesy comment.', icon: MessageCircleIcon },
    { action: 'Replied to Story', title: 'Private Engagement', description: 'Reply to a story or start a direct conversation.', icon: MessageSquare },
];

export function WarmUpDialog({ 
  isOpen, 
  onClose, 
  prospect, 
  onActivityLogged, 
  onGenerateComment, 
  onViewConversation,
  onStatusChange
}: WarmUpDialogProps) {
  const [currentProspect, setCurrentProspect] = useState<OutreachProspect | null | undefined>(prospect);
  const [isLoading, setIsLoading] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<WarmUpActivity | null>(null);
  const [showCompleteConfirmation, setShowCompleteConfirmation] = useState(false);
  const { toast } = useToast();

  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [currentScriptGenerationInput, setCurrentScriptGenerationInput] = useState<GenerateContextualScriptInput | null>(null);


  useEffect(() => {
    setCurrentProspect(prospect);
  }, [prospect]);

  const handleLogActivity = async (action: WarmUpAction, scriptContent?: string) => {
    if (!currentProspect) return;
    setIsLoading(true);
    
    const now = new Date();
    const newActivity: WarmUpActivity = { 
      id: crypto.randomUUID(), 
      action, 
      date: now.toISOString(),
      nextActionDue: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const updatedWarmUp = [...(currentProspect.warmUp || []), newActivity];

    const updates: Partial<OutreachProspect> = { warmUp: updatedWarmUp };
    
    try {
      await updateProspect(currentProspect.id, updates);
      const updatedProspectData = { ...currentProspect, ...updates };
      setCurrentProspect(updatedProspectData);
      toast({ title: 'Activity Logged', description: `'${action}' has been recorded.` });
      onActivityLogged(updatedProspectData);

      const completedActions = new Set(updatedProspectData.warmUp?.map(a => a.action) || []);
       if (updatedProspectData.conversationHistory?.includes("Me:")) {
          completedActions.add('Replied to Story');
      }

      if (completedActions.size >= warmUpSteps.length) {
          setShowCompleteConfirmation(true);
      }

    } catch (error: any) {
      toast({ title: 'Error', description: error.message || "Could not log activity.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateColdOutreach = async (prospect: OutreachProspect) => {
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    setGeneratedScript('');
    
    const input: GenerateContextualScriptInput = {
        scriptType: "Cold Outreach DM",
        clientName: prospect.name,
        clientHandle: prospect.instagramHandle,
        businessName: prospect.businessName,
        uniqueNote: prospect.uniqueNote,
        clientIndustry: prospect.industry,
        visualStyle: prospect.visualStyle,
        businessType: prospect.businessType,
    };
    
    setCurrentScriptGenerationInput(input);
    
    try {
        const result = await generateContextualScript(input);
        setGeneratedScript(result.script);
    } catch (error: any) {
        toast({ title: 'Script Generation Failed', description: (error as Error).message, variant: 'destructive' });
        setGeneratedScript('Failed to generate script. Please try again.');
    } finally {
        setIsGeneratingScript(false);
    }
  };

  const handleScriptConfirm = async (scriptContent: string) => {
    if (!currentProspect) return;
    
    const now = new Date();
    const newActivity: WarmUpActivity = { 
      id: crypto.randomUUID(), 
      action: 'Replied to Story', 
      date: now.toISOString(),
    };
    const updatedWarmUp = [...(currentProspect.warmUp || []), newActivity];

    const newStatus: OutreachLeadStage = 'Cold';
    const newHistoryEntry: StatusHistoryItem = { status: newStatus, date: now.toISOString() };

    const updates: Partial<OutreachProspect> = {
      warmUp: updatedWarmUp,
      conversationHistory: `${currentProspect.conversationHistory || ''}${currentProspect.conversationHistory ? '\n\n' : ''}Me: ${scriptContent}`.trim(),
      lastContacted: now.toISOString(),
      lastScriptSent: "Cold Outreach DM",
      status: newStatus,
      statusHistory: [...(currentProspect.statusHistory || []), newHistoryEntry],
    };

    try {
        await updateProspect(currentProspect.id, updates);
        const updatedProspectData = { ...currentProspect, ...updates };
        setCurrentProspect(updatedProspectData);
        toast({ title: "Action Complete!", description: "Outreach logged and prospect status advanced to 'Cold'." });
        onActivityLogged(updatedProspectData);
        setIsScriptModalOpen(false);
    } catch(error: any) {
        toast({ title: "Update Failed", description: error.message || 'Could not update prospect.', variant: 'destructive' });
    }
  };
  
  const handleRegenerateScript = async (customInstructions: string): Promise<string | null> => {
    if (!currentScriptGenerationInput) return null;
    const updatedInput = { ...currentScriptGenerationInput, customInstructions };
    setCurrentScriptGenerationInput(updatedInput);
    
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
  };


  const handleDeleteActivity = async () => {
    if (!currentProspect || !activityToDelete) return;
    
    const updatedWarmUp = (currentProspect.warmUp || []).filter(activity => activity.id !== activityToDelete.id);
    const updatedProspectData = { ...currentProspect, warmUp: updatedWarmUp };
    
    try {
      await updateProspect(currentProspect.id, { warmUp: updatedWarmUp });
      setCurrentProspect(updatedProspectData);
      toast({ title: 'Activity Removed', description: `The activity has been deleted.` });
      onActivityLogged(updatedProspectData);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || "Could not delete activity.", variant: "destructive" });
    } finally {
      setActivityToDelete(null);
    }
  };

  const handleEnableWarming = () => {
    if (currentProspect) {
      onStatusChange(currentProspect.id, 'Warming Up');
      setCurrentProspect(prev => prev ? { ...prev, status: 'Warming Up' } : null);
    }
  };
  
  const handleAdvanceStatus = () => {
    if(currentProspect) {
        onStatusChange(currentProspect.id, 'Cold');
        toast({ title: "Status Advanced!", description: `${currentProspect.name} is now ready for outreach.` });
    }
    setShowCompleteConfirmation(false);
  };
  
  const getCompletedActions = (p: OutreachProspect | null | undefined): Set<WarmUpAction> => {
      if (!p) return new Set();
      const actions = new Set((p.warmUp || []).map(a => a.action));
      if (p.conversationHistory?.includes("Me:")) {
          actions.add('Replied to Story');
      }
      return actions;
  };

  const completedActions = getCompletedActions(currentProspect);
  const progress = (completedActions.size / warmUpSteps.length) * 100;
  const isWarmingUp = currentProspect?.status === 'Warming Up';
  
  let nextAction: WarmUpAction | null = null;
  for (const step of warmUpSteps) {
      if (!completedActions.has(step.action)) {
          nextAction = step.action;
          break;
      }
  }


  const StepCard = ({
    stepNumber,
    title,
    description,
    action,
    icon: Icon,
    isComplete,
    isNext
  }: {
    stepNumber: number;
    title: string;
    description: string;
    action: WarmUpAction;
    icon: React.ElementType;
    isComplete: boolean;
    isNext: boolean;
  }) => {
    const isClickable = isWarmingUp && !isLoading && !isComplete;
    let button;
    switch(action) {
      case 'Left Comment':
        button = <Button variant="outline" size="sm" className="w-full" onClick={() => onGenerateComment(currentProspect!)} disabled={!isClickable}><Icon className="mr-2 h-4 w-4"/>Leave Comment</Button>;
        break;
      case 'Replied to Story':
        button = <Button variant="default" size="sm" className="w-full" onClick={() => handleGenerateColdOutreach(currentProspect!)} disabled={!isClickable}><Icon className="mr-2 h-4 w-4"/>Generate Outreach DM</Button>;
        break;
      default:
        button = <Button variant="outline" size="sm" className="w-full" onClick={() => handleLogActivity(action)} disabled={!isClickable}><Icon className="mr-2 h-4 w-4"/>Log '{title}'</Button>;
    }

    return (
    <div className={cn("flex items-start gap-4 transition-all", !isNext && !isComplete && "opacity-50", isNext && "bg-primary/5 p-3 rounded-lg -mx-3")}>
      <div className="flex flex-col items-center">
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors",
          isComplete ? "bg-primary border-primary text-primary-foreground" : 
          isNext ? "bg-primary/20 border-primary" :
          "bg-muted border-border"
        )}>
          {isComplete ? <Check className="h-5 w-5" /> : <span className={cn("font-bold", isNext && "text-primary")}>{stepNumber}</span>}
        </div>
        {stepNumber < warmUpSteps.length && <div className="w-0.5 h-16 bg-border mt-1"></div>}
      </div>
      <div className="flex-1 mt-1">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
        <div className={cn(isComplete && "opacity-60 pointer-events-none")}>
            {button}
        </div>
      </div>
    </div>
  )};

  return (
    <>
      <ScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        scriptContent={generatedScript}
        title="Generate Cold Outreach DM"
        onRegenerate={handleRegenerateScript}
        isLoadingInitially={isGeneratingScript}
        showConfirmButton={true}
        onConfirm={handleScriptConfirm}
        confirmButtonText="Copy, Save & Log"
        prospect={currentProspect}
      />

      <AlertDialog open={!!activityToDelete} onOpenChange={(open) => !open && setActivityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this activity from the log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteActivity}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
       <AlertDialog open={showCompleteConfirmation} onOpenChange={setShowCompleteConfirmation}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Warm-Up Complete!</AlertDialogTitle>
                <AlertDialogDescription>
                    You have completed all warm-up steps for {currentProspect?.name}. Do you want to advance their status to "Cold" to begin outreach?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Not Now</AlertDialogCancel>
                <AlertDialogAction onClick={handleAdvanceStatus}>
                    <ArrowRight className="mr-2 h-4 w-4" /> Advance Status
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl flex items-center">
              <Flame className="mr-2 h-6 w-6 text-destructive" /> Warm-Up Lead
            </DialogTitle>
            <DialogDescription>
              Guide <span className="font-semibold text-foreground">{currentProspect?.name || 'this prospect'}</span> through the "Become Inevitable" method.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
             <Card>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Warm-Up Progress</CardTitle>
                    <span className="font-bold text-lg">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="mt-2 h-2" />
              </CardHeader>
            </Card>

             {!isWarmingUp && (
                  <div className="p-3 text-center bg-destructive/10 border border-destructive/20 rounded-lg">
                      <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2"/>
                      <p className="text-sm font-semibold">Warm-up is not active.</p>
                      <p className="text-xs text-muted-foreground mb-3">To log activities, you must set the prospect's status to "Warming Up".</p>
                      <Button size="sm" onClick={handleEnableWarming}>Enable Warming Up Status</Button>
                  </div>
              )}

            <div className="space-y-0">
               {warmUpSteps.map((step, index) => (
                   <StepCard
                    key={step.action}
                    stepNumber={index + 1}
                    title={step.title}
                    description={step.description}
                    action={step.action}
                    icon={step.icon}
                    isComplete={completedActions.has(step.action)}
                    isNext={nextAction === step.action}
                   />
               ))}
            </div>
            
             <Accordion type="single" collapsible>
                <AccordionItem value="log">
                    <AccordionTrigger className="text-sm">View Activity Log</AccordionTrigger>
                    <AccordionContent>
                         <ScrollArea className="h-32 border bg-muted/30 rounded-md p-2">
                            <div className="space-y-2 text-xs">
                            {(currentProspect?.warmUp || []).length > 0 ? (
                                (currentProspect?.warmUp || []).slice().reverse().map((activity) => (
                                <div key={activity.id} className="flex justify-between items-center p-1.5 bg-background rounded-md group">
                                    <p className="font-medium">{activity.action}</p>
                                    <div className="flex items-center gap-2">
                                    <p className="text-muted-foreground">{format(new Date(activity.date), "MMM d, yyyy")}</p>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100" 
                                        onClick={() => setActivityToDelete(activity)}
                                        disabled={!isWarmingUp}
                                    >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                    </div>
                                </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center pt-8">No warm-up activities logged yet.</p>
                            )}
                            </div>
                        </ScrollArea>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Flame, Eye, Heart, MessageCircle as MessageCircleIcon, MessageSquare, AlertTriangle, Trash2 } from 'lucide-react';
import type { OutreachProspect, WarmUpActivity, WarmUpAction, OutreachLeadStage } from '@/lib/types';
import { updateProspect } from '@/lib/firebase/services';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addDays } from 'date-fns';
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

interface WarmUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: OutreachProspect | null | undefined;
  onActivityLogged: () => void;
  onGenerateComment: (prospect: OutreachProspect) => void;
  onViewConversation: (prospect: OutreachProspect) => void;
  onStatusChange: (id: string, newStatus: OutreachLeadStage) => void;
}

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
  const { toast } = useToast();

  useEffect(() => {
    setCurrentProspect(prospect);
  }, [prospect]);

  const handleLogActivity = async (action: WarmUpAction) => {
    if (!currentProspect) return;
    setIsLoading(true);
    
    const now = new Date();
    // Schedule next action 1-2 days from now
    const nextActionDue = addDays(now, Math.random() > 0.5 ? 1 : 2).toISOString();

    const newActivity: WarmUpActivity = { 
      id: crypto.randomUUID(), 
      action, 
      date: now.toISOString(),
      nextActionDue: nextActionDue,
    };
    const updatedWarmUp = [...(currentProspect.warmUp || []), newActivity];

    try {
      await updateProspect(currentProspect.id, { warmUp: updatedWarmUp });
      setCurrentProspect(prev => prev ? { ...prev, warmUp: updatedWarmUp } : null);
      toast({ title: 'Activity Logged', description: `${action} has been recorded.` });
      onActivityLogged();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || "Could not log activity.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!currentProspect || !activityToDelete) return;
    
    const updatedWarmUp = (currentProspect.warmUp || []).filter(activity => activity.id !== activityToDelete.id);
    
    try {
      await updateProspect(currentProspect.id, { warmUp: updatedWarmUp });
      setCurrentProspect(prev => prev ? { ...prev, warmUp: updatedWarmUp } : null);
      toast({ title: 'Activity Removed', description: `The activity has been deleted.` });
      onActivityLogged();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || "Could not delete activity.", variant: "destructive" });
    } finally {
      setActivityToDelete(null);
    }
  };


  const handleComment = () => {
    if (currentProspect) {
      onGenerateComment(currentProspect);
    }
  };

  const handleReplyToStory = () => {
    if (currentProspect) {
      onViewConversation(currentProspect);
    }
  };
  
  const handleEnableWarming = () => {
    if (currentProspect) {
      onStatusChange(currentProspect.id, 'Warming Up');
      setCurrentProspect(prev => prev ? { ...prev, status: 'Warming Up' } : null);
    }
  };


  const activities = currentProspect?.warmUp || [];
  const hasLiked = activities.some(a => a.action === 'Liked Posts');
  const hasViewedStory = activities.some(a => a.action === 'Viewed Story');
  const hasCommented = activities.some(a => a.action === 'Left Comment');
  const hasReplied = activities.some(a => a.action === 'Replied to Story');

  const progress = (hasLiked + hasViewedStory + hasCommented + hasReplied) * 25;
  const isWarmingUp = currentProspect?.status === 'Warming Up';

  const actionButtons = [
    { name: "Like Posts", icon: Heart, action: () => handleLogActivity('Liked Posts'), complete: hasLiked, tip: "Like 3-5 of their recent posts." },
    { name: "View Story", icon: Eye, action: () => handleLogActivity('Viewed Story'), complete: hasViewedStory, tip: "View their story to show up in their viewers list." },
    { name: "Leave Comment", icon: MessageCircleIcon, action: handleComment, complete: hasCommented, tip: "Generate and leave a thoughtful comment." },
    { name: "Reply to Story", icon: MessageSquare, action: handleReplyToStory, complete: hasReplied, tip: "Reply to one of their stories to start a DM." },
  ];

  return (
    <>
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

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl flex items-center">
              <Flame className="mr-2 h-6 w-6 text-destructive" /> Warm-Up Lead
            </DialogTitle>
            <DialogDescription>
              Warm up <span className="font-semibold text-foreground">{currentProspect?.name || 'this prospect'}</span> before direct outreach to increase response rates.
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                  <CardTitle>Warm-Up Progress</CardTitle>
                  <span className="font-bold text-lg">{progress}%</span>
              </div>
              <Progress value={progress} className="mt-2" />
            </CardHeader>
            <CardContent>
              {!isWarmingUp && (
                  <div className="p-3 mb-4 text-center bg-destructive/10 border border-destructive/20 rounded-lg">
                      <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2"/>
                      <p className="text-sm font-semibold">Warm-up is not active.</p>
                      <p className="text-xs text-muted-foreground mb-3">To log activities, you must set the prospect's status to "Warming Up".</p>
                      <Button size="sm" onClick={handleEnableWarming}>Enable Warming Up Status</Button>
                  </div>
              )}
              <div className="flex gap-2 mb-4 flex-wrap">
                {actionButtons.map(btn => (
                  <TooltipProvider key={btn.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1">
                          <Button 
                              variant={btn.complete ? "default" : "outline"} 
                              className="w-full"
                              onClick={btn.action} 
                              disabled={!isWarmingUp || isLoading}
                          >
                              <btn.icon className="mr-2 h-4 w-4" /> {btn.name}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{btn.complete ? 'Completed!' : btn.tip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
              <h4 className="font-semibold text-sm mb-2">Activity Log</h4>
              <ScrollArea className="h-32 border bg-muted/30 rounded-md p-2">
                <div className="space-y-2 text-xs">
                  {activities.length > 0 ? (
                    activities.slice().reverse().map((activity) => (
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
            </CardContent>
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

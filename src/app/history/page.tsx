
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessagesSquare, Search, Eye, AlertTriangle, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { OutreachProspect } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getProspects, updateProspect } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { ConversationTracker } from '@/components/outreach/conversation-tracker';
import { generateContextualScript, type GenerateContextualScriptInput } from '@/ai/flows/generate-contextual-script';


export default function ConversationHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [prospects, setProspects] = useState<OutreachProspect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<OutreachProspect | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyContent, setHistoryContent] = useState<string | null>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const { toast } = useToast();

  const fetchProspectsWithHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const allProspects = await getProspects();
      const prospectsWithHistory = allProspects.filter(p => p.conversationHistory && p.conversationHistory.trim() !== '');
      setProspects(prospectsWithHistory);
    } catch (error) {
      console.error("Error fetching prospects:", error);
      toast({ title: "Error", description: "Could not fetch conversation histories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchProspectsWithHistory();
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, fetchProspectsWithHistory, router]);

  const filteredProspects = prospects.filter(prospect => 
    prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prospect.instagramHandle && prospect.instagramHandle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewHistory = (prospect: OutreachProspect) => {
    setSelectedProspect(prospect);
    setHistoryContent(prospect.conversationHistory || '');
    setIsModalOpen(true);
  };
  
  const handleGenerateNextReply = async (prospect: OutreachProspect, customInstructions: string): Promise<string> => {
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
    } catch (error) {
      console.error("Error generating next reply:", error);
      toast({
        title: "Error Generating Reply",
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
      return '';
    }
  };

  const handleSaveHistory = async () => {
    if (!selectedProspect) return;
    setIsSaving(true);
    try {
      await updateProspect(selectedProspect.id, { conversationHistory: historyContent });
      toast({ title: "History Updated", description: "The conversation log has been saved." });
      setIsModalOpen(false);
      // Refresh the list to show updated content
      fetchProspectsWithHistory();
    } catch (error: any) {
      console.error("Error saving history:", error);
      toast({ title: "Save Failed", description: error.message || "Could not save history.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isHistoryDirty = selectedProspect ? (selectedProspect.conversationHistory || '') !== (historyContent || '') : false;

  const handleModalCloseAttempt = () => {
    if (isHistoryDirty) {
      setShowUnsavedConfirm(true);
    } else {
      setIsModalOpen(false);
    }
  };


  if (authLoading || (isLoading && !prospects.length && user)) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading conversation history..." size="lg"/></div>;
  }

  if (!user && !authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversation History"
        description="Review and manage conversation logs for all prospects."
        icon={MessagesSquare}
      />

      <AlertDialog open={showUnsavedConfirm} onOpenChange={setShowUnsavedConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard your changes? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowUnsavedConfirm(false);
              setIsModalOpen(false);
            }}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) handleModalCloseAttempt();
        else setIsModalOpen(true);
      }}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl h-[90vh] flex flex-col p-0">
          <DialogTitle className="sr-only">View Conversation History</DialogTitle>
          <DialogDescription className="sr-only">
            A dialog to view, edit, and manage the full conversation history with {selectedProspect?.name || 'this prospect'}.
          </DialogDescription>
           <div className="flex-grow min-h-0">
            <ConversationTracker
              value={historyContent}
              onChange={setHistoryContent}
              prospect={selectedProspect}
              onGenerateReply={handleGenerateNextReply}
              isDirty={isHistoryDirty}
            />
          </div>
          <DialogFooter className="gap-2 p-4 border-t">
            <Button variant="outline" onClick={handleModalCloseAttempt}>Cancel</Button>
            <Button onClick={handleSaveHistory} disabled={isSaving || !isHistoryDirty}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search by name or handle..." 
                className="pl-8 sm:w-[300px]" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
         {isLoading && prospects.length === 0 ? (
             <div className="py-10"><LoadingSpinner text="Fetching histories..." /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prospect Name</TableHead>
                    <TableHead className="hidden md:table-cell">IG Handle</TableHead>
                    <TableHead>History Preview</TableHead>
                    <TableHead className="hidden sm:table-cell">Last Contacted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.length > 0 ? (
                    filteredProspects.map((prospect) => (
                      <TableRow key={prospect.id}>
                        <TableCell className="font-medium">
                          {prospect.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {prospect.instagramHandle || <span className="italic">N/A</span>}
                        </TableCell>
                        <TableCell 
                            className="max-w-xs truncate text-sm text-muted-foreground"
                        >
                            {prospect.conversationHistory?.split('\n').pop() || '...'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {prospect.lastContacted ? new Date(prospect.lastContacted).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewHistory(prospect)} aria-label={`View history for ${prospect.name}`}>
                               <Eye className="h-4 w-4" />
                               <span className="sr-only">View History</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                   <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                              <AlertTriangle className="w-10 h-10 text-muted-foreground mb-2" />
                              <p className="font-semibold">
                                {prospects.length === 0 && searchTerm === ''
                                  ? "No conversation histories found."
                                  : "No prospects found matching your search."
                                }
                              </p>
                              {prospects.length === 0 && (
                                   <p className="text-sm text-muted-foreground">
                                      Start a conversation from the Outreach page.
                                   </p>
                              )}
                          </div>
                      </TableCell>
                   </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

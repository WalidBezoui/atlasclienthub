'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Telescope, Wand2, PlusCircle, CheckCircle, Link as LinkIcon } from 'lucide-react';
import type { OutreachProspect } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '../shared/loading-spinner';
import { discoverProspects } from '@/ai/flows/discover-prospects';
import type { DiscoveredProspect } from '@/ai/flows/discover-prospects';
import { addProspect } from '@/lib/firebase/services';

interface DiscoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProspectAdded: () => void; // Callback to refresh the main list
}

export function DiscoveryDialog({ isOpen, onClose, onProspectAdded }: DiscoveryDialogProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DiscoveredProspect[] | null>(null);
  const [addedProspects, setAddedProspects] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const resetState = () => {
    setQuery('');
    setIsSearching(false);
    setResults(null);
    setAddedProspects(new Set());
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({ title: 'Search query cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsSearching(true);
    setResults(null);
    try {
      const response = await discoverProspects({ query });
      setResults(response.prospects);
      if (response.prospects.length === 0) {
        toast({ title: 'No prospects found', description: 'Try refining your search query.' });
      }
    } catch (error: any) {
      console.error("Discovery failed:", error);
      toast({ title: 'Discovery Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddProspect = async (prospect: DiscoveredProspect) => {
    try {
      const handle = prospect.instagramHandle.replace('@', '');
      const newProspectData: Omit<OutreachProspect, 'id' | 'userId'> = {
        name: prospect.name || handle,
        instagramHandle: handle,
        status: 'To Contact',
        source: 'Discovery Tool',
        notes: `AI Suggestion: "${prospect.reason}"\nOriginal query: "${query}"`,
        createdAt: new Date().toISOString(),
        // set other fields to null/defaults
        email: null,
        businessName: prospect.name || handle,
        website: null,
        prospectLocation: null,
        industry: null,
        visualStyle: null,
        bioSummary: null,
        businessType: null,
        businessTypeOther: null,
        accountStage: null,
        followerCount: null,
        postCount: null,
        avgLikes: null,
        avgComments: null,
        painPoints: [],
        goals: [],
        lastContacted: null,
        followUpDate: null,
        followUpNeeded: false,
        offerInterest: [],
        uniqueNote: null,
        helpStatement: null,
        tonePreference: null,
        lastMessageSnippet: null,
        lastScriptSent: null,
        linkSent: false,
        carouselOffered: false,
        nextStep: null,
        conversationHistory: null,
        qualifierQuestion: null,
        qualifierSentAt: null,
        qualifierReply: null,
        leadScore: null,
        qualificationData: null,
      };

      await addProspect(newProspectData);
      setAddedProspects(prev => new Set(prev).add(prospect.instagramHandle));
      toast({ title: 'Prospect Added!', description: `${prospect.name} is now in your outreach list.` });
      onProspectAdded(); // This will trigger a refetch on the main page
    } catch (error: any) {
      console.error("Failed to add prospect:", error);
      toast({ title: 'Failed to Add Prospect', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center">
            <Telescope className="mr-2 h-6 w-6 text-primary" />
            Prospect Discovery
          </DialogTitle>
          <DialogDescription>
            Use AI to find potential prospects. Describe what you're looking for.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="discovery-query">Search Query</Label>
          <div className="flex gap-2">
            <Input
              id="discovery-query"
              placeholder="e.g., 'handmade jewelry brands in Casablanca'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              disabled={isSearching}
            />
            <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Discover
            </Button>
          </div>
        </div>
        <Separator className="my-4" />

        <div className="flex-grow overflow-y-auto -mx-6 px-6">
          {isSearching && (
            <div className="flex flex-col items-center justify-center h-full">
              <LoadingSpinner text="Searching for prospects..." size="lg" />
            </div>
          )}
          {results && (
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4">
                {results.length > 0 ? (
                  results.map((prospect, index) => (
                    <Card key={index} className="shadow-sm">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://instagram.com/${prospect.instagramHandle.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-primary hover:underline"
                            >
                              {prospect.name}
                            </a>
                            <LinkIcon className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">@{prospect.instagramHandle}</p>
                          <p className="text-sm mt-2 italic">"{prospect.reason}"</p>
                        </div>
                        <Button
                          size="sm"
                          variant={addedProspects.has(prospect.instagramHandle) ? "secondary" : "default"}
                          onClick={() => handleAddProspect(prospect)}
                          disabled={addedProspects.has(prospect.instagramHandle)}
                        >
                          {addedProspects.has(prospect.instagramHandle) ? (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          ) : (
                            <PlusCircle className="mr-2 h-4 w-4" />
                          )}
                          {addedProspects.has(prospect.instagramHandle) ? 'Added' : 'Add'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>No prospects found for your query.</p>
                    <p className="text-xs">Try being more specific or using different keywords.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          {!isSearching && !results && (
            <div className="text-center py-10 text-muted-foreground">
              <p>Your discovery results will appear here.</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

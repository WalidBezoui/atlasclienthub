
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Telescope, Wand2, PlusCircle, CheckCircle, Link as LinkIcon, Bot, BarChart3, Sparkles } from 'lucide-react';
import type { OutreachProspect, QualificationData } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '../shared/loading-spinner';
import { discoverProspects } from '@/ai/flows/discover-prospects';
import { discoverHotProspects, type DiscoveredProspect } from '@/ai/flows/discover-hot-prospects';
import { addProspect } from '@/lib/firebase/services';
import { Badge } from '../ui/badge';
import { fetchInstagramMetrics, type InstagramMetrics } from '@/app/actions/fetch-ig-metrics';
import { qualifyProspect, type QualifyProspectInput, type QualifyProspectOutput } from '@/ai/flows/qualify-prospect';
import { cn } from '@/lib/utils';


interface DiscoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProspectAdded: () => void; // Callback to refresh the main list
}

const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
};

const getLeadScoreBadgeVariant = (score: number | null | undefined): "default" | "secondary" | "destructive" => {
    if (score === null || score === undefined) return "secondary";
    if (score >= 60) return "default";
    if (score >= 30) return "secondary";
    return "destructive";
};

export function DiscoveryDialog({ isOpen, onClose, onProspectAdded }: DiscoveryDialogProps) {
  const [query, setQuery] = useState('');
  const [minFollowers, setMinFollowers] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSearch, setActiveSearch] = useState<'manual' | 'smart' | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [verifiedResults, setVerifiedResults] = useState<DiscoveredProspect[] | null>(null);
  const [addedProspects, setAddedProspects] = useState<Set<string>>(new Set());

  // New state for evaluation
  const [evaluatingHandles, setEvaluatingHandles] = useState<Set<string>>(new Set());
  const [metricsCache, setMetricsCache] = useState<Map<string, InstagramMetrics>>(new Map());
  const [evaluationResults, setEvaluationResults] = useState<Map<string, QualifyProspectOutput>>(new Map());

  const { toast } = useToast();

  const resetState = () => {
    setQuery('');
    setMinFollowers('');
    setIsLoading(false);
    setActiveSearch(null);
    setLoadingStep(null);
    setVerifiedResults(null);
    setAddedProspects(new Set());
    setEvaluatingHandles(new Set());
    setMetricsCache(new Map());
    setEvaluationResults(new Map());
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
    setActiveSearch('manual');
    setIsLoading(true);
    setLoadingStep('AI is discovering prospects...');
    setVerifiedResults([]); // Reset to empty array to show progressive loading
    setEvaluationResults(new Map());
    setMetricsCache(new Map());
    setAddedProspects(new Set());

    try {
      // Step 1: Discover prospects with AI
      const response = await discoverProspects({ 
        query,
        minFollowerCount: minFollowers !== '' ? Number(minFollowers) : null,
      });

      if (response.prospects.length === 0) {
        toast({ title: 'No initial prospects found', description: 'Try refining your search query.' });
        setIsLoading(false);
        setLoadingStep(null);
        return;
      }

      // Step 2: Verify prospects sequentially
      const newVerifiedResults: DiscoveredProspect[] = [];
      const newMetricsCache = new Map<string, InstagramMetrics>();

      for (const [index, prospect] of response.prospects.entries()) {
        setLoadingStep(`Verifying ${index + 1} of ${response.prospects.length}: @${prospect.instagramHandle}`);
        
        try {
            const result = await fetchInstagramMetrics(prospect.instagramHandle.replace('@', ''));
            if (result.data) {
                const minFollowersNum = minFollowers !== '' ? Number(minFollowers) : 0;
                if (result.data.followerCount >= minFollowersNum) {
                    const handle = prospect.instagramHandle.replace('@', '');
                    const updatedProspect = {
                        ...prospect,
                        followerCount: result.data.followerCount,
                        postCount: result.data.postCount,
                    };
                    newVerifiedResults.push(updatedProspect);
                    newMetricsCache.set(handle, result.data);
                    // Update state inside the loop to show progressive results
                    setVerifiedResults([...newVerifiedResults]);
                    setMetricsCache(new Map(newMetricsCache));
                }
            }
        } catch (e) {
            console.warn(`Could not verify @${prospect.instagramHandle}`, e);
            // Silently fail and continue to the next one
        }
      }

      if (newVerifiedResults.length === 0) {
        toast({
          title: 'No verifiable prospects found',
          description: "AI suggested some accounts, but none could be confirmed or met your follower criteria. Try a different query.",
          duration: 6000,
        });
      }

    } catch (error: any) {
      console.error("Discovery process failed:", error);
      toast({ title: 'Discovery Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
      setActiveSearch(null);
    }
  };

  const handleSmartDiscovery = async () => {
    setActiveSearch('smart');
    setIsLoading(true);
    setLoadingStep('AI is discovering hot prospects...');
    setVerifiedResults([]);
    setEvaluationResults(new Map());
    setMetricsCache(new Map());
    setAddedProspects(new Set());
    setQuery(''); // Clear query field
    setMinFollowers(''); // Clear min followers field

    try {
      // Step 1: Discover hot prospects with AI (no query)
      const response = await discoverHotProspects();

      if (response.prospects.length === 0) {
        toast({ title: 'No initial prospects found', description: 'The AI could not find any hot prospects at this time. Try again later.' });
        setIsLoading(false);
        setLoadingStep(null);
        return;
      }

      // Step 2: Verify prospects sequentially (same logic as handleSearch)
      const newVerifiedResults: DiscoveredProspect[] = [];
      const newMetricsCache = new Map<string, InstagramMetrics>();

      for (const [index, prospect] of response.prospects.entries()) {
        setLoadingStep(`Verifying ${index + 1} of ${response.prospects.length}: @${prospect.instagramHandle}`);
        
        try {
            const result = await fetchInstagramMetrics(prospect.instagramHandle.replace('@', ''));
            if (result.data) {
                const updatedProspect = {
                    ...prospect,
                    followerCount: result.data.followerCount,
                    postCount: result.data.postCount,
                };
                newVerifiedResults.push(updatedProspect);
                const handle = prospect.instagramHandle.replace('@', '');
                newMetricsCache.set(handle, result.data);
                // Update state inside the loop to show progressive results
                setVerifiedResults([...newVerifiedResults]);
                setMetricsCache(new Map(newMetricsCache));
            }
        } catch (e) {
            console.warn(`Could not verify @${prospect.instagramHandle}`, e);
        }
      }

      if (newVerifiedResults.length === 0) {
        toast({
          title: 'No verifiable prospects found',
          description: "AI suggested some accounts, but none could be confirmed. Try again.",
          duration: 6000,
        });
      }

    } catch (error: any) {
      console.error("Smart Discovery process failed:", error);
      toast({ title: 'Discovery Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
      setActiveSearch(null);
    }
  };

  const handleEvaluate = async (prospect: DiscoveredProspect) => {
    const handle = prospect.instagramHandle.replace('@', '');
    setEvaluatingHandles(prev => new Set(prev).add(handle));
    try {
        let metricsData = metricsCache.get(handle);
        if (!metricsData) {
            const metricsResult = await fetchInstagramMetrics(handle);
            if (metricsResult.error || !metricsResult.data) {
                throw new Error(metricsResult.error || 'Failed to fetch metrics.');
            }
            metricsData = metricsResult.data;
            setMetricsCache(prev => new Map(prev).set(handle, metricsData!));
        }

        const analysisResult = await qualifyProspect({
            instagramHandle: handle,
            followerCount: metricsData.followerCount,
            postCount: metricsData.postCount,
            avgLikes: metricsData.avgLikes,
            avgComments: metricsData.avgComments,
            biography: metricsData.biography,
            userProfitabilityAssessment: "Selling physical products",
            userVisualsAssessment: "Clean but Generic (Lacks personality, looks like a template)",
            userStrategyAssessment: "Increasing engagement with current followers (Middle of Funnel)",
        });

        setEvaluationResults(prev => new Map(prev).set(handle, analysisResult));
        toast({ title: 'Evaluation Complete', description: `@${handle} has been analyzed.` });

    } catch (error: any) {
        toast({ title: 'Evaluation Failed', description: error.message, variant: 'destructive' });
    } finally {
        setEvaluatingHandles(prev => {
            const newSet = new Set(prev);
            newSet.delete(handle);
            return newSet;
        });
    }
  };


  const handleAddProspect = async (prospect: DiscoveredProspect) => {
    try {
      const handle = prospect.instagramHandle.replace('@', '');
      const evaluation = evaluationResults.get(handle);
      const metrics = metricsCache.get(handle);

      const newProspectData: Omit<OutreachProspect, 'id' | 'userId'> = {
        name: prospect.name || handle,
        instagramHandle: handle,
        status: 'To Contact',
        source: 'Discovery Tool',
        notes: `AI Suggestion: "${prospect.reason}"\nOriginal query: "${query || 'Smart Discovery'}"`,
        createdAt: new Date().toISOString(),
        
        // Populate with evaluation data if it exists
        followerCount: metrics?.followerCount ?? prospect.followerCount ?? null,
        postCount: metrics?.postCount ?? prospect.postCount ?? null,
        avgLikes: metrics?.avgLikes ?? null,
        avgComments: metrics?.avgComments ?? null,
        bioSummary: metrics?.biography ?? null,

        leadScore: evaluation?.leadScore ?? null,
        qualificationData: (evaluation?.qualificationData as QualificationData) ?? null,
        painPoints: evaluation?.painPoints ?? [],
        goals: evaluation?.goals ?? [],
        helpStatement: evaluation?.summary ?? null,

        // Set other fields to null/defaults
        email: null,
        businessName: prospect.name || handle,
        website: null,
        prospectLocation: null,
        industry: null,
        visualStyle: null,
        businessType: null,
        businessTypeOther: null,
        accountStage: null,
        lastContacted: null,
        followUpDate: null,
        followUpNeeded: false,
        offerInterest: [],
        uniqueNote: null,
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

  const renderProspectCard = (prospect: DiscoveredProspect) => {
      const handle = prospect.instagramHandle.replace('@', '');
      const isEvaluating = evaluatingHandles.has(handle);
      const isAdded = addedProspects.has(prospect.instagramHandle);
      const evaluation = evaluationResults.get(handle);
      const metrics = metricsCache.get(handle);

      const displayFollowers = metrics?.followerCount ?? prospect.followerCount;
      const displayPosts = metrics?.postCount ?? prospect.postCount;

      return (
        <Card key={prospect.instagramHandle} className={cn("shadow-sm transition-all", isEvaluating && "opacity-60")}>
            <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                        <a
                            href={`https://instagram.com/${handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-primary hover:underline"
                        >
                            {prospect.name}
                        </a>
                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">@{prospect.instagramHandle}</p>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEvaluate(prospect)}
                            disabled={isEvaluating || !!evaluation}
                        >
                            {isEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                            {evaluation ? 'Evaluated' : 'Evaluate'}
                        </Button>
                        <Button
                            size="sm"
                            variant={isAdded ? "secondary" : "default"}
                            onClick={() => handleAddProspect(prospect)}
                            disabled={isAdded || isEvaluating}
                        >
                            {isAdded ? (
                                <CheckCircle className="mr-2 h-4 w-4" />
                            ) : (
                                <PlusCircle className="mr-2 h-4 w-4" />
                            )}
                            {isAdded ? 'Added' : 'Add'}
                        </Button>
                     </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                   <div className="flex items-center gap-1">
                        <BarChart3 className="h-4 w-4"/>
                        <span>Followers: <b className="text-foreground">{formatNumber(displayFollowers)}</b></span>
                   </div>
                    <div className="flex items-center gap-1">
                        <span>Posts: <b className="text-foreground">{formatNumber(displayPosts)}</b></span>
                   </div>
                </div>

                <p className="text-sm italic">"{prospect.reason}"</p>
                
                {isEvaluating && <LoadingSpinner text="Evaluating..." />}

                {evaluation && (
                    <div className="mt-2 p-3 border-t space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Evaluation Result</h4>
                            <Badge variant={getLeadScoreBadgeVariant(evaluation.leadScore)}>{evaluation.leadScore}</Badge>
                        </div>
                        <p className="text-xs italic text-muted-foreground">"{evaluation.summary}"</p>
                    </div>
                )}
            </CardContent>
        </Card>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center">
            <Telescope className="mr-2 h-6 w-6 text-primary" />
            Prospect Discovery
          </DialogTitle>
          <DialogDescription>
            Use AI to find potential prospects. Describe what you're looking for, then evaluate and add them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
            <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor="discovery-query" className="text-xs">Manual Search Query</Label>
                        <Input
                            id="discovery-query"
                            placeholder="e.g., 'handmade jewelry brands'"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <Label htmlFor="min-followers" className="text-xs">Min Followers</Label>
                        <Input
                            id="min-followers"
                            type="number"
                            placeholder="e.g., 1000"
                            value={minFollowers}
                            onChange={(e) => setMinFollowers(e.target.value === '' ? '' : Number(e.target.value))}
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
                    {isLoading && activeSearch === 'manual' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Search
                </Button>
            </div>

            <div className="relative">
                <Separator />
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-background px-2 text-xs text-muted-foreground">OR</span>
                </div>
            </div>

            <Button variant="secondary" className="w-full" onClick={handleSmartDiscovery} disabled={isLoading}>
                {isLoading && activeSearch === 'smart' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Auto-Discover Hot Prospects
            </Button>
        </div>

        <Separator className="my-4" />

        <div className="flex-grow overflow-y-auto -mx-6 px-6">
          {isLoading && (!verifiedResults || verifiedResults.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full">
              <LoadingSpinner text={loadingStep || 'Loading...'} size="lg" />
            </div>
          )}
          
          {verifiedResults && (
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4">
                {verifiedResults.length > 0 ? (
                  verifiedResults.map((prospect) => renderProspectCard(prospect))
                ) : !isLoading ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>No verifiable prospects found.</p>
                    <p className="text-xs">Try being more specific or using different keywords.</p>
                  </div>
                ) : null}
                {isLoading && verifiedResults.length > 0 && (
                  <div className="py-4">
                    <LoadingSpinner text={loadingStep || 'Loading...'} size="sm" />
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {!isLoading && !verifiedResults && (
            <div className="text-center py-10 text-muted-foreground">
              <p>Your discovered & verified prospects will appear here.</p>
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

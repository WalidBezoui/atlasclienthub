
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Telescope, Wand2, PlusCircle, CheckCircle, Link as LinkIcon, Bot, BarChart3, Sparkles, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import type { OutreachProspect, QualificationData } from '@/lib/types';
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const profitabilityQuestions = [
  "High-ticket services (coaching, consulting, agency work)",
  "Directly selling products (e-commerce, physical goods)",
  "Local services (salon, restaurant, in-person business)",
  "Affiliate marketing or brand sponsorships",
  "Unclear or likely a hobby/personal account"
];
const visualsQuestions = [
  "Highly Polished & Professional (Looks expensive, great branding)",
  "Clean but Templated (Looks good, but lacks unique personality)",
  "Inconsistent & Messy (No clear visual direction or style)",
  "Outdated or Unprofessional (Poor quality images, bad design choices)",
  "Too New to Judge (Not enough content to form an opinion)"
];
const strategyQuestions = [
  "Brand Awareness (They need to establish a clear brand identity and reach new people)",
  "Community Engagement (They have followers but need more interaction and trust)",
  "Lead Conversion (They need to turn their existing audience into paying customers)"
];

interface DiscoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProspectAdded: () => void;
  existingProspectHandles: Set<string>;
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

export function DiscoveryDialog({ isOpen, onClose, onProspectAdded, existingProspectHandles }: DiscoveryDialogProps) {
  const [query, setQuery] = useState('');
  const [minFollowers, setMinFollowers] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSearch, setActiveSearch] = useState<'manual' | 'smart' | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [verifiedResults, setVerifiedResults] = useState<DiscoveredProspect[] | null>(null);
  const [addedProspects, setAddedProspects] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  // State for evaluation
  const [metricsCache, setMetricsCache] = useState<Map<string, InstagramMetrics>>(new Map());
  const [evaluationResults, setEvaluationResults] = useState<Map<string, QualifyProspectOutput>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluationState, setEvaluationState] = useState<{
      handle: string;
      profitabilityAnswer?: string;
      visualsAnswer?: string;
      strategyAnswer?: string;
  } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (verifiedResults && verifiedResults.length > 0) {
      setCurrentIndex(0);
    }
  }, [verifiedResults]);

  const resetState = () => {
    setQuery('');
    setMinFollowers('');
    setIsLoading(false);
    setActiveSearch(null);
    setLoadingStep(null);
    setVerifiedResults(null);
    setAddedProspects(new Set());
    setMetricsCache(new Map());
    setEvaluationResults(new Map());
    setEvaluationState(null);
    setIsAnalyzing(false);
    setCurrentIndex(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };
  
  const runDiscovery = async (type: 'manual' | 'smart') => {
    if (type === 'manual' && !query.trim()) {
      toast({ title: 'Search query cannot be empty.', variant: 'destructive' });
      return;
    }

    resetState();
    setActiveSearch(type);
    setIsLoading(true);
    setLoadingStep(type === 'manual' ? 'AI is discovering prospects...' : 'AI is discovering hot prospects...');

    try {
      const response = await (type === 'manual'
        ? discoverProspects({ query, minFollowerCount: minFollowers !== '' ? Number(minFollowers) : null })
        : discoverHotProspects());

      if (!response.prospects || response.prospects.length === 0) {
        toast({ title: 'No initial prospects found', description: 'Try refining your search query or try again later.' });
        setIsLoading(false);
        setLoadingStep(null);
        return;
      }

      const prospectsToVerify = response.prospects;
      let allVerifiedResults: DiscoveredProspect[] = [];
      const BATCH_SIZE = 5;
      let processedCount = 0;

      for (let i = 0; i < prospectsToVerify.length; i += BATCH_SIZE) {
        const batch = prospectsToVerify.slice(i, i + BATCH_SIZE);
        setLoadingStep(`Verifying ${processedCount + 1}-${Math.min(processedCount + BATCH_SIZE, prospectsToVerify.length)} of ${prospectsToVerify.length}...`);

        const promises = batch.map(prospect =>
          fetchInstagramMetrics(prospect.instagramHandle.replace('@', ''))
            .then(result => ({ prospect, result }))
            .catch(error => ({ prospect, error }))
        );
        const batchRequestResults = await Promise.all(promises);

        const newMetricsCache = new Map<string, InstagramMetrics>();
        for (const { prospect, result, error } of batchRequestResults) {
          if (error || result.error || !result.data) {
            console.warn(`Could not verify @${prospect.instagramHandle}`, error || result.error);
            continue;
          }
          const metrics = result.data;
          
          let meetsFollowerCriteria;
          if (type === 'smart') {
            meetsFollowerCriteria = metrics.followerCount >= 5000;
          } else {
            meetsFollowerCriteria = minFollowers === '' || metrics.followerCount >= Number(minFollowers);
          }
          if (meetsFollowerCriteria) {
            const handle = prospect.instagramHandle.replace('@', '');
            const updatedProspect = { ...prospect, followerCount: metrics.followerCount, postCount: metrics.postCount };
            allVerifiedResults.push(updatedProspect);
            newMetricsCache.set(handle, metrics);
          }
        }
        processedCount += batch.length;
        if (newMetricsCache.size > 0) {
          setVerifiedResults([...allVerifiedResults]);
          setMetricsCache(current => new Map([...current, ...newMetricsCache]));
        }
      }

      if (allVerifiedResults.length === 0) {
        toast({ title: 'No verifiable prospects found', description: "AI suggested some accounts, but none could be confirmed or met your criteria.", duration: 6000 });
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
  
  const handleTriggerEvaluation = (prospect: DiscoveredProspect) => {
    setEvaluationState({ handle: prospect.instagramHandle.replace('@', '') });
  };
  
  const handleCancelEvaluation = () => setEvaluationState(null);

  const handleEvaluationSubmit = async () => {
    if (!evaluationState || !evaluationState.profitabilityAnswer || !evaluationState.visualsAnswer || !evaluationState.strategyAnswer) {
      toast({ title: "Missing Input", description: "Please answer all three questions to proceed.", variant: "destructive" });
      return;
    }
    const handle = evaluationState.handle;
    const metrics = metricsCache.get(handle);
    const prospect = verifiedResults?.find(p => p.instagramHandle.replace('@', '') === handle);
    if (!metrics || !prospect) {
      toast({ title: "Error", description: "Could not find prospect data to analyze.", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    try {
      const input: QualifyProspectInput = {
        instagramHandle: prospect.instagramHandle,
        followerCount: metrics.followerCount, postCount: metrics.postCount, avgLikes: metrics.avgLikes, avgComments: metrics.avgComments,
        biography: metrics.biography || null,
        userProfitabilityAssessment: evaluationState.profitabilityAnswer,
        userVisualsAssessment: evaluationState.visualsAnswer,
        userStrategyAssessment: evaluationState.strategyAnswer,
      };
      const result = await qualifyProspect(input);
      setEvaluationResults(prev => new Map(prev).set(handle, result));
      toast({ title: "Analysis Complete!", description: "Prospect has been evaluated." });
      setEvaluationState(null);
    } catch (error: any) {
      toast({ title: 'Analysis Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddProspect = async (prospect: DiscoveredProspect) => {
    try {
      const handle = prospect.instagramHandle.replace('@', '');
      const evaluation = evaluationResults.get(handle);
      const metrics = metricsCache.get(handle);
      const newProspectData: Omit<OutreachProspect, 'id' | 'userId'> = {
        name: prospect.name || handle, instagramHandle: handle, status: 'To Contact', source: 'Discovery Tool',
        notes: `AI Suggestion: "${prospect.reason}"\nOriginal query: "${query || 'Smart Discovery'}"`,
        createdAt: new Date().toISOString(),
        followerCount: metrics?.followerCount ?? prospect.followerCount ?? null,
        postCount: metrics?.postCount ?? prospect.postCount ?? null,
        avgLikes: metrics?.avgLikes ?? null, avgComments: metrics?.avgComments ?? null, bioSummary: metrics?.biography ?? null,
        leadScore: evaluation?.leadScore ?? null, qualificationData: (evaluation?.qualificationData as QualificationData) ?? null,
        painPoints: evaluation?.painPoints ?? [], goals: evaluation?.goals ?? [], helpStatement: evaluation?.summary ?? null,
        email: null, businessName: prospect.name || handle, website: null, prospectLocation: null, industry: null, visualStyle: null,
        businessType: null, businessTypeOther: null, accountStage: null, lastContacted: null, followUpDate: null, followUpNeeded: false,
        offerInterest: [], uniqueNote: null, tonePreference: null, lastMessageSnippet: null, lastScriptSent: null, linkSent: false,
        carouselOffered: false, nextStep: null, conversationHistory: null, qualifierQuestion: null, qualifierSentAt: null, qualifierReply: null,
      };
      await addProspect(newProspectData);
      setAddedProspects(prev => new Set(prev).add(prospect.instagramHandle));
      toast({ title: 'Prospect Added!', description: `${prospect.name} is now in your outreach list.` });
      onProspectAdded();
    } catch (error: any) {
      console.error("Failed to add prospect:", error);
      toast({ title: 'Failed to Add Prospect', description: error.message, variant: 'destructive' });
    }
  };

  const currentProspect = verifiedResults ? verifiedResults[currentIndex] : null;
  const isEvaluatingCurrent = !!currentProspect && evaluationState?.handle === currentProspect.instagramHandle.replace('@', '');

  return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl flex items-center">
              <Telescope className="mr-2 h-6 w-6 text-primary" /> Prospect Discovery
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
                          <Input id="discovery-query" placeholder="e.g., 'handmade jewelry brands'" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && runDiscovery('manual')} disabled={isLoading} />
                      </div>
                      <div>
                          <Label htmlFor="min-followers" className="text-xs">Min Followers</Label>
                          <Input id="min-followers" type="number" placeholder="e.g., 5000" value={minFollowers} onChange={(e) => setMinFollowers(e.target.value === '' ? '' : Number(e.target.value))} disabled={isLoading}/>
                      </div>
                  </div>
                  <Button onClick={() => runDiscovery('manual')} disabled={isLoading || !query.trim()}>
                      {isLoading && activeSearch === 'manual' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} Search
                  </Button>
              </div>
              <div className="relative flex justify-center"><Separator className="absolute inset-y-1/2" /><span className="bg-background px-2 text-xs text-muted-foreground z-10">OR</span></div>
              <Button variant="secondary" className="w-full" onClick={() => runDiscovery('smart')} disabled={isLoading}>
                  {isLoading && activeSearch === 'smart' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Auto-Discover Hot Prospects
              </Button>
          </div>

          <Separator className="my-4" />

          <div className="flex-grow overflow-y-auto -mx-6 px-6 flex flex-col min-h-0">
            {isLoading && (!verifiedResults || verifiedResults.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full"><LoadingSpinner text={loadingStep || 'Loading...'} size="lg" /></div>
            )}
            {!isLoading && (!verifiedResults || verifiedResults.length === 0) && (
              <div className="text-center py-10 text-muted-foreground flex-grow flex flex-col justify-center items-center"><p>Your discovered & verified prospects will appear here.</p></div>
            )}
            
            {verifiedResults && verifiedResults.length > 0 && (
                <div className="flex flex-col flex-grow h-full">
                    <div className="flex-grow flex items-center justify-between gap-1 md:gap-2 min-h-0">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))} disabled={currentIndex === 0} aria-label="Previous prospect" className="shrink-0"><ChevronLeft className="h-6 w-6" /></Button>
                        
                        <div className="w-full h-full flex-1 flex flex-col min-w-0">
                           {isEvaluatingCurrent ? (
                                <Card className="w-full h-full flex flex-col">
                                    <CardContent className="p-4 flex-grow overflow-y-auto space-y-4">
                                        <h3 className="font-semibold text-center">Manual Assessment for @{evaluationState.handle}</h3>
                                        <Separator/>
                                        <div>
                                            <Label className="font-semibold flex items-center text-sm mb-2"><HelpCircle className="mr-2 h-4 w-4 text-primary" />How does this account make money?</Label>
                                            <RadioGroup value={evaluationState.profitabilityAnswer} onValueChange={(v) => setEvaluationState(s => s ? {...s, profitabilityAnswer: v} : null)} className="space-y-1">{profitabilityQuestions.map((o) => <div key={o} className="flex items-center space-x-2"><RadioGroupItem value={o} id={`profit-${o}`} /><Label htmlFor={`profit-${o}`} className="font-normal text-xs">{o}</Label></div>)}</RadioGroup>
                                        </div>
                                         <Separator/>
                                        <div>
                                            <Label className="font-semibold flex items-center text-sm mb-2"><HelpCircle className="mr-2 h-4 w-4 text-primary" />Describe their visual branding.</Label>
                                            <RadioGroup value={evaluationState.visualsAnswer} onValueChange={(v) => setEvaluationState(s => s ? {...s, visualsAnswer: v} : null)} className="space-y-1">{visualsQuestions.map((o) => <div key={o} className="flex items-center space-x-2"><RadioGroupItem value={o} id={`visual-${o}`} /><Label htmlFor={`visual-${o}`} className="font-normal text-xs">{o}</Label></div>)}</RadioGroup>
                                        </div>
                                         <Separator/>
                                        <div>
                                            <Label className="font-semibold flex items-center text-sm mb-2"><HelpCircle className="mr-2 h-4 w-4 text-primary" />What's their biggest strategic opportunity?</Label>
                                            <RadioGroup value={evaluationState.strategyAnswer} onValueChange={(v) => setEvaluationState(s => s ? {...s, strategyAnswer: v} : null)} className="space-y-1">{strategyQuestions.map((o) => <div key={o} className="flex items-center space-x-2"><RadioGroupItem value={o} id={`strategy-${o}`} /><Label htmlFor={`strategy-${o}`} className="font-normal text-xs">{o}</Label></div>)}</RadioGroup>
                                        </div>
                                    </CardContent>
                                    <div className="p-4 border-t flex justify-end gap-2 shrink-0">
                                        <Button variant="ghost" onClick={handleCancelEvaluation}>Cancel</Button>
                                        <Button onClick={handleEvaluationSubmit} disabled={isAnalyzing || !evaluationState?.profitabilityAnswer || !evaluationState?.visualsAnswer || !evaluationState?.strategyAnswer}>
                                            {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Analyze
                                        </Button>
                                    </div>
                                </Card>
                            ) : currentProspect && (
                                <Card className="w-full h-full flex flex-col shadow-lg border-2 border-transparent hover:border-primary transition-colors duration-300">
                                  <CardContent className="p-4 flex-grow flex flex-col gap-3">
                                      <div className="flex items-start justify-between gap-4">
                                          <div>
                                              <a href={`https://instagram.com/${currentProspect.instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="font-headline text-lg text-primary hover:underline">{currentProspect.name}</a>
                                              <p className="text-sm text-muted-foreground">@{currentProspect.instagramHandle}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {evaluationResults.has(currentProspect.instagramHandle.replace('@', '')) ? (
                                                  <Badge variant={getLeadScoreBadgeVariant(evaluationResults.get(currentProspect.instagramHandle.replace('@', ''))?.leadScore)} className="text-lg">{evaluationResults.get(currentProspect.instagramHandle.replace('@', ''))?.leadScore}</Badge>
                                              ) : (
                                                  <Button size="sm" variant="outline" onClick={() => handleTriggerEvaluation(currentProspect)}><Bot className="mr-2 h-4 w-4" />Evaluate</Button>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex items-center justify-around text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                                          <div className="text-center"><div className="font-bold text-lg text-foreground">{formatNumber(currentProspect.followerCount)}</div><div className="text-xs">Followers</div></div>
                                          <div className="text-center"><div className="font-bold text-lg text-foreground">{formatNumber(currentProspect.postCount)}</div><div className="text-xs">Posts</div></div>
                                      </div>
                                      <div className="flex-grow space-y-2">
                                          <p className="text-sm italic text-center p-2 bg-background rounded-md">"{currentProspect.reason}"</p>
                                          {evaluationResults.has(currentProspect.instagramHandle.replace('@', '')) && (
                                              <div className="text-sm text-center p-2 rounded-md border bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-500/30">
                                                  <p className="font-semibold text-green-800 dark:text-green-300">AI Summary</p>
                                                  <p className="italic text-green-700/80 dark:text-green-400/80">"{evaluationResults.get(currentProspect.instagramHandle.replace('@', ''))?.summary}"</p>
                                              </div>
                                          )}
                                      </div>
                                  </CardContent>
                                   <div className="p-4 border-t shrink-0">
                                      <Button className="w-full" size="lg" variant={existingProspectHandles.has(currentProspect.instagramHandle.replace('@', '')) || addedProspects.has(currentProspect.instagramHandle) ? "secondary" : "default"} onClick={() => handleAddProspect(currentProspect)} disabled={existingProspectHandles.has(currentProspect.instagramHandle.replace('@', '')) || addedProspects.has(currentProspect.instagramHandle)}>
                                          {existingProspectHandles.has(currentProspect.instagramHandle.replace('@', '')) || addedProspects.has(currentProspect.instagramHandle) ? <CheckCircle className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                          {existingProspectHandles.has(currentProspect.instagramHandle.replace('@', '')) || addedProspects.has(currentProspect.instagramHandle) ? 'Already Added' : 'Add to Outreach List'}
                                      </Button>
                                  </div>
                                </Card>
                            )}
                        </div>
                        
                        <Button variant="ghost" size="icon" onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, verifiedResults.length - 1))} disabled={currentIndex === verifiedResults.length - 1} aria-label="Next prospect" className="shrink-0"><ChevronRight className="h-6 w-6" /></Button>
                    </div>
                    <div className="shrink-0 flex flex-col items-center gap-2 pt-4">
                        <div className="flex items-center gap-2">
                          {verifiedResults.map((_, index) => <button key={index} onClick={() => setCurrentIndex(index)} className={cn('h-2 rounded-full transition-all duration-300', currentIndex === index ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2')} aria-label={`Go to prospect ${index + 1}`}/>)}
                        </div>
                        <p className="text-xs text-muted-foreground">Prospect {currentIndex + 1} of {verifiedResults.length}</p>
                    </div>
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

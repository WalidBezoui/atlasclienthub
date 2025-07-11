
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Telescope, Wand2, PlusCircle, CheckCircle, Link as LinkIcon, Bot, BarChart3, Sparkles, ChevronLeft, ChevronRight, HelpCircle, BrainCircuit, ArrowRight } from 'lucide-react';
import type { OutreachProspect, QualificationData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

const profitabilityQuestions = [
  "Sells high-ticket services (coaching, consulting, agency work)",
  "Sells physical or digital products (e-commerce, courses)",
  "Is a local business (brick-and-mortar, in-person services)",
  "Monetizes through brand deals or affiliate marketing",
  "It's unclear, seems like a hobby or personal account"
];
const visualsQuestions = [
  "Inconsistent & Messy (No clear visual direction or style)",
  "Clean but Generic (Looks like a template, lacks personality)",
  "Highly Polished & Professional (Looks expensive, great branding)",
  "Outdated or Unprofessional (Poor quality images, bad design)",
  "Too New to Judge"
];
const contentPillarQuestions = [
  "Very Clear (I know exactly what they post about from a quick glance)",
  "Somewhat Clear (I can guess the topics, but it's not obvious)",
  "Unclear / Random (Posts seem to have no consistent theme or topic)"
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

const EvaluationForm = ({ onAnalyze, onCancel, isAnalyzing, setProfitability, setVisuals, setStrategy, setIndustry, canSubmit }: {
    onAnalyze: () => void;
    onCancel: () => void;
    isAnalyzing: boolean;
    setProfitability: (value: string) => void;
    setVisuals: (value: string) => void;
    setStrategy: (value: string) => void;
    setIndustry: (value: string) => void;
    canSubmit: boolean;
}) => (
    <div className="bg-muted/30 p-4 -mx-4 -mb-4 border-t">
        <p className="text-sm font-semibold mb-3">Your expertise is needed to qualify this prospect.</p>
        <div className="space-y-4">
            <div>
                <Label className="font-medium text-xs mb-2 block">1. What's their industry and specific niche?</Label>
                <Input placeholder="e.g., Skincare - Organic, handmade products" onChange={(e) => setIndustry(e.target.value)} className="text-xs h-8"/>
            </div>
            <div>
                <Label className="font-medium text-xs mb-2 block">2. How does this account likely make money?</Label>
                <RadioGroup onValueChange={setProfitability} className="space-y-1">{profitabilityQuestions.map((o) => <div key={o} className="flex items-center space-x-2"><RadioGroupItem value={o} id={`profit-${o}`} /><Label htmlFor={`profit-${o}`} className="font-normal text-xs">{o}</Label></div>)}</RadioGroup>
            </div>
            <div>
                <Label className="font-medium text-xs mb-2 block">3. What is the state of their visual branding?</Label>
                <RadioGroup onValueChange={setVisuals} className="space-y-1">{visualsQuestions.map((o) => <div key={o} className="flex items-center space-x-2"><RadioGroupItem value={o} id={`visual-${o}`} /><Label htmlFor={`visual-${o}`} className="font-normal text-xs">{o}</Label></div>)}</RadioGroup>
            </div>
            <div>
                <Label className="font-medium text-xs mb-2 block">4. How clear are their main content topics (pillars)?</Label>
                <RadioGroup onValueChange={setStrategy} className="space-y-1">{contentPillarQuestions.map((o) => <div key={o} className="flex items-center space-x-2"><RadioGroupItem value={o} id={`strategy-${o}`} /><Label htmlFor={`strategy-${o}`} className="font-normal text-xs">{o}</Label></div>)}</RadioGroup>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={onAnalyze} disabled={isAnalyzing || !canSubmit}>
                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BrainCircuit className="mr-2 h-4 w-4"/>} Analyze
                </Button>
            </div>
        </div>
    </div>
);


export function DiscoveryDialog({ isOpen, onClose, onProspectAdded, existingProspectHandles }: DiscoveryDialogProps) {
  const [query, setQuery] = useState('');
  const [minFollowers, setMinFollowers] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSearch, setActiveSearch] = useState<'manual' | 'smart' | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [verifiedResults, setVerifiedResults] = useState<DiscoveredProspect[] | null>(null);
  const [addedProspects, setAddedProspects] = useState<Set<string>>(new Set());
  
  // State for evaluation
  const [metricsCache, setMetricsCache] = useState<Map<string, InstagramMetrics>>(new Map());
  const [evaluationResults, setEvaluationResults] = useState<Map<string, QualifyProspectOutput>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // State for the inline evaluation form
  const [evaluatingHandle, setEvaluatingHandle] = useState<string | null>(null);
  const [industryAnswer, setIndustryAnswer] = useState<string | undefined>();
  const [profitabilityAnswer, setProfitabilityAnswer] = useState<string | undefined>();
  const [visualsAnswer, setVisualsAnswer] = useState<string | undefined>();
  const [strategyAnswer, setStrategyAnswer] = useState<string | undefined>();


  const { toast } = useToast();

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
    setEvaluatingHandle(null);
    setIsAnalyzing(false);
    setIndustryAnswer(undefined);
    setProfitabilityAnswer(undefined);
    setVisualsAnswer(undefined);
    setStrategyAnswer(undefined);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };
  
  const handleAccordionChange = (value: string) => {
    if (value) { // Accordion is opening
      setIndustryAnswer(undefined);
      setProfitabilityAnswer(undefined);
      setVisualsAnswer(undefined);
      setStrategyAnswer(undefined);
      setEvaluatingHandle(value);
    } else { // Accordion is closing
      setEvaluatingHandle(null);
    }
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
  
  const handleEvaluationSubmit = async () => {
    if (!evaluatingHandle || !profitabilityAnswer || !visualsAnswer || !strategyAnswer || !industryAnswer) {
      toast({ title: "Missing Input", description: "Please answer all questions to proceed.", variant: "destructive" });
      return;
    }
    const handle = evaluatingHandle;
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
        userProfitabilityAssessment: profitabilityAnswer,
        userVisualsAssessment: visualsAnswer,
        userContentPillarAssessment: strategyAnswer,
        industry: industryAnswer,
      };
      const result = await qualifyProspect(input);
      setEvaluationResults(prev => new Map(prev).set(handle, result));
      toast({ title: "Analysis Complete!", description: "Prospect has been evaluated." });
      setEvaluatingHandle(null);
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
        industry: evaluation?.qualificationData?.industry || null,
        email: null, businessName: prospect.name || handle, website: null, prospectLocation: null, visualStyle: null,
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
                <ScrollArea className="h-full -mx-4 px-4">
                    <Accordion type="single" collapsible value={evaluatingHandle || undefined} onValueChange={handleAccordionChange}>
                        <div className="space-y-3">
                        {verifiedResults.map((prospect) => {
                            const handle = prospect.instagramHandle.replace('@', '');
                            const isAdded = existingProspectHandles.has(handle) || addedProspects.has(prospect.instagramHandle);
                            const evaluation = evaluationResults.get(handle);
                            return (
                            <AccordionItem value={handle} key={handle} className="border-b-0">
                                <Card className="shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <a href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-primary hover:underline">{prospect.name}</a>
                                                <p className="text-xs text-muted-foreground">@{handle}</p>
                                            </div>
                                            <div className="text-right">
                                                {evaluation ? <Badge variant={getLeadScoreBadgeVariant(evaluation.leadScore)}>{evaluation.leadScore}</Badge> : <Badge variant="outline">Unevaluated</Badge>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-center text-xs mt-3">
                                            <div className="bg-muted/50 p-1.5 rounded-md">
                                                <p className="font-semibold">{formatNumber(prospect.followerCount)}</p>
                                                <p className="text-muted-foreground">Followers</p>
                                            </div>
                                             <div className="bg-muted/50 p-1.5 rounded-md">
                                                <p className="font-semibold">{formatNumber(prospect.postCount)}</p>
                                                <p className="text-muted-foreground">Posts</p>
                                            </div>
                                        </div>
                                         <blockquote className="mt-3 border-l-2 pl-3 text-xs italic text-muted-foreground">"{prospect.reason}"</blockquote>
                                         {evaluation && (
                                            <div className="mt-2 text-xs italic text-green-700 dark:text-green-400">
                                                <span className="font-semibold not-italic text-green-800 dark:text-green-300">Analysis:</span> "{evaluation.summary}"
                                            </div>
                                         )}
                                        <div className="flex items-center justify-end gap-2 mt-3">
                                            <Button size="sm" variant="default" onClick={() => handleAddProspect(prospect)} disabled={isAdded}>
                                                {isAdded ? <CheckCircle className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                                {isAdded ? 'Added' : 'Add'}
                                            </Button>
                                            <AccordionTrigger asChild>
                                                <Button size="sm" variant="outline">
                                                    <BrainCircuit className="mr-2 h-4 w-4" />
                                                </Button>
                                            </AccordionTrigger>
                                        </div>
                                    </div>
                                    <AccordionContent>
                                        <EvaluationForm
                                            isAnalyzing={isAnalyzing && evaluatingHandle === handle}
                                            onCancel={() => setEvaluatingHandle(null)}
                                            onAnalyze={handleEvaluationSubmit}
                                            setIndustry={setIndustryAnswer}
                                            setProfitability={setProfitabilityAnswer}
                                            setVisuals={setVisualsAnswer}
                                            setStrategy={setStrategyAnswer}
                                            canSubmit={!!(industryAnswer && profitabilityAnswer && visualsAnswer && strategyAnswer)}
                                        />
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                            )
                        })}
                        </div>
                    </Accordion>
                </ScrollArea>
            )}
          </div>
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

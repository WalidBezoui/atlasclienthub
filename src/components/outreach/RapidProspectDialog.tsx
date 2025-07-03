
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchInstagramMetrics, type InstagramMetrics } from '@/app/actions/fetch-ig-metrics';
import { qualifyProspect, type QualifyProspectInput, type QualifyProspectOutput } from '@/ai/flows/qualify-prospect';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, ArrowLeft, Wand2, Star, Save, BrainCircuit, CheckCircle, HelpCircle } from 'lucide-react';
import type { OutreachProspect, QualificationData } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

type Step = 'initial' | 'fetching' | 'questions' | 'analyzing' | 'results';

const profitabilityQuestions = [
  "Selling high-ticket services (coaching, consulting)", 
  "Selling physical products", 
  "Affiliate marketing / brand deals", 
  "It's a personal blog or hobby account"
];
const visualsQuestions = [
  "Polished & On-Brand (Strong visuals, consistent aesthetic)",
  "Clean but Generic (Lacks personality, looks like a template)",
  "Messy & Inconsistent (No clear style, feels unplanned)",
  "Not Enough Content (Too new or inactive to judge)"
];
const strategyQuestions = [
  "Reaching a wider audience (Top of Funnel)",
  "Increasing engagement with current followers (Middle of Funnel)",
  "Converting followers into clients (Bottom of Funnel)"
];

type RapidProspectDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prospectData: Omit<OutreachProspect, 'id' | 'userId'>) => void;
};

export function RapidProspectDialog({ isOpen, onClose, onSave }: RapidProspectDialogProps) {
  const [step, setStep] = useState<Step>('initial');
  const [instagramHandle, setInstagramHandle] = useState('');
  
  const [fetchedMetrics, setFetchedMetrics] = useState<InstagramMetrics | null>(null);
  const [analysisResult, setAnalysisResult] = useState<QualifyProspectOutput | null>(null);
  
  // State for user answers
  const [profitabilityAnswer, setProfitabilityAnswer] = useState<string | undefined>(undefined);
  const [visualsAnswer, setVisualsAnswer] = useState<string | undefined>(undefined);
  const [strategyAnswer, setStrategyAnswer] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const resetState = () => {
    setStep('initial');
    setInstagramHandle('');
    setFetchedMetrics(null);
    setAnalysisResult(null);
    setProfitabilityAnswer(undefined);
    setVisualsAnswer(undefined);
    setStrategyAnswer(undefined);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };
  
  const handleFetchData = async () => {
    if (!instagramHandle) {
      toast({ title: 'Instagram Handle is required', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    setStep('fetching');

    try {
      const metricsResult = await fetchInstagramMetrics(instagramHandle);
      if (metricsResult.error || !metricsResult.data) {
        throw new Error(metricsResult.error || 'The profile may be private or invalid.');
      }
      
      setFetchedMetrics(metricsResult.data);
      setStep('questions');

    } catch (error: any) {
      toast({ title: 'Fetch Failed', description: error.message, variant: 'destructive' });
      setStep('initial');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFinalAnalysis = async () => {
    if (!fetchedMetrics || !profitabilityAnswer || !visualsAnswer || !strategyAnswer) {
        toast({ title: "Missing Input", description: "Please answer all questions to proceed.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setStep('analyzing');

    try {
        const input: QualifyProspectInput = {
            instagramHandle: instagramHandle,
            followerCount: fetchedMetrics.followerCount,
            postCount: fetchedMetrics.postCount,
            avgLikes: fetchedMetrics.avgLikes,
            avgComments: fetchedMetrics.avgComments,
            biography: fetchedMetrics.biography || null,
            userProfitabilityAssessment: profitabilityAnswer,
            userVisualsAssessment: visualsAnswer,
            userStrategyAssessment: strategyAnswer,
        };

        const result = await qualifyProspect(input);
        setAnalysisResult(result);
        setStep('results');
        toast({ title: "Analysis Complete!", description: "Review the final qualification below."});

    } catch (error: any) {
        toast({ title: 'Analysis Failed', description: error.message, variant: 'destructive' });
        setStep('questions');
    } finally {
        setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!analysisResult || !fetchedMetrics) return;
    
    setIsLoading(true); // Reuse isLoading as isSaving
    const handleWithoutAt = instagramHandle.replace('@', '');
    const newProspect: Omit<OutreachProspect, 'id' | 'userId'> = {
      name: handleWithoutAt,
      instagramHandle: handleWithoutAt,
      status: 'To Contact',
      followerCount: fetchedMetrics.followerCount ?? null,
      postCount: fetchedMetrics.postCount ?? null,
      avgLikes: fetchedMetrics.avgLikes ?? null,
      avgComments: fetchedMetrics.avgComments ?? null,
      bioSummary: fetchedMetrics.biography,
      leadScore: analysisResult.leadScore,
      qualificationData: analysisResult.qualificationData as QualificationData,
      painPoints: analysisResult.painPoints,
      goals: analysisResult.goals,
      helpStatement: analysisResult.summary,
      lastContacted: null,
      email: null,
      businessName: null,
      website: null,
      prospectLocation: null,
      industry: null,
      visualStyle: null,
      businessType: null,
      businessTypeOther: null,
      accountStage: null,
      source: null,
      followUpDate: null,
      followUpNeeded: false,
      offerInterest: [],
      uniqueNote: null,
      tonePreference: null,
      notes: null,
      lastMessageSnippet: null,
      lastScriptSent: null,
      linkSent: false,
      carouselOffered: false,
      nextStep: null,
      conversationHistory: null,
      qualifierQuestion: null,
      qualifierSentAt: null,
      qualifierReply: null,
      createdAt: new Date().toISOString(),
    };
    
    onSave(newProspect);
    handleClose();
    setIsLoading(false);
  };
  
  const getLeadScoreBadgeVariant = (score: number | null | undefined): "default" | "secondary" | "destructive" => {
      if (score === null || score === undefined) return "secondary";
      if (score >= 60) return "default";
      if (score >= 30) return "secondary";
      return "destructive";
  };
  
  const renderAnalysisDetails = (data: QualificationData) => {
     const profitabilityVariantMap = { 'high': 'default', 'medium': 'secondary', 'low': 'destructive', 'unknown': 'outline' };
     const funnelVariantMap = { 'strong': 'default', 'weak': 'secondary', 'none': 'destructive', 'unknown': 'outline' };
     const clarityVariantMap = { 'very-clear': 'default', 'somewhat-clear': 'secondary', 'unclear': 'destructive', 'unknown': 'outline' };
     const yesNoVariantMap = { 'yes': 'default', 'no': 'outline', 'unknown': 'outline' };
      
     return (
       <div className="space-y-2 pt-2">
         <div className="flex justify-between items-center text-xs"><span className="text-muted-foreground">Is Business?</span><Badge variant={yesNoVariantMap[data.isBusiness]} className="capitalize">{data.isBusiness}</Badge></div>
         <div className="flex justify-between items-center text-xs"><span className="text-muted-foreground">Inconsistent Grid?</span><Badge variant={yesNoVariantMap[data.hasInconsistentGrid]} className="capitalize">{data.hasInconsistentGrid}</Badge></div>
         <div className="flex justify-between items-center text-xs"><span className="text-muted-foreground">Low Engagement?</span><Badge variant={yesNoVariantMap[data.hasLowEngagement]} className="capitalize">{data.hasLowEngagement}</Badge></div>
         <div className="flex justify-between items-center text-xs"><span className="text-muted-foreground">No Clear CTA?</span><Badge variant={yesNoVariantMap[data.hasNoClearCTA]} className="capitalize">{data.hasNoClearCTA}</Badge></div>
         <div className="flex justify-between items-center text-xs"><span className="text-muted-foreground">Content Clarity</span><Badge variant={clarityVariantMap[data.contentPillarClarity]} className="capitalize">{data.contentPillarClarity.replace(/-/g, ' ')}</Badge></div>
         <div className="flex justify-between items-center text-xs"><span className="text-muted-foreground">Sales Funnel</span><Badge variant={funnelVariantMap[data.salesFunnelStrength]} className="capitalize">{data.salesFunnelStrength}</Badge></div>
         <div className="flex justify-between items-center text-xs"><span className="text-muted-foreground">Profit Potential</span><Badge variant={profitabilityVariantMap[data.profitabilityPotential]} className="capitalize">{data.profitabilityPotential}</Badge></div>
         <div className="flex justify-between items-center text-xs pt-1"><span className="text-muted-foreground">#1 Value Prop</span><Badge variant="outline" className="capitalize">{data.valueProposition}</Badge></div>
       </div>
     );
  };

  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <div className="space-y-4 py-4">
            <Label htmlFor="instagramHandle">Instagram Handle</Label>
            <div className="flex gap-2">
              <Input
                id="instagramHandle"
                placeholder="@username"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFetchData()}
              />
              <Button onClick={handleFetchData} disabled={isLoading || !instagramHandle}>
                Fetch Data <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      case 'fetching':
      case 'analyzing':
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
               <LoadingSpinner text={step === 'fetching' ? "Fetching metrics..." : "Analyzing prospect..."} size="lg" />
            </div>
        );
      case 'questions':
        return (
          <div className="space-y-4 py-4">
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                 <h3 className="font-semibold text-lg text-center mb-2">Manual Assessment for {instagramHandle}</h3>
                 <Separator/>
                 
                 <div>
                    <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />What's the primary way this account makes money?</Label>
                     <RadioGroup value={profitabilityAnswer} onValueChange={setProfitabilityAnswer} className="space-y-2">
                      {profitabilityQuestions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={option} /><Label htmlFor={option} className="font-normal">{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                 </div>
                 <Separator/>

                 <div>
                    <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />Based on their feed, how would you describe their visual branding?</Label>
                     <RadioGroup value={visualsAnswer} onValueChange={setVisualsAnswer} className="space-y-2">
                      {visualsQuestions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={option} /><Label htmlFor={option} className="font-normal">{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                 </div>
                 <Separator/>

                 <div>
                    <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />What is the biggest strategic opportunity for their content?</Label>
                     <RadioGroup value={strategyAnswer} onValueChange={setStrategyAnswer} className="space-y-2">
                      {strategyQuestions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={option} /><Label htmlFor={option} className="font-normal">{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                 </div>
              </div>
          </div>
        );
      case 'results':
        if (!analysisResult) return null;
        return (
             <div className="space-y-4 py-4">
                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <h3 className="font-semibold text-lg text-center mb-2">
                      Analysis for {instagramHandle}:
                      <Badge variant={getLeadScoreBadgeVariant(analysisResult.leadScore)} className="text-lg ml-2">{analysisResult.leadScore}</Badge>
                  </h3>
                  <Separator/>
                  <div className="text-center"><p className="text-sm italic text-muted-foreground">"{analysisResult.summary}"</p></div>
                   <div className="space-y-2">
                    {analysisResult.painPoints && analysisResult.painPoints.length > 0 && <div><Label className="text-xs">Suggested Pain Points</Label><div className="flex flex-wrap gap-1">{analysisResult.painPoints.map(p => <Badge key={p} variant="destructive">{p}</Badge>)}</div></div>}
                    {analysisResult.goals && analysisResult.goals.length > 0 && <div><Label className="text-xs">Suggested Goals</Label><div className="flex flex-wrap gap-1">{analysisResult.goals.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}</div></div>}
                   </div>
                   <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="details"><AccordionTrigger className="text-xs pt-2">View Analysis Details</AccordionTrigger><AccordionContent>{renderAnalysisDetails(analysisResult.qualificationData as QualificationData)}</AccordionContent></AccordionItem>
                  </Accordion>
                </div>
             </div>
        );
      default:
        return null;
    }
  };
  
  const renderFooter = () => {
    if (step === 'questions') {
      return (
        <DialogFooter className="mt-auto shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => setStep('initial')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <Button onClick={handleFinalAnalysis} disabled={!profitabilityAnswer || !visualsAnswer || !strategyAnswer}>
            Analyze <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      );
    }
    if (step === 'results') {
      return (
        <DialogFooter className="mt-auto shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => setStep('questions')}><ArrowLeft className="mr-2 h-4 w-4" /> Re-assess</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
             Save Prospect
          </Button>
        </DialogFooter>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline text-2xl flex items-center"><Wand2 className="mr-2 h-6 w-6 text-primary" />Rapid Prospect Creation</DialogTitle>
          <DialogDescription>Quickly qualify and add a new prospect using their Instagram handle.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mx-6 px-6">{renderContent()}</div>
        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
}

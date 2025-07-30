
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchInstagramMetrics, type InstagramMetrics } from '@/app/actions/fetch-ig-metrics';
import { qualifyProspect, type QualifyProspectInput, type QualifyProspectOutput } from '@/ai/flows/qualify-prospect';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, ArrowLeft, Wand2, Star, Save, BrainCircuit, CheckCircle, HelpCircle, Bot } from 'lucide-react';
import type { OutreachProspect, QualificationData } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Checkbox } from '../ui/checkbox';

type Step = 'initial' | 'fetching' | 'questions' | 'analyzing' | 'results';

const profitabilityQuestions = [
  "Sells high-ticket services (coaching, consulting, agency work)",
  "Sells physical or digital products (e-commerce, courses)",
  "Is a local business (brick-and-mortar, in-person services)",
  "Monetizes through brand deals or affiliate marketing",
  "It's unclear, seems like a hobby or personal account"
];
const visualsQuestions = [
  "Highly Polished & Professional (Looks expensive, great branding)",
  "Great content, but the grid is messy and disorganized",
  "Clean but Generic (Looks like a template, lacks personality)",
  "Inconsistent & Messy (No clear visual direction or style)",
  "Outdated or Unprofessional (Poor quality images, bad design)",
];
const ctaQuestions = [
  "Strong, direct link to a sales page, booking site, or freebie",
  "Simple link to a homepage with no clear next step",
  "Generic linktree or similar with multiple, unfocused links",
  "Weak CTA like 'DM for info' with no link",
  "No link in bio at all, or a broken link"
];

const strategicGapQuestions = [
    "Visuals / Branding (inconsistent grid, bad photos, messy look)",
    "Content Strategy (no clear topics, not posting Reels, boring content)",
    "Conversion (bio is a mess, no clear CTA, not turning followers into clients)",
    "Engagement (good follower count, but very low likes/comments)",
    "Posting Consistency (hasn't posted in a while, sporadic content)",
];

const checklistItems = [
    { id: 'active', label: "Are they an active business?", description: "Have they posted in the last 7-10 days?" },
    { id: 'size', label: 'Are they the "Goldilocks" size?', description: "Do they have between ~500 and ~15,000 followers?" },
    { id: 'engaged', label: "Are they an engaged owner?", description: "Do they reply to comments on their own posts?" },
    { id: 'monetizing', label: "Is there a clear product or service?", description: 'Do they have a website, shop link, or "Book a Call" button?' },
    { id: 'gap', label: 'Is there an obvious "Strategic Gap" YOU can fix?', description: "e.g., messy bio, bad photos, no Reels, etc." },
];


type RapidProspectDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prospectData: Omit<OutreachProspect, 'id' | 'userId'>, andGenerateScript?: boolean) => void;
};

export function RapidProspectDialog({ isOpen, onClose, onSave }: RapidProspectDialogProps) {
  const [step, setStep] = useState<Step>('initial');
  const [instagramHandle, setInstagramHandle] = useState('');
  
  const [fetchedMetrics, setFetchedMetrics] = useState<InstagramMetrics | null>(null);
  const [analysisResult, setAnalysisResult] = useState<QualifyProspectOutput | null>(null);
  
  // State for user answers
  const [industryAnswer, setIndustryAnswer] = useState<string | undefined>();
  const [profitabilityAnswer, setProfitabilityAnswer] = useState<string[]>([]);
  const [visualsAnswer, setVisualsAnswer] = useState<string[]>([]);
  const [ctaAnswer, setCtaAnswer] = useState<string[]>([]);
  const [strategicGapAnswer, setStrategicGapAnswer] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  const resetState = () => {
    setStep('initial');
    setInstagramHandle('');
    setFetchedMetrics(null);
    setAnalysisResult(null);
    setIndustryAnswer(undefined);
    setProfitabilityAnswer([]);
    setVisualsAnswer([]);
    setCtaAnswer([]);
    setStrategicGapAnswer([]);
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
    if (!fetchedMetrics || profitabilityAnswer.length === 0 || visualsAnswer.length === 0 || ctaAnswer.length === 0 || !industryAnswer || strategicGapAnswer.length === 0) {
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
            userCtaAssessment: ctaAnswer,
            industry: industryAnswer,
            userStrategicGapAssessment: strategicGapAnswer,
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

  const handleSave = (andGenerateScript: boolean = false) => {
    if (!analysisResult || !fetchedMetrics) return;
    
    setIsLoading(true); // Reuse isLoading as isSaving
    const handleWithoutAt = instagramHandle.replace('@', '');
    const newProspect: Omit<OutreachProspect, 'id' | 'userId'> = {
      name: handleWithoutAt,
      instagramHandle: handleWithoutAt,
      status: andGenerateScript ? 'To Contact' : 'Warming Up',
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
      industry: analysisResult.qualificationData?.industry || null,
      lastContacted: null,
      email: null,
      businessName: null,
      website: null,
      prospectLocation: null,
      visualStyle: null,
      businessType: null,
      businessTypeOther: null,
      accountStage: null,
      source: 'Rapid Add',
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
      warmUp: [],
    };
    
    onSave(newProspect, andGenerateScript);
    handleClose();
    setIsLoading(false);
  };
  
  const getLeadScoreBadgeVariant = (score: number | null | undefined): "default" | "secondary" | "destructive" => {
      if (score === null || score === undefined) return "secondary";
      if (score >= 60) return "default";
      if (score >= 30) return "secondary";
      return "destructive";
  };
  
  const renderAnalysisDetails = (data: QualificationData, rationale?: string | null) => {
     const profitabilityVariantMap = { 'high': 'default', 'medium': 'secondary', 'low': 'destructive', 'unknown': 'outline' };
     const funnelVariantMap = { 'strong': 'default', 'weak': 'secondary', 'none': 'destructive', 'unknown': 'outline' };
     const clarityVariantMap = { 'very-clear': 'default', 'somewhat-clear': 'secondary', 'unclear': 'destructive', 'unknown': 'outline' };
     const yesNoVariantMap = { 'yes': 'default', 'no': 'outline', 'unknown': 'outline' };
      
     return (
       <div className="space-y-2 pt-2">
         {rationale && (
            <div className="mb-2 p-2 bg-blue-100/50 border border-blue-200 rounded-lg text-xs text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300">
              <p className="font-bold mb-1">Score Rationale:</p>
              <p className="whitespace-pre-wrap">{rationale}</p>
            </div>
         )}
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

    const handleCheckboxChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, option: string, checked: boolean) => {
        setter(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(option);
            } else {
                newSet.delete(option);
            }
            return Array.from(newSet);
        });
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
                 <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">The 5-Point Qualification Checklist:</p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground list-disc pl-4">
                        {checklistItems.map(item => <li key={item.id}><strong>{item.label}</strong> {item.description}</li>)}
                    </ul>
                 </div>
                 <Separator/>
                 
                 <div>
                    <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />1. What's their industry and specific niche?</Label>
                    <Input placeholder="e.g., Skincare - Organic, handmade products" onChange={(e) => setIndustryAnswer(e.target.value)} />
                 </div>
                 <Separator/>
                 
                 <div>
                    <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />2. What is the biggest "Strategic Gap" you can fix?</Label>
                     <div className="space-y-2">
                      {strategicGapQuestions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox id={`rapid-gap-${option.replace(/\s/g, '-')}`} onCheckedChange={(checked) => handleCheckboxChange(setStrategicGapAnswer, option, !!checked)} /><Label htmlFor={`rapid-gap-${option.replace(/\s/g, '-')}`} className="font-normal cursor-pointer">{option}</Label>
                        </div>
                      ))}
                    </div>
                 </div>
                 <Separator/>

                 <div>
                    <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />3. How does this account likely make money?</Label>
                     <div className="space-y-2">
                      {profitabilityQuestions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox id={`rapid-profit-${option.replace(/\s/g, '-')}`} onCheckedChange={(checked) => handleCheckboxChange(setProfitabilityAnswer, option, !!checked)} /><Label htmlFor={`rapid-profit-${option.replace(/\s/g, '-')}`} className="font-normal cursor-pointer">{option}</Label>
                        </div>
                      ))}
                    </div>
                 </div>
                 <Separator/>

                 <div>
                    <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />4. What's your first impression of their visual branding?</Label>
                     <div className="space-y-2">
                      {visualsQuestions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox id={`rapid-visuals-${option.replace(/\s/g, '-')}`} onCheckedChange={(checked) => handleCheckboxChange(setVisualsAnswer, option, !!checked)} /><Label htmlFor={`rapid-visuals-${option.replace(/\s/g, '-')}`} className="font-normal cursor-pointer">{option}</Label>
                        </div>
                      ))}
                    </div>
                 </div>
                 <Separator/>
                  <div>
                    <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />5. What is the state of their bio & call-to-action (CTA)?</Label>
                     <div className="space-y-2">
                      {ctaQuestions.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox id={`rapid-cta-${option.replace(/\s/g, '-')}`} onCheckedChange={(checked) => handleCheckboxChange(setCtaAnswer, option, !!checked)} /><Label htmlFor={`rapid-cta-${option.replace(/\s/g, '-')}`} className="font-normal cursor-pointer">{option}</Label>
                        </div>
                      ))}
                    </div>
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
                      <AccordionItem value="details"><AccordionTrigger className="text-xs pt-2">View Analysis Details</AccordionTrigger><AccordionContent>{renderAnalysisDetails(analysisResult.qualificationData as QualificationData, analysisResult.scoreRationale)}</AccordionContent></AccordionItem>
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
          <Button onClick={handleFinalAnalysis} disabled={!profitabilityAnswer || !visualsAnswer || !ctaAnswer || !industryAnswer || !strategicGapAnswer}>
            Analyze <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      );
    }
    if (step === 'results') {
      return (
        <DialogFooter className="mt-auto shrink-0 border-t pt-4 flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStep('questions')}><ArrowLeft className="mr-2 h-4 w-4" /> Re-assess</Button>
          <div className="flex w-full sm:w-auto gap-2">
            <Button className="flex-1" onClick={() => handleSave(false)} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
               Save
            </Button>
            <Button className="flex-1" onClick={() => handleSave(true)} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Bot className="mr-2 h-4 w-4" />}
               Add & Script
            </Button>
          </div>
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


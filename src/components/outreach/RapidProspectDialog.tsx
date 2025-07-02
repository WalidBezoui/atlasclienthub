
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


type RapidProspectDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prospectData: Omit<OutreachProspect, 'id' | 'userId'>) => void;
};

export function RapidProspectDialog({ isOpen, onClose, onSave }: RapidProspectDialogProps) {
  const [step, setStep] = useState(1);
  const [instagramHandle, setInstagramHandle] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [fetchedMetrics, setFetchedMetrics] = useState<InstagramMetrics | null>(null);
  const [analysisResult, setAnalysisResult] = useState<QualifyProspectOutput | null>(null);
  
  const [clarificationResponse, setClarificationResponse] = useState<string | undefined>(undefined);
  const [isReanalyzing, setIsReanalyzing] = useState(false);


  const { toast } = useToast();

  const resetState = () => {
    setStep(1);
    setInstagramHandle('');
    setIsFetching(false);
    setIsSaving(false);
    setIsAnalyzing(false);
    setFetchedMetrics(null);
    setAnalysisResult(null);
    setClarificationResponse(undefined);
    setIsReanalyzing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };
  
  const handleAnalyze = async (metrics: InstagramMetrics) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const input: QualifyProspectInput = {
        instagramHandle: instagramHandle,
        followerCount: metrics.followerCount,
        postCount: metrics.postCount,
        avgLikes: metrics.avgLikes,
        avgComments: metrics.avgComments,
        biography: metrics.biography || null,
        clarificationResponse: null,
      };
      const result = await qualifyProspect(input);
      setAnalysisResult(result);
      setStep(3);
    } catch (error: any) {
      toast({ title: 'AI Analysis Failed', description: error.message, variant: 'destructive' });
      setStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFetch = async () => {
    if (!instagramHandle) {
      toast({ title: 'Instagram Handle is required', variant: 'destructive' });
      return;
    }
    setIsFetching(true);
    setStep(2); // Move to loading step immediately
    try {
      const result = await fetchInstagramMetrics(instagramHandle);
      if (result.error || !result.data) {
        toast({ title: 'Failed to fetch metrics', description: result.error || 'The profile may be private or invalid.', variant: 'destructive' });
        setStep(1);
      } else {
        setFetchedMetrics(result.data);
        await handleAnalyze(result.data); // Immediately analyze after fetching
      }
    } catch (error: any) {
      toast({ title: 'An error occurred', description: error.message, variant: 'destructive' });
      setStep(1);
    } finally {
      setIsFetching(false);
    }
  };
  
  const handleReanalyze = async () => {
    if (!fetchedMetrics || !clarificationResponse) return;
    setIsReanalyzing(true);
    try {
      const input: QualifyProspectInput = {
        instagramHandle: instagramHandle,
        followerCount: fetchedMetrics.followerCount,
        postCount: fetchedMetrics.postCount,
        avgLikes: fetchedMetrics.avgLikes,
        avgComments: fetchedMetrics.avgComments,
        biography: fetchedMetrics.biography || null,
        clarificationResponse: clarificationResponse,
      };
      const result = await qualifyProspect(input);
      setAnalysisResult(result);
      setClarificationResponse(undefined); // Clear the selection for next time
      toast({ title: 'Re-analysis Complete', description: 'The prospect details have been updated with your input.' });
    } catch (error: any) {
      toast({ title: 'AI Re-analysis Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleSave = () => {
    if (!analysisResult || !fetchedMetrics) return;
    
    setIsSaving(true);
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
      createdAt: new Date().toISOString(), // Add createdAt
    };
    
    onSave(newProspect);
    handleClose();
    setIsSaving(false);
  };
  
  const getLeadScoreBadgeVariant = (score: number | null | undefined): "default" | "secondary" | "destructive" => {
      if (score === null || score === undefined) return "secondary";
      if (score >= 60) return "default";
      if (score >= 30) return "secondary";
      return "destructive";
  };
  
  const GenericQualificationDetail = ({ label, value, variantMap }: { label: string, value: string, variantMap: any }) => {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{label}</span>
            <Badge variant={variantMap[value] || 'outline'} className="capitalize">{value.replace(/-/g, ' ')}</Badge>
        </div>
    );
  };

  const renderAnalysisDetails = (data: QualificationData) => {
     const profitabilityVariantMap = { 'high': 'default', 'medium': 'secondary', 'low': 'destructive', 'unknown': 'outline' };
     const funnelVariantMap = { 'strong': 'default', 'weak': 'secondary', 'none': 'destructive', 'unknown': 'outline' };
     const clarityVariantMap = { 'very-clear': 'default', 'somewhat-clear': 'secondary', 'unclear': 'destructive', 'unknown': 'outline' };
     const yesNoVariantMap = { 'yes': 'default', 'no': 'outline', 'unknown': 'outline' };
      
     return (
       <div className="space-y-2 pt-2">
         <GenericQualificationDetail label="Is Business Account?" value={data.isBusiness} variantMap={yesNoVariantMap} />
         <GenericQualificationDetail label="Inconsistent Grid?" value={data.hasInconsistentGrid} variantMap={yesNoVariantMap} />
         <GenericQualificationDetail label="Low Engagement?" value={data.hasLowEngagement} variantMap={yesNoVariantMap} />
         <GenericQualificationDetail label="No Clear CTA?" value={data.hasNoClearCTA} variantMap={yesNoVariantMap} />
         <GenericQualificationDetail label="Content Pillar Clarity" value={data.contentPillarClarity} variantMap={clarityVariantMap} />
         <GenericQualificationDetail label="Sales Funnel Strength" value={data.salesFunnelStrength} variantMap={funnelVariantMap} />
         <GenericQualificationDetail label="Profitability Potential" value={data.profitabilityPotential} variantMap={profitabilityVariantMap} />
         <div className="flex justify-between items-center text-xs pt-1">
             <span className="text-muted-foreground">#1 Value Prop</span>
             <Badge variant="outline" className="capitalize">{data.valueProposition}</Badge>
         </div>
       </div>
     );
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline text-2xl flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-primary" />
            Rapid Prospect Creation
          </DialogTitle>
          <DialogDescription>
            Quickly qualify and add a new prospect using their Instagram handle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto -mx-6 px-6">
          {step === 1 && (
            <div className="space-y-4 py-4">
              <Label htmlFor="instagramHandle">Instagram Handle</Label>
              <div className="flex gap-2">
                <Input
                  id="instagramHandle"
                  placeholder="@username"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleFetch()}
                />
                <Button onClick={handleFetch} disabled={isFetching || !instagramHandle}>
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch & Analyze'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
               <LoadingSpinner text="Fetching metrics & running AI analysis..." size="lg" />
               <p className="text-sm text-muted-foreground">This may take up to a minute...</p>
            </div>
          )}

          {step === 3 && analysisResult && (
             <div className="space-y-4 py-4">
                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <h3 className="font-semibold text-lg text-center mb-2">
                      Analysis for {instagramHandle}:
                      {analysisResult.leadScore !== null && analysisResult.leadScore !== undefined && (
                        <Badge variant={getLeadScoreBadgeVariant(analysisResult.leadScore)} className="text-lg ml-2">{analysisResult.leadScore}</Badge>
                      )}
                  </h3>
                  <Separator/>
                  <div className="text-center">
                    <p className="text-sm italic text-muted-foreground">"{analysisResult.summary}"</p>
                  </div>
                  
                   <div className="space-y-2">
                    {analysisResult.painPoints && analysisResult.painPoints.length > 0 && <div><Label className="text-xs">Suggested Pain Points</Label><div className="flex flex-wrap gap-1">{analysisResult.painPoints.map(p => <Badge key={p} variant="destructive">{p}</Badge>)}</div></div>}
                    {analysisResult.goals && analysisResult.goals.length > 0 && <div><Label className="text-xs">Suggested Goals</Label><div className="flex flex-wrap gap-1">{analysisResult.goals.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}</div></div>}
                   </div>

                   <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="details">
                          <AccordionTrigger className="text-xs pt-2">View Analysis Details</AccordionTrigger>
                          <AccordionContent>
                            {renderAnalysisDetails(analysisResult.qualificationData as QualificationData)}
                          </AccordionContent>
                      </AccordionItem>
                  </Accordion>
                </div>

                 {analysisResult.clarificationRequest && (
                  <div className="mt-4 p-4 border border-dashed border-amber-500 rounded-lg bg-amber-500/10 space-y-3">
                      <Label htmlFor="clarificationAnswer" className="font-semibold flex items-center">
                          <HelpCircle className="mr-2 h-4 w-4 text-amber-600" />
                          AI Needs Your Input!
                      </Label>
                      <p className="text-sm text-muted-foreground italic">"{analysisResult.clarificationRequest.question}"</p>
                      <RadioGroup 
                        value={clarificationResponse} 
                        onValueChange={setClarificationResponse} 
                        className="space-y-2"
                        disabled={isReanalyzing}
                      >
                        {analysisResult.clarificationRequest.options.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={option} />
                            <Label htmlFor={option} className="font-normal">{option}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <div className="flex justify-end pt-2">
                          <Button onClick={handleReanalyze} disabled={!clarificationResponse || isReanalyzing} size="sm">
                              {isReanalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                              Re-analyze
                          </Button>
                      </div>
                  </div>
                )}
             </div>
          )}
        </div>
        
        {step === 3 && analysisResult && (
           <DialogFooter className="mt-auto shrink-0 border-t pt-4">
             <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
             <Button onClick={handleSave} disabled={isSaving || !!analysisResult.clarificationRequest}>
               {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                Save Prospect
             </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

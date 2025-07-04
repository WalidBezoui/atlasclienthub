
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, HelpCircle } from 'lucide-react';
import type { InstagramMetrics } from '@/app/actions/fetch-ig-metrics';
import { qualifyProspect, type QualifyProspectInput, type QualifyProspectOutput } from '@/ai/flows/qualify-prospect';
import { Separator } from '../ui/separator';
import type { DiscoveredProspect } from '@/ai/flows/discover-prospects';

// Improved Questions
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

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: DiscoveredProspect;
  metrics: InstagramMetrics;
  onEvaluationComplete: (handle: string, result: QualifyProspectOutput) => void;
}

export function EvaluationModal({ isOpen, onClose, prospect, metrics, onEvaluationComplete }: EvaluationModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profitabilityAnswer, setProfitabilityAnswer] = useState<string | undefined>(undefined);
  const [visualsAnswer, setVisualsAnswer] = useState<string | undefined>(undefined);
  const [strategyAnswer, setStrategyAnswer] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!profitabilityAnswer || !visualsAnswer || !strategyAnswer) {
      toast({ title: "Missing Input", description: "Please answer all questions to proceed.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);

    try {
      const input: QualifyProspectInput = {
        instagramHandle: prospect.instagramHandle,
        followerCount: metrics.followerCount,
        postCount: metrics.postCount,
        avgLikes: metrics.avgLikes,
        avgComments: metrics.avgComments,
        biography: metrics.biography || null,
        userProfitabilityAssessment: profitabilityAnswer,
        userVisualsAssessment: visualsAnswer,
        userStrategyAssessment: strategyAnswer,
      };

      const result = await qualifyProspect(input);
      onEvaluationComplete(prospect.instagramHandle.replace('@',''), result);
      toast({ title: "Analysis Complete!", description: "Review the final qualification in the discovery list." });
      onClose(); // Close the modal on success
    } catch (error: any) {
      toast({ title: 'Analysis Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setProfitabilityAnswer(undefined);
      setVisualsAnswer(undefined);
      setStrategyAnswer(undefined);
      setIsAnalyzing(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Manual Assessment</DialogTitle>
          <DialogDescription>
            Your insights are crucial. Answer these questions to help the AI qualify <strong>@{prospect.instagramHandle}</strong> accurately.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4 py-4">
          <div className="space-y-6">
            <div>
              <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />How does this account make money?</Label>
              <RadioGroup value={profitabilityAnswer} onValueChange={setProfitabilityAnswer} className="space-y-2">
                {profitabilityQuestions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`profit-${option.replace(/\s/g, '-')}`} /><Label htmlFor={`profit-${option.replace(/\s/g, '-')}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <Separator />
            <div>
              <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />What's your first impression of their visual branding?</Label>
              <RadioGroup value={visualsAnswer} onValueChange={setVisualsAnswer} className="space-y-2">
                {visualsQuestions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`visuals-${option.replace(/\s/g, '-')}`} /><Label htmlFor={`visuals-${option.replace(/\s/g, '-')}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <Separator />
            <div>
              <Label className="font-semibold flex items-center mb-2"><HelpCircle className="mr-2 h-4 w-4 text-amber-600" />What is their single biggest strategic opportunity?</Label>
              <RadioGroup value={strategyAnswer} onValueChange={setStrategyAnswer} className="space-y-2">
                {strategyQuestions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`strategy-${option.replace(/\s/g, '-')}`} /><Label htmlFor={`strategy-${option.replace(/\s/g, '-')}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !profitabilityAnswer || !visualsAnswer || !strategyAnswer}>
            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            Analyze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

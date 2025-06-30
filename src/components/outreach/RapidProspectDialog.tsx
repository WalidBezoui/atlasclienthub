
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchInstagramMetrics, type InstagramMetrics } from '@/app/actions/fetch-ig-metrics';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, ArrowLeft, Wand2, Star, Save } from 'lucide-react';
import type { OutreachProspect, GenerateContextualScriptInput } from '@/lib/types';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type RapidProspectDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prospectData: Omit<OutreachProspect, 'id' | 'userId'>) => void;
  generateScript: (prospect: OutreachProspect, scriptType: GenerateContextualScriptInput['scriptType']) => void;
};

type QualificationData = NonNullable<OutreachProspect['qualificationData']>;

const initialQualificationData: QualificationData = {
    isBusiness: 'unknown',
    hasInconsistentGrid: 'unknown',
    hasLowEngagement: 'unknown',
    hasNoClearCTA: 'unknown',
    valueProposition: 'unknown',
};

export function RapidProspectDialog({ isOpen, onClose, onSave, generateScript }: RapidProspectDialogProps) {
  const [step, setStep] = useState(1);
  const [instagramHandle, setInstagramHandle] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [metrics, setMetrics] = useState<InstagramMetrics | null>(null);
  const [qualificationData, setQualificationData] = useState<QualificationData>(initialQualificationData);

  const { toast } = useToast();

  const resetState = () => {
    setStep(1);
    setInstagramHandle('');
    setIsFetching(false);
    setIsSaving(false);
    setMetrics(null);
    setQualificationData(initialQualificationData);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFetch = async () => {
    if (!instagramHandle) {
      toast({ title: 'Instagram Handle is required', variant: 'destructive' });
      return;
    }
    setIsFetching(true);
    try {
      const result = await fetchInstagramMetrics(instagramHandle);
      if (result.error || !result.data) {
        toast({ title: 'Failed to fetch metrics', description: result.error || 'The profile may be private or invalid.', variant: 'destructive' });
        setMetrics(null);
      } else {
        toast({ title: 'Metrics Fetched!', description: `Data for @${instagramHandle} is ready for qualification.` });
        setMetrics(result.data);
        setStep(2);
      }
    } catch (error: any) {
      toast({ title: 'An error occurred', description: error.message, variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  };

  const leadScore = useMemo(() => {
    let score = 0;
    if (qualificationData.isBusiness === 'yes') score += 20;
    if (qualificationData.hasInconsistentGrid === 'yes') score += 15;
    if (qualificationData.hasLowEngagement === 'yes') score += 15;
    if (qualificationData.hasNoClearCTA === 'yes') score += 10;
    if (qualificationData.valueProposition !== 'unknown') score += 5;
    if (metrics && metrics.followerCount > 500) score += 10;
    return score;
  }, [qualificationData, metrics]);

  const handleSave = (generateDm: boolean = false) => {
    const handleWithoutAt = instagramHandle.replace('@', '');
    const newProspect: Omit<OutreachProspect, 'id' | 'userId'> = {
      name: handleWithoutAt, // Default name to handle
      instagramHandle: handleWithoutAt,
      status: 'To Contact',
      followerCount: metrics?.followerCount ?? null,
      postCount: metrics?.postCount ?? null,
      avgLikes: metrics?.avgLikes ?? null,
      avgComments: metrics?.avgComments ?? null,
      leadScore: leadScore,
      qualificationData: qualificationData,
      lastContacted: null, // Let services handle timestamp
      painPoints: [], // Can be pre-filled based on qualification
      goals: [],
    };
    
    // Prefill pain points
    if (qualificationData.hasInconsistentGrid === 'yes') newProspect.painPoints?.push('Inconsistent grid', 'Weak branding or visuals');
    if (qualificationData.hasLowEngagement === 'yes') newProspect.painPoints?.push('Low engagement');
    if (qualificationData.hasNoClearCTA === 'yes') newProspect.painPoints?.push('No clear CTA / no DMs');


    setIsSaving(true);
    onSave(newProspect);
    if(generateDm) {
      // Need the full prospect object, which we don't have yet (ID is missing)
      // This is a slight workflow change - we can't generate script until it's saved.
      // For now, we will just save. A better flow would be to save, then generate.
      // Let's just notify the user.
       toast({ title: "Prospect Saved!", description: "You can now generate a script from the main outreach table." });
    }
    handleClose();
    setIsSaving(false);
  };
  
  const getLeadScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
      if (score >= 60) return "default"; // Green (good)
      if (score >= 30) return "secondary"; // Yellow (medium)
      return "destructive"; // Red (low)
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-primary" />
            Rapid Prospect Creation
          </DialogTitle>
          <DialogDescription>
            Quickly qualify and add a new prospect using their Instagram handle.
          </DialogDescription>
        </DialogHeader>

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
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch & Qualify'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div>
              <Label>1. Is this a business/creator account (not personal)?</Label>
              <ToggleGroup type="single" value={qualificationData.isBusiness} onValueChange={(value: QualificationData['isBusiness']) => value && setQualificationData(p => ({...p, isBusiness: value}))} className="mt-2">
                <ToggleGroupItem value="yes">Yes</ToggleGroupItem>
                <ToggleGroupItem value="no">No</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <Label>2. Does their grid seem inconsistent or lack clear branding?</Label>
              <ToggleGroup type="single" value={qualificationData.hasInconsistentGrid} onValueChange={(value: QualificationData['hasInconsistentGrid']) => value && setQualificationData(p => ({...p, hasInconsistentGrid: value}))} className="mt-2">
                <ToggleGroupItem value="yes">Yes</ToggleGroupItem>
                <ToggleGroupItem value="no">No</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <Label>3. Is their engagement low for their follower count?</Label>
              <ToggleGroup type="single" value={qualificationData.hasLowEngagement} onValueChange={(value: QualificationData['hasLowEngagement']) => value && setQualificationData(p => ({...p, hasLowEngagement: value}))} className="mt-2">
                <ToggleGroupItem value="yes">Yes</ToggleGroupItem>
                <ToggleGroupItem value="no">No</ToggleGroupItem>
              </ToggleGroup>
            </div>
             <div>
              <Label>4. Does their bio have a weak or missing Call-to-Action?</Label>
              <ToggleGroup type="single" value={qualificationData.hasNoClearCTA} onValueChange={(value: QualificationData['hasNoClearCTA']) => value && setQualificationData(p => ({...p, hasNoClearCTA: value}))} className="mt-2">
                <ToggleGroupItem value="yes">Yes</ToggleGroupItem>
                <ToggleGroupItem value="no">No</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <Label>5. What's the #1 thing we can help them with?</Label>
               <RadioGroup value={qualificationData.valueProposition} onValueChange={(value: QualificationData['valueProposition']) => value && setQualificationData(p => ({...p, valueProposition: value}))} className="mt-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="visuals" id="vp-visuals" /><Label htmlFor="vp-visuals" className="font-normal">Visuals/Branding</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="leads" id="vp-leads" /><Label htmlFor="vp-leads" className="font-normal">Leads/Sales</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="engagement" id="vp-engagement" /><Label htmlFor="vp-engagement" className="font-normal">Engagement/Growth</Label></div>
              </RadioGroup>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(3)}>Review & Save <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold text-lg text-center mb-2">Lead Score: <Badge variant={getLeadScoreBadgeVariant(leadScore)} className="text-lg">{leadScore}</Badge></h3>
                <Separator/>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div className="font-medium">Followers:</div><div>{metrics?.followerCount ?? 'N/A'}</div>
                    <div className="font-medium">Posts:</div><div>{metrics?.postCount ?? 'N/A'}</div>
                    <div className="font-medium">Avg Likes:</div><div>{metrics?.avgLikes ?? 'N/A'}</div>
                    <div className="font-medium">Avg Comments:</div><div>{metrics?.avgComments ?? 'N/A'}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Review the calculated score. You can go back to adjust qualification answers. When ready, save the prospect to your outreach list.</p>
              
              <DialogFooter className="mt-6">
                 <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Qualify</Button>
                 <Button onClick={() => handleSave(false)} disabled={isSaving}>
                   {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Save Prospect
                 </Button>
              </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

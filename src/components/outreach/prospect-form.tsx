
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { fetchInstagramMetrics, type InstagramMetrics } from '@/app/actions/fetch-ig-metrics';
import type { OutreachProspect, OutreachLeadStage, BusinessType, PainPoint, Goal, LeadSource, OfferInterest, TonePreference, ProspectLocation, AccountStage } from '@/lib/types';
import { OUTREACH_LEAD_STAGE_OPTIONS, BUSINESS_TYPES, PAIN_POINTS, GOALS, LEAD_SOURCES, OFFER_INTERESTS, TONE_PREFERENCES, PROSPECT_LOCATIONS, ACCOUNT_STAGES } from '@/lib/types';
import { RefreshCw, Loader2, Info, Briefcase, BarChart3, AlertCircle, Target, MessageSquare, Settings2, FileQuestion, Star } from 'lucide-react';
import { Badge } from '../ui/badge';

const initialFormData: Omit<OutreachProspect, 'id' | 'userId'> = {
    name: '',
    email: null,
    instagramHandle: null,
    businessName: null,
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
    status: 'To Contact',
    source: null,
    lastContacted: null,
    followUpDate: null,
    followUpNeeded: false,
    offerInterest: [],
    uniqueNote: null,
    helpStatement: null, 
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
    leadScore: null,
    qualificationData: null,
};

// A "safe" date formatter that won't crash on invalid input
const safeFormatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return '';
        }
        return date.toISOString().split('T')[0];
    } catch (error) {
        return '';
    }
};

export function ProspectForm({ prospect, onSave, onCancel }: { prospect?: OutreachProspect, onSave: (prospectData: Omit<OutreachProspect, 'id' | 'userId'> | OutreachProspect) => void, onCancel: () => void }) {
  const { toast } = useToast();
  const [isFetchingMetrics, setIsFetchingMetrics] = useState(false);
  
  const [formData, setFormData] = useState<Partial<OutreachProspect>>(initialFormData);

  useEffect(() => {
    const dataToLoad = prospect ? { ...prospect } : { ...initialFormData };
    setFormData({
      ...dataToLoad,
      lastContacted: safeFormatDate(dataToLoad.lastContacted),
      followUpDate: safeFormatDate(dataToLoad.followUpDate),
      qualifierSentAt: safeFormatDate(dataToLoad.qualifierSentAt),
    });
  }, [prospect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
     if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: value === '' ? null : Number(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
    }
  };
  
  const handleCheckboxFieldChange = (field: 'painPoints' | 'goals' | 'offerInterest', value: string) => {
    setFormData(prev => {
      const currentValues = prev[field] || [];
      const newValues = currentValues.includes(value as never) 
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value as never];
      return { ...prev, [field]: newValues };
    });
  };
  
  const handleSingleCheckboxChange = (name: keyof OutreachProspect, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: keyof OutreachProspect, value: string | undefined) => {
    setFormData(prev => ({ ...prev, [name]: value || null }));
  };

  const handleFetchMetrics = async () => {
    if (!formData.instagramHandle) {
      toast({ title: "Missing Handle", description: "Please enter an Instagram handle to fetch metrics.", variant: "destructive" });
      return;
    }
    setIsFetchingMetrics(true);
    try {
      const result = await fetchInstagramMetrics(formData.instagramHandle.trim());
      if (result.error) {
        toast({ title: "Metrics Fetch Failed", description: result.error, variant: "destructive", duration: 8000 });
      } else if (result.data) {
        setFormData(prev => ({
          ...prev,
          followerCount: result.data!.followerCount,
          postCount: result.data!.postCount,
          avgLikes: result.data!.avgLikes,
          avgComments: result.data!.avgComments,
          accountStage: result.data!.followerCount < 1000 ? "Growing (100–1k followers)" : result.data!.followerCount < 10000 ? "Established (>1k followers)" : "Established (>1k followers)",
        }));
        toast({ title: "Metrics Fetched!", description: `Data for @${formData.instagramHandle} updated.` });
      }
    } catch (error: any) {
      toast({ title: "Error Fetching Metrics", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsFetchingMetrics(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
        toast({ title: "Error", description: "Prospect Name is required.", variant: "destructive" });
        return;
    }
    if (!formData.instagramHandle && !formData.email) {
        toast({ title: "Error", description: "Either Email or Instagram Handle is required.", variant: "destructive" });
        return;
    }
    
    onSave(formData as OutreachProspect);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl">{prospect ? 'Edit Prospect Details' : 'Add New Prospect'}</DialogTitle>
        <DialogDescription> 
          {prospect ? 'Update the comprehensive details for this prospect.' : 'Fill in the form to add a new prospect with detailed information.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">
        {/* Section 1 */}
        <section>
          <h4 className="font-semibold text-lg flex items-center mb-2"><Info className="mr-2 h-5 w-5 text-primary"/>Basic Prospect Info</h4>
          <div className="space-y-3 p-4 border rounded-md">
            <div>
              <Label htmlFor="name">Prospect Name *</Label>
              <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="instagramHandle">IG Handle (Required if no Email)</Label>
              <Input id="instagramHandle" name="instagramHandle" placeholder="@username" value={formData.instagramHandle || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="businessName">Business Name (Optional)</Label>
              <Input id="businessName" name="businessName" value={formData.businessName || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input id="website" name="website" type="url" placeholder="https://example.com" value={formData.website || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="prospectLocation">Prospect Location (Optional)</Label>
              <Select value={formData.prospectLocation || undefined} onValueChange={(value: ProspectLocation) => handleSelectChange('prospectLocation', value)}>
                <SelectTrigger id="prospectLocation"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>{PROSPECT_LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="industry">Industry (e.g., Fashion, SaaS, Coaching)</Label>
              <Input id="industry" name="industry" value={formData.industry || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="visualStyle">Visual Style Notes (Optional)</Label>
              <Input id="visualStyle" name="visualStyle" placeholder="e.g., Luxe, clean, messy, vibrant..." value={formData.visualStyle || ''} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="bioSummary">Bio Summary (Optional)</Label>
              <Textarea id="bioSummary" name="bioSummary" placeholder="Summary of their Instagram bio" value={formData.bioSummary || ''} onChange={handleChange} rows={3}/>
            </div>
            <div>
              <Label htmlFor="email">Email (Required if no IG Handle)</Label>
              <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <h4 className="font-semibold text-lg flex items-center mb-2"><Briefcase className="mr-2 h-5 w-5 text-primary"/>Business Type</h4>
          <div className="p-4 border rounded-md">
            <RadioGroup value={formData.businessType || undefined} onValueChange={(value) => handleSelectChange('businessType', value as BusinessType)} className="space-y-1">
              {BUSINESS_TYPES.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <RadioGroupItem value={type} id={`businessType-${type.replace(/\s*\/\s*|\s+/g, '-')}`} />
                  <Label htmlFor={`businessType-${type.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{type}</Label>
                </div>
              ))}
            </RadioGroup>
            {formData.businessType === "Other" && (
              <div className="mt-2">
                <Label htmlFor="businessTypeOther">Specify Other Business Type</Label>
                <Input id="businessTypeOther" name="businessTypeOther" value={formData.businessTypeOther || ''} onChange={handleChange} />
              </div>
            )}
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <h4 className="font-semibold text-lg flex items-center mb-2"><BarChart3 className="mr-2 h-5 w-5 text-primary"/>Engagement Metrics</h4>
          <div className="p-4 border rounded-md space-y-3">
              <Button type="button" variant="outline" onClick={handleFetchMetrics} disabled={isFetchingMetrics || !formData.instagramHandle} className="text-xs">
                  {isFetchingMetrics ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                  Fetch Metrics (via Apify)
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                      <Label htmlFor="accountStage">Account Stage</Label>
                      <Select value={formData.accountStage || undefined} onValueChange={(value: AccountStage) => handleSelectChange('accountStage', value)}>
                        <SelectTrigger id="accountStage"><SelectValue placeholder="Select account stage" /></SelectTrigger>
                        <SelectContent>{ACCOUNT_STAGES.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                  <div>
                      <Label htmlFor="followerCount">Follower Count</Label>
                      <Input id="followerCount" name="followerCount" type="number" value={formData.followerCount ?? ''} onChange={handleChange} />
                  </div>
                  <div>
                      <Label htmlFor="postCount">Post Count</Label>
                      <Input id="postCount" name="postCount" type="number" value={formData.postCount ?? ''} onChange={handleChange} />
                  </div>
                  <div>
                      <Label htmlFor="avgLikes">Avg Likes (last 3 posts)</Label>
                      <Input id="avgLikes" name="avgLikes" type="number" step="0.1" value={formData.avgLikes ?? ''} onChange={handleChange} />
                  </div>
                  <div>
                      <Label htmlFor="avgComments">Avg Comments (last 3 posts)</Label>
                      <Input id="avgComments" name="avgComments" type="number" step="0.1" value={formData.avgComments ?? ''} onChange={handleChange} />
                  </div>
              </div>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h4 className="font-semibold text-lg flex items-center mb-2"><AlertCircle className="mr-2 h-5 w-5 text-primary"/>Current Problems / Pain Points</h4>
          <div className="p-4 border rounded-md space-y-2 columns-1 sm:columns-2">
              {PAIN_POINTS.map(point => (
                  <div key={point} className="flex items-center space-x-2 break-inside-avoid-column">
                      <Checkbox id={`pain-${point.replace(/\s*\/\s*|\s+/g, '-')}`} checked={(formData.painPoints || []).includes(point)} onCheckedChange={() => handleCheckboxFieldChange('painPoints', point)} />
                      <Label htmlFor={`pain-${point.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{point}</Label>
                  </div>
              ))}
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <h4 className="font-semibold text-lg flex items-center mb-2"><Target className="mr-2 h-5 w-5 text-primary"/>Goals They Might Want</h4>
          <div className="p-4 border rounded-md space-y-2 columns-1 sm:columns-2">
              {GOALS.map(goal => (
                  <div key={goal} className="flex items-center space-x-2 break-inside-avoid-column">
                      <Checkbox id={`goal-${goal.replace(/\s*\/\s*|\s+/g, '-')}`} checked={(formData.goals || []).includes(goal)} onCheckedChange={() => handleCheckboxFieldChange('goals', goal)} />
                      <Label htmlFor={`goal-${goal.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{goal}</Label>
                  </div>
              ))}
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <h4 className="font-semibold text-lg flex items-center mb-2"><Star className="mr-2 h-5 w-5 text-primary"/>Lead & Interaction Status</h4>
           <div className="p-4 border rounded-md space-y-3">
              {prospect?.leadScore !== null && prospect?.leadScore !== undefined && (
                <div>
                  <Label>Lead Score</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-base">{prospect.leadScore}</Badge>
                    <p className="text-xs text-muted-foreground">This score was automatically calculated during rapid creation.</p>
                  </div>
                </div>
              )}
              <div>
                  <Label htmlFor="status">Lead Stage *</Label>
                  <Select value={formData.status} onValueChange={(value: OutreachLeadStage) => handleSelectChange('status', value)} required>
                    <SelectTrigger id="status"><SelectValue placeholder="Select lead stage" /></SelectTrigger>
                    <SelectContent>{OUTREACH_LEAD_STAGE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
              </div>
              <div>
                  <Label htmlFor="source">Source</Label>
                  <Select value={formData.source || undefined} onValueChange={(value: LeadSource) => handleSelectChange('source', value)}>
                    <SelectTrigger id="source"><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label htmlFor="lastContacted">Last Contacted</Label><Input id="lastContacted" name="lastContacted" type="date" value={formData.lastContacted || ''} onChange={handleChange} /></div>
                  <div><Label htmlFor="followUpDate">Follow-up Date</Label><Input id="followUpDate" name="followUpDate" type="date" value={formData.followUpDate || ''} onChange={handleChange} /></div>
              </div>
              <div>
                  <Label htmlFor="lastMessageSnippet">Last Message from Prospect (Optional)</Label>
                  <Textarea id="lastMessageSnippet" name="lastMessageSnippet" placeholder="e.g., 'Thanks, I'll check it out'" value={formData.lastMessageSnippet || ''} onChange={handleChange} rows={2}/>
              </div>
              <div className="flex items-center space-x-2 pt-2"><Checkbox id="followUpNeeded" checked={!!formData.followUpNeeded} onCheckedChange={(checked) => handleSingleCheckboxChange('followUpNeeded', !!checked)} /><Label htmlFor="followUpNeeded" className="font-normal">Follow-Up Needed?</Label></div>
              <div className="flex items-center space-x-2"><Checkbox id="linkSent" checked={!!formData.linkSent} onCheckedChange={(checked) => handleSingleCheckboxChange('linkSent', !!checked)} /><Label htmlFor="linkSent" className="font-normal">Link Sent? (e.g., Audit)</Label></div>
              <div className="flex items-center space-x-2"><Checkbox id="carouselOffered" checked={!!formData.carouselOffered} onCheckedChange={(checked) => handleSingleCheckboxChange('carouselOffered', !!checked)} /><Label htmlFor="carouselOffered" className="font-normal">Carousel Offered?</Label></div>
          </div>
        </section>

        {/* Section 7 */}
        <section>
          <h4 className="font-semibold text-lg flex items-center mb-2"><FileQuestion className="mr-2 h-5 w-5 text-primary"/>Qualifier Details</h4>
          <div className="p-4 border rounded-md space-y-3">
               <div>
                  <Label htmlFor="qualifierQuestion">Qualifier Question Sent</Label>
                  <Textarea id="qualifierQuestion" name="qualifierQuestion" value={formData.qualifierQuestion || ''} onChange={handleChange} rows={2}/>
                  {formData.qualifierSentAt && <p className="text-xs text-muted-foreground mt-1">Sent on: {new Date(formData.qualifierSentAt).toLocaleString()}</p>}
              </div>
              <div>
                  <Label htmlFor="qualifierReply">Prospect's Reply to Qualifier</Label>
                  <Textarea id="qualifierReply" name="qualifierReply" placeholder="Log the prospect's response here..." value={formData.qualifierReply || ''} onChange={handleChange} rows={2}/>
              </div>
          </div>
        </section>

        {/* Section 8 */}
        <section>
          <h4 className="font-semibold text-lg flex items-center mb-2"><MessageSquare className="mr-2 h-5 w-5 text-primary"/>Offer Interest (If replied)</h4>
           <div className="p-4 border rounded-md space-y-2 columns-1 sm:columns-2">
              {OFFER_INTERESTS.map(interest => (
                  <div key={interest} className="flex items-center space-x-2 break-inside-avoid-column">
                      <Checkbox id={`interest-${interest.replace(/\s*\/\s*|\s+/g, '-')}`} checked={(formData.offerInterest || []).includes(interest)} onCheckedChange={() => handleCheckboxFieldChange('offerInterest', interest)} />
                      <Label htmlFor={`interest-${interest.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{interest}</Label>
                  </div>
              ))}
          </div>
        </section>

        {/* Section 9 */}
        <section>
          <h4 className="font-semibold text-lg flex items-center mb-2"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Smart Prompts & Notes</h4>
           <div className="p-4 border rounded-md space-y-3">
              <div>
                  <Label htmlFor="uniqueNote">Unique/Interesting observation about this brand? (1-2 sentences)</Label>
                  <Textarea id="uniqueNote" name="uniqueNote" placeholder="e.g., They post skincare tips in Darija" value={formData.uniqueNote || ''} onChange={handleChange} rows={2}/>
              </div>
              <div>
                  <Label htmlFor="helpStatement">If you had to help them in 1 sentence, what would it be?</Label>
                  <Textarea id="helpStatement" name="helpStatement" placeholder="e.g., Their highlights and bio confuse visitors." value={formData.helpStatement || ''} onChange={handleChange} rows={2}/>
              </div>
              <div>
                  <Label htmlFor="nextStep">Next Step (Manual)</Label>
                  <Textarea id="nextStep" name="nextStep" placeholder="e.g., 'Follow up on audit feedback next week.'" value={formData.nextStep || ''} onChange={handleChange} rows={2}/>
              </div>
              <div>
                  <Label>Tone Preference?</Label>
                  <RadioGroup value={formData.tonePreference || undefined} onValueChange={(value) => handleSelectChange('tonePreference', value as TonePreference)} className="mt-1 space-y-1">
                      {TONE_PREFERENCES.map(tone => (
                        <div key={tone} className="flex items-center space-x-2">
                          <RadioGroupItem value={tone} id={`tone-${tone.replace(/\s*\/\s*|\s+/g, '-')}`} />
                          <Label htmlFor={`tone-${tone.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{tone}</Label>
                        </div>
                      ))}
                    </RadioGroup>
              </div>
              <div className="pt-2">
                <Label htmlFor="lastScriptSent">Last Script Sent (Label)</Label>
                <Input id="lastScriptSent" name="lastScriptSent" placeholder="e.g., 'Initial Cold DM'" value={formData.lastScriptSent || ''} onChange={handleChange} />
              </div>
              <div className="pt-2">
                <Label htmlFor="notes">General Notes (Optional)</Label>
                <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} />
              </div>
          </div>
        </section>
      </div>

      <DialogFooter className="pt-6 sticky bottom-0 bg-background py-4 z-10 border-t -mx-6 px-6">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{prospect ? 'Update Prospect' : 'Add Prospect'}</Button>
      </DialogFooter>
    </form>
  );
}

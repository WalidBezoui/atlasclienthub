
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Send, PlusCircle, Edit, Trash2, Search, Filter, ChevronDown, AlertTriangle, BotMessageSquare, Loader2, Briefcase, Globe, Link as LinkIcon, Target, AlertCircle, MessageSquare, Info, Settings2, Sparkles, HelpCircle, BarChart3, RefreshCw, Palette, FileTextIcon, Star, Calendar, MessageCircle, FileUp, ListTodo, MessageSquareText, MessagesSquare, MoreHorizontal, Save, FileQuestion, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription as CardFormDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { OutreachProspect, OutreachLeadStage, BusinessType, PainPoint, Goal, LeadSource, OfferInterest, TonePreference, ProspectLocation, AccountStage } from '@/lib/types';
import { OUTREACH_LEAD_STAGE_OPTIONS, BUSINESS_TYPES, PAIN_POINTS, GOALS, LEAD_SOURCES, OFFER_INTERESTS, TONE_PREFERENCES, PROSPECT_LOCATIONS, ACCOUNT_STAGES, SCRIPT_SNIPPET_TYPES } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { addProspect, getProspects, updateProspect, deleteProspect as fbDeleteProspect } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useScriptContext } from '@/contexts/ScriptContext';
import { generateContextualScript, type GenerateContextualScriptInput } from '@/ai/flows/generate-contextual-script';
import { generateQualifierQuestion, type GenerateQualifierInput } from '@/ai/flows/generate-qualifier-question';
import { ScriptModal } from '@/components/scripts/script-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchInstagramMetrics } from '@/app/actions/fetch-ig-metrics';
import { ConversationTracker } from '@/components/outreach/conversation-tracker';


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
};

function ProspectForm({ prospect, onSave, onCancel }: { prospect?: OutreachProspect, onSave: (prospectData: Omit<OutreachProspect, 'id' | 'userId'> | OutreachProspect) => void, onCancel: () => void }) {
  const { toast } = useToast();
  const [isFetchingMetrics, setIsFetchingMetrics] = useState(false);
  
  const [formData, setFormData] = useState(() => {
    const sourceData = prospect || initialFormData;
    // Explicitly map all fields to ensure correct initialization.
    return {
      name: sourceData.name ?? '',
      instagramHandle: sourceData.instagramHandle ?? null,
      businessName: sourceData.businessName ?? null,
      website: sourceData.website ?? null,
      prospectLocation: sourceData.prospectLocation ?? null,
      industry: sourceData.industry ?? null,
      email: sourceData.email ?? null,
      visualStyle: sourceData.visualStyle ?? null,
      bioSummary: sourceData.bioSummary ?? null,
      businessType: sourceData.businessType ?? null,
      businessTypeOther: sourceData.businessTypeOther ?? null,
      accountStage: sourceData.accountStage ?? null,
      followerCount: sourceData.followerCount ?? null,
      postCount: sourceData.postCount ?? null,
      avgLikes: sourceData.avgLikes ?? null,
      avgComments: sourceData.avgComments ?? null,
      painPoints: sourceData.painPoints ?? [],
      goals: sourceData.goals ?? [],
      status: sourceData.status ?? 'To Contact',
      source: sourceData.source ?? null,
      lastContacted: sourceData.lastContacted ? new Date(sourceData.lastContacted).toISOString().split('T')[0] : '',
      followUpDate: sourceData.followUpDate ? new Date(sourceData.followUpDate).toISOString().split('T')[0] : '',
      followUpNeeded: sourceData.followUpNeeded ?? false,
      offerInterest: sourceData.offerInterest ?? [],
      uniqueNote: sourceData.uniqueNote ?? null,
      helpStatement: sourceData.helpStatement ?? null,
      tonePreference: sourceData.tonePreference ?? null,
      notes: sourceData.notes ?? null,
      lastMessageSnippet: sourceData.lastMessageSnippet ?? null,
      lastScriptSent: sourceData.lastScriptSent ?? null,
      linkSent: sourceData.linkSent ?? false,
      carouselOffered: sourceData.carouselOffered ?? false,
      nextStep: sourceData.nextStep ?? null,
      conversationHistory: sourceData.conversationHistory ?? null,
      qualifierQuestion: sourceData.qualifierQuestion ?? null,
      qualifierSentAt: sourceData.qualifierSentAt ? new Date(sourceData.qualifierSentAt).toISOString().split('T')[0] : null,
      qualifierReply: sourceData.qualifierReply ?? null,
    };
  });

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
    if (!formData.name.trim()) {
        toast({ title: "Error", description: "Prospect Name is required.", variant: "destructive" });
        return;
    }
    if (!formData.instagramHandle && !formData.email) {
        toast({ title: "Error", description: "Either Email or Instagram Handle is required.", variant: "destructive" });
        return;
    }
    
    const dataToSave = prospect?.id ? { ...formData, id: prospect.id, userId: prospect.userId } : formData;
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto max-h-[75vh] pr-5">
      
      <Card className="pt-4">
        <CardHeader className="py-2">
          <DialogTitle className="text-lg font-semibold flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/>Section 1: Basic Prospect Info</DialogTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="name">Prospect Name *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
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
              <SelectContent>
                {PROSPECT_LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
              </SelectContent>
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
        </CardContent>
      </Card>
      <Separator />

      <Card className="pt-4">
        <CardHeader className="py-2">
          <DialogTitle className="text-lg font-semibold flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary"/>Section 2: Business Type</DialogTitle>
          <CardFormDescription>Helps personalize language, value prop, and CTA.</CardFormDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup
            value={formData.businessType || undefined}
            onValueChange={(value) => handleSelectChange('businessType', value as BusinessType)}
            className="space-y-1"
          >
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
        </CardContent>
      </Card>
      <Separator />
      
      <Card className="pt-4">
         <CardHeader className="py-2">
            <div className="flex items-center justify-between">
                 <DialogTitle className="text-lg font-semibold flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary"/>Section 3: Engagement Metrics</DialogTitle>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-2 text-xs">
                            <p>Attempt to automatically fetch public metrics from Instagram using Apify. This relies on an external service and may take a moment. Manual entry is always available if fetching doesn't work or for adjustments.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </CardHeader>
        <CardContent className="space-y-3">
            <Button type="button" variant="outline" onClick={handleFetchMetrics} disabled={isFetchingMetrics || !formData.instagramHandle} className="mb-3 text-xs">
                {isFetchingMetrics ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                Fetch Metrics (via Apify)
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <Label htmlFor="accountStage">Account Stage</Label>
                    <Select value={formData.accountStage || undefined} onValueChange={(value: AccountStage) => handleSelectChange('accountStage', value)}>
                    <SelectTrigger id="accountStage"><SelectValue placeholder="Select account stage" /></SelectTrigger>
                    <SelectContent>
                        {ACCOUNT_STAGES.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
                    </SelectContent>
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
        </CardContent>
      </Card>
      <Separator />

      <Card className="pt-4">
        <CardHeader className="py-2">
            <DialogTitle className="text-lg font-semibold flex items-center"><AlertCircle className="mr-2 h-5 w-5 text-primary"/>Section 4: Current Problems / Pain Points</DialogTitle>
            <CardFormDescription>These guide pain points in scripts.</CardFormDescription>
        </CardHeader>
        <CardContent className="space-y-2 columns-1 sm:columns-2">
            {PAIN_POINTS.map(point => (
                <div key={point} className="flex items-center space-x-2 break-inside-avoid-column">
                    <Checkbox
                        id={`pain-${point.replace(/\s*\/\s*|\s+/g, '-')}`}
                        checked={(formData.painPoints || []).includes(point)}
                        onCheckedChange={() => handleCheckboxFieldChange('painPoints', point)}
                    />
                    <Label htmlFor={`pain-${point.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{point}</Label>
                </div>
            ))}
        </CardContent>
      </Card>
      <Separator />

      <Card className="pt-4">
        <CardHeader className="py-2">
            <DialogTitle className="text-lg font-semibold flex items-center"><Target className="mr-2 h-5 w-5 text-primary"/>Section 5: Goals They Might Want</DialogTitle>
            <CardFormDescription>Used to align with outcomes in message.</CardFormDescription>
        </CardHeader>
        <CardContent className="space-y-2 columns-1 sm:columns-2">
            {GOALS.map(goal => (
                <div key={goal} className="flex items-center space-x-2 break-inside-avoid-column">
                    <Checkbox
                        id={`goal-${goal.replace(/\s*\/\s*|\s+/g, '-')}`}
                        checked={(formData.goals || []).includes(goal)}
                        onCheckedChange={() => handleCheckboxFieldChange('goals', goal)}
                    />
                    <Label htmlFor={`goal-${goal.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{goal}</Label>
                </div>
            ))}
        </CardContent>
      </Card>
      <Separator />
      
      <Card className="pt-4">
        <CardHeader className="py-2">
             <DialogTitle className="text-lg font-semibold flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary"/>Section 6: Lead & Interaction Status</DialogTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <div>
                <Label htmlFor="status">Lead Stage *</Label>
                <Select value={formData.status} onValueChange={(value: OutreachLeadStage) => handleSelectChange('status', value)} required>
                  <SelectTrigger id="status"><SelectValue placeholder="Select lead stage" /></SelectTrigger>
                  <SelectContent>
                    {OUTREACH_LEAD_STAGE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="source">Source</Label>
                 <Select value={formData.source || undefined} onValueChange={(value: LeadSource) => handleSelectChange('source', value)}>
                  <SelectTrigger id="source"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div>
                    <Label htmlFor="lastContacted">Last Contacted</Label>
                    <Input id="lastContacted" name="lastContacted" type="date" value={formData.lastContacted || ''} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="followUpDate">Follow-up Date</Label>
                    <Input id="followUpDate" name="followUpDate" type="date" value={formData.followUpDate || ''} onChange={handleChange} />
                </div>
            </div>
             <div>
                <Label htmlFor="lastMessageSnippet">Last Message from Prospect (Optional)</Label>
                <Textarea id="lastMessageSnippet" name="lastMessageSnippet" placeholder="e.g., 'Thanks, I'll check it out'" value={formData.lastMessageSnippet || ''} onChange={handleChange} rows={2}/>
            </div>
            <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="followUpNeeded" checked={!!formData.followUpNeeded} onCheckedChange={(checked) => handleSingleCheckboxChange('followUpNeeded', !!checked)} />
                <Label htmlFor="followUpNeeded" className="font-normal">Follow-Up Needed?</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="linkSent" checked={!!formData.linkSent} onCheckedChange={(checked) => handleSingleCheckboxChange('linkSent', !!checked)} />
                <Label htmlFor="linkSent" className="font-normal">Link Sent? (e.g., Audit)</Label>
            </div>
             <div className="flex items-center space-x-2">
                <Checkbox id="carouselOffered" checked={!!formData.carouselOffered} onCheckedChange={(checked) => handleSingleCheckboxChange('carouselOffered', !!checked)} />
                <Label htmlFor="carouselOffered" className="font-normal">Carousel Offered?</Label>
            </div>
        </CardContent>
      </Card>
      <Separator />

      <Card className="pt-4">
        <CardHeader className="py-2">
            <DialogTitle className="text-lg font-semibold flex items-center"><FileQuestion className="mr-2 h-5 w-5 text-primary"/>Section 7: Qualifier Details</DialogTitle>
            <CardFormDescription>Track the pre-audit qualification question and response.</CardFormDescription>
        </CardHeader>
        <CardContent className="space-y-3">
             <div>
                <Label htmlFor="qualifierQuestion">Qualifier Question Sent</Label>
                <Textarea id="qualifierQuestion" name="qualifierQuestion" value={formData.qualifierQuestion || ''} onChange={handleChange} rows={2}/>
                {formData.qualifierSentAt && <p className="text-xs text-muted-foreground mt-1">Sent on: {new Date(formData.qualifierSentAt).toLocaleString()}</p>}
            </div>
             <div>
                <Label htmlFor="qualifierReply">Prospect's Reply to Qualifier</Label>
                <Textarea id="qualifierReply" name="qualifierReply" placeholder="Log the prospect's response here..." value={formData.qualifierReply || ''} onChange={handleChange} rows={2}/>
            </div>
        </CardContent>
      </Card>
      <Separator />
      
      <Card className="pt-4">
        <CardHeader className="py-2">
            <DialogTitle className="text-lg font-semibold flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary"/>Section 8: Offer Interest (If replied)</DialogTitle>
            <CardFormDescription>Helps segment what to pitch.</CardFormDescription>
        </CardHeader>
        <CardContent className="space-y-2 columns-1 sm:columns-2">
            {OFFER_INTERESTS.map(interest => (
                <div key={interest} className="flex items-center space-x-2 break-inside-avoid-column">
                    <Checkbox
                        id={`interest-${interest.replace(/\s*\/\s*|\s+/g, '-')}`}
                        checked={(formData.offerInterest || []).includes(interest)}
                        onCheckedChange={() => handleCheckboxFieldChange('offerInterest', interest)}
                    />
                    <Label htmlFor={`interest-${interest.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{interest}</Label>
                </div>
            ))}
        </CardContent>
      </Card>
      <Separator />

      <Card className="pt-4">
        <CardHeader className="py-2">
            <DialogTitle className="text-lg font-semibold flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Section 9: Smart Prompts & Notes</DialogTitle>
            <CardFormDescription>These make the LLM outputs sharper.</CardFormDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
                 <RadioGroup
                    value={formData.tonePreference || undefined}
                    onValueChange={(value) => handleSelectChange('tonePreference', value as TonePreference)}
                    className="mt-1 space-y-1"
                  >
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
        </CardContent>
      </Card>


      <DialogFooter className="pt-6 sticky bottom-0 bg-background py-4 z-10 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{prospect ? 'Update Prospect' : 'Add Prospect'}</Button>
      </DialogFooter>
    </form>
  );
}


export default function OutreachPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { setClientContext, clearContext: clearScriptContext } = useScriptContext();
  const [prospects, setProspects] = useState<OutreachProspect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<OutreachLeadStage>>(new Set(OUTREACH_LEAD_STAGE_OPTIONS));
  const [showOnlyNeedsFollowUp, setShowOnlyNeedsFollowUp] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [editingProspect, setEditingProspect] = useState<OutreachProspect | undefined>(undefined);
  
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [scriptModalTitle, setScriptModalTitle] = useState("Generated Script");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [currentProspectForScript, setCurrentProspectForScript] = useState<OutreachProspect | null>(null);
  const [scriptModalConfig, setScriptModalConfig] = useState<any>({});
  
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  const [currentProspectForConversation, setCurrentProspectForConversation] = useState<OutreachProspect | null>(null);
  const [conversationHistoryContent, setConversationHistoryContent] = useState<string | null>(null);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  
  const { toast } = useToast();

  const scriptMenuItems: Array<{label: string, type: GenerateContextualScriptInput['scriptType']}> = [
    { label: "Cold Outreach DM", type: "Cold Outreach DM" },
    { label: "Warm Follow-Up DM", type: "Warm Follow-Up DM" },
    { label: "Audit Delivery Message", type: "Audit Delivery Message" },
    { label: "Send Reminder", type: "Send Reminder" },
    { label: "Soft Close", type: "Soft Close" },
  ];

  const fetchProspects = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedProspects = await getProspects();
      setProspects(fetchedProspects.sort((a,b) => (b.followUpNeeded ? 1 : -1) - (a.followUpNeeded ? 1 : -1) || new Date(b.lastContacted || 0).getTime() - new Date(a.lastContacted || 0).getTime()));
    } catch (error) {
      console.error("Error fetching prospects:", error);
      toast({ title: "Error", description: "Could not fetch prospects.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchProspects();
      } else {
        // AuthProvider should handle redirect
      }
    }
  }, [user, authLoading, fetchProspects, router]);

  const handleSaveProspect = async (prospectData: Omit<OutreachProspect, 'id'|'userId'> | OutreachProspect) => {
     if (!user) {
        toast({title: "Authentication Error", description: "You must be logged in.", variant: "destructive"});
        return;
    }
    try {
        const dataToSave = 'id' in prospectData ? prospectData : { ...prospectData, lastContacted: new Date().toISOString() };
        await ('id' in dataToSave && dataToSave.id 
          ? updateProspect(dataToSave.id, dataToSave as Partial<OutreachProspect>) 
          : addProspect(dataToSave as Omit<OutreachProspect, 'id'|'userId'>));

        toast({ title: "Success", description: `Prospect ${prospectData.name} saved.` });
        
        fetchProspects(); 
        setIsFormOpen(false);
        setEditingProspect(undefined);
    } catch (error: any) {
        console.error("Error saving prospect:", error);
        toast({ title: "Error", description: error.message || "Could not save prospect.", variant: "destructive"});
    }
  };
  
  const handleDeleteProspect = async (prospectId: string, prospectName: string) => {
     if (window.confirm(`Are you sure you want to delete prospect "${prospectName}"?`)) {
      try {
        await fbDeleteProspect(prospectId);
        toast({ title: "Prospect Deleted", description: `Prospect ${prospectName} has been removed.` });
        fetchProspects(); 
      } catch (error: any) {
        console.error("Error deleting prospect:", error);
        toast({ title: "Error", description: error.message || "Could not delete prospect.", variant: "destructive"});
      }
    }
  };

  const handleStatusChange = async (prospectId: string, newStatus: OutreachLeadStage) => {
    if (!user) return;
    try {
      await updateProspect(prospectId, { status: newStatus });
      setProspects(prevProspects => 
        prevProspects.map(p => p.id === prospectId ? { ...p, status: newStatus } : p)
      );
      toast({ title: "Status Updated", description: `Prospect status changed to ${newStatus}.` });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
      fetchProspects(); 
    }
  };

  const handleFollowUpToggle = async (prospectId: string, currentFollowUpStatus: boolean) => {
    if (!user) return;
    const newFollowUpStatus = !currentFollowUpStatus;
    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, followUpNeeded: newFollowUpStatus } : p));
    try {
        await updateProspect(prospectId, { followUpNeeded: newFollowUpStatus });
        toast({ title: "Follow-up status updated." });
    } catch (error) {
        console.error("Error updating follow-up status:", error);
        setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, followUpNeeded: currentFollowUpStatus } : p));
        toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };


  const toggleStatusFilter = (status: OutreachLeadStage) => {
    setStatusFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      if (newSet.size === 0) {
        return new Set(OUTREACH_LEAD_STAGE_OPTIONS);
      }
      return newSet;
    });
  };

  const handleGenerateScript = async (prospect: OutreachProspect, scriptType: GenerateContextualScriptInput['scriptType']) => {
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    setGeneratedScript('');
    setScriptModalTitle(`Generating ${scriptType}...`);
    setCurrentProspectForScript(prospect); 
    setScriptModalConfig({
        showSaveToSnippetsButton: true,
        showConfirmButton: false,
        scriptTypeToSave: scriptType
    });
    
    const input: GenerateContextualScriptInput = {
        scriptType,
        clientName: prospect.name?.trim() || null,
        clientHandle: prospect.instagramHandle?.trim() || null,
        businessName: prospect.businessName?.trim() || null,
        website: prospect.website?.trim() || null,
        prospectLocation: prospect.prospectLocation || null,
        clientIndustry: prospect.industry?.trim() || null,
        visualStyle: prospect.visualStyle?.trim() || null, 
        bioSummary: prospect.bioSummary?.trim() || null, 
        businessType: prospect.businessType || null,
        businessTypeOther: prospect.businessTypeOther?.trim() || null,
        accountStage: prospect.accountStage || null,
        followerCount: prospect.followerCount,
        postCount: prospect.postCount,
        avgLikes: prospect.avgLikes,
        avgComments: prospect.avgComments,
        painPoints: prospect.painPoints || [],
        goals: prospect.goals || [],
        leadStatus: prospect.status,
        source: prospect.source || null,
        lastTouch: prospect.lastContacted ? `Last contacted on ${new Date(prospect.lastContacted).toLocaleDateString()}` : 'No prior contact recorded',
        followUpNeeded: prospect.followUpNeeded || false,
        offerInterest: prospect.offerInterest || [],
        tonePreference: prospect.tonePreference || null,
        additionalNotes: prospect.notes?.trim() || null,
        lastMessageSnippet: prospect.lastMessageSnippet?.trim() || null,
        lastScriptSent: prospect.lastScriptSent?.trim() || null,
        linkSent: prospect.linkSent || false,
        carouselOffered: prospect.carouselOffered || false,
        nextStep: prospect.nextStep?.trim() || null,
        conversationHistory: prospect.conversationHistory?.trim() || null,
    };
    
    try {
        const result = await generateContextualScript(input);
        setGeneratedScript(result.script);
        setScriptModalTitle(`${scriptType} for ${prospect.name || 'Prospect'}`);
    } catch (error) {
        handleScriptGenerationError(error, "Error Generating Script");
    } finally {
        setIsGeneratingScript(false);
    }
  };

  const handleGenerateQualifier = async (prospect: OutreachProspect) => {
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    setGeneratedScript('');
    setScriptModalTitle(`Generating Qualifier for ${prospect.name}...`);
    setCurrentProspectForScript(prospect);
    setScriptModalConfig({
        showSaveToSnippetsButton: false,
        showConfirmButton: true,
        confirmButtonText: "Send & Update Status",
        onConfirm: async (scriptContent: string) => {
            await handleSendQualifier(prospect.id, scriptContent);
        }
    });

    const input: GenerateQualifierInput = {
        prospectName: prospect.name,
        igHandle: prospect.instagramHandle,
        businessType: prospect.businessType,
        lastMessage: prospect.lastMessageSnippet,
        goals: prospect.goals,
        painPoints: prospect.painPoints,
        accountStage: prospect.accountStage
    };

    try {
        const result = await generateQualifierQuestion(input);
        setGeneratedScript(result.question);
        setScriptModalTitle(`Qualifier Question for ${prospect.name}`);
    } catch (error) {
        handleScriptGenerationError(error, "Error Generating Qualifier");
    } finally {
        setIsGeneratingScript(false);
    }
  };

  const handleSendQualifier = async (prospectId: string, question: string) => {
      try {
          await updateProspect(prospectId, {
              qualifierQuestion: question,
              qualifierSentAt: new Date().toISOString(),
              status: 'Qualifier Sent'
          });
          toast({ title: "Qualifier Sent!", description: "Prospect status updated." });
          fetchProspects();
          setIsScriptModalOpen(false);
      } catch (error) {
          console.error("Error sending qualifier:", error);
          toast({ title: "Update Failed", description: "Could not update the prospect.", variant: "destructive" });
      }
  };

  const handleScriptGenerationError = (error: any, title: string) => {
    console.error(title, error);
    toast({ title, description: (error as Error).message || "Could not generate script.", variant: "destructive" });
    setScriptModalTitle(title);
    setGeneratedScript("Failed to generate script. Please try again.");
  }
  
  const handleRegenerateScript = async (): Promise<string | null> => {
    // This function can be enhanced to handle both script types if needed,
    // but for now, it's tied to the contextual script.
    // To handle qualifiers, we'd need to store the input for that flow as well.
    return null; // Placeholder
  };

  const filteredProspects = prospects.filter(prospect => {
    const searchTermMatch = (prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (prospect.email && prospect.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (prospect.businessName && prospect.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (prospect.industry && prospect.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (prospect.instagramHandle && prospect.instagramHandle.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const statusMatch = (statusFilters.size === OUTREACH_LEAD_STAGE_OPTIONS.length || statusFilters.has(prospect.status));
    const followUpMatch = !showOnlyNeedsFollowUp || !!prospect.followUpNeeded;

    return searchTermMatch && statusMatch && followUpMatch;
  });

  const getStatusBadgeVariant = (status: OutreachLeadStage): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Closed - Won':
      case 'Audit Delivered':
      case 'Ready for Audit':
      case 'Replied':
      case 'Interested': return 'default';
      case 'Warm':
      case 'Qualifier Sent': return 'secondary';
      case 'Cold':
      case 'To Contact': return 'outline';
      case 'Closed - Lost':
      case 'Not Interested': return 'destructive';
      default: return 'default';
    }
  };

  const getDaysSinceText = (lastContacted?: string | null): string => {
      if (!lastContacted) return '-';
      const lastContactDate = new Date(lastContacted);
      const today = new Date();
      today.setHours(0,0,0,0);
      lastContactDate.setHours(0,0,0,0);
      
      const diffTime = today.getTime() - lastContactDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays} days ago`;
  };

  if (authLoading || (isLoading && !prospects.length && user)) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading outreach prospects..." size="lg"/></div>;
  }
  
  if (!user && !authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }
  
  const handleOpenNewProspectForm = () => {
    setEditingProspect(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEditProspectForm = (prospect: OutreachProspect) => {
    setEditingProspect(prospect);
    setIsFormOpen(true);
  };

  const handleOpenConversationModal = (prospect: OutreachProspect) => {
    setCurrentProspectForConversation(prospect);
    setConversationHistoryContent(prospect.conversationHistory || null);
    setIsConversationModalOpen(true);
  };

  const handleSaveConversation = async () => {
    if (!currentProspectForConversation) return;
    setIsSavingConversation(true);
    try {
      await updateProspect(currentProspectForConversation.id, { conversationHistory: conversationHistoryContent });
      toast({ title: 'Conversation Saved', description: `History for ${currentProspectForConversation.name} updated.` });
      setIsConversationModalOpen(false);
      setCurrentProspectForConversation(null);
      fetchProspects(); // Refetch to get the latest data
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message || 'Could not save conversation.', variant: 'destructive' });
    } finally {
      setIsSavingConversation(false);
    }
  };
  
  const renderActions = (prospect: OutreachProspect) => {
    const canAskQualifier = ['Interested', 'Replied'].includes(prospect.status);
    const canCreateAudit = prospect.status === 'Ready for Audit';

    const buildQuestionnaireFromProspect = (p: OutreachProspect) => {
        const parts = [
            `Analyzing profile for: ${p.name || 'N/A'} (@${p.instagramHandle || 'N/A'})`,
            `Entity ID: ${p.id}`,
            `Industry: ${p.industry || 'Not specified'}`,
            `Business Type: ${p.businessType || 'Not specified'}${p.businessType === 'Other' ? ` (${p.businessTypeOther || ''})` : ''}`,
            `Account Stage: ${p.accountStage || 'N/A'}`,
            `Follower Count: ${p.followerCount ?? 'N/A'}`,
            `\n--- GOALS ---\n${p.goals && p.goals.length > 0 ? p.goals.map(g => `- ${g}`).join('\n') : 'No specific goals listed.'}`,
            `\n--- PAIN POINTS ---\n${p.painPoints && p.painPoints.length > 0 ? p.painPoints.map(pp => `- ${pp}`).join('\n') : 'No specific pain points listed.'}`,
            `\n--- QUALIFIER ---\nQ: ${p.qualifierQuestion || 'None sent.'}\nA: ${p.qualifierReply || 'No reply logged.'}`,
            `\n--- CONVERSATION HISTORY ---\n${p.conversationHistory || 'No history logged.'}`,
            `\n--- ADDITIONAL NOTES ---\n${p.notes || 'None'}`
        ];
        return encodeURIComponent(parts.join('\n\n'));
    };

    const auditLink = `/audits/new?handle=${prospect.instagramHandle || ''}&name=${prospect.name}&entityId=${prospect.id}&q=${buildQuestionnaireFromProspect(prospect)}`;

    return (
        <TableCell className="text-right space-x-0.5">
            <TooltipProvider>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => handleOpenEditProspectForm(prospect)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenConversationModal(prospect)}>
                                <MessagesSquare className="mr-2 h-4 w-4" /> Manage Conversation
                            </DropdownMenuItem>

                             <Tooltip>
                                <TooltipTrigger asChild>
                                     <div className={cn(!canCreateAudit && "cursor-not-allowed w-full")}>
                                        <Link href={canCreateAudit ? auditLink : '#'} passHref legacyBehavior>
                                            <DropdownMenuItem
                                                disabled={!canCreateAudit}
                                                className={cn(!canCreateAudit && "cursor-not-allowed")}
                                                onClick={(e) => !canCreateAudit && e.preventDefault()}
                                            >
                                                <GraduationCap className="mr-2 h-4 w-4" /> Create Audit
                                            </DropdownMenuItem>
                                        </Link>
                                    </div>
                                </TooltipTrigger>
                                {!canCreateAudit && <TooltipContent><p>Status must be 'Ready for Audit'</p></TooltipContent>}
                            </Tooltip>
                        </DropdownMenuGroup>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuGroup>
                           <DropdownMenuLabel>Generate Scripts</DropdownMenuLabel>
                           <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(!canAskQualifier && "cursor-not-allowed w-full")}>
                                        <DropdownMenuItem
                                            disabled={!canAskQualifier}
                                            onClick={() => canAskQualifier && handleGenerateQualifier(prospect)}
                                        >
                                            <FileQuestion className="mr-2 h-4 w-4" /> Ask Qualifier Question
                                        </DropdownMenuItem>
                                    </div>
                                </TooltipTrigger>
                                {!canAskQualifier && <TooltipContent><p>Status must be 'Interested' or 'Replied'</p></TooltipContent>}
                            </Tooltip>
                           {scriptMenuItems.map(item => (
                                <DropdownMenuItem key={item.type} onClick={() => handleGenerateScript(prospect, item.type)}>
                                    <BotMessageSquare className="mr-2 h-4 w-4" />
                                    <span>{item.label}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteProspect(prospect.id, prospect.name)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TooltipProvider>
        </TableCell>
    );
  };


  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading Outreach..." size="lg"/></div>}>
    <div className="space-y-6">
      <PageHeader
        title="Outreach Manager"
        description="Track and manage your cold outreach efforts with detailed prospect information."
        icon={Send}
        actions={
          <Button onClick={handleOpenNewProspectForm}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Prospect
          </Button>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setEditingProspect(undefined);
          }
      }}>
        <DialogContent className="sm:max-w-lg md:max-w-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="font-headline text-2xl">{editingProspect ? 'Edit Prospect Details' : 'Add New Prospect'}</DialogTitle>
            <DialogDescription> 
              {editingProspect ? 'Update the comprehensive details for this prospect.' : 'Fill in the form to add a new prospect with detailed information.'}
            </DialogDescription>
          </DialogHeader>
          <ProspectForm 
            key={editingProspect?.id || 'new'}
            prospect={editingProspect} 
            onSave={handleSaveProspect} 
            onCancel={() => { setIsFormOpen(false); setEditingProspect(undefined);}} 
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isConversationModalOpen} onOpenChange={setIsConversationModalOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">Conversation with {currentProspectForConversation?.name}</DialogTitle>
            <DialogDescription>Track and manage your conversation history. This context is used by the AI.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow min-h-0">
            <ConversationTracker
              value={conversationHistoryContent}
              onChange={(newValue) => setConversationHistoryContent(newValue)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConversationModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConversation} disabled={isSavingConversation}>
              {isSavingConversation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search prospects by name, email, IG..." 
                className="pl-8 sm:w-[300px] md:w-[400px]" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" /> Filter by Status <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {OUTREACH_LEAD_STAGE_OPTIONS.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilters.has(status)}
                    onCheckedChange={() => toggleStatusFilter(status)}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                    checked={showOnlyNeedsFollowUp}
                    onCheckedChange={setShowOnlyNeedsFollowUp}
                >
                  <Star className="mr-2 h-4 w-4 text-yellow-500" />
                  Needs Follow-up Only
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
         {isLoading && prospects.length === 0 ? (
             <div className="overflow-x-auto">
              <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <LoadingSpinner text="Fetching prospects..." />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
             </div>
          ) : (
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Follow</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Next Step</TableHead>
                    <TableHead className="hidden lg:table-cell">Days Since</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProspects.length > 0 ? filteredProspects.map((prospect) => (
                      <TableRow key={prospect.id} data-follow-up={!!prospect.followUpNeeded} className="data-[follow-up=true]:bg-primary/10">
                        <TableCell>
                          <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Checkbox
                                          checked={!!prospect.followUpNeeded}
                                          onCheckedChange={() => handleFollowUpToggle(prospect.id, !!prospect.followUpNeeded)}
                                          aria-label={`Mark ${prospect.name} as needs follow-up`}
                                          className="h-5 w-5"
                                      />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>Mark for Follow-up</p>
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div>
                              {prospect.name}
                              <br/>
                              {prospect.instagramHandle ? (
                                <a 
                                  href={`https://instagram.com/${prospect.instagramHandle.replace('@', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {prospect.instagramHandle}
                                  <LinkIcon className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No handle</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Select 
                            value={prospect.status} 
                            onValueChange={(newStatus: OutreachLeadStage) => handleStatusChange(prospect.id, newStatus)}
                          >
                            <SelectTrigger className="h-auto py-0.5 px-2.5 border-none shadow-none [&>span]:flex [&>span]:items-center text-xs w-auto min-w-[100px]">
                              <SelectValue asChild>
                                <Badge variant={getStatusBadgeVariant(prospect.status)} className="cursor-pointer text-xs whitespace-nowrap">
                                  {prospect.status}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {OUTREACH_LEAD_STAGE_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{prospect.nextStep || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                          {getDaysSinceText(prospect.lastContacted)}
                        </TableCell>
                        {renderActions(prospect)}
                      </TableRow>
                    )) : (
                       <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                            <div className="flex flex-col items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-muted-foreground mb-2" />
                                <p className="font-semibold">
                                  {prospects.length === 0 && searchTerm === '' && (statusFilters.size === OUTREACH_LEAD_STAGE_OPTIONS.length || statusFilters.size === 0)
                                    ? "No prospects found."
                                    : "No prospects found matching your criteria."
                                  }
                                </p>
                                {prospects.length === 0 && searchTerm === '' && (statusFilters.size === OUTREACH_LEAD_STAGE_OPTIONS.length || statusFilters.size === 0) && (
                                    <p className="text-sm text-muted-foreground">
                                      Start building your outreach list by <Button variant="link" className="p-0 h-auto" onClick={() => { setEditingProspect(undefined); setIsFormOpen(true);}}>adding your first prospect</Button>!
                                    </p>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <ScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        scriptContent={generatedScript}
        title={scriptModalTitle}
        onRegenerate={scriptModalConfig.onRegenerate || handleRegenerateScript}
        isLoadingInitially={isGeneratingScript && !generatedScript}
        isConfirming={isGeneratingScript}
        // Configurable props
        scriptTypeToSave={scriptModalConfig.scriptTypeToSave}
        prospectContextToSave={currentProspectForScript ? { prospectId: currentProspectForScript.id, prospectName: currentProspectForScript.name } : undefined}
        showSaveToSnippetsButton={scriptModalConfig.showSaveToSnippetsButton}
        showConfirmButton={scriptModalConfig.showConfirmButton}
        confirmButtonText={scriptModalConfig.confirmButtonText}
        onConfirm={scriptModalConfig.onConfirm}
      />
    </div>
    </Suspense>
  );
}

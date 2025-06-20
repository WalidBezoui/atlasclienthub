
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Send, PlusCircle, Edit, Trash2, Search, Filter, ChevronDown, AlertTriangle, BotMessageSquare, Loader2, Briefcase, Globe, Link as LinkIcon, Target, AlertCircle, MessageSquare, Info, Settings2, Sparkles, HelpCircle, BarChart3, RefreshCw, Palette, FileTextIcon } from 'lucide-react';
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
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { OutreachProspect, OutreachLeadStage, BusinessType, PainPoint, Goal, LeadSource, OfferInterest, TonePreference, ProspectLocation, AccountStage } from '@/lib/types';
import { OUTREACH_LEAD_STAGE_OPTIONS, BUSINESS_TYPES, PAIN_POINTS, GOALS, LEAD_SOURCES, OFFER_INTERESTS, TONE_PREFERENCES, PROSPECT_LOCATIONS, ACCOUNT_STAGES } from '@/lib/types';
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
import { generateContextualScript, type GenerateContextualScriptInput, type GenerateContextualScriptOutput } from '@/ai/flows/generate-contextual-script';
import { ScriptModal } from '@/components/scripts/script-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchInstagramMetrics } from '@/app/actions/fetch-ig-metrics';


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
};

function ProspectForm({ prospect, onSave, onCancel }: { prospect?: OutreachProspect, onSave: (prospectData: Omit<OutreachProspect, 'id' | 'userId'> | OutreachProspect) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<Omit<OutreachProspect, 'id' | 'userId'> | OutreachProspect>(initialFormData);
  const { toast } = useToast();
  const [isFetchingMetrics, setIsFetchingMetrics] = useState(false);

  useEffect(() => {
     if (prospect) {
        const formattedProspect = {
            ...initialFormData, 
            ...prospect,
            followerCount: prospect.followerCount === undefined || prospect.followerCount === null ? undefined : Number(prospect.followerCount),
            postCount: prospect.postCount === undefined || prospect.postCount === null ? undefined : Number(prospect.postCount),
            avgLikes: prospect.avgLikes === undefined || prospect.avgLikes === null ? undefined : Number(prospect.avgLikes),
            avgComments: prospect.avgComments === undefined || prospect.avgComments === null ? undefined : Number(prospect.avgComments),
            painPoints: prospect.painPoints || [],
            goals: prospect.goals || [],
            offerInterest: prospect.offerInterest || [],
            lastContacted: prospect.lastContacted ? new Date(prospect.lastContacted).toISOString().split('T')[0] : undefined,
            followUpDate: prospect.followUpDate ? new Date(prospect.followUpDate).toISOString().split('T')[0] : undefined,
            followUpNeeded: prospect.followUpNeeded || false,
            visualStyle: prospect.visualStyle || null, 
            bioSummary: prospect.bioSummary || null, 
        };
      setFormData(formattedProspect);
    } else {
      setFormData(initialFormData);
    }
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
      const result = await fetchInstagramMetrics(formData.instagramHandle);
      if (result.error) {
        toast({ title: "Metrics Fetch Failed", description: result.error, variant: "destructive", duration: 8000 });
      } else if (result.data) {
        setFormData(prev => ({
          ...prev,
          followerCount: result.data!.followerCount,
          postCount: result.data!.postCount,
          avgLikes: result.data!.avgLikes,
          avgComments: result.data!.avgComments,
           accountStage: result.data!.followerCount < 1000 ? "New (0–1k followers)" : result.data!.followerCount < 10000 ? "Growing (1k–10k followers)" : "Established (>10k followers)", // Example logic
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
    if (!formData.email?.trim() && !formData.instagramHandle?.trim()) {
        toast({ title: "Error", description: "Either Email or Instagram Handle is required.", variant: "destructive" });
        return;
    }
    onSave(formData);
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
                    <Input id="followerCount" name="followerCount" type="number" value={formData.followerCount === undefined || formData.followerCount === null ? '' : formData.followerCount} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="postCount">Post Count</Label>
                    <Input id="postCount" name="postCount" type="number" value={formData.postCount === undefined || formData.postCount === null ? '' : formData.postCount} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="avgLikes">Avg Likes (last 3 posts)</Label>
                    <Input id="avgLikes" name="avgLikes" type="number" step="0.1" value={formData.avgLikes === undefined || formData.avgLikes === null ? '' : formData.avgLikes} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="avgComments">Avg Comments (last 3 posts)</Label>
                    <Input id="avgComments" name="avgComments" type="number" step="0.1" value={formData.avgComments === undefined || formData.avgComments === null ? '' : formData.avgComments} onChange={handleChange} />
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
             <DialogTitle className="text-lg font-semibold flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary"/>Section 6: Lead Warmth & Status</DialogTitle>
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
            <div className="flex items-center space-x-2 mt-1">
                <Checkbox id="followUpNeeded" checked={!!formData.followUpNeeded} onCheckedChange={(checked) => handleSingleCheckboxChange('followUpNeeded', !!checked)} />
                <Label htmlFor="followUpNeeded" className="font-normal">Follow-Up Needed?</Label>
            </div>
        </CardContent>
      </Card>
      <Separator />
      
      <Card className="pt-4">
        <CardHeader className="py-2">
            <DialogTitle className="text-lg font-semibold flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary"/>Section 7: Offer Interest (If replied)</DialogTitle>
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
            <DialogTitle className="text-lg font-semibold flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Section 8: Smart Question Prompts (Optional)</DialogTitle>
            <CardFormDescription>These make the LLM outputs sharper.</CardFormDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <div>
                <Label htmlFor="uniqueNote">What’s unique or interesting about this brand? (1-2 sentences)</Label>
                <Textarea id="uniqueNote" name="uniqueNote" placeholder="e.g., They post skincare tips in Darija" value={formData.uniqueNote || ''} onChange={handleChange} rows={2}/>
            </div>
            <div>
                <Label htmlFor="helpStatement">If you had to help them in 1 sentence, what would it be?</Label>
                <Textarea id="helpStatement" name="helpStatement" placeholder="e.g., Their highlights and bio confuse visitors." value={formData.helpStatement || ''} onChange={handleChange} rows={2}/>
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
        </CardContent>
      </Card>

      <div className="pt-2">
        <Label htmlFor="notes">General Notes (Optional)</Label>
        <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} />
      </div>

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<OutreachProspect | undefined>(undefined);
  
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [scriptModalTitle, setScriptModalTitle] = useState("Generated Script");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [currentScriptGenerationInput, setCurrentScriptGenerationInput] = useState<GenerateContextualScriptInput | null>(null);
  const [currentProspectForScript, setCurrentProspectForScript] = useState<OutreachProspect | null>(null);
  
  const { toast } = useToast();

  const scriptMenuItems: Array<{label: string, type: GenerateContextualScriptInput['scriptType']}> = [
    { label: "Cold Outreach DM", type: "Cold Outreach DM" },
    { label: "Warm Follow-Up DM", type: "Warm Follow-Up DM" },
    { label: "Audit Delivery Message", type: "Audit Delivery Message" },
  ];

  const fetchProspects = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedProspects = await getProspects();
      setProspects(fetchedProspects);
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
        const dataToSave: Partial<OutreachProspect> & { userId?: string } = { ...initialFormData, ...prospectData };

        (Object.keys(dataToSave) as Array<keyof OutreachProspect>).forEach(key => {
            if (dataToSave[key] === '' && 
                key !== 'name' && 
                key !== 'email' && 
                key !== 'instagramHandle' && 
                key !== 'businessName' &&
                key !== 'website' &&
                key !== 'businessTypeOther' &&
                key !== 'uniqueNote' &&
                key !== 'helpStatement' &&
                key !== 'notes' &&
                key !== 'industry' &&
                key !== 'visualStyle' &&
                key !== 'bioSummary'
             ) {
                (dataToSave as any)[key] = null;
            }
             if (key === 'followerCount' || key === 'postCount' || key === 'avgLikes' || key === 'avgComments') {
                if (dataToSave[key] === '' || dataToSave[key] === null || isNaN(Number(dataToSave[key]))) {
                    (dataToSave as any)[key] = null;
                } else {
                    (dataToSave as any)[key] = Number(dataToSave[key]);
                }
            }
        });
        
        dataToSave.painPoints = dataToSave.painPoints || [];
        dataToSave.goals = dataToSave.goals || [];
        dataToSave.offerInterest = dataToSave.offerInterest || [];
        dataToSave.followUpNeeded = dataToSave.followUpNeeded || false;


        if ('id' in dataToSave && dataToSave.id) { 
            const { id, userId, ...updateData } = dataToSave as OutreachProspect;
            await updateProspect(id, updateData);
            toast({ title: "Success", description: `Prospect ${dataToSave.name} updated.` });
        } else { 
            await addProspect(dataToSave as Omit<OutreachProspect, 'id'|'userId'>);
            toast({ title: "Success", description: `Prospect ${dataToSave.name} added.` });
        }
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

  const handleGenerateProspectScript = async (prospect: OutreachProspect, scriptType: GenerateContextualScriptInput['scriptType']) => {
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    setGeneratedScript('');
    setScriptModalTitle(`Generating ${scriptType} for ${prospect.name || 'Prospect'}...`);
    setCurrentProspectForScript(prospect); 

    setClientContext({ 
        clientHandle: prospect.instagramHandle || undefined,
        clientName: prospect.name,
        clientIndustry: prospect.industry || prospect.businessType || "Not Specified",
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
        followerCount: prospect.followerCount === null ? undefined : prospect.followerCount,
        postCount: prospect.postCount === null ? undefined : prospect.postCount,
        avgLikes: prospect.avgLikes === null ? undefined : prospect.avgLikes,
        avgComments: prospect.avgComments === null ? undefined : prospect.avgComments,

        painPoints: prospect.painPoints || [],
        goals: prospect.goals || [],

        leadStatus: prospect.status,
        source: prospect.source || null,
        lastTouch: prospect.lastContacted ? `Last contacted on ${new Date(prospect.lastContacted).toLocaleDateString()}` : 'No prior contact recorded',
        followUpNeeded: prospect.followUpNeeded || false,
        
        offerInterest: prospect.offerInterest || [],
        uniqueNote: prospect.uniqueNote?.trim() || null,
        helpStatement: prospect.helpStatement?.trim() || null,
        tonePreference: prospect.tonePreference || null,
        additionalNotes: prospect.notes?.trim() || null,
    };
    setCurrentScriptGenerationInput(input);

    try {
        const result: GenerateContextualScriptOutput = await generateContextualScript(input);
        setGeneratedScript(result.script);
        setScriptModalTitle(`${scriptType} for ${prospect.name || 'Prospect'}`);
    } catch (error) {
        console.error("Error generating script for prospect:", error);
        toast({ title: "Script Generation Failed", description: (error as Error).message || "Could not generate script.", variant: "destructive" });
        setScriptModalTitle("Error Generating Script");
        setGeneratedScript("Failed to generate script. Please try again.");
    } finally {
        setIsGeneratingScript(false);
    }
  };
  
  const handleRegenerateProspectScript = async (): Promise<string | null> => {
    if (!currentScriptGenerationInput) {
        toast({ title: "Error", description: "No script context to regenerate.", variant: "destructive" });
        return null;
    }
    setIsGeneratingScript(true);
    setGeneratedScript('');
    try {
        const result = await generateContextualScript(currentScriptGenerationInput);
        setGeneratedScript(result.script);
        setIsGeneratingScript(false);
        return result.script;
    } catch (error) {
        console.error("Error regenerating script:", error);
        toast({ title: "Script Regeneration Failed", description: (error as Error).message || "Could not regenerate script.", variant: "destructive" });
        setGeneratedScript("Failed to regenerate script. Please try again.");
        setIsGeneratingScript(false);
        return null;
    }
  };

  const filteredProspects = prospects.filter(prospect => 
    (prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (prospect.email && prospect.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (prospect.businessName && prospect.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (prospect.industry && prospect.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (prospect.instagramHandle && prospect.instagramHandle.toLowerCase().includes(searchTerm.toLowerCase()))
    ) &&
    (statusFilters.size === OUTREACH_LEAD_STAGE_OPTIONS.length || statusFilters.has(prospect.status))
  );

  const getStatusBadgeVariant = (status: OutreachLeadStage): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Closed - Won':
      case 'Audit Sent':
      case 'Replied':
      case 'Interested': return 'default';
      case 'Warm': return 'secondary';
      case 'Cold':
      case 'Follow-up': 
      case 'To Contact': return 'outline'; 
      case 'Closed - Lost':
      case 'Not Interested': return 'destructive';
      default: return 'default';
    }
  };

  if (authLoading || (isLoading && !prospects.length && user)) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading outreach prospects..." size="lg"/></div>;
  }
  
  if (!user && !authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach Manager"
        description="Track and manage your cold outreach efforts with detailed prospect information."
        icon={Send}
        actions={
          <Button onClick={() => { setEditingProspect(undefined); setIsFormOpen(true); }}>
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
        <DialogContent className="sm:max-w-lg md:max-w-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="font-headline text-2xl">{editingProspect ? 'Edit Prospect Details' : 'Add New Prospect'}</DialogTitle>
            <DialogDescription> 
              {editingProspect ? 'Update the comprehensive details for this prospect.' : 'Fill in the form to add a new prospect with detailed information.'}
            </DialogDescription>
          </DialogHeader>
          <ProspectForm 
            prospect={editingProspect} 
            onSave={handleSaveProspect} 
            onCancel={() => { setIsFormOpen(false); setEditingProspect(undefined);}} 
          />
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
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">IG Handle</TableHead>
                    <TableHead className="hidden sm:table-cell">Business Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Source</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Contacted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProspects.length > 0 ? filteredProspects.map((prospect) => (
                      <TableRow key={prospect.id}>
                        <TableCell className="font-medium">{prospect.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{prospect.instagramHandle || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{prospect.businessType === "Other" && prospect.businessTypeOther ? prospect.businessTypeOther : prospect.businessType || '-'}</TableCell>
                        <TableCell>
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
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{prospect.source || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {prospect.lastContacted ? new Date(prospect.lastContacted).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right space-x-0.5">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Generate script for ${prospect.name}`}>
                                  <BotMessageSquare className="h-4 w-4" />
                                  <span className="sr-only">Scripts</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {scriptMenuItems.map(item => (
                                    <DropdownMenuItem
                                        key={item.type}
                                        onClick={() => handleGenerateProspectScript(prospect, item.type)}
                                        disabled={isGeneratingScript && currentScriptGenerationInput?.clientName === prospect.name && currentScriptGenerationInput?.scriptType === item.type}
                                    >
                                      {item.label}
                                      {isGeneratingScript && currentScriptGenerationInput?.clientName === prospect.name && currentScriptGenerationInput?.scriptType === item.type && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                           <Button variant="ghost" size="icon" onClick={() => { setEditingProspect(prospect); setIsFormOpen(true); }} aria-label={`Edit prospect ${prospect.name}`}>
                            <Edit className="h-4 w-4" />
                             <span className="sr-only">Edit Prospect</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteProspect(prospect.id, prospect.name)} className="text-destructive hover:text-destructive" aria-label={`Delete prospect ${prospect.name}`}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Prospect</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                       <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
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
        onClose={() => {
          setIsScriptModalOpen(false);
          setCurrentProspectForScript(null); 
        }}
        scriptContent={generatedScript}
        title={scriptModalTitle}
        onRegenerate={handleRegenerateProspectScript}
        isLoadingInitially={isGeneratingScript && !generatedScript}
        scriptTypeToSave={currentScriptGenerationInput?.scriptType}
        prospectContextToSave={
            currentProspectForScript 
            ? { prospectId: currentProspectForScript.id, prospectName: currentProspectForScript.name } 
            : undefined
        }
      />
    </div>
  );
}


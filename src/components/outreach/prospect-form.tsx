
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
import { useToast } from '@/hooks/use-toast';
import { fetchInstagramMetrics } from '@/app/actions/fetch-ig-metrics';
import type { OutreachProspect, OutreachLeadStage, BusinessType, PainPoint, Goal, LeadSource, OfferInterest, TonePreference, ProspectLocation, AccountStage, WarmUpActivity, WarmUpAction } from '@/lib/types';
import { OUTREACH_LEAD_STAGE_OPTIONS, BUSINESS_TYPES, PAIN_POINTS, GOALS, LEAD_SOURCES, OFFER_INTERESTS, TONE_PREFERENCES, PROSPECT_LOCATIONS, ACCOUNT_STAGES } from '@/lib/types';
import { RefreshCw, Loader2, Info, Briefcase, BarChart3, AlertCircle, Target, MessageSquare, Settings2, FileQuestion, Star, Flame, Eye, Heart, MessageCircle as MessageCircleIcon } from 'lucide-react';
import { Badge } from '../ui/badge';
import { qualifyProspect, type QualifyProspectInput } from '@/ai/flows/qualify-prospect';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';

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
    createdAt: new Date().toISOString(),
    warmUp: [],
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

const WarmUpTracker = ({ prospect, onLogActivity, onGenerateComment, onViewConversation }: { prospect: Partial<OutreachProspect>, onLogActivity: (action: WarmUpAction) => void, onGenerateComment: () => void, onViewConversation: () => void }) => {
    const activities = prospect.warmUp || [];
    const isDisabled = prospect.status !== 'Warming Up';
    const hasLiked = activities.some(a => a.action === 'Liked Posts');
    const hasViewedStory = activities.some(a => a.action === 'Viewed Story');
    const hasCommented = activities.some(a => a.action === 'Left Comment');
    const hasReplied = activities.some(a => a.action === 'Replied to Story');

    const progress = (hasLiked + hasViewedStory + hasCommented + hasReplied) * 25;
    
    const actionButtons = [
        { name: "Like Posts", icon: Heart, action: () => onLogActivity('Liked Posts'), complete: hasLiked, tip: "Like 3-5 of their recent posts." },
        { name: "View Story", icon: Eye, action: () => onLogActivity('Viewed Story'), complete: hasViewedStory, tip: "View their story to show up in their viewers list." },
        { name: "Leave Comment", icon: MessageCircleIcon, action: onGenerateComment, complete: hasCommented, tip: "Generate and leave a thoughtful comment."},
        { name: "Reply to Story", icon: MessageSquare, action: onViewConversation, complete: hasReplied, tip: "Reply to one of their stories to start a DM." },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Flame className="mr-2 text-destructive"/>Warm-Up Progress</CardTitle>
                <CardDescription>
                    {isDisabled 
                        ? 'Enable "Warming Up" status to log activities.'
                        : 'Follow these steps to warm up the lead before direct outreach.'
                    }
                </CardDescription>
                <Progress value={progress} className="mt-2" />
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4 flex-wrap">
                    {actionButtons.map(btn => (
                        <TooltipProvider key={btn.name}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <Button variant={btn.complete ? "default" : "outline"} size="sm" onClick={btn.action} disabled={isDisabled}>
                                        <btn.icon className="mr-2 h-4 w-4" /> {btn.name}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{btn.complete ? 'Completed!' : btn.tip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
                <h4 className="font-semibold text-sm mb-2">Activity Log</h4>
                <ScrollArea className="h-24">
                     <div className="space-y-2 text-xs">
                        {activities.length > 0 ? (
                             activities.slice().reverse().map((activity, index) => (
                                <div key={index} className="flex justify-between items-center p-1.5 bg-muted/50 rounded-md">
                                    <p className="font-medium">{activity.action}</p>
                                    <p className="text-muted-foreground">{format(new Date(activity.date), "MMM d, yyyy")}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center pt-4">No warm-up activities logged yet.</p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};


export function ProspectForm({ prospect, onSave, onCancel, onGenerateComment, onViewConversation }: { prospect?: OutreachProspect, onSave: (prospectData: Omit<OutreachProspect, 'id' | 'userId'> | OutreachProspect) => void, onCancel: () => void, onGenerateComment: (prospect: OutreachProspect) => void, onViewConversation: (prospect: OutreachProspect) => void }) {
  const { toast } = useToast();
  const [isFetchingMetrics, setIsFetchingMetrics] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);
  
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

  const handleFetchAndQualify = async () => {
    if (!formData.instagramHandle) {
        toast({ title: "Missing Handle", description: "Please enter an Instagram handle to fetch metrics.", variant: "destructive" });
        return;
    }
    setIsFetchingMetrics(true);
    setIsQualifying(true);
    try {
        const metricsResult = await fetchInstagramMetrics(formData.instagramHandle.trim());
        if (metricsResult.error || !metricsResult.data) {
            toast({ title: "Metrics Fetch Failed", description: metricsResult.error || "The profile may be private or invalid.", variant: "destructive", duration: 8000 });
            setIsFetchingMetrics(false);
            setIsQualifying(false);
            return;
        }
        
        toast({ title: "Metrics Fetched!", description: "Now running AI qualification..." });
        
        const qualifyResult = await qualifyProspect({
            instagramHandle: formData.instagramHandle,
            followerCount: metricsResult.data.followerCount,
            postCount: metricsResult.data.postCount,
            avgLikes: metricsResult.data.avgLikes,
            avgComments: metricsResult.data.avgComments,
            biography: metricsResult.data.biography,
            userProfitabilityAssessment: ["Selling physical or digital products (e-commerce, courses)"],
            userVisualsAssessment: ["Clean but Generic (Looks like a template, lacks personality)"],
            userCtaAssessment: ['Strong, direct link to a sales page, booking site, or freebie'],
            industry: formData.industry || 'unknown',
            userStrategicGapAssessment: ["Visuals / Branding (inconsistent grid, bad photos, messy look)"],
        });

        if (qualifyResult) {
            setFormData(prev => ({
                ...prev,
                followerCount: metricsResult.data?.followerCount ?? prev.followerCount,
                postCount: metricsResult.data?.postCount ?? prev.postCount,
                avgLikes: metricsResult.data?.avgLikes ?? prev.avgLikes,
                avgComments: metricsResult.data?.avgComments ?? prev.avgComments,
                bioSummary: metricsResult.data?.biography ?? prev.bioSummary,
                leadScore: qualifyResult.leadScore,
                qualificationData: qualifyResult.qualificationData,
                painPoints: qualifyResult.painPoints,
                goals: qualifyResult.goals,
                helpStatement: qualifyResult.summary,
            }));
            toast({ title: "Prospect Re-qualified!", description: `Data for @${formData.instagramHandle} has been fetched and analyzed.` });
        }
    } catch (error: any) {
        toast({ title: "Error During Process", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsFetchingMetrics(false);
        setIsQualifying(false);
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
  
  const handleLogWarmUpActivity = (action: WarmUpAction) => {
    setFormData(prev => {
        const newActivity: WarmUpActivity = { action, date: new Date().toISOString() };
        const updatedWarmUp = [...(prev.warmUp || []), newActivity];
        return { ...prev, warmUp: updatedWarmUp };
    });
    toast({ title: 'Activity Logged', description: `${action} has been recorded.` });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
      
      <DialogHeader className="shrink-0">
        <DialogTitle className="font-headline text-2xl">{prospect ? 'Edit Prospect Details' : 'Add New Prospect'}</DialogTitle>
        <DialogDescription> 
          {prospect ? 'Update the comprehensive details for this prospect.' : 'Fill in the form to add a new prospect with detailed information.'}
        </DialogDescription>
      </DialogHeader>
      
        <ScrollArea className="flex-grow pr-4 -mr-4 py-4">
            <div className="space-y-4">
                <WarmUpTracker 
                    prospect={formData} 
                    onLogActivity={handleLogWarmUpActivity}
                    onGenerateComment={() => onGenerateComment(formData as OutreachProspect)}
                    onViewConversation={() => onViewConversation(formData as OutreachProspect)}
                />
                <Accordion type="multiple" defaultValue={['basic-info', 'lead-status']} className="w-full space-y-2">
                    <AccordionItem value="basic-info">
                      <AccordionTrigger><h4 className="font-semibold text-base flex items-center"><Info className="mr-2 h-5 w-5 text-primary"/>Basic Info</h4></AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="name">Prospect Name *</Label>
                              <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
                            </div>
                            <div>
                              <Label htmlFor="instagramHandle">IG Handle</Label>
                              <Input id="instagramHandle" name="instagramHandle" placeholder="@username" value={formData.instagramHandle || ''} onChange={handleChange} />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input id="businessName" name="businessName" value={formData.businessName || ''} onChange={handleChange} />
                          </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="website">Website</Label>
                              <Input id="website" name="website" type="url" placeholder="https://example.com" value={formData.website || ''} onChange={handleChange} />
                            </div>
                             <div>
                              <Label htmlFor="email">Email</Label>
                              <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="prospectLocation">Prospect Location</Label>
                              <Select value={formData.prospectLocation || undefined} onValueChange={(value: ProspectLocation) => handleSelectChange('prospectLocation', value)}>
                                <SelectTrigger id="prospectLocation"><SelectValue placeholder="Select location" /></SelectTrigger>
                                <SelectContent>{PROSPECT_LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="industry">Industry</Label>
                              <Input id="industry" name="industry" placeholder="e.g., Fashion, SaaS" value={formData.industry || ''} onChange={handleChange} />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="visualStyle">Visual Style Notes</Label>
                            <Input id="visualStyle" name="visualStyle" placeholder="e.g., Luxe, clean, messy..." value={formData.visualStyle || ''} onChange={handleChange} />
                          </div>
                          <div>
                            <Label htmlFor="bioSummary">Bio Summary</Label>
                            <Textarea id="bioSummary" name="bioSummary" placeholder="Summary of their Instagram bio" value={formData.bioSummary || ''} onChange={handleChange} rows={3}/>
                          </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="business-profile">
                       <AccordionTrigger><h4 className="font-semibold text-base flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary"/>Business Profile</h4></AccordionTrigger>
                       <AccordionContent className="pt-2">
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
                       </AccordionContent>
                    </AccordionItem>
        
                    <AccordionItem value="metrics">
                      <AccordionTrigger><h4 className="font-semibold text-base flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary"/>Metrics & Qualification</h4></AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <Button type="button" variant="outline" onClick={handleFetchAndQualify} disabled={isFetchingMetrics || isQualifying || !formData.instagramHandle}>
                            {isFetchingMetrics || isQualifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            {isFetchingMetrics ? 'Fetching...' : isQualifying ? 'Re-qualifying...' : 'Fetch & Re-qualify'}
                        </Button>
                        {formData.leadScore !== null && formData.leadScore !== undefined && (
                          <div className="p-3 bg-muted/50 rounded-md">
                            <Label>Lead Score</Label>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-base">{formData.leadScore}</Badge>
                              <p className="text-xs text-muted-foreground">This score was automatically calculated.</p>
                            </div>
                          </div>
                        )}
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
                                <Label htmlFor="avgLikes">Avg Likes</Label>
                                <Input id="avgLikes" name="avgLikes" type="number" step="0.1" value={formData.avgLikes ?? ''} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="avgComments">Avg Comments</Label>
                                <Input id="avgComments" name="avgComments" type="number" step="0.1" value={formData.avgComments ?? ''} onChange={handleChange} />
                            </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
        
                    <AccordionItem value="pains-goals">
                       <AccordionTrigger><h4 className="font-semibold text-base flex items-center"><AlertCircle className="mr-2 h-5 w-5 text-primary"/>Pain Points & Goals</h4></AccordionTrigger>
                       <AccordionContent className="space-y-4 pt-2">
                          <div>
                            <Label>Current Problems / Pain Points</Label>
                            <div className="p-3 border rounded-md mt-1 space-y-2 columns-1 sm:columns-2">
                                {PAIN_POINTS.map(point => (
                                    <div key={point} className="flex items-center space-x-2 break-inside-avoid-column">
                                        <Checkbox id={`pain-${point.replace(/\s*\/\s*|\s+/g, '-')}`} checked={(formData.painPoints || []).includes(point)} onCheckedChange={() => handleCheckboxFieldChange('painPoints', point)} />
                                        <Label htmlFor={`pain-${point.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{point}</Label>
                                    </div>
                                ))}
                            </div>
                          </div>
                           <div>
                            <Label>Goals They Might Want</Label>
                            <div className="p-3 border rounded-md mt-1 space-y-2 columns-1 sm:columns-2">
                                {GOALS.map(goal => (
                                    <div key={goal} className="flex items-center space-x-2 break-inside-avoid-column">
                                        <Checkbox id={`goal-${goal.replace(/\s*\/\s*|\s+/g, '-')}`} checked={(formData.goals || []).includes(goal)} onCheckedChange={() => handleCheckboxFieldChange('goals', goal)} />
                                        <Label htmlFor={`goal-${goal.replace(/\s*\/\s*|\s+/g, '-')}`} className="font-normal">{goal}</Label>
                                    </div>
                                ))}
                            </div>
                          </div>
                       </AccordionContent>
                    </AccordionItem>
        
                    <AccordionItem value="lead-status">
                       <AccordionTrigger><h4 className="font-semibold text-base flex items-center"><Star className="mr-2 h-5 w-5 text-primary"/>Lead & Interaction Status</h4></AccordionTrigger>
                       <AccordionContent className="space-y-3 pt-2">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><Label htmlFor="lastContacted">Last Contacted</Label><Input id="lastContacted" name="lastContacted" type="date" value={formData.lastContacted || ''} onChange={handleChange} /></div>
                            <div><Label htmlFor="followUpDate">Follow-up Date</Label><Input id="followUpDate" name="followUpDate" type="date" value={formData.followUpDate || ''} onChange={handleChange} /></div>
                        </div>
                        <div>
                            <Label htmlFor="lastMessageSnippet">Last Message from Prospect</Label>
                            <Textarea id="lastMessageSnippet" name="lastMessageSnippet" placeholder="e.g., 'Thanks, I'll check it out'" value={formData.lastMessageSnippet || ''} onChange={handleChange} rows={2}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                          <div className="flex items-center space-x-2"><Checkbox id="followUpNeeded" checked={!!formData.followUpNeeded} onCheckedChange={(checked) => handleSingleCheckboxChange('followUpNeeded', !!checked)} /><Label htmlFor="followUpNeeded" className="font-normal">Follow-Up?</Label></div>
                          <div className="flex items-center space-x-2"><Checkbox id="linkSent" checked={!!formData.linkSent} onCheckedChange={(checked) => handleSingleCheckboxChange('linkSent', !!checked)} /><Label htmlFor="linkSent" className="font-normal">Link Sent?</Label></div>
                          <div className="flex items-center space-x-2"><Checkbox id="carouselOffered" checked={!!formData.carouselOffered} onCheckedChange={(checked) => handleSingleCheckboxChange('carouselOffered', !!checked)} /><Label htmlFor="carouselOffered" className="font-normal">Carousel Offered?</Label></div>
                        </div>
                       </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="prompts-notes">
                       <AccordionTrigger><h4 className="font-semibold text-base flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary"/>Smart Prompts & Notes</h4></AccordionTrigger>
                       <AccordionContent className="space-y-3 pt-2">
                         <div>
                              <Label htmlFor="uniqueNote">Unique observation about this brand? (1-2 sentences)</Label>
                              <Textarea id="uniqueNote" name="uniqueNote" placeholder="e.g., They post skincare tips in Darija" value={formData.uniqueNote || ''} onChange={handleChange} rows={2}/>
                          </div>
                          <div>
                              <Label htmlFor="helpStatement">Help statement (AI-generated summary)</Label>
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
                            <Label htmlFor="notes">General Notes</Label>
                            <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} />
                          </div>
                       </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
      </ScrollArea>


      <DialogFooter className="border-t pt-4 shrink-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{prospect ? 'Update Prospect' : 'Add Prospect'}</Button>
      </DialogFooter>
    </form>
  );
}

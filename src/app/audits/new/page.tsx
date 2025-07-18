
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrainCircuit, Lightbulb, Loader2, FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { generateIgAudit } from '@/ai/flows/generate-ig-audit';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { InstagramAudit, AuditStatus } from '@/lib/types';
import { AUDIT_STATUS_OPTIONS } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useAuth } from '@/hooks/useAuth';
import { addAudit } from '@/lib/firebase/services';

const initialFormState = {
  instagramHandle: '',
  entityName: '',
  entityType: undefined as 'Client' | 'Prospect' | undefined,
  questionnaireResponses: '',
  auditReport: undefined as string | undefined,
  auditStatus: 'Requested' as AuditStatus,
};

export default function NewAuditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [instagramHandle, setInstagramHandle] = useState(initialFormState.instagramHandle);
  const [entityName, setEntityName] = useState(initialFormState.entityName);
  const [entityType, setEntityType] = useState(initialFormState.entityType);
  const [questionnaireResponses, setQuestionnaireResponses] = useState(initialFormState.questionnaireResponses);
  const [isGenerating, setIsGenerating] = useState(false);
  const [auditReport, setAuditReport] = useState(initialFormState.auditReport);
  const [isSaving, setIsSaving] = useState(false);
  const [auditStatus, setAuditStatus] = useState<AuditStatus>(initialFormState.auditStatus);
  
  const { toast } = useToast();

  useEffect(() => {
    const handle = searchParams.get('handle');
    const name = searchParams.get('name');
    const questionnaire = searchParams.get('q');
    
    if (handle) setInstagramHandle(handle);
    if (name) setEntityName(name);
    if (handle || name) {
        setEntityType('Prospect');
    }
    if (questionnaire) {
        setQuestionnaireResponses(decodeURIComponent(questionnaire));
    } else if (handle || name) {
        // Fallback questionnaire if 'q' param is missing
        setQuestionnaireResponses(
            `Analyzing profile for ${name || ''} (@${handle || ''}).\n` +
            `Key areas to focus on: `
        );
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      // AuthProvider should handle redirect
    }
  }, [user, authLoading, router]);

  const clearForm = () => {
    setInstagramHandle(initialFormState.instagramHandle);
    setEntityName(initialFormState.entityName);
    setEntityType(initialFormState.entityType);
    setQuestionnaireResponses(initialFormState.questionnaireResponses);
    setAuditReport(initialFormState.auditReport);
    setAuditStatus(initialFormState.auditStatus);
    setIsGenerating(false);
    setIsSaving(false);
    router.replace('/audits/new', undefined); // Clear URL params
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagramHandle.trim() || !questionnaireResponses.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both Instagram handle and questionnaire responses.',
        variant: 'destructive',
      });
      return;
    }
    setIsGenerating(true);
    setAuditReport(undefined); 
    try {
      const result = await generateIgAudit({ questionnaireResponses });
      setAuditReport(result.auditReport);
      toast({
        title: 'Audit Generated!',
        description: 'Review the report below and save it.',
      });
    } catch (error) {
      console.error('Error generating audit:', error);
      toast({
        title: 'Error Generating Audit',
        description: (error as Error).message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAudit = async () => {
    if (!user) {
        toast({title: "Authentication Error", description: "You must be logged in to save an audit.", variant: "destructive"});
        return;
    }
    if (!auditReport || !instagramHandle) {
      toast({ title: "Cannot Save", description: "No audit report generated or Instagram handle missing.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const newAuditData: Omit<InstagramAudit, 'id' | 'userId'> = {
      instagramHandle,
      entityName: entityName || undefined,
      entityType: entityType || undefined,
      questionnaireResponses,
      auditReport,
      status: auditStatus,
      requestedDate: new Date().toISOString(),
      entityId: searchParams.get('entityId') || undefined,
      completedDate: auditStatus === 'Completed' ? new Date().toISOString() : undefined,
    };

    try {
      await addAudit(newAuditData);
      toast({ title: "Audit Saved!", description: `Audit for ${instagramHandle} has been saved.`});
      router.push('/audits'); 
    } catch (error: any) {
      console.error("Failed to save audit:", error);
      toast({ title: "Save Failed", description: error.message || "Could not save the audit. Please try again.", variant: "destructive"});
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading..." size="lg"/></div>;
  }
   if (!user && !authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="New Instagram Audit"
        description="Generate an AI-powered audit for an Instagram profile."
        icon={BrainCircuit}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Audit Input</CardTitle>
            <CardDescription>
              Provide the Instagram handle and key information to generate the audit.
              The more detailed your responses, the better the audit will be.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="instagramHandle">Instagram Handle *</Label>
                    <Input
                        id="instagramHandle"
                        placeholder="@username"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value)}
                        required
                    />
                </div>
                 <div>
                    <Label htmlFor="entityName">Client/Prospect Name (Optional)</Label>
                    <Input
                        id="entityName"
                        placeholder="e.g., Cool Brand Inc."
                        value={entityName}
                        onChange={(e) => setEntityName(e.target.value)}
                    />
                </div>
                <div>
                    <Label htmlFor="entityType">Entity Type (Optional)</Label>
                    <Select value={entityType} onValueChange={(value: 'Client' | 'Prospect') => setEntityType(value)}>
                        <SelectTrigger id="entityType">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Client">Client</SelectItem>
                            <SelectItem value="Prospect">Prospect</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div>
              <Label htmlFor="questionnaireResponses">Questionnaire / Key Information *</Label>
              <Textarea
                id="questionnaireResponses"
                placeholder="Describe the account's goals, target audience, current challenges, content pillars, competitors, etc."
                rows={12}
                value={questionnaireResponses}
                onChange={(e) => setQuestionnaireResponses(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                If started from the Outreach page, this is pre-filled with prospect data. You can edit or add more context here.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isGenerating || !instagramHandle || !questionnaireResponses}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" /> Generate Audit
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {isGenerating && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Generating Report...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-12">
            <LoadingSpinner text="Our AI is hard at work analyzing the profile..." />
          </CardContent>
        </Card>
      )}

      {auditReport && !isGenerating && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <FileText className="mr-2 h-6 w-6 text-primary" />
              Generated Audit Report for {instagramHandle}
            </CardTitle>
            <CardDescription>Review the report below. You can edit it before saving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="auditReport">Report Content</Label>
            <Textarea 
              id="auditReport"
              value={auditReport} 
              onChange={(e) => setAuditReport(e.target.value)} 
              rows={20}
              className="text-sm p-4 bg-muted/30 rounded-md border"
              aria-label="Generated Audit Report"
            />
             <div>
                <Label htmlFor="auditStatus">Set Initial Status</Label>
                <Select value={auditStatus} onValueChange={(value: AuditStatus) => setAuditStatus(value)}>
                  <SelectTrigger id="auditStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={clearForm}>
              Clear & Start New
            </Button>
            <Button onClick={handleSaveAudit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Audit</>}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { BrainCircuit, Lightbulb, Loader2, Send, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { generateIgAudit } from '@/ai/flows/generate-ig-audit';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // For redirecting after save
import { InstagramAudit, AUDIT_STATUS_OPTIONS, AuditStatus } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// This component would ideally be part of a shared library or context for managing audits
// For simplicity, we'll just simulate saving it here.
async function saveAuditToBackend(auditData: InstagramAudit): Promise<InstagramAudit> {
  console.log("Saving audit (simulated):", auditData);
  // In a real app, this would be an API call.
  // For now, we'll just return the data with a slight delay.
  return new Promise(resolve => setTimeout(() => resolve(auditData), 500));
}


export default function NewAuditPage() {
  const [instagramHandle, setInstagramHandle] = useState('');
  const [questionnaireResponses, setQuestionnaireResponses] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [auditStatus, setAuditStatus] = useState<AuditStatus>('Requested');

  const { toast } = useToast();
  const router = useRouter();

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

    setIsLoading(true);
    setAuditReport(undefined); // Clear previous report

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
      setIsLoading(false);
    }
  };

  const handleSaveAudit = async () => {
    if (!auditReport || !instagramHandle) {
      toast({ title: "Cannot Save", description: "No audit report generated or Instagram handle missing.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const newAudit: InstagramAudit = {
      id: Date.now().toString(), // simple ID generation
      instagramHandle,
      questionnaireResponses,
      auditReport,
      status: auditStatus, // Default status, can be updated later
      requestedDate: new Date().toISOString(),
      // entityId, entityName, entityType would be set if linking to client/prospect
    };

    try {
      await saveAuditToBackend(newAudit); // Simulate saving
      toast({ title: "Audit Saved!", description: `Audit for ${instagramHandle} has been saved.`});
      // Optionally, redirect to the audits list or the new audit's detail page
      router.push('/audits'); 
    } catch (error) {
      console.error("Failed to save audit:", error);
      toast({ title: "Save Failed", description: "Could not save the audit. Please try again.", variant: "destructive"});
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Instagram Audit"
        description="Generate an AI-powered audit for an Instagram profile."
        icon={BrainCircuit}
      />

      <form onSubmit={handleSubmit}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Audit Input</CardTitle>
            <CardDescription>
              Provide the Instagram handle and fill out the questionnaire to generate the audit.
              The more detailed your responses, the better the audit will be.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="instagramHandle">Instagram Handle</Label>
              <Input
                id="instagramHandle"
                placeholder="@username"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="questionnaireResponses">Questionnaire / Key Information</Label>
              <Textarea
                id="questionnaireResponses"
                placeholder="Describe the account's goals, target audience, current challenges, content pillars, competitors, etc."
                rows={8}
                value={questionnaireResponses}
                onChange={(e) => setQuestionnaireResponses(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Example prompts: "Analyze bio effectiveness", "Suggest content pillars for a local coffee shop", "Identify 3 key competitors and their strengths".
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !instagramHandle || !questionnaireResponses}>
              {isLoading ? (
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

      {isLoading && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Generating Report...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-12">
            <LoadingSpinner text="Our AI is hard at work analyzing the profile..." />
          </CardContent>
        </Card>
      )}

      {auditReport && !isLoading && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <FileText className="mr-2 h-6 w-6 text-primary" />
              Generated Audit Report for {instagramHandle}
            </CardTitle>
            <CardDescription>Review the report below. You can edit it before saving if needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* For production, consider a rich text editor or markdown renderer */}
            <Textarea 
              value={auditReport} 
              onChange={(e) => setAuditReport(e.target.value)} 
              rows={20}
              className="font-mono text-sm p-4 bg-muted/30 rounded-md border"
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
            <Button variant="outline" onClick={() => {setAuditReport(undefined); setInstagramHandle(''); setQuestionnaireResponses('');}}>
              Clear & Start New
            </Button>
            <Button onClick={handleSaveAudit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Audit"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

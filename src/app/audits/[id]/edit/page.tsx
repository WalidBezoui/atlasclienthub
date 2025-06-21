
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BrainCircuit, Lightbulb, Loader2, FileText, Save, AlertTriangle, ArrowLeft, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { generateIgAudit } from '@/ai/flows/generate-ig-audit';
import { useToast } from '@/hooks/use-toast';
import type { InstagramAudit, AuditStatus } from '@/lib/types';
import { AUDIT_STATUS_OPTIONS } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useAuth } from '@/hooks/useAuth';
import { getAuditById, updateAudit } from '@/lib/firebase/services';

export default function EditAuditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [originalAudit, setOriginalAudit] = useState<InstagramAudit | null>(null);
  const [instagramHandle, setInstagramHandle] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState<'Client' | 'Prospect' | undefined>(undefined);
  const [questionnaireResponses, setQuestionnaireResponses] = useState('');
  const [auditReport, setAuditReport] = useState<string | undefined>(undefined);
  const [auditStatus, setAuditStatus] = useState<AuditStatus>('Requested');
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { toast } = useToast();

  const fetchAuditDetails = useCallback(async (auditId: string) => {
    if (!user) return;
    setIsLoadingPage(true);
    try {
      const data = await getAuditById(auditId);
      if (data) {
        setOriginalAudit(data);
        setInstagramHandle(data.instagramHandle);
        setEntityName(data.entityName || '');
        setEntityType(data.entityType);
        setQuestionnaireResponses(data.questionnaireResponses);
        setAuditReport(data.auditReport);
        setAuditStatus(data.status);
      } else {
        toast({ title: "Not Found", description: "Audit not found or you don't have access.", variant: "destructive" });
        router.push('/audits');
      }
    } catch (error) {
      console.error("Error fetching audit for editing:", error);
      toast({ title: "Error", description: "Failed to fetch audit details for editing.", variant: "destructive" });
      router.push('/audits');
    } finally {
      setIsLoadingPage(false);
    }
  }, [user, toast, router]);

  useEffect(() => {
    if (!authLoading) {
      if (user && id) {
        fetchAuditDetails(id);
      } else if (!user) {
        router.push('/login');
      } else if (!id) {
        toast({ title: "Error", description: "No audit ID provided.", variant: "destructive" });
        router.push('/audits');
      }
    }
  }, [id, user, authLoading, fetchAuditDetails, router, toast]);

  const handleGenerateReport = async () => {
    if (!questionnaireResponses.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide questionnaire responses to generate a report.',
        variant: 'destructive',
      });
      return;
    }
    setIsGeneratingReport(true);
    try {
      const result = await generateIgAudit({ questionnaireResponses });
      setAuditReport(result.auditReport);
      toast({
        title: 'Report Re-generated!',
        description: 'Review the updated report below.',
      });
    } catch (error) {
      console.error('Error re-generating audit report:', error);
      toast({
        title: 'Error Re-generating Report',
        description: (error as Error).message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleUpdateAudit = async () => {
    if (!user || !originalAudit) {
        toast({title: "Error", description: "Cannot update audit. User or original audit data missing.", variant: "destructive"});
        return;
    }
    if (!instagramHandle.trim()) {
      toast({ title: "Missing Handle", description: "Instagram handle is required.", variant: "destructive" });
      return;
    }

    setIsUpdating(true);
    const updatedAuditData: Partial<Omit<InstagramAudit, 'id' | 'userId'>> = {
      instagramHandle,
      entityName: entityName || undefined,
      entityType: entityType || undefined,
      questionnaireResponses,
      auditReport: auditReport || undefined,
      status: auditStatus,
    };
    
    if (auditStatus === 'Completed' && originalAudit.status !== 'Completed') {
      updatedAuditData.completedDate = new Date().toISOString();
    } else if (auditStatus !== 'Completed' && originalAudit.completedDate) {
      // If status changed from Completed, clear completedDate.
      if (!updatedAuditData.hasOwnProperty('completedDate')) {
           (updatedAuditData as any).completedDate = null; // Explicitly set to null to be handled by service
       }
    }


    try {
      await updateAudit(originalAudit.id, updatedAuditData);
      toast({ title: "Audit Updated!", description: `Audit for ${instagramHandle} has been successfully updated.`});
      router.push(`/audits/${originalAudit.id}`); 
    } catch (error: any) {
      console.error("Failed to update audit:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update the audit. Please try again.", variant: "destructive"});
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || isLoadingPage) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading audit for editing..." size="lg"/></div>;
  }
   if (!user && !authLoading) {
    // This should be handled by AuthProvider but as a fallback:
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }
  if (!originalAudit && !isLoadingPage) {
     return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Audit Not Found</h2>
        <p className="text-muted-foreground">The audit you are trying to edit could not be found or you do not have permission.</p>
        <Button onClick={() => router.push('/audits')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Audits
        </Button>
      </div>
    );
  }

  const hasReport = auditReport !== undefined && auditReport !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Audit: ${originalAudit?.instagramHandle || 'Loading...'}`}
        description="Modify the details and report for this Instagram audit."
        icon={Edit}
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Audit Details</CardTitle>
          <CardDescription>
            Update the information below. You can re-generate the AI report if questionnaire details change.
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
              placeholder="Describe the account's goals, target audience, current challenges, etc."
              rows={12}
              value={questionnaireResponses}
              onChange={(e) => setQuestionnaireResponses(e.target.value)}
              required
            />
          </div>
          <Button onClick={handleGenerateReport} disabled={isGeneratingReport || !questionnaireResponses} variant="outline">
            {isGeneratingReport ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Re-generating...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-4 w-4" /> Re-generate Audit Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

    <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            Audit Report & Status
            </CardTitle>
            <CardDescription>
                {hasReport ? "Review and edit the report content below." : "No report generated yet. You can generate one using the questionnaire data above."}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {isGeneratingReport && !hasReport && (
                <div className="flex justify-center items-center py-12">
                    <LoadingSpinner text="Our AI is hard at work analyzing the profile..." />
                </div>
            )}
            {hasReport && (
                 <Textarea 
                    value={auditReport} 
                    onChange={(e) => setAuditReport(e.target.value)} 
                    rows={20}
                    className="text-sm p-4 bg-muted/30 rounded-md border"
                    aria-label="Editable Audit Report"
                />
            )}
            <div>
                <Label htmlFor="auditStatus">Audit Status</Label>
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
            <Button variant="outline" onClick={() => router.push(id ? `/audits/${id}` : '/audits')} disabled={isUpdating}>
            Cancel
            </Button>
            <Button onClick={handleUpdateAudit} disabled={isUpdating || isGeneratingReport}>
            {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : <><Save className="mr-2 h-4 w-4" /> Update Audit</>}
            </Button>
        </CardFooter>
    </Card>
    </div>
  );
}

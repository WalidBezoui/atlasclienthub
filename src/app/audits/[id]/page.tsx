
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Edit, Share2, Download, FileText, Tag, CalendarDays, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import type { InstagramAudit, AuditStatus } from '@/lib/types';
import { AUDIT_STATUS_OPTIONS } from '@/lib/types';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getAuditById, updateAudit } from '@/lib/firebase/services';


export default function AuditDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  
  const [audit, setAudit] = useState<InstagramAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<AuditStatus | undefined>(undefined);
  const { toast } = useToast();

  const fetchAudit = useCallback(async (auditId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getAuditById(auditId);
      if (data) {
        setAudit(data);
        setCurrentStatus(data.status);
      } else {
        toast({ title: "Not Found", description: "Audit not found or you don't have access.", variant: "destructive" });
        router.push('/audits');
      }
    } catch (error) {
      console.error("Error fetching audit:", error);
      toast({ title: "Error", description: "Failed to fetch audit details.", variant: "destructive" });
      router.push('/audits');
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, router]);

  useEffect(() => {
    if (!authLoading) {
      if (user && id) {
        fetchAudit(id);
      } else if (!user) {
        router.push('/login');
      }
    }
  }, [id, user, authLoading, fetchAudit, router]);

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = async (newStatus: AuditStatus) => {
    if (!audit || !user) return;
    try {
      await updateAudit(audit.id, { status: newStatus, completedDate: newStatus === 'Completed' && !audit.completedDate ? new Date().toISOString() : audit.completedDate });
      setCurrentStatus(newStatus);
      setAudit(prev => prev ? { ...prev, status: newStatus, completedDate: newStatus === 'Completed' && !audit.completedDate ? new Date().toISOString() : audit.completedDate } : null);
      toast({ title: "Status Updated", description: `Audit status changed to ${newStatus}.` });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading audit details..." size="lg" /></div>;
  }

  if (!user && !authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }

  if (!audit) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Audit Not Found</h2>
        <p className="text-muted-foreground">The requested audit could not be found or you do not have permission to view it.</p>
        <Button onClick={() => router.push('/audits')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Audits
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Audit: ${audit.instagramHandle}`}
        description={`Detailed report and status for ${audit.entityName || audit.instagramHandle}.`}
        icon={FileText}
        actions={
          <div className="flex gap-2 flex-wrap no-print">
            <Button variant="outline" onClick={() => router.push('/audits')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Export to PDF
            </Button>
             {/* <Button variant="secondary" disabled>
              <Edit className="mr-2 h-4 w-4" /> Edit Audit Data (Non-Report)
            </Button> */}
          </div>
        }
      />

      <Card className="shadow-lg printable-area-card"> {/* Added printable-area-card */}
        <CardHeader className="no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="font-headline text-2xl">{audit.instagramHandle}</CardTitle>
              {audit.entityName && <CardDescription>{audit.entityType}: {audit.entityName}</CardDescription>}
            </div>
            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
               <Badge variant={audit.status === 'Completed' || audit.status === 'Exported' ? 'default' : audit.status === 'Canceled' ? 'destructive' : 'secondary'} className="text-sm px-3 py-1 self-start sm:self-end">
                {currentStatus}
              </Badge>
              <div className="w-full sm:w-[200px]">
                <Select value={currentStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger id="status-update">
                    <SelectValue placeholder="Update status" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info section for print */}
           <div className="print-only-header mb-6 hidden">
                <h1 className="text-2xl font-bold mb-1">Instagram Audit: {audit.instagramHandle}</h1>
                {audit.entityName && <h2 className="text-lg text-gray-700 mb-3">{audit.entityType}: {audit.entityName}</h2>}
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-muted-foreground" />
              <strong>Requested:</strong>&nbsp;{new Date(audit.requestedDate).toLocaleDateString()}
            </div>
            {audit.completedDate && (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                <strong>Completed:</strong>&nbsp;{new Date(audit.completedDate).toLocaleDateString()}
              </div>
            )}
          </div>
           <div className="print-only-status text-sm mb-4 hidden"><strong>Status:</strong> {audit.status}</div>
          
          <Separator />

          <div>
            <h3 className="font-semibold text-lg mb-2 font-headline">Questionnaire Summary</h3>
            <p className="text-muted-foreground bg-muted/50 p-4 rounded-md whitespace-pre-wrap text-sm">
              {audit.questionnaireResponses || "No questionnaire summary provided."}
            </p>
          </div>

          <Separator />
          
          <div>
            <h3 className="font-semibold text-lg mb-2 font-headline">AI Generated Audit Report</h3>
            {audit.auditReport ? (
              <div 
                className="prose prose-sm max-w-none p-4 border rounded-md bg-background dark:prose-invert whitespace-pre-wrap font-mono text-xs md:text-sm" 
              >
                {audit.auditReport}
              </div>
            ) : (
              <p className="text-muted-foreground">Audit report is not yet available or in progress.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end no-print">
           {/* Additional actions like share, download raw can be added here */}
        </CardFooter>
      </Card>
      
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area-card, .printable-area-card * {
            visibility: visible;
          }
          .printable-area-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only-header, .print-only-status {
            display: block !important; /* Show elements meant only for print */
          }
          .prose { 
            font-size: 10pt !important;
            color: black !important;
            max-width: 100% !important;
          }
          .prose h1, .prose h2, .prose h3, .prose h4 {
             color: black !important;
             margin-top: 0.5em;
             margin-bottom: 0.25em;
          }
           .prose p, .prose li {
            color: black !important;
          }
          .bg-background {
            background-color: white !important;
          }
        }
      `}</style>
    </div>
  );
}


'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, FileText, CalendarDays, CheckCircle, AlertTriangle, Edit } from 'lucide-react';
import Link from 'next/link';
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
      const updateData: Partial<InstagramAudit> = { status: newStatus };
      if (newStatus === 'Completed' && (!audit.completedDate || audit.status !== 'Completed')) {
        updateData.completedDate = new Date().toISOString();
      }
      
      await updateAudit(audit.id, updateData);
      setCurrentStatus(newStatus);
      setAudit(prev => prev ? { ...prev, ...updateData, completedDate: updateData.completedDate || prev.completedDate } : null);
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
             <Link href={`/audits/${id}/edit`} passHref>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" /> Edit Audit
              </Button>
            </Link>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Export to PDF
            </Button>
          </div>
        }
      />

      <Card className="shadow-lg printable-area-card">
        <CardHeader className="no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="font-headline text-2xl">{audit.instagramHandle}</CardTitle>
              {audit.entityName && <CardDescription>{audit.entityType}: {audit.entityName}</CardDescription>}
            </div>
            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
               <Badge variant={currentStatus === 'Completed' || currentStatus === 'Exported' ? 'default' : currentStatus === 'Canceled' ? 'destructive' : 'secondary'} className="text-sm px-3 py-1 self-start sm:self-end">
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
           <div className="print-only-header mb-6 hidden">
                <h1 className="text-2xl font-bold mb-1 print-title">Instagram Audit: {audit.instagramHandle}</h1>
                {audit.entityName && <h2 className="text-lg text-gray-700 mb-3 print-subtitle">{audit.entityType}: {audit.entityName}</h2>}
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-muted-foreground print-icon" />
              <strong>Requested:</strong>&nbsp;{new Date(audit.requestedDate).toLocaleDateString()}
            </div>
            {audit.completedDate && (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500 print-icon" />
                <strong>Completed:</strong>&nbsp;{new Date(audit.completedDate).toLocaleDateString()}
              </div>
            )}
          </div>
           <div className="print-only-status text-sm mb-4 hidden"><strong>Status:</strong> {currentStatus}</div>
          
          <Separator className="print-separator" />

          <div>
            <h3 className="font-semibold text-lg mb-2 font-headline print-section-title">Questionnaire Summary</h3>
            <p className="text-muted-foreground bg-muted/50 p-4 rounded-md whitespace-pre-wrap text-sm print-text-block">
              {audit.questionnaireResponses || "No questionnaire summary provided."}
            </p>
          </div>

          <Separator className="print-separator" />
          
          <div>
            <h3 className="font-semibold text-lg mb-2 font-headline print-section-title">AI Generated Audit Report</h3>
            {audit.auditReport ? (
              <article 
                className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-background print-audit-report"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {audit.auditReport}
                </ReactMarkdown>
              </article>
            ) : (
              <p className="text-muted-foreground">Audit report is not yet available or in progress.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end no-print">
        </CardFooter>
      </Card>
      
      <style jsx global>{`
        @media print {
          body, html {
            visibility: hidden;
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important; /* Chrome, Safari */
            color-adjust: exact !important; /* Firefox, Edge */
          }
          .printable-area-card, .printable-area-card * {
            visibility: visible !important;
          }
          .printable-area-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 20px !important; /* Add some padding for print */
            background-color: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only-header, .print-only-status {
            display: block !important;
            color: black !important;
          }
          .print-title {
            font-size: 20pt !important;
            color: black !important;
            margin-bottom: 4px !important;
          }
          .print-subtitle {
            font-size: 14pt !important;
            color: #333 !important;
            margin-bottom: 12px !important;
          }
          .print-section-title {
            font-size: 16pt !important;
            color: black !important;
            margin-top: 1em !important;
            margin-bottom: 0.5em !important;
            border-bottom: 1px solid #ccc;
            padding-bottom: 0.25em;
          }
          .print-text-block, .print-audit-report {
            font-size: 10pt !important;
            line-height: 1.4 !important;
            color: black !important;
            background-color: white !important;
            border-color: #eee !important;
            padding: 8px !important;
          }
          .print-audit-report {
             font-family: Inter, sans-serif !important; /* Use body font for rendered report */
          }
           .prose { /* Base prose styles for print */
            font-size: 10pt !important;
            color: black !important;
            max-width: 100% !important;
          }
           .prose h1, .prose h2, .prose h3, .prose h4, .prose p, .prose li, .prose strong, .prose em, .prose ul, .prose ol, .prose blockquote {
             color: black !important;
             background-color: transparent !important;
          }
          .text-muted-foreground, .print-icon {
            color: #555 !important;
          }
          .text-green-500 {
            color: green !important;
          }
          .print-separator {
            border-color: #ccc !important;
            margin-top: 1em !important;
            margin-bottom: 1em !important;
          }
          /* Ensure ShadCN specific background/text colors are overridden */
          .bg-background, .bg-muted\\/50, .border {
            background-color: white !important;
            border-color: #ddd !important; /* Lighten border for print */
          }
          .dark\\:prose-invert { /* Disable dark mode prose inversion for print */
             --tw-prose-body: black !important;
             --tw-prose-headings: black !important;
             --tw-prose-lead: black !important;
             --tw-prose-links: black !important;
             --tw-prose-bold: black !important;
             --tw-prose-counters: black !important;
             --tw-prose-bullets: black !important;
             --tw-prose-hr: #ccc !important;
             --tw-prose-quotes: black !important;
             --tw-prose-quote-borders: #ccc !important;
             --tw-prose-captions: black !important;
             --tw-prose-code: black !important;
             --tw-prose-pre-code: black !important;
             --tw-prose-pre-bg: #f5f5f5 !important; /* Light background for code blocks */
             --tw-prose-th-borders: #ccc !important;
             --tw-prose-td-borders: #ccc !important;
          }
          /* Hide elements that might overlap or are not needed in print */
          header, footer, nav, aside, .app-header, .app-sidebar { 
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

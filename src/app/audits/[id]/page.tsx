'use client';

import React, { useEffect, useState } from 'react';
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


// Mock function to fetch audit data - replace with actual data fetching
const fetchAuditById = async (id: string): Promise<InstagramAudit | null> => {
  console.log(`Fetching audit with ID: ${id}`);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  const mockAudits: InstagramAudit[] = [
    { id: 'audit1', instagramHandle: '@coolbrand', entityName: 'Cool Brand Inc.', entityType: 'Client', status: 'Completed', requestedDate: '2024-07-01', completedDate: '2024-07-05', questionnaireResponses: 'Likes fashion, targets Gen Z. Wants to increase engagement by 20% and grow followers by 500/month. Key competitors: @stylemaven, @trendsetter.', auditReport: "## Instagram Audit for @coolbrand\n\n### 1. Profile Overview:\n- **Bio:** Clear and concise, good use of keywords. Consider adding a trackable link.\n- **Profile Picture:** High quality and recognizable.\n- **Highlights:** Well-organized but could be updated more frequently.\n\n### 2. Content Analysis:\n- **Theme:** Consistent visual theme. Good job!\n- **Captions:** Engaging, but could benefit from stronger calls to action.\n- **Hashtags:** Mix of broad and niche hashtags. Research more community-specific tags.\n\n### 3. Engagement:\n- **Engagement Rate:** Slightly below industry average. Focus on interactive content like polls and Q&As.\n- **Comments:** Responding to comments promptly. Good.\n\n### 4. Recommendations:\n- Implement 2-3 Reels per week focusing on behind-the-scenes content.\n- Run a contest to boost engagement and follower growth.\n- Collaborate with micro-influencers in the fashion niche." },
    { id: 'audit2', instagramHandle: '@foodiegalore', entityName: 'Foodie Galore Blog', entityType: 'Prospect', status: 'In Progress', requestedDate: '2024-07-10', questionnaireResponses: 'Food blog, wants more engagement', auditReport: "Report generation in progress..." },
  ];
  return mockAudits.find(audit => audit.id === id) || null;
};

// Mock function to update audit status
const updateAuditStatusOnBackend = async (id: string, status: AuditStatus): Promise<boolean> => {
  console.log(`Updating audit ${id} status to ${status}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  return true; // Simulate success
};

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [audit, setAudit] = useState<InstagramAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<AuditStatus | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      const loadAudit = async () => {
        setIsLoading(true);
        const data = await fetchAuditById(id);
        setAudit(data);
        if (data) setCurrentStatus(data.status);
        setIsLoading(false);
      };
      loadAudit();
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = async (newStatus: AuditStatus) => {
    if (!audit) return;
    const success = await updateAuditStatusOnBackend(audit.id, newStatus);
    if (success) {
      setCurrentStatus(newStatus);
      setAudit(prev => prev ? { ...prev, status: newStatus } : null);
      toast({ title: "Status Updated", description: `Audit status changed to ${newStatus}.` });
    } else {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner text="Loading audit details..." size="lg" /></div>;
  }

  if (!audit) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Audit Not Found</h2>
        <p className="text-muted-foreground">The requested audit could not be found.</p>
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => router.push('/audits')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Export to PDF
            </Button>
             {/* <Button variant="secondary" disabled>
              <Edit className="mr-2 h-4 w-4" /> Edit Audit
            </Button> */}
          </div>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
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
                // In a real app, this would be rendered from Markdown to HTML for rich text.
                // For now, simple pre-wrap.
              >
                {audit.auditReport}
              </div>
            ) : (
              <p className="text-muted-foreground">Audit report is not yet available or in progress.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
           {/* Additional actions like share, download raw can be added here */}
           {/* <Button variant="outline" disabled><Share2 className="mr-2 h-4 w-4" /> Share</Button> */}
        </CardFooter>
      </Card>
      
      {/* Print-specific styling for the report. This is a basic example. */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          /* You might want to style the .prose for printing */
          .prose { 
            font-size: 10pt !important;
            color: black !important;
          }
          .prose h2 { font-size: 14pt !important; }
          .prose h3 { font-size: 12pt !important; }
        }
      `}</style>
      {/* This div wraps the content you want to print */}
      <div className="printable-area hidden"> {/* Hidden by default, shown by print styles */}
        <h1 className="text-2xl font-bold mb-2">Instagram Audit: {audit.instagramHandle}</h1>
        {audit.entityName && <h2 className="text-lg text-gray-700 mb-4">{audit.entityType}: {audit.entityName}</h2>}
        <div className="text-sm mb-4">
          <p><strong>Requested:</strong> {new Date(audit.requestedDate).toLocaleDateString()}</p>
          {audit.completedDate && <p><strong>Completed:</strong> {new Date(audit.completedDate).toLocaleDateString()}</p>}
          <p><strong>Status:</strong> {audit.status}</p>
        </div>
        <hr className="my-4" />
        <h3 className="font-semibold text-lg mb-2">Questionnaire Summary</h3>
        <pre className="text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap mb-4">{audit.questionnaireResponses}</pre>
        <hr className="my-4" />
        <h3 className="font-semibold text-lg mb-2">AI Generated Audit Report</h3>
        <pre className="text-xs whitespace-pre-wrap">{audit.auditReport}</pre>
      </div>

    </div>
  );
}

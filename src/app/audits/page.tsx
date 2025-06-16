'use client';

import React, { useState, useEffect } from 'react';
import { ListChecks, PlusCircle, Eye, Filter, ChevronDown, Search, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { InstagramAudit, AuditStatus } from '@/lib/types';
import { AUDIT_STATUS_OPTIONS } from '@/lib/types'; // Import options
import { useToast } from '@/hooks/use-toast';

const initialAudits: InstagramAudit[] = [
  { id: 'audit1', instagramHandle: '@coolbrand', entityName: 'Cool Brand Inc.', entityType: 'Client', status: 'Completed', requestedDate: '2024-07-01', completedDate: '2024-07-05', questionnaireResponses: 'Likes fashion, targets Gen Z' },
  { id: 'audit2', instagramHandle: '@foodiegalore', entityName: 'Foodie Galore Blog', entityType: 'Prospect', status: 'In Progress', requestedDate: '2024-07-10', questionnaireResponses: 'Food blog, wants more engagement' },
  { id: 'audit3', instagramHandle: '@fitnessguru', entityName: 'Mr. Fitness', entityType: 'Client', status: 'Requested', requestedDate: '2024-07-15', questionnaireResponses: 'Fitness influencer, needs content strategy' },
  { id: 'audit4', instagramHandle: '@traveldreams', entityName: 'Wanderlust Travels', entityType: 'Prospect', status: 'Exported', requestedDate: '2024-06-20', completedDate: '2024-06-25', questionnaireResponses: 'Travel agency, luxury market' },
];


export default function AuditsPage() {
  const [audits, setAudits] = useState<InstagramAudit[]>(initialAudits);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<AuditStatus>>(new Set(AUDIT_STATUS_OPTIONS));
  const { toast } = useToast();

  const handleDeleteAudit = (auditId: string) => {
    if (window.confirm("Are you sure you want to delete this audit? This action cannot be undone.")) {
      setAudits(prev => prev.filter(a => a.id !== auditId));
      toast({ title: "Audit Deleted", description: "The audit has been removed." });
    }
  };
  
  const toggleStatusFilter = (status: AuditStatus) => {
    setStatusFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const filteredAudits = audits.filter(audit => 
    (audit.instagramHandle.toLowerCase().includes(searchTerm.toLowerCase()) || (audit.entityName && audit.entityName.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    statusFilters.has(audit.status)
  );
  
  const getStatusBadgeVariant = (status: AuditStatus): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Completed': return 'default'; // Using ShadCN "primary" via default
      case 'Exported': return 'default'; 
      case 'In Progress': return 'secondary';
      case 'Requested': return 'outline';
      case 'Needs Follow-up': return 'default'; // Could be accent if available, use primary for now
      case 'Canceled': return 'destructive';
      default: return 'outline';
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Instagram Audits"
        description="Manage and track all your Instagram audit reports."
        icon={ListChecks}
        actions={
          <Link href="/audits/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Audit
            </Button>
          </Link>
        }
      />

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search audits..." 
                className="pl-8 sm:w-[300px]" 
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
                {AUDIT_STATUS_OPTIONS.map((status) => (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IG Handle</TableHead>
                <TableHead className="hidden md:table-cell">Client/Prospect</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Requested</TableHead>
                <TableHead className="hidden lg:table-cell">Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudits.length > 0 ? (
                filteredAudits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.instagramHandle}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{audit.entityName || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(audit.status)}>{audit.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{new Date(audit.requestedDate).toLocaleDateString()}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {audit.completedDate ? new Date(audit.completedDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Link href={`/audits/${audit.id}`} passHref>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                           <span className="sr-only">View Audit</span>
                        </Button>
                      </Link>
                       {/* Edit might link to /audits/new with prefilled data, or a dedicated edit page */}
                       <Link href={`/audits/edit/${audit.id}`} passHref>
                         <Button variant="ghost" size="icon" disabled> {/* Simple edit disabled for now */}
                           <Edit className="h-4 w-4" />
                           <span className="sr-only">Edit Audit</span>
                         </Button>
                       </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAudit(audit.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Audit</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No audits found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

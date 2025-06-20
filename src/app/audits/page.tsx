
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ListChecks, PlusCircle, Eye, Filter, ChevronDown, Search, Edit, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { InstagramAudit, AuditStatus } from '@/lib/types';
import { AUDIT_STATUS_OPTIONS } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getAudits, deleteAudit as fbDeleteAudit } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useRouter } from 'next/navigation';


export default function AuditsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [audits, setAudits] = useState<InstagramAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<AuditStatus>>(new Set(AUDIT_STATUS_OPTIONS));
  const { toast } = useToast();

  const fetchAudits = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedAudits = await getAudits();
      setAudits(fetchedAudits);
    } catch (error) {
      console.error("Error fetching audits:", error);
      toast({ title: "Error", description: "Could not fetch audits.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchAudits();
      } else {
        // AuthProvider should handle redirect
      }
    }
  }, [user, authLoading, fetchAudits, router]);

  const handleDeleteAudit = async (auditId: string, auditHandle: string) => {
    if (window.confirm(`Are you sure you want to delete the audit for "${auditHandle}"? This action cannot be undone.`)) {
      try {
        await fbDeleteAudit(auditId);
        toast({ title: "Audit Deleted", description: `The audit for ${auditHandle} has been removed.` });
        fetchAudits(); 
      } catch (error: any) {
        console.error("Error deleting audit:", error);
        toast({ title: "Error", description: error.message || "Could not delete audit.", variant: "destructive" });
      }
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
      // If all filters are deselected, select all by default
      if (newSet.size === 0) {
        return new Set(AUDIT_STATUS_OPTIONS);
      }
      return newSet;
    });
  };

  const filteredAudits = audits.filter(audit => 
    (audit.instagramHandle.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (audit.entityName && audit.entityName.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (statusFilters.size === AUDIT_STATUS_OPTIONS.length || statusFilters.has(audit.status)) // Apply filter only if not all are selected
  );
  
  const getStatusBadgeVariant = (status: AuditStatus): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Completed': return 'default';
      case 'Exported': return 'default'; 
      case 'In Progress': return 'secondary';
      case 'Requested': return 'outline';
      case 'Needs Follow-up': return 'default'; 
      case 'Canceled': return 'destructive';
      default: return 'outline';
    }
  };

  if (authLoading || (isLoading && !audits.length && user)) { // Show loading if auth is loading OR data is loading for an authenticated user
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading audits..." size="lg"/></div>;
  }

  if (!user && !authLoading) {
     // This should ideally be handled by AuthProvider, but good for fallback
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }


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
         {isLoading && audits.length === 0 ? (
             <div className="py-10"><LoadingSpinner text="Fetching audits..." /></div>
          ) : (
            <div className="overflow-x-auto">
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
                            <Button variant="ghost" size="icon" aria-label={`View audit for ${audit.instagramHandle}`}>
                              <Eye className="h-4 w-4" />
                               <span className="sr-only">View Audit</span>
                            </Button>
                          </Link>
                           <Link href={`/audits/${audit.id}/edit`} passHref>
                             <Button variant="ghost" size="icon" aria-label={`Edit audit for ${audit.instagramHandle}`}> 
                               <Edit className="h-4 w-4" />
                               <span className="sr-only">Edit Audit</span>
                             </Button>
                           </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteAudit(audit.id, audit.instagramHandle)} className="text-destructive hover:text-destructive" aria-label={`Delete audit for ${audit.instagramHandle}`}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Audit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                   <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                              <AlertTriangle className="w-10 h-10 text-muted-foreground mb-2" />
                              <p className="font-semibold">
                                {audits.length === 0 && searchTerm === '' && (statusFilters.size === AUDIT_STATUS_OPTIONS.length || statusFilters.size === 0)
                                  ? "No audits found."
                                  : "No audits found matching your criteria."
                                }
                              </p>
                              {audits.length === 0 && searchTerm === '' && (statusFilters.size === AUDIT_STATUS_OPTIONS.length || statusFilters.size === 0) && (
                                   <p className="text-sm text-muted-foreground">
                                      Get started by <Link href="/audits/new" className="text-primary hover:underline">creating your first audit</Link>!
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
    </div>
  );
}


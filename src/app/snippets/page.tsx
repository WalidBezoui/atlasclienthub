
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Trash2, Search, Filter, ChevronDown, AlertTriangle, Copy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ScriptSnippet, ScriptSnippetType } from '@/lib/types';
import { SCRIPT_SNIPPET_TYPES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getSnippets, deleteSnippet as fbDeleteSnippet } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea'; // For displaying full content
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";


export default function SnippetsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [snippets, setSnippets] = useState<ScriptSnippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilters, setTypeFilters] = useState<Set<ScriptSnippetType>>(new Set(SCRIPT_SNIPPET_TYPES));
  const [selectedSnippet, setSelectedSnippet] = useState<ScriptSnippet | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const { toast } = useToast();

  const fetchSnippets = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedSnippets = await getSnippets();
      setSnippets(fetchedSnippets);
    } catch (error) {
      console.error("Error fetching snippets:", error);
      toast({ title: "Error", description: "Could not fetch snippets.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchSnippets();
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, fetchSnippets, router]);

  const handleDeleteSnippet = async (snippetId: string, snippetType: string) => {
    if (window.confirm(`Are you sure you want to delete this ${snippetType} snippet? This action cannot be undone.`)) {
      try {
        await fbDeleteSnippet(snippetId);
        toast({ title: "Snippet Deleted", description: `The snippet has been removed.` });
        fetchSnippets(); 
      } catch (error: any) {
        console.error("Error deleting snippet:", error);
        toast({ title: "Error", description: error.message || "Could not delete snippet.", variant: "destructive" });
      }
    }
  };
  
  const toggleTypeFilter = (type: ScriptSnippetType) => {
    setTypeFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      if (newSet.size === 0) {
        return new Set(SCRIPT_SNIPPET_TYPES);
      }
      return newSet;
    });
  };

  const filteredSnippets = snippets.filter(snippet => 
    (snippet.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (snippet.prospectName && snippet.prospectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
     snippet.scriptType.toLowerCase().includes(searchTerm.toLowerCase())
    ) &&
    (typeFilters.size === SCRIPT_SNIPPET_TYPES.length || typeFilters.has(snippet.scriptType))
  );

  const handleViewSnippet = (snippet: ScriptSnippet) => {
    setSelectedSnippet(snippet);
    setIsViewModalOpen(true);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Snippet content copied to clipboard." });
    }).catch(err => {
      toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
    });
  };
  

  if (authLoading || (isLoading && !snippets.length && user)) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading snippets..." size="lg"/></div>;
  }

  if (!user && !authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Script Snippets"
        description="Manage and review all your saved script snippets."
        icon={ClipboardList}
      />

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-headline">
              View Snippet: {selectedSnippet?.scriptType}
              {selectedSnippet?.prospectName && ` for ${selectedSnippet.prospectName}`}
            </DialogTitle>
            <DialogDescription>
              Created on: {selectedSnippet && new Date(selectedSnippet.createdAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={selectedSnippet?.content || ''}
            readOnly
            rows={15}
            className="my-4 text-sm bg-muted/30"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => selectedSnippet && handleCopyToClipboard(selectedSnippet.content)}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search snippets..." 
                className="pl-8 sm:w-[300px]" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" /> Filter by Type <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Script Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SCRIPT_SNIPPET_TYPES.map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={typeFilters.has(type)}
                    onCheckedChange={() => toggleTypeFilter(type)}
                  >
                    {type}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
         {isLoading && snippets.length === 0 ? (
             <div className="py-10"><LoadingSpinner text="Fetching snippets..." /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Prospect</TableHead>
                    <TableHead>Content (Preview)</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSnippets.length > 0 ? (
                    filteredSnippets.map((snippet) => (
                      <TableRow key={snippet.id}>
                        <TableCell>
                          <Badge variant="secondary">{snippet.scriptType}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {snippet.prospectName || <span className="italic">General</span>}
                        </TableCell>
                        <TableCell 
                            className="max-w-xs truncate cursor-pointer hover:underline"
                            onClick={() => handleViewSnippet(snippet)}
                            title="Click to view full snippet"
                        >
                            {snippet.content.substring(0, 70)}{snippet.content.length > 70 && '...'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {new Date(snippet.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewSnippet(snippet)} aria-label={`View snippet`}>
                               <Search className="h-4 w-4" />
                               <span className="sr-only">View Snippet</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSnippet(snippet.id, snippet.scriptType)} className="text-destructive hover:text-destructive" aria-label={`Delete snippet`}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Snippet</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                   <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                              <AlertTriangle className="w-10 h-10 text-muted-foreground mb-2" />
                              <p className="font-semibold">
                                {snippets.length === 0 && searchTerm === '' && (typeFilters.size === SCRIPT_SNIPPET_TYPES.length || typeFilters.size === 0)
                                  ? "No snippets saved yet."
                                  : "No snippets found matching your criteria."
                                }
                              </p>
                              {snippets.length === 0 && (
                                   <p className="text-sm text-muted-foreground">
                                      Generate scripts and click "Save to Snippets" in the script modal.
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

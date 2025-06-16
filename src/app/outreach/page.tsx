'use client';

import React, { useState } from 'react';
import { Send, PlusCircle, Edit, Trash2, Search, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { OutreachProspect, OutreachStatus } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const initialProspects: OutreachProspect[] = [
  { id: '1', name: 'Alice Wonderland', email: 'alice@example.com', company: 'Wonderland Bakery', status: 'Contacted', lastContacted: '2024-07-10', instagramHandle: 'wonderland_bakes' },
  { id: '2', name: 'Bob The Builder', email: 'bob@example.com', company: 'Bob\'s Constructions', status: 'Interested', lastContacted: '2024-07-12', followUpDate: '2024-07-20', instagramHandle: 'bobbuilds' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', status: 'To Contact', instagramHandle: 'goodgriefcharlie' },
  { id: '4', name: 'Diana Prince', email: 'diana@example.com', company: 'Themyscira Exports', status: 'Replied', lastContacted: '2024-07-15', notes: 'Asked for portfolio.' },
];

const OUTREACH_STATUS_OPTIONS: OutreachStatus[] = ["To Contact", "Contacted", "Replied", "Interested", "Not Interested", "Follow-up"];

function ProspectForm({ prospect, onSave, onCancel }: { prospect?: OutreachProspect, onSave: (prospect: OutreachProspect) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<OutreachProspect>(prospect || {
    id: prospect ? prospect.id : Date.now().toString(),
    name: '',
    email: '',
    company: '',
    status: 'To Contact',
    instagramHandle: '',
    notes: '',
  });
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: OutreachStatus) => {
    setFormData(prev => ({ ...prev, status: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
       toast({ title: "Error", description: "Name and Email are required.", variant: "destructive" });
       return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Prospect Name</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="company">Company (Optional)</Label>
        <Input id="company" name="company" value={formData.company || ''} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="instagramHandle">Instagram Handle (Optional)</Label>
        <Input id="instagramHandle" name="instagramHandle" value={formData.instagramHandle || ''} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={handleStatusChange}>
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {OUTREACH_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="lastContacted">Last Contacted (Optional)</Label>
        <Input id="lastContacted" name="lastContacted" type="date" value={formData.lastContacted?.split('T')[0] || ''} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
        <Input id="followUpDate" name="followUpDate" type="date" value={formData.followUpDate?.split('T')[0] || ''} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Prospect</Button>
      </DialogFooter>
    </form>
  );
}


export default function OutreachPage() {
  const [prospects, setProspects] = useState<OutreachProspect[]>(initialProspects);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<OutreachStatus>>(new Set(OUTREACH_STATUS_OPTIONS));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<OutreachProspect | undefined>(undefined);
  const { toast } = useToast();

  const handleSaveProspect = (prospect: OutreachProspect) => {
    setProspects(prev => {
      const existing = prev.find(p => p.id === prospect.id);
      if (existing) {
        return prev.map(p => p.id === prospect.id ? prospect : p);
      }
      return [...prev, prospect];
    });
    toast({ title: "Success", description: `Prospect ${prospect.name} ${editingProspect ? 'updated' : 'added'}.` });
    setIsFormOpen(false);
    setEditingProspect(undefined);
  };
  
  const handleDeleteProspect = (prospectId: string) => {
     if (window.confirm("Are you sure you want to delete this prospect?")) {
      setProspects(prev => prev.filter(p => p.id !== prospectId));
      toast({ title: "Prospect Deleted", description: "The prospect has been removed." });
    }
  };

  const toggleStatusFilter = (status: OutreachStatus) => {
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

  const filteredProspects = prospects.filter(prospect => 
    (prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) || prospect.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
    statusFilters.has(prospect.status)
  );

  const getStatusBadgeVariant = (status: OutreachStatus) => {
    switch (status) {
      case 'Interested': return 'default'; // primary
      case 'Replied': return 'secondary';
      case 'Contacted': return 'outline';
      case 'Follow-up': return 'default'; // Consider a different color for follow-up, e.g., using accent or a custom class
      case 'To Contact': return 'outline';
      case 'Not Interested': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach Manager"
        description="Track and manage your cold outreach efforts."
        icon={Send}
        actions={
          <Button onClick={() => { setEditingProspect(undefined); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Prospect
          </Button>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingProspect ? 'Edit Prospect' : 'Add New Prospect'}</DialogTitle>
            <DialogDescription>
              {editingProspect ? 'Update prospect details.' : 'Add a new prospect to your outreach list.'}
            </DialogDescription>
          </DialogHeader>
          <ProspectForm 
            prospect={editingProspect} 
            onSave={handleSaveProspect} 
            onCancel={() => { setIsFormOpen(false); setEditingProspect(undefined); }} 
          />
        </DialogContent>
      </Dialog>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search prospects..." 
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
                {OUTREACH_STATUS_OPTIONS.map((status) => (
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
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last Contacted</TableHead>
                <TableHead className="hidden lg:table-cell">Follow-up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspects.length > 0 ? (
                filteredProspects.map((prospect) => (
                  <TableRow key={prospect.id}>
                    <TableCell className="font-medium">{prospect.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{prospect.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{prospect.company || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(prospect.status)}>{prospect.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {prospect.lastContacted ? new Date(prospect.lastContacted).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {prospect.followUpDate ? new Date(prospect.followUpDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => { setEditingProspect(prospect); setIsFormOpen(true); }} className="mr-2">
                        <Edit className="h-4 w-4" />
                         <span className="sr-only">Edit Prospect</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProspect(prospect.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Prospect</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    No prospects found.
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

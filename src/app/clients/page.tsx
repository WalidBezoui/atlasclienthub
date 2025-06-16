'use client';

import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, Edit, Trash2, Eye, Search, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Client, ClientStatus } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const initialClients: Client[] = [
  { id: '1', name: 'Tech Solutions Inc.', contactEmail: 'contact@techsolutions.com', companyName: 'Tech Solutions Inc.', status: 'Active', joinedDate: '2023-01-15', instagramHandle: 'techsolutions', notes: 'Monthly retainer client.' },
  { id: '2', name: 'GreenLeaf Organics', contactEmail: 'info@greenleaf.com', companyName: 'GreenLeaf Organics', status: 'Active', joinedDate: '2023-03-22', instagramHandle: 'greenleaf_org', notes: 'Focus on content creation.' },
  { id: '3', name: 'Momentum Fitness', contactEmail: 'support@momentum.fit', companyName: 'Momentum Fitness', status: 'On Hold', joinedDate: '2022-11-01', instagramHandle: 'momentumfit', notes: 'Paused campaign in Q2.' },
  { id: '4', name: 'Artisan Coffee Co.', contactEmail: 'hello@artisancoffee.co', companyName: 'Artisan Coffee Co.', status: 'Past', joinedDate: '2022-05-10', instagramHandle: 'artisancoffeeco', notes: 'Completed 6-month project.' },
];

const CLIENT_STATUS_OPTIONS: ClientStatus[] = ["Active", "On Hold", "Past"];

function ClientForm({ client, onSave, onCancel }: { client?: Client, onSave: (client: Client) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<Client>(client || {
    id: client ? client.id : Date.now().toString(),
    name: '',
    contactEmail: '',
    companyName: '',
    status: 'Active',
    joinedDate: new Date().toISOString().split('T')[0],
    instagramHandle: '',
    notes: '',
  });
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: ClientStatus) => {
    setFormData(prev => ({ ...prev, status: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contactEmail || !formData.companyName) {
       toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
       return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Client/Company Name</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="contactEmail">Contact Email</Label>
        <Input id="contactEmail" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="contactPhone">Contact Phone (Optional)</Label>
        <Input id="contactPhone" name="contactPhone" value={formData.contactPhone || ''} onChange={handleChange} />
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
            {CLIENT_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="joinedDate">Joined Date</Label>
        <Input id="joinedDate" name="joinedDate" type="date" value={formData.joinedDate} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Client</Button>
      </DialogFooter>
    </form>
  );
}


export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<ClientStatus>>(new Set(CLIENT_STATUS_OPTIONS));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const { toast } = useToast();

  const handleSaveClient = (client: Client) => {
    setClients(prev => {
      const existing = prev.find(c => c.id === client.id);
      if (existing) {
        return prev.map(c => c.id === client.id ? client : c);
      }
      return [...prev, client];
    });
    toast({ title: "Success", description: `Client ${client.name} ${editingClient ? 'updated' : 'added'}.` });
    setIsFormOpen(false);
    setEditingClient(undefined);
  };
  
  const handleDeleteClient = (clientId: string) => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      setClients(prev => prev.filter(c => c.id !== clientId));
      toast({ title: "Client Deleted", description: "The client has been removed." });
    }
  };

  const toggleStatusFilter = (status: ClientStatus) => {
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

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    statusFilters.has(client.status)
  );

  const getStatusBadgeVariant = (status: ClientStatus) => {
    switch (status) {
      case 'Active': return 'default';
      case 'On Hold': return 'secondary';
      case 'Past': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client relationships and information."
        icon={Users}
        actions={
          <Button onClick={() => { setEditingClient(undefined); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Client
          </Button>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Update the details for this client.' : 'Fill in the form to add a new client to your roster.'}
            </DialogDescription>
          </DialogHeader>
          <ClientForm 
            client={editingClient} 
            onSave={handleSaveClient} 
            onCancel={() => { setIsFormOpen(false); setEditingClient(undefined); }} 
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
                placeholder="Search clients..." 
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
                {CLIENT_STATUS_OPTIONS.map((status) => (
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
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Joined Date</TableHead>
                <TableHead className="hidden lg:table-cell">IG Handle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{client.contactEmail}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(client.status)}>{client.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{new Date(client.joinedDate).toLocaleDateString()}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{client.instagramHandle || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingClient(client); setIsFormOpen(true); }} className="mr-2">
                        <Edit className="h-4 w-4" />
                         <span className="sr-only">Edit Client</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Client</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No clients found.
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

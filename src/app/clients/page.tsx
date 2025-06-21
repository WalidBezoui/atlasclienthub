
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, PlusCircle, Edit, Trash2, Search, ChevronDown, Filter, AlertTriangle } from 'lucide-react';
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { addClient, getClients, updateClient, deleteClient as fbDeleteClient } from '@/lib/firebase/services';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useScriptContext } from '@/contexts/ScriptContext'; // Import script context


const CLIENT_STATUS_OPTIONS: ClientStatus[] = ["Active", "On Hold", "Past"];

const initialFormDataState = { 
  name: '',
  contactEmail: '',
  companyName: '',
  status: 'Active' as ClientStatus,
  joinedDate: new Date().toISOString().split('T')[0],
  instagramHandle: '',
  contactPhone: '',
  notes: '',
  industry: '',
};


function ClientForm({ client, onSave, onCancel }: { client?: Client, onSave: (client: Omit<Client, 'id' | 'userId'> | Client) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'userId'> | Client>(initialFormDataState);
  const { toast } = useToast();

  useEffect(() => {
    if (client) {
      const clientDataWithDefaults = {
        ...initialFormDataState,
        ...client,
        joinedDate: client.joinedDate ? new Date(client.joinedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      };
      setFormData(clientDataWithDefaults);
    } else {
      setFormData(initialFormDataState);
    }
  }, [client]);


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
       toast({ title: "Error", description: "Please fill in Client/Company Name, Contact Email, and Company Name.", variant: "destructive" });
       return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[65vh] pr-5">
      <div>
        <Label htmlFor="name">Client/Company Name *</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="contactEmail">Contact Email *</Label>
        <Input id="contactEmail" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} required />
      </div>
       <div>
        <Label htmlFor="companyName">Company Name *</Label>
        <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} required/>
      </div>
      <div>
        <Label htmlFor="contactPhone">Contact Phone (Optional)</Label>
        <Input id="contactPhone" name="contactPhone" value={formData.contactPhone || ''} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="instagramHandle">Instagram Handle (Optional)</Label>
        <Input id="instagramHandle" name="instagramHandle" placeholder="@username" value={formData.instagramHandle || ''} onChange={handleChange} />
      </div>
       <div>
        <Label htmlFor="industry">Industry (Optional)</Label>
        <Input id="industry" name="industry" value={formData.industry || ''} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="status">Status *</Label>
         <Select value={formData.status} onValueChange={handleStatusChange} required>
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="joinedDate">Joined Date *</Label>
        <Input id="joinedDate" name="joinedDate" type="date" value={formData.joinedDate} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} />
      </div>
      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{client ? 'Update Client' : 'Add Client'}</Button>
      </DialogFooter>
    </form>
  );
}


export default function ClientsPage() {
  const { user, loading: authLoading } = useAuth();
  const { setClientContext, clearContext: clearScriptContext } = useScriptContext(); // Use script context
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<ClientStatus>>(new Set(CLIENT_STATUS_OPTIONS));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const { toast } = useToast();

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedClients = await getClients();
      setClients(fetchedClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({ title: "Error", description: "Could not fetch clients.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchClients();
      } else {
         // AuthProvider should handle redirect
      }
    }
  }, [user, authLoading, fetchClients, router]);


  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'userId'> | Client) => {
    if (!user) {
        toast({title: "Authentication Error", description: "You must be logged in.", variant: "destructive"});
        return;
    }
    try {
        const dataToSave = { ...clientData };
        dataToSave.contactPhone = dataToSave.contactPhone || undefined;
        dataToSave.instagramHandle = dataToSave.instagramHandle || undefined;
        dataToSave.notes = dataToSave.notes || undefined;

        if ('id' in dataToSave && dataToSave.id) { 
            const { id, userId, ...updateData } = dataToSave as Client;
            await updateClient(id, updateData);
            toast({ title: "Success", description: `Client ${dataToSave.name} updated.` });
        } else { 
            await addClient(dataToSave as Omit<Client, 'id' | 'userId'>);
            toast({ title: "Success", description: `Client ${dataToSave.name} added.` });
        }
        fetchClients(); 
        setIsFormOpen(false);
        setEditingClient(undefined);
        clearScriptContext(); // Clear script context after saving/closing
    } catch (error: any) {
        console.error("Error saving client:", error);
        toast({ title: "Error", description: error.message || "Could not save client.", variant: "destructive"});
    }
  };
  
  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (window.confirm(`Are you sure you want to delete client "${clientName}"? This action cannot be undone.`)) {
      try {
        await fbDeleteClient(clientId);
        toast({ title: "Client Deleted", description: `Client ${clientName} has been removed.` });
        fetchClients();
        if (editingClient?.id === clientId) { // If deleted client was in script context
            clearScriptContext();
            setEditingClient(undefined);
        }
      } catch (error: any) {
        console.error("Error deleting client:", error);
        toast({ title: "Error", description: error.message || "Could not delete client.", variant: "destructive"});
      }
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
      if (newSet.size === 0) {
        return new Set(CLIENT_STATUS_OPTIONS);
      }
      return newSet;
    });
  };

  const filteredClients = clients.filter(client => 
    (client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (client.companyName && client.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (client.instagramHandle && client.instagramHandle.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (statusFilters.size === CLIENT_STATUS_OPTIONS.length || statusFilters.has(client.status))
  );

  const getStatusBadgeVariant = (status: ClientStatus) => {
    switch (status) {
      case 'Active': return 'default';
      case 'On Hold': return 'secondary';
      case 'Past': return 'outline';
      default: return 'default';
    }
  };
  
  if (authLoading || (isLoading && !clients.length && user)) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner text="Loading clients..." size="lg"/></div>;
  }

  if (!user && !authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
  }

  const handleOpenNewClientForm = () => {
    setEditingClient(undefined);
    clearScriptContext(); // Clear any existing client context
    setIsFormOpen(true);
  };

  const handleOpenEditClientForm = (client: Client) => {
    setEditingClient(client);
    // Set script context for the client being edited
    setClientContext({
      clientHandle: client.instagramHandle,
      clientName: client.name,
      // industry is not in Client type, add a placeholder or consider adding it to the type
      clientIndustry: "Not Specified", // Placeholder for industry
    });
    setIsFormOpen(true);
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client relationships and information."
        icon={Users}
        actions={
          <Button onClick={handleOpenNewClientForm}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Client
          </Button>
        }
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setEditingClient(undefined);
            clearScriptContext(); // Clear script context when dialog closes
          }
      }}>
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
            onCancel={() => { setIsFormOpen(false); setEditingClient(undefined); clearScriptContext(); }} 
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
          {isLoading && clients.length === 0 ? (
             <div className="overflow-x-auto">
              <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <LoadingSpinner text="Fetching clients..." />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
             </div>
          ) : filteredClients.length > 0 ? (
            <div className="overflow-x-auto">
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
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{client.contactEmail}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(client.status)}>{client.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{new Date(client.joinedDate).toLocaleDateString()}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{client.instagramHandle || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditClientForm(client)} className="mr-2" aria-label={`Edit client ${client.name}`}>
                            <Edit className="h-4 w-4" />
                             <span className="sr-only">Edit Client</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client.id, client.name)} className="text-destructive hover:text-destructive" aria-label={`Delete client ${client.name}`}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Client</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                          <div className="flex flex-col items-center justify-center">
                              <AlertTriangle className="w-10 h-10 text-muted-foreground mb-2" />
                              <p className="font-semibold">
                                {clients.length === 0 && searchTerm === '' && (statusFilters.size === CLIENT_STATUS_OPTIONS.length || statusFilters.size === 0)
                                  ? "No clients found."
                                  : "No clients found matching your criteria."
                                }
                              </p>
                              {clients.length === 0 && searchTerm === '' && (statusFilters.size === CLIENT_STATUS_OPTIONS.length || statusFilters.size === 0) && (
                                  <p className="text-sm text-muted-foreground">
                                    Get started by <Button variant="link" className="p-0 h-auto" onClick={handleOpenNewClientForm}>adding your first client</Button>!
                                  </p>
                              )}
                          </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

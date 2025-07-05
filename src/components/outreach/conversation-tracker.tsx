
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { User, Bot, MoreHorizontal, Edit, Trash2, Repeat, Loader2, Sparkles, Clipboard, Download, Send, MessageCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import type { OutreachProspect, GeneratedComment } from '@/lib/types';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ConversationTrackerProps {
  value: string | null;
  onChange: (newValue: string) => void;
  prospect?: OutreachProspect | null;
  onGenerateReply?: (prospect: OutreachProspect, customInstructions: string) => Promise<string>;
  isDirty?: boolean;
}

type Message = {
  sender: 'Me' | 'Prospect';
  content: string;
};

const parseMessages = (value: string | null): Message[] => {
  if (!value) return [];
  const lines = value.split('\n');
  const messages: Message[] = [];
  let currentMessage: Message | null = null;

  for (const line of lines) {
    const isMePrefix = line.startsWith('Me: ');
    const isProspectPrefix = line.startsWith('Prospect: ') || line.startsWith('Them: ');

    if (isMePrefix || isProspectPrefix) {
      if (currentMessage) {
        messages.push({ ...currentMessage, content: currentMessage.content.trim() });
      }
      let content = '';
      if (isMePrefix) {
        content = line.substring(4);
      } else if (line.startsWith('Prospect: ')) {
        content = line.substring(10);
      } else { 
        content = line.substring(6);
      }
      currentMessage = {
        sender: isMePrefix ? 'Me' : 'Prospect',
        content: content,
      };
    } else if (currentMessage) {
      currentMessage.content += '\n' + line;
    } else if (line.trim() !== '') {
      currentMessage = { sender: 'Prospect', content: line };
    }
  }

  if (currentMessage) {
    messages.push({ ...currentMessage, content: currentMessage.content.trim() });
  }

  return messages;
};

const serializeMessages = (messages: Message[]): string => {
  return messages.map(msg => {
    const prefix = msg.sender === 'Me' ? 'Me' : 'Prospect';
    return `${prefix}: ${msg.content}`;
  }).join('\n\n'); 
};

export function ConversationTracker({ value, onChange, prospect, onGenerateReply, isDirty }: ConversationTrackerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sender, setSender] = useState<'Me' | 'Prospect'>('Me');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [activeTab, setActiveTab] = useState('dms');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    setTimeout(() => {
       if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }, 100);
  };

  useEffect(() => {
    setMessages(parseMessages(value));
    if (activeTab === 'dms') {
        scrollToBottom();
    }
  }, [value, activeTab]);
  
  const handleAddMessage = () => {
    if (!newMessage.trim()) return;
    const newMessages = [...messages, { sender, content: newMessage.trim() }];
    onChange(serializeMessages(newMessages));
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingIndex !== null) {
        handleSaveEdit();
      } else {
        handleAddMessage();
      }
    }
  };

  const handleDeleteMessage = (index: number) => {
    const newMessages = messages.filter((_, i) => i !== index);
    onChange(serializeMessages(newMessages));
  };
  
  const handleSwitchSender = (index: number) => {
    const newMessages = messages.map((msg, i) => {
        if (i === index) {
            return { ...msg, sender: msg.sender === 'Me' ? 'Prospect' : 'Me' };
        }
        return msg;
    });
    onChange(serializeMessages(newMessages));
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(messages[index].content);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const newMessages = messages.map((msg, i) => {
        if (i === editingIndex) {
            return { ...msg, content: editingText };
        }
        return msg;
    });
    onChange(serializeMessages(newMessages));
    setEditingIndex(null);
    setEditingText('');
  };

  const handleGenerateClick = async () => {
    if (!prospect || !onGenerateReply) return;
    setIsGenerating(true);
    try {
        const reply = await onGenerateReply(prospect, customInstructions);
        if (reply) {
            setNewMessage(reply);
            setSender('Me'); 
            setCustomInstructions(''); 
             toast({
                title: 'Reply Generated',
                description: 'Review the generated message in the text area below.',
            });
        }
    } catch (e) {
        console.error("Failed to generate reply", e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = serializeMessages(messages);
    if (!textToCopy) {
        toast({ title: 'Nothing to copy', description: 'The conversation is empty.' });
        return;
    }
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast({ title: "Copied!", description: "Full conversation copied to clipboard." });
      })
      .catch(err => {
        console.error("Failed to copy conversation: ", err);
        toast({ title: "Copy Failed", variant: "destructive" });
      });
  };

  const handleExport = () => {
    const textToExport = serializeMessages(messages);
     if (!textToExport) {
        toast({ title: 'Nothing to export', description: 'The conversation is empty.' });
        return;
    }
    const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const prospectName = prospect?.name?.replace(/\s/g, '_') || 'export';
    link.download = `conversation_${prospectName}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 bg-card rounded-t-lg">
        <h3 className="flex-1 font-semibold text-foreground truncate flex items-center gap-2" title={prospect?.name}>
            <span>Conversation with {prospect?.name || 'Prospect'}</span>
            <span 
                className={cn(
                    "text-amber-500 text-2xl leading-none transition-opacity duration-300",
                    isDirty ? "opacity-100 animate-pulse" : "opacity-0"
                )} 
                title="Unsaved changes"
            >
                *
            </span>
        </h3>
        <div className="flex items-center gap-1 mr-8">
            <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!serializeMessages(messages)}>
                <Clipboard className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={!serializeMessages(messages)}>
                <Download className="mr-2 h-4 w-4" /> Export
            </Button>
        </div>
      </div>
      
      <Tabs defaultValue="dms" onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
        <div className="px-4 pt-2 border-b bg-card">
            <TabsList>
                <TabsTrigger value="dms">DM History</TabsTrigger>
                <TabsTrigger value="comments">Comment History ({prospect?.comments?.length || 0})</TabsTrigger>
            </TabsList>
        </div>
        
        <TabsContent value="dms" className="flex-grow flex flex-col min-h-0">
            <ScrollArea className="flex-grow p-4 bg-background" ref={scrollAreaRef}>
                <div className="space-y-6">
                {messages.length > 0 ? (
                    messages.map((message, index) => (
                    <div
                        key={index}
                        className={cn('flex items-end gap-2.5 group w-full', {
                        'justify-end': message.sender === 'Me',
                        'justify-start': message.sender === 'Prospect',
                        })}
                    >
                        {message.sender === 'Prospect' && <User className="h-6 w-6 text-muted-foreground shrink-0 self-start mt-5" />}

                        <div className={cn("flex flex-col w-full max-w-[80%] md:max-w-[70%]", { "items-end": message.sender === 'Me', "items-start": message.sender === 'Prospect' })}>
                            <span className={cn('text-xs text-muted-foreground mb-1', { 'pr-2': message.sender === 'Me', 'pl-2': message.sender === 'Prospect' })}>
                                {message.sender === 'Me' ? 'You' : (prospect?.name || 'Prospect')}
                            </span>
                            <div className="flex items-center gap-2">
                                { message.sender === 'Me' &&
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleStartEdit(index)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSwitchSender(index)}><Repeat className="mr-2 h-4 w-4"/>Switch to Prospect</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteMessage(index)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                }
                                <div
                                className={cn('rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap shadow-sm', {
                                    'bg-primary text-primary-foreground rounded-br-none': message.sender === 'Me',
                                    'bg-card border rounded-bl-none': message.sender === 'Prospect',
                                })}
                                >
                                {editingIndex === index ? (
                                    <div className="flex flex-col gap-2 w-full">
                                    <Textarea 
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        autoFocus
                                        rows={Math.max(3, editingText.split('\n').length)}
                                        className="bg-background text-foreground text-sm"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setEditingIndex(null)}>Cancel</Button>
                                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                                    </div>
                                    </div>
                                ) : (
                                    message.content
                                )}
                                </div>

                                { message.sender === 'Prospect' &&
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem onClick={() => handleStartEdit(index)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSwitchSender(index)}><Repeat className="mr-2 h-4 w-4"/>Switch to Me</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteMessage(index)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                }
                            </div>
                        </div>

                        {message.sender === 'Me' && <Bot className="h-6 w-6 text-muted-foreground shrink-0 self-start mt-5" />}
                    </div>
                    ))
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        No conversation history yet. Add the first message below.
                    </div>
                )}
                </div>
            </ScrollArea>
            <div className="p-4 border-t shrink-0 space-y-3 bg-card">
                {onGenerateReply && prospect && (
                    <Accordion type="single" collapsible className="w-full -m-2 mb-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <AccordionItem value="ai-tools" className="border-none">
                        <AccordionTrigger className="text-sm font-semibold py-0 hover:no-underline">
                            <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            AI Assistant
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-3">
                            <Label htmlFor="custom-instructions" className="text-xs font-medium">Custom Instructions (Optional)</Label>
                            <Input 
                                id="custom-instructions"
                                placeholder="e.g., 'Keep it short and ask about their main challenge.'"
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                disabled={isGenerating}
                            />
                            <Button onClick={handleGenerateClick} disabled={isGenerating || !prospect} className="w-full">
                                {isGenerating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                Generate Next Reply
                            </Button>
                        </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
                
                <div className="space-y-2">
                    <Textarea
                        id="manual-message"
                        placeholder="Type your message here, or generate one above... (Shift+Enter for new line)"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-grow bg-background"
                        rows={3}
                        disabled={editingIndex !== null || isGenerating}
                    />
                    <div className="flex w-full justify-between items-center gap-4">
                        <RadioGroup value={sender} onValueChange={(val: 'Me' | 'Prospect') => setSender(val)} className="flex items-center space-x-4">
                            <Label className="text-xs">Sender:</Label>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Me" id="sender-me" />
                                <Label htmlFor="sender-me" className="font-normal text-xs">Me (Atlas)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Prospect" id="sender-them" />
                                <Label htmlFor="sender-them" className="font-normal text-xs">Prospect</Label>
                            </div>
                        </RadioGroup>
                        <Button size="sm" onClick={handleAddMessage} disabled={editingIndex !== null || isGenerating || !newMessage.trim()}>
                            <Send className="mr-2 h-4 w-4" />
                            Add Message
                        </Button>
                    </div>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="comments" className="flex-grow min-h-0 bg-background">
            <ScrollArea className="h-full p-4">
                 {(prospect?.comments && prospect.comments.length > 0) ? (
                    <div className="space-y-4">
                        {prospect.comments.slice().reverse().map((comment: GeneratedComment) => (
                             <Card key={comment.id} className="shadow-sm">
                                <CardHeader className="flex flex-row justify-between items-start pb-2">
                                    <div>
                                        <Badge variant="secondary" className="font-medium">{comment.commentType}</Badge>
                                        <p className="text-xs text-muted-foreground mt-1.5">
                                            {formatDistanceToNow(new Date(comment.generatedAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm font-medium mb-3">"{comment.commentText}"</p>
                                    <blockquote className="border-l-2 pl-3 text-xs italic text-muted-foreground">
                                        In response to post: "{comment.postDescription}"
                                    </blockquote>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center text-sm text-muted-foreground h-full flex flex-col justify-center items-center">
                        <MessageCircle className="h-10 w-10 mb-4" />
                        <p className="font-semibold">No comments logged for this prospect yet.</p>
                        <p>Generated comments will appear here after you save them.</p>
                    </div>
                 )}
            </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

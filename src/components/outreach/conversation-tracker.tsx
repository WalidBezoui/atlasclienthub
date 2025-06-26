
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { User, Bot, MoreHorizontal, Edit, Trash2, Repeat, Loader2, Sparkles, Clipboard, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import type { OutreachProspect } from '@/lib/types';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';


interface ConversationTrackerProps {
  value: string | null;
  onChange: (newValue: string) => void;
  prospect?: OutreachProspect | null;
  onGenerateReply?: (prospect: OutreachProspect, customInstructions: string) => Promise<string>;
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

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine === '' && currentMessage) {
        // Handle intentional newlines within a message
        currentMessage.content += '\n';
        return;
    }

    if (line.startsWith('Me: ') || line.startsWith('Them: ')) {
      if (currentMessage) {
          messages.push(currentMessage);
      }
      const isMe = line.startsWith('Me: ');
      currentMessage = {
        sender: isMe ? 'Me' : 'Prospect',
        content: isMe ? line.substring(4) : line.substring(6),
      };
    } else if (currentMessage) {
      // It's a continuation of the last message
      currentMessage.content += '\n' + line;
    } else if (trimmedLine !== '') {
      // It's the very first line and has no prefix, assume it's the prospect
      currentMessage = {
        sender: 'Prospect',
        content: line,
      };
    }
  });

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
};


const serializeMessages = (messages: Message[]): string => {
  return messages.map(msg => {
    const prefix = msg.sender === 'Me' ? 'Me' : 'Them';
    return `${prefix}: ${msg.content}`;
  }).join('\n\n'); 
};


export function ConversationTracker({ value, onChange, prospect, onGenerateReply }: ConversationTrackerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sender, setSender] = useState<'Me' | 'Prospect'>('Me');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMessages(parseMessages(value));
  }, [value]);

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
    scrollToBottom();
  }, [messages]);
  
  const triggerChange = (updatedMessages: Message[]) => {
      setMessages(updatedMessages);
      onChange(serializeMessages(updatedMessages));
  };

  const handleAddMessage = () => {
    if (!newMessage.trim()) return;
    const newMessages = [...messages, { sender, content: newMessage.trim() }];
    triggerChange(newMessages);
    setNewMessage('');
    scrollToBottom();
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
    triggerChange(newMessages);
  };
  
  const handleSwitchSender = (index: number) => {
    const newMessages = messages.map((msg, i) => {
        if (i === index) {
            return { ...msg, sender: msg.sender === 'Me' ? 'Prospect' : 'Me' };
        }
        return msg;
    });
    triggerChange(newMessages);
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
    triggerChange(newMessages);
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
        }
    } catch (e) {
        console.error("Failed to generate reply", e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!value) {
        toast({ title: 'Nothing to copy', description: 'The conversation is empty.' });
        return;
    }
    navigator.clipboard.writeText(value)
      .then(() => {
        toast({ title: "Copied!", description: "Full conversation copied to clipboard." });
      })
      .catch(err => {
        console.error("Failed to copy conversation: ", err);
        toast({ title: "Copy Failed", variant: "destructive" });
      });
  };

  const handleExport = () => {
     if (!value) {
        toast({ title: 'Nothing to export', description: 'The conversation is empty.' });
        return;
    }
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
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
    <div className="flex flex-col h-full bg-background rounded-lg border">
       <div className="flex items-center justify-end gap-2 px-4 py-2 border-b shrink-0">
         <Button variant="outline" size="sm" onClick={handleCopy} disabled={!value}>
            <Clipboard className="mr-2 h-4 w-4" /> Copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!value}>
            <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex items-end gap-2.5 group w-full', {
                  'justify-end': message.sender === 'Me',
                  'justify-start': message.sender === 'Prospect',
                })}
              >
                {message.sender === 'Prospect' && <User className="h-6 w-6 text-muted-foreground shrink-0" />}

                <div className={cn("flex flex-col w-full max-w-[80%] md:max-w-[70%]", { "items-end": message.sender === 'Me', "items-start": message.sender === 'Prospect' })}>
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
                             <div className="flex flex-col gap-2 min-w-64">
                              <Textarea 
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={handleKeyPress}
                                autoFocus
                                rows={Math.max(4, editingText.split('\n').length)}
                                className="bg-background text-foreground"
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

                {message.sender === 'Me' && <Bot className="h-6 w-6 text-muted-foreground shrink-0" />}
              </div>
            ))
          ) : (
             <div className="text-center text-sm text-muted-foreground py-8">
                No conversation history yet. Add the first message below.
             </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t shrink-0 space-y-4">
        {onGenerateReply && prospect && (
            <div className="flex gap-2">
                <Input 
                    id="custom-instructions"
                    placeholder="Optional: custom instructions for the AI..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    disabled={isGenerating}
                />
                <Button onClick={handleGenerateClick} disabled={isGenerating || !prospect} className="shrink-0">
                    {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                       <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate
                </Button>
            </div>
        )}
        
        <div className="space-y-2">
            <Textarea
                id="manual-message"
                placeholder="Type message, or generate one above and edit... (Shift+Enter for new line)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-grow"
                rows={3}
                disabled={editingIndex !== null || isGenerating}
            />
            <div className="flex w-full justify-between items-center">
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
                    Add Message
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { User, Bot, MoreHorizontal, Edit, Trash2, Repeat, Loader2, Sparkles } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import type { OutreachProspect } from '@/lib/types';


interface ConversationTrackerProps {
  value: string | null;
  onChange: (newValue: string) => void;
  prospect: OutreachProspect | null;
  onGenerateReply: (prospect: OutreachProspect) => Promise<string>;
}

type Message = {
  sender: 'Me' | 'Prospect';
  content: string;
};

const parseMessages = (value: string | null): Message[] => {
  if (!value) return [];
  return value
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      if (line.startsWith('Me: ')) {
        return { sender: 'Me', content: line.substring(4) };
      }
      if (line.startsWith('Them: ')) {
        return { sender: 'Prospect', content: line.substring(6) };
      }
      // Fallback for lines without a prefix, assuming it's from the prospect
      return { sender: 'Prospect', content: line };
    })
    .filter(msg => msg.content.trim() !== '');
};

const serializeMessages = (messages: Message[]): string => {
  return messages.map(msg => {
    const prefix = msg.sender === 'Me' ? 'Me' : 'Them';
    return `${prefix}: ${msg.content}`;
  }).join('\n');
};


export function ConversationTracker({ value, onChange, prospect, onGenerateReply }: ConversationTrackerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sender, setSender] = useState<'Me' | 'Prospect'>('Me');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        const reply = await onGenerateReply(prospect);
        if (reply) {
            setNewMessage(reply);
            setSender('Me'); // Default to sending as 'Me'
        }
    } catch (e) {
        // Error toast will be handled by the calling component
        console.error("Failed to generate reply", e);
    } finally {
        setIsGenerating(false);
    }
  };


  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base font-semibold">Conversation History</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow p-4 bg-muted/20" ref={scrollAreaRef}>
        <div className="space-y-1">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex items-end gap-2 group w-full', {
                  'justify-end': message.sender === 'Me',
                  'justify-start': message.sender === 'Prospect',
                })}
              >
                {message.sender === 'Prospect' && (
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
                )}

                {message.sender === 'Prospect' && <User className="h-6 w-6 text-muted-foreground shrink-0" />}

                <div
                  className={cn('rounded-lg px-3 py-2 text-sm break-words max-w-[80%]', {
                    'bg-primary text-primary-foreground': message.sender === 'Me',
                    'bg-card border': message.sender === 'Prospect',
                  })}
                >
                  {editingIndex === index ? (
                     <div className="flex flex-col gap-2 w-64">
                      <Textarea 
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        autoFocus
                        rows={3}
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

                 {message.sender === 'Me' && <Bot className="h-6 w-6 text-muted-foreground shrink-0" />}
                
                 {message.sender === 'Me' && (
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
                )}
              </div>
            ))
          ) : (
             <div className="text-center text-sm text-muted-foreground py-8">
                No conversation history yet. Add the first message below.
             </div>
          )}
        </div>
      </ScrollArea>
      <CardFooter className="p-4 border-t flex-col items-start gap-2">
        <div className="flex w-full gap-2">
            <Input
                placeholder="Type message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-grow"
                disabled={editingIndex !== null || isGenerating}
            />
            <Button onClick={handleAddMessage} disabled={editingIndex !== null || isGenerating}>Add</Button>
        </div>
         <div className="flex w-full justify-between items-center">
             <RadioGroup value={sender} onValueChange={(val: 'Me' | 'Prospect') => setSender(val)} className="flex items-center space-x-4">
                <Label>Sender:</Label>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Me" id="sender-me" />
                    <Label htmlFor="sender-me" className="font-normal">Me (Atlas Studio)</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Prospect" id="sender-them" />
                    <Label htmlFor="sender-them" className="font-normal">Prospect</Label>
                </div>
            </RadioGroup>
            
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateClick} 
                disabled={isGenerating || !prospect}
            >
                {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Reply
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

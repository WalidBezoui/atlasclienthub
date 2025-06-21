'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface ConversationTrackerProps {
  value: string | null;
  onChange: (newValue: string) => void;
}

type Message = {
  sender: 'Me' | 'Prospect';
  content: string;
};

export function ConversationTracker({ value, onChange }: ConversationTrackerProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sender, setSender] = useState<'Me' | 'Prospect'>('Me');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const messages: Message[] = useMemo(() => {
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
        // Fallback for lines without a prefix
        return { sender: 'Prospect', content: line };
      })
      .filter(msg => msg.content.trim() !== '');
  }, [value]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleAddMessage = () => {
    if (!newMessage.trim()) return;
    const prefix = sender === 'Me' ? 'Me' : 'Them';
    const newLine = `${prefix}: ${newMessage}`;
    const newValue = value ? `${value}\n${newLine}` : newLine;
    onChange(newValue);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-base font-semibold">Conversation History</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow p-4 bg-muted/20" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex items-end gap-2', {
                  'justify-end': message.sender === 'Me',
                  'justify-start': message.sender === 'Prospect',
                })}
              >
                {message.sender === 'Prospect' && <User className="h-6 w-6 text-muted-foreground shrink-0" />}
                <div
                  className={cn('rounded-lg px-3 py-2 text-sm break-words max-w-[80%]', {
                    'bg-primary text-primary-foreground': message.sender === 'Me',
                    'bg-card border': message.sender === 'Prospect',
                  })}
                >
                  {message.content}
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
      <CardFooter className="p-4 border-t flex-col items-start gap-2">
        <div className="flex w-full gap-2">
            <Input
                placeholder="Type message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-grow"
            />
            <Button onClick={handleAddMessage}>Add</Button>
        </div>
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
      </CardFooter>
    </Card>
  );
}

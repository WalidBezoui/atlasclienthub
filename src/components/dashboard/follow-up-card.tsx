
'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FollowUpAgendaItem, OutreachProspect } from '@/lib/types';
import { formatDistanceToNow, isPast, isValid } from 'date-fns';
import { Clock, Send, MessageSquare, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface FollowUpCardProps {
  item: FollowUpAgendaItem;
  onGenerateFollowUp: (prospect: OutreachProspect) => void;
}

export function FollowUpCard({ item, onGenerateFollowUp }: FollowUpCardProps) {
  const lastContactedDate = item.lastContacted ? new Date(item.lastContacted) : null;
  const isDateValid = lastContactedDate && isValid(lastContactedDate);

  const timeAgo = isDateValid ? formatDistanceToNow(lastContactedDate, { addSuffix: true }) : 'N/A';
  
  const getUrgencyColor = () => {
    if (!isDateValid) return 'text-muted-foreground';
    const daysAgo = (new Date().getTime() - lastContactedDate.getTime()) / (1000 * 3600 * 24);
    if (daysAgo > 14) return 'text-destructive';
    if (daysAgo > 7) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
         <div className="flex justify-between items-start">
            <p className="font-semibold truncate">{item.name}</p>
            <Badge variant={item.status === 'Closed - Won' ? 'default' : 'secondary'} className="text-xs">{item.status}</Badge>
         </div>
          {item.instagramHandle && (
           <a 
              href={`https://instagram.com/${item.instagramHandle.replace('@','')}`} 
              target="_blank" rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()} 
              className="text-xs text-muted-foreground truncate flex items-center gap-1.5 hover:text-primary hover:underline w-fit group"
          >
           @{item.instagramHandle}
           <LinkIcon className="h-3 w-3 text-muted-foreground/70 transition-colors group-hover:text-primary" />
          </a>
        )}
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className={cn("flex items-center text-xs font-medium", getUrgencyColor())}>
          <Clock className="mr-1.5 h-3 w-3" />
          Last contact: {timeAgo}
        </div>
        <blockquote className="border-l-2 pl-3 text-xs italic text-muted-foreground h-12 overflow-hidden relative">
          {item.lastMessageSnippet}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-card to-transparent" />
        </blockquote>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => onGenerateFollowUp(item as OutreachProspect)}>
            <Send className="mr-2 h-4 w-4" /> Generate Follow-Up
        </Button>
      </CardFooter>
    </Card>
  );
}

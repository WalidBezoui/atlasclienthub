
'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FollowUpAgendaItem, OutreachProspect } from '@/lib/types';
import { formatDistanceToNow, isPast, isValid } from 'date-fns';
import { Clock, Send, MessageSquare } from 'lucide-react';
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
    if (daysAgo > 7) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
         <div className="flex justify-between items-start">
            <p className="font-semibold truncate">{item.name}</p>
            <Badge variant={item.status === 'Closed - Won' ? 'default' : 'secondary'}>{item.status}</Badge>
         </div>
         <p className="text-xs text-muted-foreground">@{item.instagramHandle}</p>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className={cn("flex items-center text-xs", getUrgencyColor())}>
          <Clock className="mr-1.5 h-3 w-3" />
          Last contact: {timeAgo}
        </div>
        <blockquote className="border-l-2 pl-3 text-xs italic text-muted-foreground h-12 overflow-hidden relative">
          {item.lastMessageSnippet}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-card to-transparent" />
        </blockquote>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => onGenerateFollowUp(item)}>
            <Send className="mr-2 h-4 w-4" /> Generate Follow-Up
        </Button>
      </CardFooter>
    </Card>
  );
}

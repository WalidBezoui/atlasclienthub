
'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RevivalAgendaItem, OutreachProspect, OutreachLeadStage } from '@/lib/types';
import { formatDistanceToNow, isValid, differenceInDays } from 'date-fns';
import { Send, TrendingUp, Sparkles, Star, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface RevivalCardProps {
  item: RevivalAgendaItem;
  onGenerateScript: (prospect: OutreachProspect, scriptType: 'Warm Follow-Up DM' | 'Soft Close', onConfirm: (script: string) => void) => void;
  onLogActivity: (prospect: OutreachProspect) => void;
}

export function RevivalCard({ item, onGenerateScript, onLogActivity }: RevivalCardProps) {
  const lastContactedDate = item.lastContacted ? new Date(item.lastContacted) : null;
  const isDateValid = lastContactedDate && isValid(lastContactedDate);
  const timeAgo = isDateValid ? formatDistanceToNow(lastContactedDate, { addSuffix: true }) : 'N/A';

  const getActionDetails = () => {
    switch (item.revivalDay) {
      case 2:
        return {
          title: "Day 2: Soft Value Nudge",
          description: "Re-open the conversation with a new, valuable insight from their audit.",
          buttonText: "Generate Value Nudge",
          icon: Sparkles,
          onClick: () => onGenerateScript(item, 'Warm Follow-Up DM', () => onLogActivity(item)),
        };
      case 3:
        return {
          title: "Day 3: Social Proof Drip",
          description: "Post a relevant case study or result and log it here to keep the prospect warm.",
          buttonText: "Log Social Proof Post",
          icon: TrendingUp,
          onClick: () => onLogActivity(item),
        };
      case 4:
        return {
          title: "Day 4: Scarcity Trigger",
          description: "Create urgency by mentioning you are closing client slots for the month.",
          buttonText: "Generate Scarcity Message",
          icon: Star,
          onClick: () => onGenerateScript(item, 'Soft Close', () => onLogActivity(item)),
        };
    }
  };
  
  const actionDetails = getActionDetails();
  const ActionIcon = actionDetails.icon;

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500/50">
      <CardHeader className="pb-2">
         <div className="flex justify-between items-start">
            <CardTitle className="font-semibold text-base truncate">{item.name}</CardTitle>
            <Badge variant="secondary" className="text-xs">Day {item.revivalDay}</Badge>
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
        <div className="flex items-center text-xs font-medium text-muted-foreground">
          <p>Audit sent {timeAgo}</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-sm font-semibold flex items-center"><ActionIcon className="mr-2 h-4 w-4 text-blue-500"/>{actionDetails.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{actionDetails.description}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={actionDetails.onClick}>
          <Send className="mr-2 h-4 w-4" /> {actionDetails.buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
}

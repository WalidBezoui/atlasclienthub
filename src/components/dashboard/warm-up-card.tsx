
'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WarmUpPipelineItem, OutreachProspect, WarmUpAction } from '@/lib/types';
import { formatDistanceToNow, isPast, isToday } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { MessagesSquare, Heart, Eye, MessageCircle, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WarmUpCardProps {
  item: WarmUpPipelineItem;
  onLogActivity: (prospectId: string, action: WarmUpAction) => void;
  onOpenWarmUpDialog: (prospect: WarmUpPipelineItem) => void;
  onGenerateOutreach: (prospect: WarmUpPipelineItem) => void;
}

export function WarmUpCard({ item, onLogActivity, onOpenWarmUpDialog, onGenerateOutreach }: WarmUpCardProps) {
  
  const getUrgencyBadge = (): { text: string; variant: "destructive" | "secondary" | "outline" } => {
    if (!item.nextActionDue) return { text: "Next", variant: "secondary" };
    try {
        const dueDate = new Date(item.nextActionDue);
        if (isNaN(dueDate.getTime())) return { text: "Next", variant: "secondary" };
        if (isPast(dueDate) && !isToday(dueDate)) return { text: "Overdue", variant: "destructive" };
        if (isToday(dueDate)) return { text: "Due Today", variant: "secondary" };
        return { text: `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`, variant: "outline" };
    } catch {
        return { text: "Next", variant: "secondary" };
    }
  };

  const { text, variant } = getUrgencyBadge();

  const handleQuickAction = (e: React.MouseEvent, action: WarmUpAction) => {
    e.stopPropagation();
    onLogActivity(item.id, action);
  };
  
  const quickActionIcons: { action: WarmUpAction; icon: React.ElementType; tooltip: string }[] = [
    { action: 'Liked Posts', icon: Heart, tooltip: "Log 'Liked Posts'" },
    { action: 'Viewed Story', icon: Eye, tooltip: "Log 'Viewed Story'" },
    { action: 'Left Comment', icon: MessageCircle, tooltip: 'Open Comment Generator' },
  ];

  return (
    <div 
        className="p-3 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col" 
        onClick={() => onOpenWarmUpDialog(item)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate text-sm group-hover:underline">{item.name}</p>
           <a 
                href={`https://instagram.com/${item.instagramHandle?.replace('@','')}`} 
                target="_blank" rel="noopener noreferrer" 
                onClick={(e) => e.stopPropagation()} 
                className="text-xs text-muted-foreground truncate flex items-center gap-1.5 hover:text-primary hover:underline w-fit group"
            >
             @{item.instagramHandle || 'N/A'}
             <LinkIcon className="h-3 w-3 text-muted-foreground/70 transition-colors group-hover:text-primary" />
            </a>
        </div>
         <TooltipProvider>
            <div className="flex items-center gap-1">
                 {quickActionIcons.map(({action, icon: Icon, tooltip}) => {
                     const isDone = item.completedActions.includes(action);
                     return (
                         <Tooltip key={action}>
                             <TooltipTrigger asChild>
                                <Button 
                                    variant={isDone ? 'secondary' : 'ghost'} 
                                    size="icon" 
                                    className="h-7 w-7" 
                                    onClick={(e) => handleQuickAction(e, action)} 
                                    disabled={isDone}
                                >
                                    <Icon className={cn("h-4 w-4", isDone && 'text-muted-foreground')} />
                                </Button>
                             </TooltipTrigger>
                             <TooltipContent><p>{isDone ? `Already logged '${action}'` : tooltip}</p></TooltipContent>
                         </Tooltip>
                     );
                 })}
            </div>
        </TooltipProvider>
      </div>
      <div className="mt-2 space-y-2 flex-grow">
        <div>
            <div className="text-xs flex justify-between items-center mb-1">
                <span className="font-medium text-muted-foreground">Progress</span>
                <span className="font-semibold">{Math.round(item.progress)}%</span>
            </div>
            <Progress value={item.progress} className="h-1.5"/>
        </div>
        <div className="text-xs flex justify-between pt-1 items-center">
            <span className="text-muted-foreground">Next: <span className="font-medium text-foreground">{item.nextAction}</span></span>
            <Badge variant={variant} className="text-xs">{text}</Badge>
        </div>
      </div>
      <div className="pt-3 mt-auto">
         <Button variant="default" size="sm" className="w-full h-8" onClick={(e) => { e.stopPropagation(); onGenerateOutreach(item); }} disabled={item.completedActions.includes('Replied to Story')}>
             <MessagesSquare className="mr-2 h-4 w-4"/> Generate Outreach DM
         </Button>
      </div>
    </div>
  );
};

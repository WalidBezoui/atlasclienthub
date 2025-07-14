
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { OutreachProspect, OutreachLeadStage, ScriptLanguage } from '@/lib/types';
import { OUTREACH_LEAD_STAGE_OPTIONS, SCRIPT_LANGUAGES } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreHorizontal, Edit, MessagesSquare, GraduationCap, Bot, MessageCircle, FileQuestion, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ProspectMobileCardProps {
  prospect: OutreachProspect;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onStatusChange: (id: string, newStatus: OutreachLeadStage) => void;
  onEdit: (prospect: OutreachProspect) => void;
  onViewConversation: (prospect: OutreachProspect) => void;
  onStartAudit: (prospect: OutreachProspect) => void;
  onGenerateComment: (prospect: OutreachProspect) => void;
  onGenerateQualifier: (prospect: OutreachProspect) => void;
  onEvaluate: (prospect: OutreachProspect) => void;
  onDelete: (prospect: OutreachProspect) => void;
  onGenerateScript: (prospect: OutreachProspect, scriptType: any, language: ScriptLanguage) => void;
}

const ProspectMobileCard = React.memo(({
  prospect,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onEdit,
  onViewConversation,
  onStartAudit,
  onGenerateComment,
  onGenerateQualifier,
  onEvaluate,
  onDelete,
  onGenerateScript
}: ProspectMobileCardProps) => {

    const formatNumber = (num: number | null | undefined): string => {
        if (num === null || num === undefined) return '-';
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
        return num.toString();
    };

    const getStatusBadgeVariant = (status: OutreachLeadStage): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case 'Closed - Won': case 'Audit Delivered': case 'Ready for Audit': case 'Replied': case 'Interested': return 'default';
            case 'Warm': case 'Qualifier Sent': return 'secondary';
            case 'Cold': case 'To Contact': return 'outline';
            case 'Closed - Lost': case 'Not Interested': return 'destructive';
            default: return 'default';
        }
    };
    
    return (
        <Card className={cn("p-4", prospect.followUpNeeded && 'bg-primary/10')}>
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3 flex-grow min-w-0">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(prospect.id)}
                        className="mt-1"
                        aria-label={`Select prospect ${prospect.name}`}
                    />
                    <div className="flex-grow min-w-0">
                        <p className="font-semibold truncate">{prospect.name}</p>
                        <a
                            href={`https://instagram.com/${prospect.instagramHandle?.replace('@', '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:underline truncate"
                        >
                            {prospect.instagramHandle || 'N/A'}
                        </a>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1"><MoreHorizontal className="h-4 w-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(prospect)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewConversation(prospect)}><MessagesSquare className="mr-2 h-4 w-4"/>Conversation</DropdownMenuItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuSub>
                           <DropdownMenuSubTrigger><Bot className="mr-2 h-4 w-4"/>AI Actions</DropdownMenuSubTrigger>
                           <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => onEvaluate(prospect)}>Evaluate</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onGenerateComment(prospect)}>Generate Comment</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onGenerateQualifier(prospect)}>Ask Qualifier Question</DropdownMenuItem>
                           </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                           <DropdownMenuSubTrigger><Bot className="mr-2 h-4 w-4"/>Generate Script</DropdownMenuSubTrigger>
                           <DropdownMenuSubContent>
                               <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Cold Outreach DM</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {SCRIPT_LANGUAGES.map(lang => (
                                            <DropdownMenuItem key={lang} onClick={() => onGenerateScript(prospect, 'Cold Outreach DM', lang)}>{lang}</DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                               </DropdownMenuSub>
                               <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Warm Follow-Up</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {SCRIPT_LANGUAGES.map(lang => (
                                            <DropdownMenuItem key={lang} onClick={() => onGenerateScript(prospect, 'Warm Follow-Up DM', lang)}>{lang}</DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                               </DropdownMenuSub>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Deliver Audit</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {SCRIPT_LANGUAGES.map(lang => (
                                            <DropdownMenuItem key={lang} onClick={() => onGenerateScript(prospect, 'Audit Delivery Message', lang)}>{lang}</DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                               </DropdownMenuSub>
                           </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator/>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-full">
                                        <DropdownMenuItem disabled={!prospect.status.startsWith("Ready")} onClick={() => onStartAudit(prospect)}>
                                            <GraduationCap className="mr-2 h-4 w-4"/>Create Audit
                                        </DropdownMenuItem>
                                    </div>
                                </TooltipTrigger>
                                {!prospect.status.startsWith("Ready") && <TooltipContent><p>Status must be 'Ready for Audit'</p></TooltipContent>}
                            </Tooltip>
                        </TooltipProvider>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem onClick={() => onDelete(prospect)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mt-3 text-xs">
                <div className="bg-muted/50 p-1.5 rounded-md">
                    <p className="font-bold">{formatNumber(prospect.followerCount)}</p>
                    <p className="text-muted-foreground">Followers</p>
                </div>
                 <div className="bg-muted/50 p-1.5 rounded-md">
                    <p className="font-bold">{formatNumber(prospect.postCount)}</p>
                    <p className="text-muted-foreground">Posts</p>
                </div>
                 <div className="bg-muted/50 p-1.5 rounded-md">
                   <p className="font-bold">{prospect.leadScore ?? '-'}</p>
                   <p className="text-muted-foreground">Score</p>
                </div>
            </div>
            <div className="mt-3">
                <Select
                  value={prospect.status}
                  onValueChange={(newStatus: OutreachLeadStage) => onStatusChange(prospect.id, newStatus)}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue asChild>
                       <Badge variant={getStatusBadgeVariant(prospect.status)} className="cursor-pointer text-xs whitespace-nowrap">
                          {prospect.status}
                        </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {OUTREACH_LEAD_STAGE_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
        </Card>
    );
});
ProspectMobileCard.displayName = "ProspectMobileCard";

export { ProspectMobileCard };

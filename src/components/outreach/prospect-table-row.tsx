

'use client';

import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreHorizontal, Link as LinkIcon, Bot, MessageCircle, MessagesSquare, GraduationCap, FileQuestion, Loader2, Star, Languages, Flame, UserPlus, Clock, Clipboard, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { OutreachProspect, OutreachLeadStage, WarmUpAction } from '@/lib/types';
import { OUTREACH_LEAD_STAGE_OPTIONS } from '@/lib/types';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';

const ProspectTimelineTooltip = ({ prospect }: { prospect: OutreachProspect }) => {
    if (!prospect.createdAt) return null;

    const history = [
        { status: 'Added' as const, date: prospect.createdAt },
        ...(prospect.statusHistory || [])
    ];
    
    const uniqueHistoryMap = new Map<string, {status: OutreachLeadStage | 'Added', date: string}>();
    history.forEach(event => {
        const key = `${event.status}_${new Date(event.date).toISOString()}`;
        if (!uniqueHistoryMap.has(key)) {
            uniqueHistoryMap.set(key, event);
        }
    });
    const uniqueHistory = Array.from(uniqueHistoryMap.values());

    return (
        <TooltipContent>
            <div className="p-2 space-y-1.5 text-xs w-56">
                <p className="font-bold mb-1">Prospect Timeline</p>
                <Separator />
                {uniqueHistory.map((event, index) => (
                    <div key={index} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{event.status}</span>
                        <span className="font-medium">{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                ))}
            </div>
        </TooltipContent>
    );
};


const scriptMenuItems = [
    { label: "Cold Outreach DM", type: "Cold Outreach DM" },
    { label: "Warm Follow-Up DM", type: "Warm Follow-Up DM" },
    { label: "Conversation Starter", type: "Conversation Starter" },
    { label: "Audit Delivery Message", type: "Audit Delivery Message" },
    { label: "Send Reminder", type: "Send Reminder" },
    { label: "Soft Close", type: "Soft Close" },
];

interface ProspectTableRowProps {
  prospect: OutreachProspect;
  isSelected: boolean;
  isEvaluating: boolean;
  onToggleSelect: (id: string) => void;
  onFollowUpToggle: (id: string, status: boolean) => void;
  onStatusChange: (id: string, newStatus: OutreachLeadStage) => void;
  onEdit: (prospect: OutreachProspect) => void;
  onViewConversation: (prospect: OutreachProspect) => void;
  onStartAudit: (prospect: OutreachProspect) => void;
  onGenerateComment: (prospect: OutreachProspect) => void;
  onGenerateQualifier: (prospect: OutreachProspect) => void;
  onGenerateScript: (prospect: OutreachProspect, scriptType: any) => void;
  onEvaluate: (prospect: OutreachProspect) => void;
  onDelete: (prospect: OutreachProspect) => void;
  onWarmUp: (prospect: OutreachProspect) => void;
  onCopyDetails: (prospect: OutreachProspect) => void;
  onExportDetails: (prospect: OutreachProspect) => void;
}

const ProspectTableRow = React.memo(({
  prospect,
  isSelected,
  isEvaluating,
  onToggleSelect,
  onFollowUpToggle,
  onStatusChange,
  onEdit,
  onViewConversation,
  onStartAudit,
  onGenerateComment,
  onGenerateQualifier,
  onGenerateScript,
  onEvaluate,
  onDelete,
  onWarmUp,
  onCopyDetails,
  onExportDetails,
}: ProspectTableRowProps) => {

    const formatNumber = (num: number | null | undefined): string => {
        if (num === null || num === undefined) return '-';
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
        return num.toString();
    };

    const getStatusBadgeVariant = (status: OutreachLeadStage): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case 'Closed - Won': case 'Audit Delivered': case 'Ready for Audit': case 'Replied': case 'Interested': return 'default';
            case 'Warming Up': case 'Warm': case 'Qualifier Sent': case 'Quote Sent': case 'Quote Delivered': return 'secondary';
            case 'Cold': case 'To Contact': return 'outline';
            case 'Closed - Lost': case 'Not Interested': return 'destructive';
            default: return 'default';
        }
    };
    
    const calculateWarmUpProgress = (prospect: OutreachProspect): number => {
      const actions = new Set((prospect.warmUp || []).map(a => a.action));
      if (prospect.conversationHistory?.includes("Me:")) {
        actions.add('Replied to Story');
      }
      return (actions.size / 4) * 100;
    };


    const getLeadScoreBadgeVariant = (score: number | null | undefined): "default" | "secondary" | "destructive" => {
        if (score === null || score === undefined) return "secondary";
        if (score >= 60) return "default";
        if (score >= 30) return "secondary";
        return "destructive";
    };

    const getActivityText = (prospect: OutreachProspect): { text: string, isNext: boolean } => {
        if (prospect.status === 'Warming Up') {
            const actions = new Set((prospect.warmUp || []).map(a => a.action));
            if (prospect.conversationHistory?.includes("Me:")) {
                actions.add('Replied to Story');
            }
            let nextAction: WarmUpAction | 'Done' = 'Liked Posts';
            if (actions.has('Liked Posts')) nextAction = 'Viewed Story';
            if (actions.has('Viewed Story')) nextAction = 'Left Comment';
            if (actions.has('Left Comment')) nextAction = 'Replied to Story';
            if (actions.has('Replied to Story')) nextAction = 'Done';
            
            return { text: `Next: ${nextAction === 'Done' ? 'Send DM' : nextAction}`, isNext: true };
        }

        const dates = [
            prospect.createdAt,
            prospect.lastContacted,
            ...(prospect.statusHistory?.map(h => h.date) || [])
        ].filter(d => d).map(d => new Date(d!).getTime());
        
        const mostRecentDate = Math.max(0, ...dates);
        if (mostRecentDate === 0) return { text: '-', isNext: false };

        try {
            return { text: `${formatDistanceToNow(new Date(mostRecentDate), { addSuffix: true })}`, isNext: false };
        } catch { return { text: '-', isNext: false }; }
    };
    
    const activityInfo = getActivityText(prospect);

    return (
        <TableRow data-follow-up={!!prospect.followUpNeeded} className="data-[follow-up=true]:bg-primary/10" data-selected={isSelected}>
            <TableCell className="p-2">
                <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(prospect.id)} aria-label={`Select prospect ${prospect.name}`}/>
            </TableCell>
            <TableCell className="p-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Checkbox
                                checked={!!prospect.followUpNeeded}
                                onCheckedChange={() => onFollowUpToggle(prospect.id, !!prospect.followUpNeeded)}
                                aria-label={`Mark ${prospect.name} as needs follow-up`}
                                className="h-5 w-5"
                            />
                        </TooltipTrigger>
                        <TooltipContent><p>Mark for Follow-up</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </TableCell>
            <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                    <div>
                        {prospect.name}
                        <br/>
                        {prospect.instagramHandle ? (
                            <a href={`https://instagram.com/${prospect.instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                {prospect.instagramHandle}
                                <LinkIcon className="h-3 w-3" />
                            </a>
                        ) : (<span className="text-xs text-muted-foreground italic">No handle</span>)}
                    </div>
                </div>
            </TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">{formatNumber(prospect.followerCount)}</TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">{formatNumber(prospect.postCount)}</TableCell>
            <TableCell className="hidden sm:table-cell">
               {prospect.status === 'Warming Up' ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="w-full">
                                <Progress value={calculateWarmUpProgress(prospect)} className="h-1.5" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Warm-up Progress: {Math.round(calculateWarmUpProgress(prospect))}%</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <Select value={prospect.status} onValueChange={(newStatus: OutreachLeadStage) => onStatusChange(prospect.id, newStatus)}>
                        <SelectTrigger className="h-auto py-0.5 px-2.5 border-none shadow-none [&>span]:flex [&>span]:items-center text-xs w-auto min-w-[100px]">
                            <SelectValue asChild>
                                <Badge variant={getStatusBadgeVariant(prospect.status)} className="cursor-pointer text-xs whitespace-nowrap">{prospect.status}</Badge>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>{OUTREACH_LEAD_STAGE_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                    </Select>
                )}
            </TableCell>
            <TableCell className="hidden md:table-cell">
                {prospect.leadScore !== null && prospect.leadScore !== undefined ? (
                    <Badge variant={getLeadScoreBadgeVariant(prospect.leadScore)}>{prospect.leadScore}</Badge>
                ) : (<Badge variant="outline">-</Badge>)}
            </TableCell>
            <TableCell className={cn("hidden xl:table-cell text-muted-foreground text-xs", activityInfo.isNext && "text-amber-600 dark:text-amber-500 font-medium")}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-help flex items-center gap-1.5">
                                {activityInfo.isNext && <Clock className="h-3 w-3" />}
                                {activityInfo.text}
                            </span>
                        </TooltipTrigger>
                        <ProspectTimelineTooltip prospect={prospect} />
                    </Tooltip>
                </TooltipProvider>
            </TableCell>
            <TableCell className="text-right space-x-0.5">
                <TooltipProvider>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isEvaluating}>
                                {isEvaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                <span className="sr-only">Actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => onWarmUp(prospect)}><Flame className="mr-2 h-4 w-4"/>Warm Up</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEdit(prospect)}><Edit className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onViewConversation(prospect)}><MessagesSquare className="mr-2 h-4 w-4" /> Manage Conversation</DropdownMenuItem>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className={cn(!prospect.status.startsWith("Ready") && "cursor-not-allowed w-full")}>
                                            <DropdownMenuItem disabled={!prospect.status.startsWith("Ready")} className={cn(!prospect.status.startsWith("Ready") && "cursor-not-allowed")} onClick={() => prospect.status.startsWith("Ready") && onStartAudit(prospect)} >
                                                <GraduationCap className="mr-2 h-4 w-4" /> Create Audit
                                            </DropdownMenuItem>
                                        </div>
                                    </TooltipTrigger>
                                    {!prospect.status.startsWith("Ready") && <TooltipContent><p>Status must be 'Ready for Audit'</p></TooltipContent>}
                                </Tooltip>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>AI Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onEvaluate(prospect)} disabled={!prospect.instagramHandle}><Bot className="mr-2 h-4 w-4" /> Fetch & Evaluate</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onGenerateComment(prospect)}><MessageCircle className="mr-2 h-4 w-4" /> Generate Comment</DropdownMenuItem>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className={cn(!['Interested', 'Replied'].includes(prospect.status) && "cursor-not-allowed w-full")}>
                                            <DropdownMenuItem disabled={!['Interested', 'Replied'].includes(prospect.status)} className={cn(!['Interested', 'Replied'].includes(prospect.status) && "cursor-not-allowed")} onClick={() => ['Interested', 'Replied'].includes(prospect.status) && onGenerateQualifier(prospect)}>
                                                <FileQuestion className="mr-2 h-4 w-4" /> Ask Qualifier Question
                                            </DropdownMenuItem>
                                        </div>
                                    </TooltipTrigger>
                                    {!['Interested', 'Replied'].includes(prospect.status) && <TooltipContent><p>Status must be 'Interested' or 'Replied'</p></TooltipContent>}
                                </Tooltip>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger><Bot className="mr-2 h-4 w-4" /> Generate Script</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {scriptMenuItems.map(item => (
                                            <DropdownMenuItem key={item.type} onClick={() => onGenerateScript(prospect, item.type)}>
                                                {item.label}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                             <DropdownMenuSub>
                                <DropdownMenuSubTrigger><FileText className="mr-2 h-4 w-4" /> Export Details</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => onCopyDetails(prospect)}>
                                        <Clipboard className="mr-2 h-4 w-4" />
                                        Copy to Clipboard
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onExportDetails(prospect)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Export to .txt File
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem onClick={() => onDelete(prospect)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Prospect</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TooltipProvider>
            </TableCell>
        </TableRow>
    );
});
ProspectTableRow.displayName = "ProspectTableRow";

export { ProspectTableRow };

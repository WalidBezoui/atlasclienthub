
'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Copy, Save, Lightbulb, HelpCircle, Heart, BookOpen, ClipboardCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { OutreachProspect, GeneratedComment, CommentType } from '@/lib/types';
import { COMMENT_TYPES } from '@/lib/types';
import { generateComment, GenerateCommentInput } from '@/ai/flows/generate-comment';
import { updateProspect } from '@/lib/firebase/services';

interface CommentGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: OutreachProspect | null;
  onCommentAdded: () => void;
}

const commentTypeIcons: Record<CommentType, React.ElementType> = {
  "Value-add": Lightbulb,
  "Question": HelpCircle,
  "Compliment": Heart,
  "Story-based": BookOpen,
};

const commentTypeDescriptions: Record<CommentType, string> = {
    "Value-add": "Offer a helpful tip or insight.",
    "Question": "Ask a thoughtful, open-ended question.",
    "Compliment": "Give a specific, genuine compliment.",
    "Story-based": "Relate with a short, relevant anecdote.",
};

export function CommentGeneratorDialog({ isOpen, onClose, prospect, onCommentAdded }: CommentGeneratorDialogProps) {
  const [postDescription, setPostDescription] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('Value-add');
  const [generatedComment, setGeneratedComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { toast } = useToast();

  const resetState = () => {
    setPostDescription('');
    setCommentType('Value-add');
    setGeneratedComment('');
    setIsLoading(false);
    setIsSaving(false);
    setIsCopied(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const prospectContextString = useMemo(() => {
    if (!prospect) return '';
    const contextParts = [
      `Name: ${prospect.name}`,
      `Handle: ${prospect.instagramHandle || 'N/A'}`,
      `Industry: ${prospect.industry || 'N/A'}`,
      `Business Type: ${prospect.businessType || 'N/A'}`,
      prospect.goals && `Goals: ${prospect.goals.join(', ')}`,
      prospect.painPoints && `Pain Points: ${prospect.painPoints.join(', ')}`,
      prospect.conversationHistory && `\n--- CONVERSATION HISTORY ---\n${prospect.conversationHistory}`
    ];
    return contextParts.filter(Boolean).join('\n');
  }, [prospect]);

  const handleGenerate = async () => {
    if (!prospect || !postDescription.trim()) {
      toast({ title: 'Missing Information', description: 'Please describe the post to comment on.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    setGeneratedComment('');

    const input: GenerateCommentInput = {
      prospectContext: prospectContextString,
      postDescription,
      commentType,
    };
    
    try {
      const result = await generateComment(input);
      setGeneratedComment(result.comment);
      toast({ title: 'Comment Generated!', description: 'Review your new comment below.' });
    } catch (error: any) {
      toast({ title: 'Generation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedComment) return;
    navigator.clipboard.writeText(generatedComment);
    setIsCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveComment = async () => {
    if (!prospect || !generatedComment) {
      toast({ title: 'Cannot Save', description: 'No comment has been generated.', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    
    const newComment: GeneratedComment = {
      id: crypto.randomUUID(),
      postDescription: postDescription,
      commentText: generatedComment,
      commentType: commentType,
      generatedAt: new Date().toISOString(),
    };

    const updatedComments = [...(prospect.comments || []), newComment];
    
    try {
      await updateProspect(prospect.id, { comments: updatedComments });
      toast({ title: 'Comment Saved!', description: `The comment has been logged for ${prospect.name}.` });
      onCommentAdded();
      handleClose();
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-primary" /> Generate Strategic Comment
          </DialogTitle>
          <DialogDescription>
            For prospect: <span className="font-semibold text-foreground">{prospect?.name || '...'}</span>. Describe their post and choose a style.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow min-h-0 -mx-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 px-6">
            {/* Left Side: Input */}
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="post-description" className="font-semibold">1. Describe the Prospect's Post</Label>
                <Textarea
                  id="post-description"
                  placeholder="e.g., 'A carousel post about 3 mistakes to avoid when designing a logo...'"
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  rows={6}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">2. Choose a Comment Style</Label>
                <RadioGroup value={commentType} onValueChange={(v: CommentType) => setCommentType(v)} className="grid grid-cols-2 gap-2">
                  {COMMENT_TYPES.map((type) => {
                    const Icon = commentTypeIcons[type];
                    return (
                      <Label
                        key={type}
                        htmlFor={type}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-md border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary',
                          commentType === type ? 'border-primary' : 'border-muted'
                        )}
                      >
                        <RadioGroupItem value={type} id={type} className="sr-only" />
                        <Icon className="mb-2 h-6 w-6" />
                        <span className="font-semibold text-xs text-center">{type}</span>
                        <span className="text-xs text-muted-foreground text-center">{commentTypeDescriptions[type]}</span>
                      </Label>
                    )
                  })}
                </RadioGroup>
              </div>
              <Button onClick={handleGenerate} disabled={isLoading || !postDescription.trim()} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Generate
              </Button>
            </div>

            {/* Right Side: Output & Context */}
            <div className="flex flex-col gap-4 bg-muted/50 p-4 rounded-lg">
              <Label className="font-semibold">3. Generated Comment</Label>
              <div className="relative flex-grow">
                <Textarea
                  readOnly
                  value={generatedComment || (isLoading ? 'AI is thinking...' : "Your generated comment will appear here.")}
                  className="h-full resize-none text-sm min-h-[150px]"
                />
                {generatedComment && (
                  <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={handleCopyToClipboard}>
                      {isCopied ? <ClipboardCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-xs">For Context: Prospect Details</Label>
                <ScrollArea className="h-32 rounded-md border bg-background p-2">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                    {prospectContextString}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4 shrink-0">
          <Button variant="outline" onClick={handleClose}>Close</Button>
          <Button onClick={handleSaveComment} disabled={isSaving || !generatedComment}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Comment to Prospect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

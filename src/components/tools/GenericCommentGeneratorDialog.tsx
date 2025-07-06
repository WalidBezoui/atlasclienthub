
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Copy, Lightbulb, HelpCircle, Heart, BookOpen, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommentType } from '@/lib/types';
import { COMMENT_TYPES } from '@/lib/types';
import { generateGenericComment, GenerateGenericCommentInput } from '@/ai/flows/generate-generic-comment';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GenericCommentGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
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

export function GenericCommentGeneratorDialog({ isOpen, onClose }: GenericCommentGeneratorDialogProps) {
  const [postDescription, setPostDescription] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('Value-add');
  const [postAuthorInfo, setPostAuthorInfo] = useState('');
  const [generatedComment, setGeneratedComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setPostDescription('');
    setCommentType('Value-add');
    setPostAuthorInfo('');
    setGeneratedComment('');
    setIsLoading(false);
    setIsCopied(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGenerate = async () => {
    if (!postDescription.trim()) {
      toast({ title: 'Missing Information', description: 'Please describe the post to comment on.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    setGeneratedComment('');

    const input: GenerateGenericCommentInput = {
      postDescription,
      commentType,
      postAuthorInfo: postAuthorInfo.trim() || undefined,
    };
    
    try {
      const result = await generateGenericComment(input);
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline text-2xl flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-primary" /> General Comment Generator
          </DialogTitle>
          <DialogDescription>
            Craft a high-quality comment for any post, without needing a prospect context.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow min-h-0 -mx-6 px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Left Side: Input */}
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="post-description-generic" className="font-semibold">1. Describe the Post</Label>
                  <Textarea
                    id="post-description-generic"
                    placeholder="e.g., 'A carousel post about 3 mistakes to avoid when designing a logo...'"
                    value={postDescription}
                    onChange={(e) => setPostDescription(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-author-info" className="font-semibold">2. Author Context (Optional)</Label>
                  <Input
                    id="post-author-info"
                    placeholder="e.g., 'A freelance graphic designer'"
                    value={postAuthorInfo}
                    onChange={(e) => setPostAuthorInfo(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">3. Choose a Comment Style</Label>
                  <RadioGroup value={commentType} onValueChange={(v: CommentType) => setCommentType(v)} className="grid grid-cols-2 gap-2">
                    {COMMENT_TYPES.map((type) => {
                      const Icon = commentTypeIcons[type];
                      return (
                        <Label
                          key={type}
                          htmlFor={`generic-${type}`}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-md border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary',
                            commentType === type ? 'border-primary' : 'border-muted'
                          )}
                        >
                          <RadioGroupItem value={type} id={`generic-${type}`} className="sr-only" />
                          <Icon className="mb-2 h-5 w-5" />
                          <span className="font-semibold text-xs text-center">{type}</span>
                          <span className="text-xs text-muted-foreground text-center">{commentTypeDescriptions[type]}</span>
                        </Label>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>

              {/* Right Side: Output */}
              <div className="flex flex-col gap-4 bg-muted/50 p-4 rounded-lg">
                <Label className="font-semibold">4. Generated Comment</Label>
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
                 <Button onClick={handleGenerate} disabled={isLoading || !postDescription.trim()} className="w-full mt-auto">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              </div>
            </div>
          </ScrollArea>
        <DialogFooter className="border-t pt-4 shrink-0">
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

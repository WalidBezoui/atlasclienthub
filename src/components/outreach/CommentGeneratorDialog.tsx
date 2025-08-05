

'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Copy, Save, Lightbulb, HelpCircle, Heart, BookOpen, ClipboardCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { OutreachProspect, GeneratedComment, CommentType, WarmUpActivity } from '@/lib/types';
import { COMMENT_TYPES } from '@/lib/types';
import { generateComment, GenerateCommentInput } from '@/ai/flows/generate-comment';
import { updateProspect } from '@/lib/firebase/services';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CommentGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: OutreachProspect | null;
  onCommentAdded: (updatedProspect: OutreachProspect) => void;
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
  const [activeTab, setActiveTab] = useState('post');

  const { toast } = useToast();

  const resetState = () => {
    setPostDescription('');
    setCommentType('Value-add');
    setGeneratedComment('');
    setIsLoading(false);
    setIsSaving(false);
    setIsCopied(false);
    setActiveTab('post');
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
      prospect.goals && `Goals: ${prospect.goals.join(', ')}`,
      prospect.painPoints && `Pain Points: ${prospect.painPoints.join(', ')}`,
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
    setActiveTab('result');

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

    const newWarmUpActivity: WarmUpActivity = {
      id: crypto.randomUUID(),
      action: 'Left Comment',
      date: new Date().toISOString(),
      nextActionDue: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const updatedWarmUp = [...(prospect.warmUp || []), newWarmUpActivity];
    const updatedProspectData = { ...prospect, comments: updatedComments, warmUp: updatedWarmUp };
    
    try {
      await updateProspect(prospect.id, { comments: updatedComments, warmUp: updatedWarmUp });
      toast({ title: 'Comment Saved & Activity Logged!', description: `The comment has been logged for ${prospect.name}.` });
      onCommentAdded(updatedProspectData);
      handleClose();
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg h-[90vh] flex flex-col p-0">
        <DialogHeader className="shrink-0 p-6 pb-2">
          <DialogTitle className="font-headline text-2xl flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-primary" /> Generate Comment
          </DialogTitle>
          <DialogDescription>
            For prospect: <span className="font-semibold text-foreground">{prospect?.name || '...'}</span>
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="post">1. Post</TabsTrigger>
              <TabsTrigger value="style">2. Style</TabsTrigger>
              <TabsTrigger value="result">3. Result</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-grow min-h-0">
            <div className="p-6">
              <TabsContent value="post" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="post-description" className="font-semibold">Describe the Prospect's Post</Label>
                  <Textarea
                    id="post-description"
                    placeholder="e.g., 'A carousel post about 3 mistakes to avoid when designing a logo...'"
                    value={postDescription}
                    onChange={(e) => setPostDescription(e.target.value)}
                    rows={8}
                    className="text-sm"
                  />
                </div>
                 <div className="space-y-2">
                    <Label className="font-semibold text-xs">For Context: Prospect Details</Label>
                    <div className="h-32 rounded-md border bg-muted/50 p-2">
                      <ScrollArea className="h-full">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                          {prospectContextString}
                        </pre>
                      </ScrollArea>
                    </div>
                </div>
              </TabsContent>
              
              <TabsContent value="style" className="mt-0 space-y-4">
                 <div className="space-y-2">
                  <Label className="font-semibold">Choose a Comment Style</Label>
                  <RadioGroup value={commentType} onValueChange={(v: CommentType) => setCommentType(v)} className="grid grid-cols-2 gap-3">
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
                          <span className="text-xs text-muted-foreground text-center mt-1">{commentTypeDescriptions[type]}</span>
                        </Label>
                      )
                    })}
                  </RadioGroup>
                </div>
              </TabsContent>

              <TabsContent value="result" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Generated Comment</Label>
                  <div className="relative h-64">
                    <Textarea
                      readOnly
                      value={generatedComment || (isLoading ? 'AI is thinking...' : "Your generated comment will appear here.")}
                      className="h-full resize-none text-sm"
                    />
                     {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-background/50"><Loader2 className="h-6 w-6 animate-spin"/></div>}
                     {generatedComment && (
                        <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={handleCopyToClipboard}>
                            {isCopied ? <ClipboardCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
        
        <DialogFooter className="border-t p-4 shrink-0 flex-row justify-between">
          <div>
            {activeTab === 'style' && (
              <Button variant="outline" onClick={() => setActiveTab('post')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
            )}
            {activeTab === 'result' && (
              <Button variant="outline" onClick={() => setActiveTab('style')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
            )}
          </div>

          <div>
            {activeTab === 'post' && (
              <Button onClick={() => setActiveTab('style')} disabled={!postDescription.trim()}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {activeTab === 'style' && (
              <Button onClick={handleGenerate} disabled={isLoading || !postDescription.trim()}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Generate
              </Button>
            )}
            {activeTab === 'result' && (
              <Button onClick={handleSaveComment} disabled={isSaving || !generatedComment}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Comment
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

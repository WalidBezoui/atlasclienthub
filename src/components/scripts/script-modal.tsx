
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, RefreshCw, Save, Loader2, ClipboardList, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ScriptSnippetType } from '@/lib/types';
import { addSnippet } from '@/lib/firebase/services';
import { useAuth } from '@/hooks/useAuth';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptContent: string;
  title?: string;
  onRegenerate?: () => Promise<string | null>;
  isLoadingInitially?: boolean;
  
  // Snippet-saving related props
  scriptTypeToSave?: ScriptSnippetType;
  prospectContextToSave?: { prospectId: string; prospectName: string };
  showSaveToSnippetsButton?: boolean;

  // Custom confirmation action props
  onConfirm?: (scriptContent: string) => void;
  confirmButtonText?: string;
  isConfirming?: boolean;
  showConfirmButton?: boolean;
}

export function ScriptModal({
  isOpen,
  onClose,
  scriptContent,
  title = "Generated Script",
  onRegenerate,
  isLoadingInitially = false,
  scriptTypeToSave,
  prospectContextToSave,
  showSaveToSnippetsButton = true,
  onConfirm,
  confirmButtonText = "Confirm",
  isConfirming = false,
  showConfirmButton = false,
}: ScriptModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentScript, setCurrentScript] = useState(scriptContent);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCurrentScript(scriptContent); 
  }, [scriptContent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentScript)
      .then(() => {
        toast({ title: "Copied!", description: "Script copied to clipboard." });
      })
      .catch(err => {
        console.error("Failed to copy script: ", err);
        toast({ title: "Copy Failed", description: "Could not copy script to clipboard.", variant: "destructive" });
      });
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      const newScript = await onRegenerate();
      if (newScript) {
        setCurrentScript(newScript);
        toast({ title: "Script Regenerated!", description: "A new version of the script has been generated." });
      }
    } catch (error) { 
      console.error("Error regenerating script:", error);
    } finally {
      setIsRegenerating(false);
    }
  };
  
  const handleSaveToSnippets = async () => {
    if (!user) {
      toast({ title: "Not Logged In", description: "You must be logged in to save snippets.", variant: "destructive" });
      return;
    }
    if (!currentScript.trim()) {
      toast({ title: "Empty Script", description: "Cannot save an empty script.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const snippetData = {
        scriptType: scriptTypeToSave || "Other" as ScriptSnippetType,
        content: currentScript,
        prospectId: prospectContextToSave?.prospectId || null,
        prospectName: prospectContextToSave?.prospectName || null,
        tags: [],
      };
      await addSnippet(snippetData);
      toast({ title: "Snippet Saved!", description: "The script has been saved to your snippets." });
    } catch (error: any) {
      console.error("Error saving snippet:", error);
      toast({ title: "Save Failed", description: error.message || "Could not save the snippet.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(currentScript);
    }
  };

  const isBusy = isRegenerating || isLoadingInitially || isSaving || isConfirming;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <ClipboardList className="mr-2 h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>
            Review the generated script below. You can copy, regenerate, or save it.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          {isLoadingInitially && !currentScript ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Generating script...</span>
            </div>
          ) : (
            <Textarea
              value={currentScript}
              onChange={(e) => setCurrentScript(e.target.value)} 
              rows={10}
              readOnly={isBusy}
              className="w-full min-h-[200px] text-sm bg-muted/30"
              placeholder="Script will appear here..."
            />
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
          <Button variant="outline" onClick={handleCopy} disabled={isBusy || !currentScript}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
          {onRegenerate && (
            <Button variant="secondary" onClick={handleRegenerate} disabled={isBusy}>
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          )}
          {showSaveToSnippetsButton && (
             <Button onClick={handleSaveToSnippets} disabled={isBusy || !currentScript}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save to Snippets
            </Button>
          )}
          {showConfirmButton && onConfirm && (
             <Button onClick={handleConfirm} disabled={isBusy || !currentScript}>
                {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {confirmButtonText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

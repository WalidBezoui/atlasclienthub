
"use client";

import React, { useState } from 'react';
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
import { Copy, RefreshCw, Save, Loader2, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GenerateContextualScriptInput } from '@/ai/flows/generate-contextual-script';
import type { ScriptSnippetType } from '@/lib/types';
import { addSnippet } from '@/lib/firebase/services'; // Import addSnippet
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptContent: string;
  title?: string;
  onRegenerate?: () => Promise<string | null>;
  isLoadingInitially?: boolean;
  scriptTypeToSave?: GenerateContextualScriptInput['scriptType']; // Pass the specific script type
  prospectContextToSave?: { prospectId: string; prospectName: string }; // Pass prospect context
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
}: ScriptModalProps) {
  const { toast } = useToast();
  const { user } = useAuth(); // Get user for saving snippet
  const [currentScript, setCurrentScript] = useState(scriptContent);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
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
      // Toast for regeneration error should be handled by the caller if it wants to customize
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
        scriptType: scriptTypeToSave || "Other" as ScriptSnippetType, // Fallback to 'Other'
        content: currentScript,
        prospectId: prospectContextToSave?.prospectId || null,
        prospectName: prospectContextToSave?.prospectName || null,
        // tags: [], // Initialize with empty tags, can be added later
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


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <ClipboardList className="mr-2 h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>
            Review the generated script below. You can copy, regenerate, or save it to your snippets.
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
              readOnly={isRegenerating || isLoadingInitially || isSaving}
              className="w-full min-h-[200px] text-sm bg-muted/30"
              placeholder="Script will appear here..."
            />
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCopy} disabled={isRegenerating || isLoadingInitially || !currentScript || isSaving}>
            <Copy className="mr-2 h-4 w-4" /> Copy Script
          </Button>
          {onRegenerate && (
            <Button variant="secondary" onClick={handleRegenerate} disabled={isRegenerating || isLoadingInitially || isSaving}>
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          )}
          <Button onClick={handleSaveToSnippets} disabled={isRegenerating || isLoadingInitially || !currentScript || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save to Snippets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

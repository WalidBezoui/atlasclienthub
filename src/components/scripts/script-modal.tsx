
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
import { Copy, RefreshCw, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptContent: string;
  title?: string;
  onRegenerate?: () => Promise<string | null>; // Returns new script content or null on error
  isLoadingInitially?: boolean;
}

export function ScriptModal({
  isOpen,
  onClose,
  scriptContent,
  title = "Generated Script",
  onRegenerate,
  isLoadingInitially = false,
}: ScriptModalProps) {
  const { toast } = useToast();
  const [currentScript, setCurrentScript] = useState(scriptContent);
  const [isRegenerating, setIsRegenerating] = useState(false);

  React.useEffect(() => {
    setCurrentScript(scriptContent); // Update script when prop changes
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
      } else if (newScript === null) { // Explicitly null means an error handled by the caller
         // Toast for regeneration error should be handled by the caller if it wants to customize
      }
    } catch (error) { // Catch any unexpected error during regeneration
      console.error("Error regenerating script:", error);
      toast({ title: "Regeneration Failed", description: (error as Error).message || "Could not regenerate the script.", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };
  
  const handleSaveToSnippets = () => {
    // Placeholder for future implementation
    toast({ title: "Coming Soon!", description: "Saving to snippets will be available in a future update." });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">{title}</DialogTitle>
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
              onChange={(e) => setCurrentScript(e.target.value)} // Allow editing if needed, though primary interaction is copy/regen
              rows={10}
              readOnly={isRegenerating || isLoadingInitially}
              className="w-full min-h-[200px] text-sm bg-muted/30"
              placeholder="Script will appear here..."
            />
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCopy} disabled={isRegenerating || isLoadingInitially || !currentScript}>
            <Copy className="mr-2 h-4 w-4" /> Copy Script
          </Button>
          {onRegenerate && (
            <Button variant="secondary" onClick={handleRegenerate} disabled={isRegenerating || isLoadingInitially}>
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          )}
          <Button onClick={handleSaveToSnippets} disabled={isRegenerating || isLoadingInitially || !currentScript}>
            <Save className="mr-2 h-4 w-4" /> Save to Snippets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

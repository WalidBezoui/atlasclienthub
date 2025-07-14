
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
import { Copy, RefreshCw, Loader2, ClipboardList, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SCRIPT_LANGUAGES } from '@/lib/types';
import type { ScriptLanguage } from '@/lib/types';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptContent: string;
  title?: string;
  onRegenerate?: (language: ScriptLanguage, customInstructions: string) => Promise<string | null>;
  isLoadingInitially?: boolean;
  
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
  onConfirm,
  confirmButtonText = "Confirm",
  isConfirming = false,
  showConfirmButton = false,
}: ScriptModalProps) {
  const { toast } = useToast();
  const [currentScript, setCurrentScript] = useState(scriptContent);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [language, setLanguage] = useState<ScriptLanguage>('English');
  const [customInstructions, setCustomInstructions] = useState('');

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
      const newScript = await onRegenerate(language, customInstructions);
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
  
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(currentScript);
    }
  };

  const isBusy = isRegenerating || isLoadingInitially || isConfirming;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            onClose();
            setCustomInstructions('');
            setLanguage('English');
        }
    }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <ClipboardList className="mr-2 h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>
            Review the generated script below. You can edit it, regenerate with new options, or copy it.
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

           {onRegenerate && (
                <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
                    <h4 className="text-sm font-semibold">Regeneration Options</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="language-select" className="text-xs">Language</Label>
                            <Select value={language} onValueChange={(v: ScriptLanguage) => setLanguage(v)}>
                                <SelectTrigger id="language-select">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCRIPT_LANGUAGES.map(lang => (
                                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:col-span-2">
                             <Label htmlFor="custom-instructions" className="text-xs">Custom Instructions (Optional)</Label>
                             <Input 
                                id="custom-instructions"
                                placeholder="e.g., 'Make it more casual', 'Add an emoji'" 
                                value={customInstructions} 
                                onChange={(e) => setCustomInstructions(e.target.value)} 
                                disabled={isBusy}
                            />
                        </div>
                    </div>
                     <Button variant="secondary" onClick={handleRegenerate} disabled={isBusy} className="w-full">
                        {isRegenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Regenerate with Options
                    </Button>
                </div>
            )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
          <Button variant="outline" onClick={handleCopy} disabled={isBusy || !currentScript}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
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

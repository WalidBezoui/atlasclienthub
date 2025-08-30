
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
import { Copy, RefreshCw, Loader2, ClipboardList, Save, ChevronDown, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import type { OutreachProspect } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptContent: string;
  title?: string;
  onRegenerate?: (customInstructions: string) => Promise<string | null>;
  isLoadingInitially?: boolean;
  
  onConfirm?: (scriptContent: string, openIg?: boolean) => void;
  confirmButtonText?: string;
  isConfirming?: boolean;
  showConfirmButton?: boolean;
  prospect?: OutreachProspect | null;
}

export function ScriptModal({
  isOpen,
  onClose,
  scriptContent,
  title = "Generated Script",
  onRegenerate,
  isLoadingInitially = false,
  onConfirm,
  isConfirming = false,
  showConfirmButton = false,
  confirmButtonText = "Confirm", // Provide a default value
  prospect,
}: ScriptModalProps) {
  const { toast } = useToast();
  const [currentScript, setCurrentScript] = useState(scriptContent);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');

  useEffect(() => {
    setCurrentScript(scriptContent); 
  }, [scriptContent]);

  const handleCopy = () => {
    if (!currentScript) {
        toast({ title: 'Nothing to copy', variant: 'destructive' });
        return;
    }
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
      const newScript = await onRegenerate(customInstructions);
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
  
  const handleConfirm = (openIg: boolean = false) => {
    if (onConfirm) {
      onConfirm(currentScript, openIg);
    }
    if (prospect?.instagramHandle && openIg) {
      window.open(`https://www.instagram.com/${prospect.instagramHandle.replace('@', '')}/`, '_blank');
    }
  };


  const isBusy = isRegenerating || isLoadingInitially || isConfirming;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            onClose();
            setCustomInstructions('');
        }
    }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b shrink-0">
          <DialogTitle className="font-headline flex items-center">
            <ClipboardList className="mr-2 h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>
            Review the generated script below. You can edit it, regenerate with new options, or copy it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto min-h-0">
            <div className="p-6 space-y-3">
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
                    <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
                        <h4 className="text-sm font-semibold">Regeneration Options</h4>
                        <div>
                             <Label htmlFor="custom-instructions" className="text-xs">Custom Instructions (Optional)</Label>
                             <Input 
                                id="custom-instructions"
                                placeholder="e.g., 'Make it more casual', 'Add an emoji'" 
                                value={customInstructions} 
                                onChange={(e) => setCustomInstructions(e.target.value)} 
                                disabled={isBusy}
                            />
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
        </div>

        <DialogFooter className="p-4 border-t shrink-0 flex-col sm:flex-row sm:justify-between gap-2">
           <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCopy} disabled={isBusy || !currentScript}>
                <Copy className="mr-2 h-4 w-4" /> Copy Only
            </Button>
            
            {showConfirmButton && onConfirm && (
                <div className="flex rounded-md shadow-sm">
                    <Button onClick={() => handleConfirm(false)} disabled={isBusy || !currentScript} className="relative flex-1 rounded-r-none">
                         {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                         {confirmButtonText || "Confirm"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="default" size="icon" className="w-10 rounded-l-none" disabled={isBusy || !currentScript}>
                            <ChevronDown className="h-4 w-4"/>
                         </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleConfirm(true)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {confirmButtonText ? `${confirmButtonText.replace("Log", "Log &")} Open IG` : "Confirm & Open IG"}
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

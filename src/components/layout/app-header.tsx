
"use client";

import React, { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserCircle, Bell, LogIn, LogOut, BotMessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { APP_NAME } from '@/lib/constants';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useScriptContext, ClientScriptContext, ContentScriptContext } from '@/contexts/ScriptContext';
import { generateContextualScript, GenerateContextualScriptInput, GenerateContextualScriptOutput } from '@/ai/flows/generate-contextual-script';
import { ScriptModal } from '@/components/scripts/script-modal';
import { useToast } from '@/hooks/use-toast';

type ScriptType = GenerateContextualScriptInput['scriptType'];

export function AppHeader() {
  const { isMobile } = useSidebar();
  const { user, logout, loading: authLoading } = useAuth();
  const { clientContext, contentContext } = useScriptContext();
  const { toast } = useToast();

  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [scriptModalTitle, setScriptModalTitle] = useState("Generated Script");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [currentScriptGenerationInput, setCurrentScriptGenerationInput] = useState<GenerateContextualScriptInput | null>(null);


  const getUserInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const handleGenerateScript = async (scriptType: ScriptType) => {
    setIsGeneratingScript(true);
    setIsScriptModalOpen(true);
    setGeneratedScript(''); 
    setScriptModalTitle(`Generating ${scriptType}...`);
    
    let input: Partial<GenerateContextualScriptInput> = { scriptType };

    if (clientContext) {
      input = {
        ...input,
        clientHandle: clientContext.clientHandle,
        clientName: clientContext.clientName,
        clientIndustry: clientContext.clientIndustry, 
        lastTouch: clientContext.lastTouch,
      };
    }
    
    // Fallback logic for when context isn't available
    const requiresClientContext = ["Cold Outreach DM", "Warm Follow-Up DM", "Audit Delivery Message", "Send Reminder", "Soft Close"].includes(scriptType);
    if(requiresClientContext && !clientContext) {
        toast({ title: "Generating Generic Script", description: `No client context set. A generic "${scriptType}" will be generated.`, variant: "default" });
    }

    setCurrentScriptGenerationInput(input as GenerateContextualScriptInput);

    try {
      const result: GenerateContextualScriptOutput = await generateContextualScript(input as GenerateContextualScriptInput);
      setGeneratedScript(result.script);
      setScriptModalTitle(`${scriptType} - Result`);
    } catch (error) {
      console.error("Error generating script:", error);
      toast({ title: "Script Generation Failed", description: (error as Error).message || "Could not generate script.", variant: "destructive" });
      setScriptModalTitle("Error Generating Script");
      setGeneratedScript("Failed to generate script. Please try again.");
    } finally {
      setIsGeneratingScript(false);
    }
  };
  
  const handleRegenerateScript = async (): Promise<string | null> => {
    if (!currentScriptGenerationInput) {
      toast({ title: "Error", description: "No previous script context to regenerate.", variant: "destructive" });
      return null;
    }
    setIsGeneratingScript(true); 
    setGeneratedScript(''); 
    try {
      const result = await generateContextualScript(currentScriptGenerationInput);
      setGeneratedScript(result.script); 
      setIsGeneratingScript(false);
      return result.script;
    } catch (error) {
      console.error("Error regenerating script:", error);
      toast({ title: "Script Regeneration Failed", description: (error as Error).message || "Could not regenerate script.", variant: "destructive" });
      setGeneratedScript("Failed to regenerate script. Please try again.");
      setIsGeneratingScript(false);
      return null;
    }
  };


  const scriptMenuItems: Array<{label: string, type: ScriptType, contextRequired?: 'client' | 'content'}> = [
    { label: "Cold Outreach DM", type: "Cold Outreach DM", contextRequired: 'client' },
    { label: "Warm Follow-Up DM", type: "Warm Follow-Up DM", contextRequired: 'client' },
    { label: "Audit Delivery Message", type: "Audit Delivery Message", contextRequired: 'client' },
    { label: "Send Reminder", type: "Send Reminder", contextRequired: 'client' },
    { label: "Soft Close", type: "Soft Close", contextRequired: 'client' },
  ];

  const isScriptMenuButtonDisabled = () => {
    return !user; // Only disable the main "Scripts" button if user is not logged in
  };


  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-2">
          {user && <SidebarTrigger className="h-8 w-8" />}
          {!isMobile && <h1 className="text-lg font-headline font-semibold">{APP_NAME}</h1>}
        </div>
        
        <div className="flex items-center gap-2">
          {user && (
            <Menubar className="border-none shadow-none p-0 h-auto bg-transparent">
              <MenubarMenu>
                <MenubarTrigger 
                    asChild
                    disabled={isScriptMenuButtonDisabled()}
                    className="px-3 py-2 h-9 text-sm data-[state=open]:bg-accent data-[state=open]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent"
                 >
                   <Button variant="ghost" size="sm" disabled={isScriptMenuButtonDisabled()}>
                     <BotMessageSquare className="mr-2 h-4 w-4" /> Scripts
                   </Button>
                </MenubarTrigger>
                <MenubarContent align="end">
                  {scriptMenuItems.map(item => {
                     const contextMissingMessage =
                        item.contextRequired === 'client' && !clientContext
                          ? 'No client context. Will generate a generic script.'
                          : item.contextRequired === 'content' && !contentContext
                          ? 'No content context. Will generate a generic script.'
                          : undefined;
                    return (
                        <MenubarItem 
                            key={item.type} 
                            onClick={() => handleGenerateScript(item.type)}
                            disabled={isGeneratingScript} // Only disable if a script is actively being generated
                            title={contextMissingMessage || (isGeneratingScript && currentScriptGenerationInput?.scriptType === item.type ? "Generating..." : undefined)}
                        >
                          {item.label}
                          {isGeneratingScript && currentScriptGenerationInput?.scriptType === item.type && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                        </MenubarItem>
                    );
                  })}
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          )}

          {user && (
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
          )}

          {authLoading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback>{getUserInitials(user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.displayName || user.email}</div>
                  <div className="text-xs text-muted-foreground">My Account</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Profile</DropdownMenuItem>
                <DropdownMenuItem disabled>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" passHref>
              <Button variant="outline">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </header>
      <ScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        scriptContent={generatedScript}
        title={scriptModalTitle}
        onRegenerate={handleRegenerateScript}
        isLoadingInitially={isGeneratingScript && !generatedScript}
      />
    </>
  );
}

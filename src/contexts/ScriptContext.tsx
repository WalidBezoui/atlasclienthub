
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ClientScriptContext {
  clientHandle?: string;
  clientIndustry?: string; // Example: "Beauty Salon", "Fitness Coach"
  clientName?: string;
  lastTouch?: string; // Example: "None", "Sent intro DM 3 days ago"
  desiredAction?: string; // Example: "Free Audit Offer", "Book a call"
}

export interface ContentScriptContext {
  postTopic?: string;
  brandVoice?: string; // Example: "Friendly, strategic, Moroccan"
  objectives?: string[]; // Example: ["engagement", "DM leads"]
  postType?: string; // Example: "Carousel", "Reel"
}

interface ScriptContextType {
  clientContext: ClientScriptContext | null;
  contentContext: ContentScriptContext | null;
  setClientContext: (context: ClientScriptContext | null) => void;
  setContentContext: (context: ContentScriptContext | null) => void;
  clearContext: () => void;
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

export const ScriptProvider = ({ children }: { children: ReactNode }) => {
  const [clientContext, setClientContext] = useState<ClientScriptContext | null>(null);
  const [contentContext, setContentContext] = useState<ContentScriptContext | null>(null);

  const clearContext = () => {
    setClientContext(null);
    setContentContext(null);
  };

  return (
    <ScriptContext.Provider value={{ 
      clientContext, 
      contentContext, 
      setClientContext, 
      setContentContext,
      clearContext 
    }}>
      {children}
    </ScriptContext.Provider>
  );
};

export const useScriptContext = (): ScriptContextType => {
  const context = useContext(ScriptContext);
  if (context === undefined) {
    throw new Error('useScriptContext must be used within a ScriptProvider');
  }
  return context;
};

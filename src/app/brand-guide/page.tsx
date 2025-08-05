

'use client';

import React from 'react';
import { Palette, Type, Image as ImageIcon, MessageSquareText, Star, Briefcase, Rocket, CalendarCheck, BarChart3, List, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

const outreachSteps = [
  { step: 'Step 1: The "Silent" Engagement Phase (Days 1-3)', action: 'Like their new posts. Watch their stories. That\'s it.', goal: 'To make your name, atlassocialstudio, a familiar and non-threatening presence in their notifications.' },
  { step: 'Step 2: The "Value" Engagement Phase (Days 4-7)', action: 'Leave one incredibly insightful, high-value comment on one of their recent posts. Use the "Top Comment" formulas (Specific Compliment + Question, Helpful Insight, or Shared Experience).', goal: 'To establish yourself as an expert peer who adds value to their conversation.' },
  { step: 'Step 3: The "Private" Engagement Phase (Days 8-10)', action: 'Path A (If they post Stories): Reply to one of their stories with a genuine, non-salesy reaction. Path B (If they don\'t post Stories): After they have liked or replied to your high-value comment from Step 2, send them the "Conversation Starter" DM.', goal: 'To move the interaction from a public space to the private DMs in a warm, low-pressure way.' },
  { step: 'Step 4: The "Ask" (Day 10+)', action: 'Only after you have completed the first three steps, you can send your Free Audit offer.', goal: 'To make a welcome, low-risk offer to a prospect who already knows, recognizes, and respects you.' },
];

const contentCadence = [
  { type: 'Reels', frequency: '5 per week', purpose: 'Discovery & Reach' },
  { type: 'Feed Posts (Carousels)', frequency: '2 per week', purpose: 'Authority & Trust' },
  { type: 'Stories', frequency: '5-7 slides, every day', purpose: 'Connection & Community' },
];

const reelFormulas = [
  { 
    name: '1. The "Atlas Playbook" (High-Utility Listicle)',
    goal: 'To establish your authority by sharing "secret knowledge" in a save-worthy format.',
    examples: '"The 3-3-3 Content Framework," "5 Subtle Branding Mistakes."',
    visuals: 'Use clean, professional screen recordings or aesthetic "working" shots.',
    fonts: 'Use your professional brand fonts (Playfair Display & Montserrat).',
    icon: List,
  },
  { 
    name: '2. The "Founder\'s Reality" (Relatable Trend)',
    goal: 'To build a deep, human connection by sharing a relatable feeling or struggle.',
    examples: '"The Strategist\'s Brain," "The Founder\'s Reset."',
    visuals: 'Use authentic, in-the-moment clips or meme-style videos.',
    fonts: 'Use native Instagram fonts to feel more authentic and "of the platform."',
    icon: BookOpen,
  },
];


export default function BrandGuidePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Agency Playbook & Brand Guide"
        description="Your single source of truth for outreach, content, and brand identity."
        icon={Briefcase}
      />

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Rocket className="mr-2 h-6 w-6 text-primary" /> The "Become Inevitable" Outreach Method</CardTitle>
          <CardDescription>
           This is the patient, 10-day warm-up campaign that will turn cold prospects into warm leads. This is your most important daily work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {outreachSteps.map((item, index) => (
              <div key={item.step} className="p-4 bg-muted/50 rounded-lg">
                <strong className="font-semibold block mb-1">{item.step}</strong>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Action:</strong> {item.action}</p>
                <p className="text-sm text-muted-foreground mt-1"><strong className="text-foreground">Goal:</strong> {item.goal}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><CalendarCheck className="mr-2 h-6 w-6 text-primary" /> The "Accelerator Cadence" Content Plan</CardTitle>
           <CardDescription>
           This is your weekly publishing schedule, designed for maximum discovery and authority-building.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content Type</TableHead>
                <TableHead>Frequency Per Week</TableHead>
                <TableHead>Primary Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contentCadence.map((item) => (
                <TableRow key={item.type}>
                  <TableCell className="font-medium">{item.type}</TableCell>
                  <TableCell>{item.frequency}</TableCell>
                  <TableCell>{item.purpose}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><BarChart3 className="mr-2 h-6 w-6 text-primary" /> High-Engagement Content Formulas</CardTitle>
          <CardDescription>
            Alternate between these two powerful Reel formulas to build authority and connect with your audience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {reelFormulas.map((formula, index) => {
            const FormulaIcon = formula.icon;
            return (
              <div key={formula.name} className="p-4 border rounded-lg bg-card shadow-sm">
                <h4 className="font-semibold text-lg flex items-center mb-2"><FormulaIcon className="mr-2 h-5 w-5 text-secondary-foreground" /> {formula.name}</h4>
                <div className="space-y-2 text-sm">
                  <p><strong className="font-medium">Goal:</strong> {formula.goal}</p>
                  <p><strong className="font-medium">Examples:</strong> <span className="italic">{formula.examples}</span></p>
                  <p><strong className="font-medium">Visuals:</strong> {formula.visuals}</p>
                  <p><strong className="font-medium">Fonts:</strong> {formula.fonts}</p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
      
    </div>
  );
}

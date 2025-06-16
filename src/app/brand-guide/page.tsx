
'use client';

import React from 'react';
import { Palette, Type, Image as ImageIcon, MessageSquareText, Star, Briefcase } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

const brandPersonalityTraits = [
  { trait: '🎨 Creative', description: 'Bold, original, visually inspiring' },
  { trait: '📈 Strategic', description: 'Every post has a purpose (growth, leads, brand trust)' },
  { trait: '🤝 Friendly', description: 'Warm, human, approachable tone' },
  { trait: '🏁 Fastlane Minded', description: 'Efficient, results-driven, focused on real ROI' },
];

const colorPalette = [
  { name: '🟡 Mustard Gold', use: 'Logo, CTA highlights', hex: '#E8B23C', hslVar: 'var(--primary)' },
  { name: '🪻 Sage Light', use: 'Background / base tone', hex: '#EDEFE7', hslVar: 'var(--background)' },
  { name: '⚫ Charcoal Black', use: 'Text / contrast', hex: '#2B2B2B', hslVar: 'var(--foreground)' },
  { name: '⚪ Off White', use: 'Background / text balance', hex: '#FDFDFD', hslVar: 'var(--card)' },
  { name: '🔴 Coral Red X', use: 'For "bad examples" / alerts', hex: '#EB4D4B', hslVar: 'var(--destructive)' },
];

const typographySystem = [
  { type: 'Heading', font: 'Montserrat Bold', use: 'Logo, titles, slide headers' },
  { type: 'Subheading', font: 'Montserrat Medium', use: 'Carousel intro text, post titles' },
  { type: 'Body', font: 'Inter Regular', use: 'Paragraphs, captions' },
];

const instagramGridAesthetic = [
  { format: 'Carousel Posts', description: '80% of feed: value-based, audit-style, proof, tips, storytelling' },
  { format: 'Reels (later)', description: 'Short, punchy branding/strategy breakdowns' },
  { format: 'Stories', description: 'Daily: Polls, questions, behind-the-scenes, audits' },
  { format: 'Highlights', description: 'Free Audit / Proof / Brand Tips / About Atlas' },
];

const brandVoiceExamples = [
  { tone: 'Clear, no fluff', example: '“Don’t post for fun. Post to sell.”' },
  { tone: 'Friendly', example: '“Hey creators 👋 Let’s talk about your grid.”' },
  { tone: 'Bold but respectful', example: '“Your bio is losing you clients — here’s how to fix it.”' },
];

export default function BrandGuidePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Atlas Social Studio - Brand Guide"
        description="“Carrying Moroccan brands to new heights”"
        icon={Palette}
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Briefcase className="mr-2 h-6 w-6 text-primary" /> Mission Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            To empower Moroccan and global brands with striking visuals, strategy-backed content, and Instagram-first creative direction that turns followers into clients.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Star className="mr-2 h-6 w-6 text-primary" /> Brand Personality</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {brandPersonalityTraits.map((item) => (
              <li key={item.trait} className="p-3 bg-muted/50 rounded-md">
                <strong className="font-medium">{item.trait}:</strong>
                <span className="ml-2 text-muted-foreground">{item.description}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Palette className="mr-2 h-6 w-6 text-primary" /> Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Swatch</TableHead>
                <TableHead>Use</TableHead>
                <TableHead>HEX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colorPalette.map((color) => (
                <TableRow key={color.name}>
                  <TableCell className="font-medium">{color.name}</TableCell>
                  <TableCell>
                    <div 
                      className="h-6 w-10 rounded border border-border" 
                      style={{ backgroundColor: color.hex /* Using direct hex for swatch, could use HSL var if defined exactly */ }}
                      aria-label={`Color swatch for ${color.name}`}
                    ></div>
                  </TableCell>
                  <TableCell>{color.use}</TableCell>
                  <TableCell>{color.hex}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Type className="mr-2 h-6 w-6 text-primary" /> Typography System</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Font</TableHead>
                <TableHead>Use</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typographySystem.map((type) => (
                <TableRow key={type.type}>
                  <TableCell className="font-medium">{type.type}</TableCell>
                  <TableCell>{type.font}</TableCell>
                  <TableCell>{type.use}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-sm text-muted-foreground">
            📌 <strong>Note:</strong> Always use 48–60px for headers on IG carousels (scaled properly), and 26–32px for body on IG post slides.
          </p>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><ImageIcon className="mr-2 h-6 w-6 text-primary" /> Logo Versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
          <p><strong>Primary Logo:</strong> Wordmark with mustard “Atlas” + clean sans-serif "Social Studio"</p>
          <p><strong>Icon:</strong> Stylized “A” in mustard for profile icon / watermark</p>
          <p><strong>Formats:</strong> PNG (transparent), SVG, JPG, IG optimized</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><ImageIcon className="mr-2 h-6 w-6 text-primary" /> Instagram Grid Aesthetic</CardTitle> {/* Reusing icon for visual consistency */}
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 mb-4">
            {instagramGridAesthetic.map((item) => (
              <li key={item.format} className="p-3 bg-muted/50 rounded-md">
                <strong className="font-medium">{item.format}:</strong>
                <span className="ml-2 text-muted-foreground">{item.description}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            <strong>Grid visual identity:</strong> Clean layout + mustard CTA highlights + screenshot mockups + audit-style value
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><MessageSquareText className="mr-2 h-6 w-6 text-primary" /> Brand Voice & Writing Style</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 mb-4">
            {brandVoiceExamples.map((item) => (
              <li key={item.tone} className="p-3 bg-muted/50 rounded-md">
                <strong className="font-medium">{item.tone}:</strong>
                <span className="ml-2 text-muted-foreground italic">{item.example}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            <strong>Voice = Strategic + Friendly + Moroccan Proud</strong>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Star className="mr-2 h-6 w-6 text-primary" /> Value Proposition (USP)</CardTitle> {/* Reusing icon */}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">
            “Atlas Social Studio combines high-converting design with growth-first strategy to help Moroccan and global brands turn attention into income — without wasting time on random content.”
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

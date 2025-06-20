
'use server';
/**
 * @fileOverview Generates contextual scripts based on client or content information.
 *
 * - generateContextualScript - A function to generate scripts.
 * - GenerateContextualScriptInput - Input type for script generation.
 * - GenerateContextualScriptOutput - Output type for script generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { BusinessType, PainPoint, Goal, LeadSource, OfferInterest, TonePreference, OutreachStatus } from '@/lib/types';
import { BUSINESS_TYPES, PAIN_POINTS, GOALS, LEAD_SOURCES, OFFER_INTERESTS, TONE_PREFERENCES } from '@/lib/types';


const GenerateContextualScriptInputSchema = z.object({
  scriptType: z.enum([
    "Cold Outreach DM", 
    "Warm Follow-Up DM", 
    "Audit Delivery Message", 
    "Closing Pitch", 
    "Caption Idea"
  ]).describe("The type of script to generate."),
  
  // Prospect/Client Info
  clientName: z.string().optional().describe("The prospect's or client's name."),
  clientHandle: z.string().optional().describe("The prospect's or client's Instagram handle (e.g., @brandXYZ)."),
  businessName: z.string().optional().describe("The prospect's business name."),
  website: z.string().url().optional().describe("The prospect's website URL."),
  prospectLocation: z.string().optional().describe("The prospect's location (e.g., Morocco, Global, Casablanca)."),
  clientIndustry: z.string().optional().describe("The client's industry (e.g., Beauty Salon, Fitness Coach, SaaS). This can be the existing 'industry' field or derived from BusinessType."),

  // Business Details
  businessType: z.enum(BUSINESS_TYPES).optional().describe("The type of business the prospect runs."),
  businessTypeOther: z.string().optional().describe("Specific business type if 'Other' was selected."),
  painPoints: z.array(z.enum(PAIN_POINTS)).optional().describe("List of current problems or pain points the prospect is facing."),
  goals: z.array(z.enum(GOALS)).optional().describe("List of goals the prospect might want to achieve."),

  // Lead & Interaction Context
  leadStatus: z.string().optional().describe("Current status of the lead, e.g., To Contact, Contacted, Replied."), // Using general string for flexibility with OutreachStatus type
  source: z.enum(LEAD_SOURCES).optional().describe("How the lead was found or generated."),
  lastTouch: z.string().optional().describe("Description of the last interaction with the client (e.g., None, Sent intro DM 3 days ago, Viewed story)."), // Can be enriched by leadStatus/lastContacted
  desiredAction: z.string().optional().describe("The desired action from the client (e.g., Free Audit Offer, Book a call, Reply to DM)."),
  offerInterest: z.array(z.enum(OFFER_INTERESTS)).optional().describe("What the prospect has shown interest in, if they've replied."),

  // Smart Insights & Content Context
  uniqueNote: z.string().optional().describe("A unique or interesting observation about the prospect's brand."),
  helpStatement: z.string().optional().describe("A concise statement on how you could help them."),
  tonePreference: z.enum(TONE_PREFERENCES).optional().describe("The preferred tone for the generated script."),
  
  postTopic: z.string().optional().describe("The topic of the social media post for which a caption is needed."),
  brandVoice: z.string().optional().describe("The brand voice to use for the script (e.g., Friendly, strategic, Moroccan). This is more for general content, less for direct outreach to specific prospect unless it's for their brand."),
  objectives: z.array(z.string()).optional().describe("Key objectives for the post or outreach (e.g., engagement, DM leads)."),
  additionalNotes: z.string().optional().describe("Any other relevant notes or context to consider for script generation.")
});
export type GenerateContextualScriptInput = z.infer<typeof GenerateContextualScriptInputSchema>;

const GenerateContextualScriptOutputSchema = z.object({
  script: z.string().describe('The generated script.'),
});
export type GenerateContextualScriptOutput = z.infer<typeof GenerateContextualScriptOutputSchema>;

export async function generateContextualScript(input: GenerateContextualScriptInput): Promise<GenerateContextualScriptOutput> {
  return generateContextualScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContextualScriptPrompt',
  input: {schema: GenerateContextualScriptInputSchema},
  output: {schema: GenerateContextualScriptOutputSchema},
  prompt: `You are an expert social media manager and copywriter for "Atlas Social Studio".
Your mission: "To empower Moroccan and global brands with striking visuals, strategy-backed content, and Instagram-first creative direction that turns followers into clients."
Your goal is to generate a concise, effective, and context-aware "{{scriptType}}".

Prospect/Client Details:
{{#if clientName}}Name: {{clientName}}{{/if}}
{{#if clientHandle}}Instagram Handle: {{clientHandle}}{{/if}}
{{#if businessName}}Business Name: {{businessName}}{{/if}}
{{#if clientIndustry}}Industry: {{clientIndustry}}{{/if}}
{{#if prospectLocation}}Location: {{prospectLocation}}{{/if}}
{{#if website}}Website: {{website}}{{/if}}

Business Context:
{{#if businessType}}Business Type: {{businessType}}{{#if businessTypeOther}} ({{businessTypeOther}}){{/if}}.{{/if}}
{{#if painPoints}}Identified Pain Points: {{#each painPoints}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.{{/if}}
{{#if goals}}Potential Goals: {{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.{{/if}}

Interaction Context:
{{#if leadStatus}}Lead Status: {{leadStatus}}.{{/if}}
{{#if source}}Source: {{source}}.{{/if}}
{{#if lastTouch}}Last Interaction: {{lastTouch}}.{{/if}}
{{#if desiredAction}}Desired Action from Prospect: {{desiredAction}}.{{/if}}
{{#if offerInterest}}Expressed Interest In: {{#each offerInterest}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.{{/if}}

Smart Insights & Tone:
{{#if uniqueNote}}Unique Observation: "{{uniqueNote}}"{{/if}}
{{#if helpStatement}}Primary Help Angle: "{{helpStatement}}"{{/if}}
{{#if tonePreference}}Preferred Tone: {{tonePreference}}.{{/if}}

Content Specifics (if applicable, e.g., for "Caption Idea"):
{{#if postTopic}}Post Topic: {{postTopic}}{{/if}}
{{#if brandVoice}}Brand Voice for Content: {{brandVoice}}.{{/if}}
{{#if objectives}}Key Objectives for Content: {{#each objectives}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.{{/if}}

Additional Notes:
{{#if additionalNotes}}{{additionalNotes}}{{/if}}

Instructions:
1. Based on the script type "{{scriptType}}" and ALL the provided context, generate a compelling and actionable script.
2. If generating a "Cold Outreach DM" or "Warm Follow-Up DM", keep it brief, personalized, and suitable for Instagram DMs. Focus on addressing a key pain point or goal.
3. If business type is "Local Business" and location is "Morocco" or a Moroccan city, incorporate subtle Moroccan cultural nuances or language (like a common greeting or a relevant local reference) if the {{tonePreference}} allows and it feels natural.
4. If {{uniqueNote}} is provided, try to weave it into the opening to make the message feel highly personalized.
5. If {{helpStatement}} is provided, ensure the script's value proposition aligns with it.
6. If generating a "Caption Idea", provide one engaging caption for the "{{postTopic}}".
7. If no specific prospect context is available (e.g. no clientName, painPoints, etc.), generate a more generic but still effective version of the "{{scriptType}}".

Generate the "{{scriptType}}" now:
`,
});

const generateContextualScriptFlow = ai.defineFlow(
  {
    name: 'generateContextualScriptFlow',
    inputSchema: GenerateContextualScriptInputSchema,
    outputSchema: GenerateContextualScriptOutputSchema,
  },
  async (input) => {
    // Basic temperature setting, can be adjusted. Max output tokens ensure conciseness for DMs.
    const {output} = await prompt(input, { config: { temperature: 0.75, maxOutputTokens: 350 }}); 
    return output!;
  }
);

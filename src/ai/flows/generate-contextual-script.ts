
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
import type { BusinessType, PainPoint, Goal, LeadSource, OfferInterest, TonePreference, ProspectLocation, AccountStage, OutreachLeadStage } from '@/lib/types';
import { BUSINESS_TYPES, PAIN_POINTS, GOALS, LEAD_SOURCES, OFFER_INTERESTS, TONE_PREFERENCES, PROSPECT_LOCATIONS, ACCOUNT_STAGES, OUTREACH_LEAD_STAGE_OPTIONS } from '@/lib/types';


const GenerateContextualScriptInputSchema = z.object({
  scriptType: z.enum([
    "Cold Outreach DM", 
    "Warm Follow-Up DM", 
    "Audit Delivery Message", 
    // "Closing Pitch", // As per spec, but let's keep it simple for now
    // "Caption Idea" // Requires content context, not fully implemented yet
  ]).describe("The type of script to generate."),
  
  // Section 1: Basic Prospect Info
  clientName: z.string().nullable().optional().describe("The prospect's or client's name."),
  clientHandle: z.string().nullable().optional().describe("The prospect's or client's Instagram handle (e.g., @brandXYZ)."),
  businessName: z.string().nullable().optional().describe("The prospect's business name."),
  website: z.string().url().nullable().optional().describe("The prospect's website URL."),
  prospectLocation: z.enum(PROSPECT_LOCATIONS).nullable().optional().describe("The prospect's location."),
  clientIndustry: z.string().nullable().optional().describe("The client's industry (e.g., Beauty Salon, Fitness Coach, SaaS)."),

  // Section 2: Business Details
  businessType: z.enum(BUSINESS_TYPES).nullable().optional().describe("The type of business the prospect runs."),
  businessTypeOther: z.string().nullable().optional().describe("Specific business type if 'Other' was selected."),
  
  // Engagement Metrics
  accountStage: z.enum(ACCOUNT_STAGES).nullable().optional().describe("The prospect's account stage based on followers."),
  followerCount: z.number().optional().describe("The prospect's follower count."),
  postCount: z.number().optional().describe("The prospect's post count."),
  avgLikes: z.number().optional().describe("Average likes on recent posts."),
  avgComments: z.number().optional().describe("Average comments on recent posts."),

  // Section 3: Current Problems / Pain Points
  painPoints: z.array(z.enum(PAIN_POINTS)).optional().describe("List of current problems or pain points the prospect is facing."),
  
  // Section 4: Goals They Might Want
  goals: z.array(z.enum(GOALS)).optional().describe("List of goals the prospect might want to achieve."),

  // Section 5: Lead & Interaction Context
  leadStatus: z.enum(OUTREACH_LEAD_STAGE_OPTIONS).nullable().optional().describe("Current stage of the lead."),
  source: z.enum(LEAD_SOURCES).nullable().optional().describe("How the lead was found or generated."),
  lastTouch: z.string().nullable().optional().describe("Description of the last interaction with the client (e.g., None, Sent intro DM 3 days ago, Viewed story)."),
  followUpNeeded: z.boolean().optional().describe("Whether a follow-up is marked as needed."),
  
  // Section 6: Offer Interest
  offerInterest: z.array(z.enum(OFFER_INTERESTS)).optional().describe("What the prospect has shown interest in, if they've replied."),
  
  // Section 7: Smart Insights & Content Context
  uniqueNote: z.string().nullable().optional().describe("A unique or interesting observation about the prospect's brand (1-2 sentences)."),
  helpStatement: z.string().nullable().optional().describe("A concise statement on how you could help them (1 sentence)."),
  tonePreference: z.enum(TONE_PREFERENCES).nullable().optional().describe("The preferred tone for the generated script."),
  
  // For "Caption Idea" - future enhancement
  // postTopic: z.string().optional().describe("The topic of the social media post for which a caption is needed."),
  // brandVoice: z.string().optional().describe("The brand voice to use for the script."),
  // objectives: z.array(z.string()).optional().describe("Key objectives for the post or outreach."),
  
  additionalNotes: z.string().nullable().optional().describe("Any other relevant notes or context to consider for script generation.")
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
  prompt: `You are "Atlas Social Studio," an expert social media manager and copywriter.
Your mission: "To empower Moroccan and global brands with striking visuals, strategy-backed content, and Instagram-first creative direction that turns followers into clients."
Your current campaign: "Atlas Social Studio is on a mission to deliver 50 free IG audits in 30 days."
Your offer for this campaign: "3 custom audit tips, visual mockup ideas, and a mini-strategy guide."
Your goal is to generate a concise, effective, and context-aware "{{scriptType}}".

Prospect Details:
Name: {{#if clientName}}{{clientName}}{{else}}this brand{{/if}}
{{#if clientHandle}}Instagram Handle: {{clientHandle}}{{/if}}
{{#if businessName}}Business Name: {{businessName}}{{/if}}
{{#if clientIndustry}}Industry: {{clientIndustry}}{{/if}}
{{#if prospectLocation}}Location: {{prospectLocation}}{{/if}}
{{#if website}}Website: {{website}}{{/if}}

Business Context:
{{#if businessType}}Business Type: {{businessType}}{{#if businessTypeOther}} ({{businessTypeOther}}){{/if}}.{{/if}}
{{#if accountStage}}Account Stage: {{accountStage}}.{{/if}}
{{#if followerCount}}
Metrics: {{followerCount}} followers{{#if postCount}}, {{postCount}} posts{{/if}}{{#if avgLikes}}, avg {{avgLikes}} likes{{/if}}{{#if avgComments}} & {{avgComments}} comments{{/if}}.
{{else if postCount}}
Metrics: {{postCount}} posts{{#if avgLikes}}, avg {{avgLikes}} likes{{/if}}{{#if avgComments}} & {{avgComments}} comments{{/if}}.
{{/if}}
{{#if painPoints}}Identified Pain Points: {{#each painPoints}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.{{/if}}
{{#if goals}}Potential Goals: {{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.{{/if}}

Interaction Context:
{{#if leadStatus}}Lead Stage: {{leadStatus}}.{{/if}}
{{#if source}}Source: {{source}}.{{/if}}
{{#if lastTouch}}Last Interaction: {{lastTouch}}.{{/if}}
{{#if followUpNeeded}}Follow-up is marked as needed.{{/if}}
{{#if offerInterest}}Expressed Interest In: {{#each offerInterest}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.{{/if}}

Smart Insights & Tone:
{{#if uniqueNote}}Unique Observation: "{{uniqueNote}}"{{/if}}
{{#if helpStatement}}Primary Help Angle: "{{helpStatement}}"{{/if}}
{{#if tonePreference}}Preferred Tone: {{tonePreference}}. Use a friendly Moroccan-localized style if appropriate and location is Morocco.{{else}}Use a friendly and professional tone. If location is Morocco, consider subtle Moroccan localization.{{/if}}

Additional Notes from User:
{{#if additionalNotes}}{{additionalNotes}}{{/if}}

Instructions for generating "{{scriptType}}":
1. Account Stage Logic: If Account Stage is "New (0–100 followers)" or Follower Count is 0 or very low (e.g., <10), acknowledge this positively, e.g., "Looks like you're just getting started on IG / recently launched – exciting times!" or "We just launched this week (0 followers so far) and are looking to connect with promising brands like yours."
2. If {{uniqueNote}} is provided, try to weave it into the opening to make the message feel highly personalized.
3. If {{painPoints}} are listed, focus on one or two key pain points in your message.
4. If {{goals}} are listed, align your value proposition with one or two key goals.
5. Value Proposition: Clearly state how Atlas Social Studio can help, referencing the "50 free IG audits in 30 days" campaign and its offer (3 custom tips, mockup ideas, mini-strategy).
6. Call to Action: Invite them to reply ‘AUDIT’ to receive their free audit.
7. Keep DMs brief, authentic, and suitable for Instagram. Avoid overly salesy language.
8. If business type is "Local Business" and location is "Morocco" or a Moroccan city, incorporate subtle Moroccan cultural nuances or language (like a common greeting or a relevant local reference) if the {{tonePreference}} allows and it feels natural.

Critique Directive: After drafting the script, review it for emotional impact, clarity, brand alignment (with Atlas Social Studio's mission and offer), and conciseness. Ensure it directly addresses the prospect based on the provided context. Then, output ONLY the perfected script.

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
    const {output} = await prompt(input, { config: { temperature: 0.75, maxOutputTokens: 400 }}); 
    return output!;
  }
);

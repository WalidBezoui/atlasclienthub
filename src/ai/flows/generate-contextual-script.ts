
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
  ]).describe("The type of script to generate."),

  // Section 1: Basic Prospect Info (from guide)
  clientName: z.string().nullable().optional().describe("The prospect's or client's name (e.g., Amina)."),
  clientHandle: z.string().nullable().optional().describe("The prospect's or client's Instagram handle (e.g., @brandXYZ)."),
  businessName: z.string().nullable().optional().describe("The prospect's brand name (e.g., Glow by Amina)."),
  website: z.string().url().nullable().optional().describe("The prospect's website URL."),
  prospectLocation: z.enum(PROSPECT_LOCATIONS).nullable().optional().describe("The prospect's location."),
  clientIndustry: z.string().nullable().optional().describe("The client's industry (e.g., Skincare, Clothing, Coach)."),
  visualStyle: z.string().nullable().optional().describe("Notes on the prospect's visual style (e.g., Luxe, clean, messy, vibrant...)."),
  bioSummary: z.string().nullable().optional().describe("A summary of the prospect's Instagram bio for reference."),

  // Business Stage & Metrics (from guide)
  accountStage: z.enum(ACCOUNT_STAGES).nullable().optional().describe("The prospect's business stage (New, Growing, Established)."), // Maps to Business Stage
  followerCount: z.number().nullable().optional().describe("The prospect's follower count."),
  postCount: z.number().nullable().optional().describe("The prospect's post count."),
  avgLikes: z.number().nullable().optional().describe("Average likes on recent posts."),
  avgComments: z.number().nullable().optional().describe("Average comments on recent posts."),

  // Problems & Goals (from guide)
  painPoints: z.array(z.enum(PAIN_POINTS)).nullable().optional().describe("List of common pain points the prospect might be facing."),
  goals: z.array(z.enum(GOALS)).nullable().optional().describe("List of goals the prospect might want to achieve."),

  // Lead & Interaction Context
  leadStatus: z.enum(OUTREACH_LEAD_STAGE_OPTIONS).nullable().optional().describe("Current stage of the lead."),
  source: z.enum(LEAD_SOURCES).nullable().optional().describe("How the lead was found or generated."),
  lastTouch: z.string().nullable().optional().describe("Description of the last interaction (e.g., None, Sent intro DM 3 days ago)."),
  followUpNeeded: z.boolean().nullable().optional().describe("Whether a follow-up is marked as needed."),

  // Offer Interest & Tone (from guide)
  offerInterest: z.array(z.enum(OFFER_INTERESTS)).nullable().optional().describe("What the prospect has shown interest in, if they've replied."),
  tonePreference: z.enum(TONE_PREFERENCES).nullable().optional().describe("The preferred tone for the generated script (Friendly, Confident, Creative)."), // Guide uses "Friendly / Bold / Polite" - mapping to existing.
  offerType: z.string().describe("The specific offer being made, e.g., 'Free 3-point audit + visual tips'.").default("Free 3-point audit + visual tips"),

  // Business Type (from existing, relevant for context)
  businessType: z.enum(BUSINESS_TYPES).nullable().optional().describe("The type of business the prospect runs."),
  businessTypeOther: z.string().nullable().optional().describe("Specific business type if 'Other' was selected."),
  
  // Additional Notes (from existing)
  additionalNotes: z.string().nullable().optional().describe("Any other relevant notes or context for the LLM.")
});
export type GenerateContextualScriptInput = z.infer<typeof GenerateContextualScriptInputSchema>;

const GenerateContextualScriptOutputSchema = z.object({
  script: z.string().describe('The generated script.'),
});
export type GenerateContextualScriptOutput = z.infer<typeof GenerateContextualScriptOutputSchema>;

export async function generateContextualScript(input: GenerateContextualScriptInput): Promise<GenerateContextualScriptOutput> {
  return generateContextualScriptFlow(input);
}

// Sender Studio Name is fixed as "Atlas Social Studio"
const SENDER_STUDIO_NAME = "Atlas Social Studio";
// Sender Follower Count is fixed as 0 for this guide's context
const SENDER_FOLLOWER_COUNT = 0;

const prompt = ai.definePrompt({
  name: 'generateContextualScriptPrompt',
  input: {schema: GenerateContextualScriptInputSchema},
  output: {schema: GenerateContextualScriptOutputSchema},
  prompt: `You are an expert Instagram outreach copywriter for "${SENDER_STUDIO_NAME}".
Your objective is to craft a personalized, persuasive Instagram DM to offer a free audit or content service to potential clients.
The message must: Build trust, Show relevance and expertise, Remove skepticism (especially as "${SENDER_STUDIO_NAME}" is currently positioning itself as a new, mission-driven studio selecting hand-picked brands), Offer tangible value, and Include a soft, non-pushy call-to-action.
The message goal is to get permission to send the audit/service described in "{{offerType}}".
The sender account, "${SENDER_STUDIO_NAME}", currently has ${SENDER_FOLLOWER_COUNT} followers. Frame this positively as being selective or mission-driven, NOT as being new or desperate.

Prospect Details:
{{#if clientName}}Name: {{clientName}}{{/if}}
{{#if clientHandle}}IG Handle: {{clientHandle}}{{/if}}
{{#if businessName}}Brand Name: {{businessName}}{{/if}}
{{#if clientIndustry}}Industry: {{clientIndustry}}{{/if}}
{{#if visualStyle}}Visual Style: {{visualStyle}}{{/if}}
{{#if accountStage}}Business Stage: {{accountStage}}{{/if}}
{{#if bioSummary}}Bio Summary: "{{bioSummary}}"{{/if}}
{{#if painPoints}}Identified Pain Point(s): {{#each painPoints}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
Preferred Tone: {{#if tonePreference}}{{tonePreference}}{{else}}Friendly & Confident{{/if}}
Offer: {{offerType}}

Follow this structure for the DM:

A. Personalized Opening:
   - Start with a warm greeting (e.g., "Hey {{clientName}}! 👋" or "Hi {{businessName}} team!").
   - Include a SINCERE compliment that shows you’ve ACTUALLY REVIEWED THEIR FEED. Reference their specific content, products, {{visualStyle}}, or overall vibe related to their {{clientIndustry}}.
   - Example: "I came across {{#if businessName}}{{businessName}}{{else if clientHandle}}{{clientHandle}}{{else}}your profile{{/if}} and loved the {{#if visualStyle}}{{visualStyle}} vibe of your {{clientIndustry}} content – it really stands out." (Adapt this using available info).

B. Who You Are (Without Saying "I'm New"):
   - Introduce "${SENDER_STUDIO_NAME}".
   - Position the studio as focused, curated, and mission-driven.
   - Explain the current initiative: "${SENDER_STUDIO_NAME}" is working with a few hand-picked brands admired for their potential, offering personalized audits/makeovers as part of a growth mission. This builds exclusivity.
   - Example phrasing: "I run ${SENDER_STUDIO_NAME} – we help brands like yours sharpen their visual presence and turn scrolls into clicks through content makeovers and subtle branding upgrades. We're currently working with a few hand-picked brands we admire to offer personalized insights – part of our mission to elevate standout {{#if clientIndustry_lc}}{{clientIndustry_lc_pluralized}}{{else}}businesses{{/if}}." (lowercase and pluralize industry if possible for natural language)

C. The Offer:
   - Clearly state the value of the "{{offerType}}". Make it tangible and no-pressure.
   - Briefly list 2-3 key deliverables or benefits.
   - Example for "{{offerType}}": "It includes: what’s working in your feed, where you might be losing engagement or conversions, and a couple of fresh design ideas to upgrade your visual identity." (Tailor this to the specific offerType if it changes).

D. Soft Close (Low-Pressure CTA):
   - End with a short, frictionless question to get permission.
   - Example: "Would you like me to send it over? 💬" or "Want me to DM it to you here?"

E. Things to AVOID:
   - Do NOT say "${SENDER_STUDIO_NAME}" just launched or is trying to grow.
   - Do NOT use generic compliments like “cool feed.”
   - Do NOT use fake urgency (e.g., "spots filling fast!").
   - Do NOT use a robotic tone or spammy formatting.
   - Keep the intro punchy and the overall message concise for Instagram DMs.

Psychology Reminders:
- Specificity: Use details from the prospect's profile.
- Exclusivity: Frame the offer as selective.
- Reciprocity: The free value.
- Clarity: Be clear about the offer.
- Low Commitment CTA.

Critique Directive: After drafting the script based on ALL the above, review it for emotional impact, clarity, alignment with "${SENDER_STUDIO_NAME}"'s mission-driven positioning (even with 0 followers), and conciseness. Ensure it directly addresses the prospect based on the provided context. Then, output ONLY the perfected script.

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
    // Helper for prompt: lowercase and attempt to pluralize industry
    let clientIndustry_lc: string | undefined = undefined;
    let clientIndustry_lc_pluralized: string | undefined = undefined;
    if (input.clientIndustry) {
        clientIndustry_lc = input.clientIndustry.toLowerCase();
        if (clientIndustry_lc.endsWith('y')) {
            clientIndustry_lc_pluralized = clientIndustry_lc.slice(0, -1) + 'ies';
        } else if (clientIndustry_lc.endsWith('s') || clientIndustry_lc.endsWith('sh') || clientIndustry_lc.endsWith('ch') || clientIndustry_lc.endsWith('x') || clientIndustry_lc.endsWith('z')) {
            clientIndustry_lc_pluralized = clientIndustry_lc + 'es';
        } else {
            clientIndustry_lc_pluralized = clientIndustry_lc + 's';
        }
    }

    const augmentedInput = {
        ...input,
        clientIndustry_lc,
        clientIndustry_lc_pluralized
    };

    const {output} = await prompt(augmentedInput, { config: { temperature: 0.75, maxOutputTokens: 500 }}); // Increased max tokens slightly for potentially more detailed personalized scripts
    return output!;
  }
);


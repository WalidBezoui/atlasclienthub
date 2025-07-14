
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
import { BUSINESS_TYPES, PAIN_POINTS, GOALS, LEAD_SOURCES, OFFER_INTERESTS, TONE_PREFERENCES, PROSPECT_LOCATIONS, ACCOUNT_STAGES, OUTREACH_LEAD_STAGE_OPTIONS, SCRIPT_LANGUAGES } from '@/lib/types';


const GenerateContextualScriptInputSchema = z.object({
  scriptType: z.enum([
    "Cold Outreach DM",
    "Warm Follow-Up DM",
    "Audit Delivery Message",
    "Send Reminder",
    "Soft Close",
    "Generate Next Reply",
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
  lastMessageSnippet: z.string().nullable().optional().describe("The last message received from the prospect."),
  lastScriptSent: z.string().nullable().optional().describe("A label for the last script that was sent to this prospect."),
  linkSent: z.boolean().nullable().optional().describe("Whether a link (e.g., to an audit) has been sent."),
  carouselOffered: z.boolean().nullable().optional().describe("Whether a free sample (like a carousel post) was offered."),
  nextStep: z.string().nullable().optional().describe("The defined next step for this prospect."),
  conversationHistory: z.string().nullable().optional().describe("The history of the conversation so far."),


  // Offer Interest & Tone (from guide)
  offerInterest: z.array(z.enum(OFFER_INTERESTS)).nullable().optional().describe("What the prospect has shown interest in, if they've replied."),
  tonePreference: z.enum(TONE_PREFERENCES).nullable().optional().describe("The preferred tone for the generated script (Friendly, Confident, Creative)."),
  offerType: z.string().describe("The specific offer being made, e.g., 'Free 3-point audit + visual tips'.").default("Free 3-point audit + visual tips"),

  // Business Type (from existing, relevant for context)
  businessType: z.enum(BUSINESS_TYPES).nullable().optional().describe("The type of business the prospect runs."),
  businessTypeOther: z.string().nullable().optional().describe("Specific business type if 'Other' was selected."),
  
  // Additional Notes (from existing)
  language: z.enum(SCRIPT_LANGUAGES).nullable().optional().describe("The language for the generated script. Default is English."),
  additionalNotes: z.string().nullable().optional().describe("Any other relevant notes or context for the LLM."),
  customInstructions: z.string().nullable().optional().describe("User-provided custom instructions to guide the reply generation."),
});
export type GenerateContextualScriptInput = z.infer<typeof GenerateContextualScriptInputSchema>;

const GenerateContextualScriptOutputSchema = z.object({
  script: z.string().describe('The generated script.'),
});
export type GenerateContextualScriptOutput = z.infer<typeof GenerateContextualScriptOutputSchema>;

export async function generateContextualScript(input: GenerateContextualScriptInput): Promise<GenerateContextualScriptOutput> {
  return generateContextualScriptFlow(input);
}

const SENDER_STUDIO_NAME = "Atlas Social Studio";

const prompt = ai.definePrompt({
  name: 'generateContextualScriptPrompt',
  input: {schema: GenerateContextualScriptInputSchema},
  output: {schema: GenerateContextualScriptOutputSchema},
  prompt: `You are an expert Instagram outreach copywriter for a new, creative studio called "${SENDER_STUDIO_NAME}". Your goal is to craft a personalized, persuasive Instagram DM.
The message MUST build trust, show relevance, offer tangible yet slightly vague value, and include a soft, non-pushy call-to-action.

**IMPORTANT CONTEXT: Your studio, "${SENDER_STUDIO_NAME}", is a creative studio specializing in social media, content creation, and Instagram strategy.** You MUST frame this positively. Position the studio as being highly selective and on a mission to work with a few hand-picked brands. This creates exclusivity and scarcity. DO NOT apologize for being new or having few followers.

**LANGUAGE & TONE:**
- **Language**: {{#if language}}{{language}}{{else}}English{{/if}}.
  - If "Moroccan Darija", write in natural, conversational Arabic letters (e.g., "السلام عليكم، لاباس؟").
- **Tone**: {{#if tonePreference}}{{tonePreference}}{{else}}Friendly & Confident{{/if}}.

**PROSPECT DETAILS:**
- **Name**: {{#if clientName}}{{clientName}}{{else if businessName}}{{businessName}}{{else}}{{clientHandle}}{{/if}}
- **IG Handle**: {{clientHandle}}
- **Brand Name**: {{businessName}}
- **Industry**: {{clientIndustry}}
- **Business Type**: {{#if businessType}}{{businessType}}{{#if businessTypeOther}} ({{businessTypeOther}}){{/if}}{{else}}Not specified{{/if}}
- **Identified Pain Point(s)**: {{#each painPoints}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Their Goals**: {{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Lead Status**: {{leadStatus}}
{{#if lastMessageSnippet}}- **Last Message from Them**: "{{lastMessageSnippet}}"{{/if}}

**CONVERSATION HISTORY:**
{{#if conversationHistory}}
{{{conversationHistory}}}
{{else}}
No conversation history provided.
{{/if}}

---
**CUSTOM INSTRUCTIONS:**
{{#if customInstructions}}
**CRITICAL: The user has provided specific guidance for this reply. You MUST prioritize and follow these instructions.**
**User Instructions:** "{{{customInstructions}}}"
{{else}}
(No custom instructions provided.)
{{/if}}
---
**SCRIPT GENERATION LOGIC**

**1. SCRIPT TYPE: "{{scriptType}}"**

**IF the script type is "Generate Next Reply":**
Act as an expert conversational assistant. Analyze the CONVERSATION HISTORY and the prospect's current Lead Status. Your goal is to suggest the most logical and effective next message from "Me" to move the conversation forward towards a successful outcome (e.g., getting them to agree to an audit, closing a deal). Prioritize user's Custom Instructions if provided.

**IF the script type is "Cold Outreach DM":**
Follow this structure:
**A. Personalized Opening:** Start with a warm greeting and a SINCERE, specific compliment about their page or product. Show you've actually looked.
**B. The "Exclusive Mission" Angle:** Introduce "${SENDER_STUDIO_NAME}" as a new studio on a mission to elevate a few **hand-picked brands** we genuinely admire. This creates scarcity.
**C. The Intrigue & Vague Value Offer:** Instead of a generic audit, offer specific but un-detailed insights. Build curiosity. Example: "While looking at your page, I noticed a couple of quick opportunities to potentially boost engagement and make your branding even more impactful."
**D. Soft Close:** End with a short, frictionless question to get permission. Example: "Would you be open to me sending them over? No strings attached, of course."

**IF the script type is "Warm Follow-Up DM" or "Send Reminder":**
Adapt based on conversation history. Be gentle and non-pushy.
**A. Re-engage Gently:** Refer back to the last interaction.
**B. Reiterate Value (Briefly):** Remind them of the core benefit of the "{{offerType}}".
**C. Adjust CTA based on context.**

**IF the script type is "Soft Close":**
Be graceful. Acknowledge it might not be the right time, leave the door open for the future, and wish them well.

**2. CONTEXTUALIZE BASED ON BUSINESS TYPE:**
- If they are a **"Product Brand"** or **"Local Business"**: Focus the compliment on their products, aesthetic, or customer photos. Frame the value in terms of brand perception and sales.
- If they are a **"Personal Brand (coach, consultant)"** or **"Creator / Influencer"**: Focus the compliment on their message, content, or the value they provide. Frame the value in terms of audience trust and converting followers into clients.
- If **"Other"** or unknown, use general business language.

**3. FINAL CRITIQUE:**
After drafting the script, review it for emotional impact, clarity, and alignment with the exclusive, mission-driven positioning. Ensure it is concise and sounds human.

**Now, generate the "{{scriptType}}" for this prospect in the requested language.**
`,
});

const generateContextualScriptFlow = ai.defineFlow(
  {
    name: 'generateContextualScriptFlow',
    inputSchema: GenerateContextualScriptInputSchema,
    outputSchema: GenerateContextualScriptOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input, { config: { temperature: 0.8, maxOutputTokens: 500 }});
    return output!;
  }
);

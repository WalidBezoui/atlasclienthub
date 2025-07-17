
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
import type { BusinessType, PainPoint, Goal, LeadSource, OfferInterest, TonePreference, ProspectLocation, AccountStage, ScriptLanguage } from '@/lib/types';
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
  name: 'generateAndTranslateScriptPrompt',
  input: {schema: GenerateContextualScriptInputSchema},
  output: {schema: GenerateContextualScriptOutputSchema},
  prompt: `You are an expert Instagram outreach copywriter for a creative studio called "${SENDER_STUDIO_NAME}", which specializes in social media, content creation, and Instagram strategy.

**YOUR TASK IS A TWO-STEP PROCESS:**
1.  **STEP 1 (Internal Thought Process):** First, analyze all the prospect details provided below. Based on these details and the script generation rules, mentally craft the perfect, personalized Instagram DM in ENGLISH. This is your internal draft.
2.  **STEP 2 (Final Output):** Translate the English draft you just created into the requested language: **{{#if language}}{{language}}{{else}}English{{/if}}**. Your final response must *only* be the translated text.

**CRITICAL LANGUAGE INSTRUCTIONS:**
- Your entire final response MUST be in the requested language.
- If the requested language is "Moroccan Darija", you MUST write the translation using Arabic letters and a natural, conversational dialect (e.g., "السلام عليكم، كيف الحال؟"). Do not use Latin characters (franco).

---
**PROSPECT DETAILS & CONTEXT FOR YOUR INTERNAL DRAFT:**
- **Name**: {{#if clientName}}{{clientName}}{{else if businessName}}{{businessName}}{{else}}{{clientHandle}}{{/if}}
- **IG Handle**: {{clientHandle}}
- **Brand Name**: {{businessName}}
- **Industry**: {{clientIndustry}}
- **Business Type**: {{#if businessType}}{{businessType}}{{#if businessTypeOther}} ({{businessTypeOther}}){{/if}}{{else}}Not specified{{/if}}
- **Identified Pain Point(s)**: {{#each painPoints}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Their Goals**: {{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Lead Status**: {{leadStatus}}
{{#if lastMessageSnippet}}- **Last Message from Them**: "{{lastMessageSnippet}}"{{/if}}
- **Conversation History**: {{#if conversationHistory}}{{{conversationHistory}}}{{else}}No history.{{/if}}

---
**SCRIPT GENERATION RULES (FOR YOUR INTERNAL ENGLISH DRAFT)**

**1. SCRIPT TYPE: "{{scriptType}}"**

**IF "Cold Outreach DM":**
   - **Compliment:** Start with a sincere, specific compliment about their page or product. Show you've actually looked.
   - **The "Exclusive Mission" Angle:** Introduce "${SENDER_STUDIO_NAME}" as a creative studio on a mission to elevate a few **hand-picked brands** we genuinely admire. This creates exclusivity.
   - **Intrigue & Vague Value:** Instead of a generic audit, offer specific but un-detailed insights to build curiosity. Example: "I noticed a couple of quick opportunities to potentially boost engagement and make your branding even more impactful."
   - **Soft CTA:** End with a short, frictionless question to get permission. Example: "Would you be open to me sending them over? No strings attached, of course."

**IF "Warm Follow-Up DM" or "Send Reminder":**
   - Be gentle and non-pushy. Refer back to the last interaction and briefly reiterate the value of the "{{offerType}}".

**IF "Generate Next Reply":**
   - Act as an expert conversational assistant. Analyze the conversation history and the prospect's last message. Your goal is to suggest the most logical next message to move the conversation forward. Prioritize the user's custom instructions if provided.

**IF "Soft Close":**
   - Be graceful. Acknowledge it might not be the right time and leave the door open for the future.

**2. POSITIONING & TONE (FOR YOUR INTERNAL ENGLISH DRAFT):**
- Your tone should be: **{{#if tonePreference}}{{tonePreference}}{{else}}Friendly & Confident{{/if}}**.
- Always position the studio as highly selective. We are on a mission, not desperate for clients.

**3. CUSTOM INSTRUCTIONS (FOR YOUR INTERNAL ENGLISH DRAFT):**
{{#if customInstructions}}
**CRITICAL: The user has provided specific guidance. You MUST prioritize and follow these instructions.**
**User Instructions:** "{{{customInstructions}}}"
{{else}}
(No custom instructions provided.)
{{/if}}

---
Now, perform Step 2. Translate your internally-crafted English script into **{{#if language}}{{language}}{{else}}English{{/if}}** and provide only that translation as your output.
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
    
    if (!output?.script) {
        throw new Error("Failed to generate a valid script.");
    }

    return { script: output.script };
  }
);

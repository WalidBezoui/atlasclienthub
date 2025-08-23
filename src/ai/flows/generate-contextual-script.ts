

'use server';
/**
 * @fileOverview Generates contextual scripts based on client or content information.
 * This flow ALWAYS generates the script in English.
 *
 * - generateContextualScript - A function to generate scripts.
 * - GenerateContextualScriptInput - Input type for script generation.
 * - GenerateContextualScriptOutput - Output type for script generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { BusinessType, PainPoint, Goal, LeadSource, OfferInterest, TonePreference, ProspectLocation, AccountStage, WarmUpActivity } from '@/lib/types';
import { BUSINESS_TYPES, PAIN_POINTS, GOALS, LEAD_SOURCES, OFFER_INTERESTS, TONE_PREFERENCES, PROSPECT_LOCATIONS, ACCOUNT_STAGES, OUTREACH_LEAD_STAGE_OPTIONS } from '@/lib/types';


const GenerateContextualScriptInputSchema = z.object({
  scriptType: z.enum([
    "Cold Outreach DM",
    "Warm Follow-Up DM",
    "Audit Delivery Message",
    "Send Reminder",
    "Soft Close",
    "Generate Next Reply",
    "Conversation Starter",
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
  uniqueNote: z.string().nullable().optional().describe("A unique, specific, and true observation about their page to be used for a compliment."),


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
  
  // "Become Inevitable" Context
  isInevitableMethod: z.boolean().nullable().optional().describe("Whether this prospect is part of the 'Become Inevitable' 10-day warm-up method."),
  warmUpActivities: z.array(z.string()).nullable().optional().describe("List of completed warm-up activities (e.g., 'Liked Posts', 'Left Comment')."),

  // Business Type (from existing, relevant for context)
  businessType: z.enum(BUSINESS_TYPES).nullable().optional().describe("The type of business the prospect runs."),
  businessTypeOther: z.string().nullable().optional().describe("Specific business type if 'Other' was selected."),
  
  // Additional Notes (from existing)
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
  input: {schema: z.any()}, // Input schema handled in the flow
  output: {schema: GenerateContextualScriptOutputSchema},
  prompt: `You are an expert Instagram outreach copywriter and senior strategist for a creative studio called "${SENDER_STUDIO_NAME}", which specializes in social media, content creation, and Instagram strategy.

Your task is to craft the perfect, personalized Instagram DM based on the prospect details and conversation history below.

---
**PROSPECT DETAILS:**
- **Name**: {{#if clientName}}{{clientName}}{{else if businessName}}{{businessName}}{{else}}{{clientHandle}}{{/if}}
- **IG Handle**: {{clientHandle}}
- **Brand Name**: {{businessName}}
- **Industry**: {{clientIndustry}}
- **Business Type**: {{#if businessType}}{{businessType}}{{#if businessTypeOther}} ({{businessTypeOther}}){{/if}}{{else}}Not specified{{/if}}
- **Identified Pain Point(s)**: {{#each painPoints}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Their Goals**: {{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Lead Status**: {{leadStatus}}
{{#if isInevitableMethod}}
- **Outreach Method**: "Become Inevitable" (10-Day Warm-Up)
- **Warm-Up Actions Completed**: {{#if warmUpActivities}}{{#each warmUpActivities}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None yet{{/if}}
{{/if}}
---

**SCRIPT GENERATION RULES**

**1. SCRIPT TYPE: "{{scriptType}}"**

**IF "Cold Outreach DM":**
   - **Language:** The response MUST be in FRENCH.
   - **Goal:** To start a conversation by providing value, not to make a hard sell.
   - **Structure:** You must follow this 4-part structure. Do NOT use a rigid template.
     1.  **The Hook (Personalized Compliment):** Start with a genuine, specific compliment. Use the \`uniqueNote\` field if available. If not, create one based on their page. It MUST be specific (e.g., "la palette de couleurs de votre dernier réel", "la façon dont vous présentez vos produits").
     2.  **The "Why You?" (Relate & State Expertise):** Briefly and elegantly connect their brand to your agency's expertise. Mention that you work with brands in their niche. This shows them they aren't just a random name on a list. Example: "En tant que studio qui collabore avec des marques de [Industry/Niche], votre approche a vraiment retenu notre attention."
     3.  **The Value Proposition (Identify the Gap):** This is the most critical part. Instead of a generic offer, pinpoint a *single, high-impact area* where they could improve, based on their pain points. Frame it as a helpful observation. Examples:
         - *If pain is "Inconsistent grid":* "En parcourant votre page, j'ai remarqué que votre contenu est excellent, mais avec une grille plus harmonieuse, l'impact visuel pourrait être décuplé."
         - *If pain is "Low engagement":* "J'ai vu que vous aviez une belle communauté, et j'ai quelques idées sur comment transformer cette audience en clients fidèles."
     4.  **The Call to Action (Low-Friction Ask):** End with a soft, easy-to-say-yes-to question. DO NOT ask for a call. The goal is to get a reply and start a conversation.
         - *Good:* "Seriez-vous ouvert(e) à ce que je vous envoie une ou deux suggestions rapides à ce sujet ?"
         - *Good:* "Je peux vous envoyer quelques exemples si ça vous intéresse."
         - *Bad:* "Pouvons-nous prévoir un appel ?"
         
   - **Putting it all together:** The final output should be a smooth, natural-sounding message. It should feel like a peer reaching out, not a salesperson.

**IF "Conversation Starter":**
   - **Language:** The response SHOULD BE in ENGLISH, unless prospect details indicate otherwise.
   - **Context:** This script is for the "Private Engagement" phase of the warm-up method. It's the first DM to send after they've engaged with your comment or story reply.
   - **Goal:** To start a genuine, low-pressure conversation. **DO NOT PITCH ANYTHING.**
   - **Template Ideas:**
     - **Acknowledge their engagement:** Start by acknowledging their like/reply to bridge the gap.
       - "Hey {{clientName}}, thanks for the love on my comment!"
       - "Hey {{clientName}}, appreciate the reply to my story!"
     - **Connect to their content:** Ask a thoughtful, open-ended question related to their recent posts or niche.
       - "That post you did about [topic] was super insightful. It made me wonder, what's the biggest hurdle you see [their target audience] facing when it comes to [related challenge]?"
       - "Loved your story about [story topic]. How have you found the response to that been?"
     - **Focus on a specific compliment:** Refer back to something you genuinely like.
       - "Just wanted to say I'm really impressed with how you [do something specific from their page]. What was the inspiration behind that?"

**IF "Generate Next Reply":**
   - **Role:** Act as a senior sales strategist for "${SENDER_STUDIO_NAME}". Your goal is to move the conversation forward toward a specific outcome (e.g., getting them to agree to a free audit, booking a call).
   - **Task:** Based on the full conversation history below, craft the best possible next reply.
   - **Analysis Steps (Internal Monologue - do not show in output):**
     1.  **Analyze the Full History:** What has been said? What was our last message? What was their reply?
     2.  **Determine Current State:** Are they skeptical? Interested but busy? Confused? Asking for details?
     3.  **Identify Next Logical Goal:** Based on their state, what is the *single most effective thing* we can say to guide them to the next milestone (e.g., from 'interested' to 'accepting an audit')?
     4.  **Craft the Reply:** Write a concise, natural-sounding message that accomplishes this next step. It should directly address their last message while gently steering the conversation.
   - **CRITICAL CONTEXT TO USE:**
     - **Full Conversation History (Newest at bottom):**
       {{#if conversationHistory}}
       {{{conversationHistory}}}
       {{else}}
       (No conversation history yet. This is the first message.)
       {{/if}}
     - **Prospect's Last Message:** "{{#if lastMessageSnippet}}{{{lastMessageSnippet}}}{{else}}(No previous message from them){{/if}}"
     - **Your Custom Instructions (Highest Priority):** "{{#if customInstructions}}{{{customInstructions}}}{{else}}(No custom instructions provided){{/if}}"
   - **Final Output:** The generated script should be ready to copy and paste.

**IF "Warm Follow-Up DM" or "Send Reminder":**
   - **Goal:** To re-engage a prospect who has not replied to a previous message, without being pushy or annoying.
   - **Structure:**
     1. **Contextual Opener:** Gently remind them of the last interaction. This is critical.
        - *If you sent an audit:* "Hey {{clientName}}, just wanted to follow up and see if you had a chance to look at the audit I sent over?"
        - *If you made an offer:* "Hey {{clientName}}, hope you're having a great week! Just wanted to quickly follow up on my offer to share some ideas about [their pain point]."
        - *If they replied and then went silent:* "Hey {{clientName}}, circling back on our conversation from last week."
     2. **Value Reiteration & Low-Friction CTA:** Briefly restate the value and ask an easy, open-ended question.
        - *Example for audit:* "Was there anything in there that stood out, or any questions I can answer?"
        - *Example for offer:* "No pressure at all, just thought it could be helpful. Would you still be interested?"
   - **Rules:**
     - **NEVER** say "just checking in" or "just following up" without context.
     - Keep it short and respectful of their time.
     - Assume they are busy, not that they are ignoring you.

**IF "Soft Close":**
   - Be graceful. Acknowledge it might not be the right time and leave the door open for the future.

**2. POSITIONING & TONE:**
- Your tone should be: **{{#if tonePreference}}{{tonePreference}}{{else}}Friendly & Confident{{/if}}**.
- Always position the studio as highly selective. We are on a mission, not desperate for clients.

**3. CUSTOM INSTRUCTIONS:**
{{#if customInstructions}}
**CRITICAL: The user has provided specific guidance. You MUST prioritize and follow these instructions.**
**User Instructions:** "{{{customInstructions}}}"
{{else}}
(No custom instructions provided.)
{{/if}}

---
Now, generate the script.
`,
});


const generateContextualScriptFlow = ai.defineFlow(
  {
    name: 'generateContextualScriptFlow',
    inputSchema: GenerateContextualScriptInputSchema,
    outputSchema: GenerateContextualScriptOutputSchema,
  },
  async (input) => {
    // Pre-process the input to create boolean flags for Handlebars
    const promptInput = {
      ...input,
      isCreator: input.businessType === "Creator / Influencer",
      isPersonalBrand: input.businessType === "Personal Brand (coach, consultant)",
      isBusiness: !["Creator / Influencer", "Personal Brand (coach, consultant)"].includes(input.businessType || ''),
      isInevitableMethod: input.leadStatus === 'Warming Up', // Set flag based on status
      warmUpActivities: input.warmUpActivities || [],
    };

    const {output} = await prompt(promptInput, { config: { temperature: 0.8, maxOutputTokens: 500 }});
    
    if (!output?.script) {
        throw new Error("Failed to generate a valid script.");
    }

    return { script: output.script };
  }
);
    






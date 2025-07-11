
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
  prompt: `You are an expert Instagram outreach copywriter for a new, mission-driven studio called "${SENDER_STUDIO_NAME}". Your goal is to craft a personalized, persuasive Instagram DM.
The message MUST build trust, show relevance, offer tangible yet slightly vague value, and include a soft, non-pushy call-to-action.

**IMPORTANT CONTEXT: Your studio, "${SENDER_STUDIO_NAME}", is a new, boutique agency.** You MUST frame this positively. Position the studio as being highly selective and on a mission to work with a few hand-picked brands. This creates exclusivity and scarcity. DO NOT apologize for being new or having few followers.

**PROSPECT DETAILS:**
- **Name**: {{clientName}}
- **IG Handle**: {{clientHandle}}
- **Brand Name**: {{businessName}}
- **Industry**: {{clientIndustry}}
- **Visual Style Notes**: {{visualStyle}}
- **Bio Summary**: "{{bioSummary}}"
- **Business Stage**: {{accountStage}}
- **Identified Pain Point(s)**: {{#each painPoints}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Their Goals**: {{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- **Preferred Tone**: {{#if tonePreference}}{{tonePreference}}{{else}}Friendly & Confident{{/if}}
- **Offer**: {{offerType}}
- **Lead Status**: {{leadStatus}}
{{#if lastMessageSnippet}}- **Last Message from Them**: "{{lastMessageSnippet}}"{{/if}}

**CONVERSATION HISTORY:**
{{#if conversationHistory}}
{{{conversationHistory}}}
{{else}}
No conversation history provided.
{{/if}}
---
**SCRIPT GENERATION LOGIC**

**IF the script type is "Generate Next Reply", your task is to act as an expert conversational assistant. Analyze the entire CONVERSATION HISTORY and the prospect's current Lead Status. Your goal is to suggest the most logical and effective next message from "Me" to move the conversation forward towards a successful outcome (e.g., getting them to agree to an audit, closing a deal).**

{{#if customInstructions}}
**CRITICAL INSTRUCTION: The user has provided specific guidance for this reply. You MUST prioritize and follow these instructions.**
**Custom Instructions:** "{{{customInstructions}}}"
Based on these instructions AND the full context below, generate the next reply.
{{/if}}

**A. Analyze the last message in the CONVERSATION HISTORY.** Is it from them or from me? What was the topic? Is there an unanswered question?
**B. Consider their current Lead Status: "{{leadStatus}}".**
   - If 'Replied' or 'Interested', they are engaged. Suggest a message that transitions to the next logical step. If a qualifier question hasn't been asked, suggest that. If it has, guide them towards the audit.
   - If 'Qualifier Sent' and their last message is a reply, analyze their reply and suggest how to confirm you're ready to start the audit.
   - If 'Audit Delivered', suggest a follow-up asking for their thoughts or feedback.
   - If 'Cold' or 'Warm' and they haven't replied for a while, suggest a gentle, non-pushy follow-up. Avoid being repetitive.
   - If 'Not Interested', suggest a graceful closing message that leaves the door open for the future.
**C. Review all other prospect details** (Pain Points, Goals, Industry) to add personalization and relevance.
**D. Keep the tone consistent with the preferred tone: {{#if tonePreference}}{{tonePreference}}{{else}}Friendly & Confident{{/if}}.**
**E. Formulate a concise, natural-sounding DM. The message should be ready to copy and paste.**

---

**IF the script type is "Cold Outreach DM" OR the lead status is 'To Contact' or 'Cold' (this is a NEW lead), follow this structure:**

**A. Personalized Opening:**
   - Start with a warm greeting (e.g., "Hey {{#if clientName}}{{clientName}}{{else if businessName}}{{businessName}}{{else}}{{clientHandle}}{{/if}}! 👋").
   - Give a SINCERE compliment that shows you’ve reviewed their feed. Reference their specific content, products, {{#if visualStyle}}their {{visualStyle}} visual style, {{/if}}or overall vibe related to their {{#if clientIndustry}}{{clientIndustry}} niche.{{/if}} Be specific. Avoid "cool feed".
   - Example: "Came across your page and the way you showcase your products is beautiful. Really love the authentic feel."

**B. The "Mission-Driven & Exclusive" Angle:**
   - Introduce "${SENDER_STUDIO_NAME}".
   - Frame the outreach as a special initiative: "${SENDER_STUDIO_NAME}" is a new studio on a mission to elevate a few **hand-picked brands** we genuinely admire. This creates exclusivity.
   - Example phrasing: "My name's [Your Name] and I run ${SENDER_STUDIO_NAME}. We're a new boutique studio on a mission to help a select few brands we admire sharpen their visual presence to turn more followers into clients."

**C. The Intrigue & Vague Value Offer:**
   - Instead of a generic audit, offer specific but un-detailed insights. This builds curiosity.
   - Example: "While looking at your page, I noticed a couple of quick opportunities to potentially boost engagement and make your branding even more impactful. I put together a few thoughts I think you'll find valuable."
   - This is better than a generic "3-point audit" because it's tailored and mysterious.

**D. Soft Close (Low-Pressure CTA):**
   - End with a short, frictionless question to get permission.
   - Example: "Would you be open to me sending them over? No strings attached, of course."

---

**IF the script type is "Warm Follow-Up DM" OR the lead status is 'Warm', 'Replied', or 'Interested' (this is a FOLLOW-UP), adapt the structure. Base your response on the provided Conversation History and the Last Message Snippet.**

**A. Re-engage Gently:**
   - Refer back to the last interaction based on the conversation history.
   - If they replied, acknowledge their message directly.
   - Example if they said "for free!!?": "Hey {{clientName}}! Just following up. And yes, absolutely no strings attached! We do this for a select few brands we're excited about."
   - Example if they said "I'll check later": "Hey {{clientName}}, hope you had a great week! Just wanted to gently follow up on the ideas I had for {{businessName}}. No pressure at all, just wanted to see if you had any thoughts."
   - If they haven't replied at all (status is 'Warm' but no reply and no convo history): "Hey {{clientName}}, just wanted to quickly resurface my message from last week about a couple of quick ideas for {{businessName}}. Let me know if you'd be open to it! 🙂"

**B. Reiterate Value (Briefly):**
   - Remind them of the core benefit of the "{{offerType}}".
   - Example: "It's a quick way to get some fresh eyes on your content strategy."

**C. The CTA (Adjust based on context):**
   - If they showed interest, make the next step easy.
   - Example: "If you're still interested, just give me the word and I'll get it to you this week!"
   - If it's a cold follow-up, repeat the soft CTA: "Would you be open to me sending it over?"

---

**IF the script type is "Send Reminder", follow this structure (for prospects who haven't replied after a few days):**

**A. Gentle Re-engagement:**
   - Start with a friendly, low-pressure opener.
   - Example: "Hey {{clientName}}, just wanted to quickly resurface my message from last week..."

**B. Reiterate the Offer Briefly:**
   - Remind them of the value without being pushy.
   - Example: "...about the free ideas for {{businessName}}. No pressure at all, just thought it might be helpful!"

**C. Soft CTA:**
   - End with a simple, easy-to-answer question.
   - Example: "Let me know if you'd be open to it! 🙂"

---

**IF the script type is "Soft Close", follow this structure (for prospects who are not interested or have ghosted):**

**A. Acknowledge and Respect Their Position:**
   - Start by acknowledging that it might not be the right time. Be graceful.
   - Example: "Hey {{clientName}}, no worries at all if now isn't the right time for this."

**B. Leave the Door Open (Future Value):**
   - Offer future help without any immediate expectation. This maintains a positive relationship.
   - Example: "I'll leave it with you! If you ever want a fresh pair of eyes on your IG strategy in the future, just give me a shout."

**C. Wish Them Well:**
   - End on a positive and genuine note.
   - Example: "Wishing you all the best with {{businessName}}!"

---

**FINAL CRITIQUE DIRECTIVE:**
After drafting the script based on ALL the above, review it for emotional impact, clarity, and alignment with "${SENDER_STUDIO_NAME}"'s exclusive, mission-driven positioning. Ensure it sounds human and is concise for Instagram DMs.

**Now, generate the "{{scriptType}}" for this prospect:**
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
        if (clientIndustry_lc.endsWith('y') && !['day', 'key', 'guy', 'way', 'toy', 'boy', 'play'].some(s => clientIndustry_lc.endsWith(s))) { // simple y -> ies
            clientIndustry_lc_pluralized = clientIndustry_lc.slice(0, -1) + 'ies';
        } else if (['s', 'sh', 'ch', 'x', 'z'].some(suffix => clientIndustry_lc.endsWith(suffix))) { // s, sh, ch, x, z -> es
            clientIndustry_lc_pluralized = clientIndustry_lc + 'es';
        } else { // default -> s
            clientIndustry_lc_pluralized = clientIndustry_lc + 's';
        }
    }

    const augmentedInput = {
        ...input,
        clientIndustry_lc,
        clientIndustry_lc_pluralized
    };

    const {output} = await prompt(augmentedInput, { config: { temperature: 0.8, maxOutputTokens: 500 }});
    return output!;
  }
);

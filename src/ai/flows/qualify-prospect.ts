
'use server';
/**
 * @fileOverview Qualifies an Instagram prospect using AI.
 *
 * - qualifyProspect - Analyzes metrics and bio to generate a lead score and qualification data.
 * - QualifyProspectInput - Input type for the function.
 * - QualifyProspectOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PainPoint, Goal, QualificationData } from '@/lib/types';
import { PAIN_POINTS, GOALS } from '@/lib/types';


const QualificationDataSchema = z.object({
    isBusiness: z.enum(['yes', 'no', 'unknown']).describe("Is this a business/creator account, not a personal one?"),
    hasInconsistentGrid: z.enum(['yes', 'no', 'unknown']).describe("Does their grid seem inconsistent or lack clear branding? (Based on user's visual assessment)"),
    hasLowEngagement: z.enum(['yes', 'no', 'unknown']).describe("Is their engagement (likes/comments) low for their follower count?"),
    hasNoClearCTA: z.enum(['yes', 'no', 'unknown']).describe("Does their bio have a weak, unclear, or missing Call-to-Action?"),
    valueProposition: z.enum(['visuals', 'leads', 'engagement', 'unknown']).describe("What is the #1 area we can help them with? (Visuals/Branding, Leads/Sales, or Engagement/Growth)"),
    profitabilityPotential: z.enum(['low', 'medium', 'high', 'unknown']).describe("Assessment of the prospect's likely ability to afford services."),
    contentPillarClarity: z.enum(['unclear', 'somewhat-clear', 'very-clear', 'unknown']).describe("How clear are their main content topics or pillars from their bio and recent posts?"),
    salesFunnelStrength: z.enum(['none', 'weak', 'strong', 'unknown']).describe("How effective is their sales funnel from their Instagram bio? 'strong' = direct booking/sales page; 'weak' = generic linktree; 'none' = no link."),
});

const QualifyProspectInputSchema = z.object({
  instagramHandle: z.string().describe("The prospect's Instagram handle."),
  followerCount: z.number().nullable().describe("The prospect's follower count."),
  postCount: z.number().nullable().describe("The prospect's post count."),
  avgLikes: z.number().nullable().describe("Average likes on recent posts."),
  avgComments: z.number().nullable().describe("Average comments on recent posts."),
  biography: z.string().nullable().describe("The prospect's Instagram bio text."),
  clarificationResponse: z.string().nullable().optional().describe("The user's selected answer from a previous multiple-choice clarification request. This is the key to proceeding with the final analysis."),
});
export type QualifyProspectInput = z.infer<typeof QualifyProspectInputSchema>;

const QualifyProspectOutputSchema = z.object({
  qualificationData: QualificationDataSchema.describe("The structured qualification assessment."),
  leadScore: z.number().min(0).max(100).nullable().describe("A calculated lead score from 0-100. This will be null until all clarification questions are answered."),
  painPoints: z.array(z.enum(PAIN_POINTS)).nullable().optional().describe("A list of likely pain points. Null until analysis is complete."),
  goals: z.array(z.enum(GOALS)).nullable().optional().describe("A list of likely goals. Null until analysis is complete."),
  summary: z.string().describe("A concise, 1-2 sentence summary of the analysis. If clarification is needed, this will state what the AI is waiting for."),
  clarificationRequest: z.object({
    question: z.string().describe("The question for the user."),
    options: z.array(z.string()).min(2).max(4).describe("A list of 2-4 options for the user to choose from."),
  }).nullable().optional().describe("If the AI needs more info, it will return this object. The analysis is paused until this is answered."),
});
export type QualifyProspectOutput = z.infer<typeof QualifyProspectOutputSchema>;

export async function qualifyProspect(input: QualifyProspectInput): Promise<QualifyProspectOutput> {
  return qualifyProspectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'qualifyProspectPrompt',
  input: {schema: QualifyProspectInputSchema},
  output: {schema: QualifyProspectOutputSchema},
  prompt: `You are a senior Instagram growth strategist. Your goal is to qualify a prospect by analyzing their data and asking for essential visual context from the user.

**PROSPECT DATA:**
- **Handle:** {{instagramHandle}}
- **Bio:** "{{#if biography}}{{biography}}{{else}}Not available{{/if}}"
- **Followers:** {{#if followerCount}}{{followerCount}}{{else}}N/A{{/if}}
- **Posts:** {{#if postCount}}{{postCount}}{{else}}N/A{{/if}}
- **Avg. Likes:** {{#if avgLikes}}{{avgLikes}}{{else}}N/A{{/if}}
- **Avg. Comments:** {{#if avgComments}}{{avgComments}}{{else}}N/A{{/if}}

**STANDARD OPERATING PROCEDURE (SOP):**

Your entire task is one of two things: either ask a question, or provide a final analysis.

**IF \`clarificationResponse\` IS NOT PROVIDED:**
This is the first run. Your job is to ask the FIRST and MOST IMPORTANT question.
1. Analyze the data.
2. Determine the highest-priority question based on the priority list below (start with Profitability).
3. Generate the question and options.
4. **Return a "Paused State":**
   - Set \`clarificationRequest\` to the question object.
   - Set \`leadScore\`, \`painPoints\`, \`goals\` to \`null\`.
   - Set \`summary\` to a message like "Awaiting input to complete qualification."
   - Fill out \`qualificationData\` with 'unknown' for fields that are not yet known.
   - **STOP HERE.** Do not proceed.

**IF \`clarificationResponse\` IS PROVIDED:**
The user has answered a question. Your job is to decide whether to ask the NEXT question or FINISH the analysis.
1. Use the \`clarificationResponse\` as a fact to update your understanding of the prospect.
2. Look at the priority list again. Is there another question you need to ask?
   - **If YES (e.g., they answered Profitability, now you must ask about Visual Feed):**
     - Generate the NEXT question and options.
     - Return another "Paused State" exactly as described above.
     - **STOP HERE.**
   - **If NO (all necessary questions have been answered):**
     - Perform a **Final Analysis**.
     - Set \`clarificationRequest\` to \`null\`.
     - Calculate the final \`leadScore\`.
     - Determine the \`painPoints\` and \`goals\`.
     - Write the final, comprehensive \`summary\`.
     - Fill out the complete \`qualificationData\` object.

---
**QUESTION PRIORITY ORDER (Strict):**
1.  **Profitability**: Is it clear how they make money?
2.  **Visual Feed**: Have you received the user's visual assessment? This is mandatory.
3.  **Content Strategy**: What is their biggest content opportunity? (Lower priority)

---
**Question Generation Examples:**

- **A. Profitability Question (Priority 1)**:
  - *Scenario*: Bio is vague ("Spreading good vibes").
  - *Good Question*: "What's the primary way this account seems to make money (or plans to)?"
  - *Good Options*: ["Selling high-ticket services (coaching, consulting)", "Selling physical products", "Affiliate marketing / brand deals", "It seems to be a personal blog or hobby account"]

- **B. Visual Feed Question (Priority 2 - MANDATORY)**:
  - *This is the MOST common and important question.* You MUST ask this if profitability is clear.
  - *Good Question*: "Based on their feed, how would you describe their visual branding?"
  - *Good Options*: ["Polished & On-Brand (Strong visuals, consistent aesthetic)", "Clean but Generic (Lacks personality, looks like a template)", "Messy & Inconsistent (No clear style, feels unplanned)", "Not Enough Content (Too new or inactive to judge)"]

- **C. Content Strategy Question (Priority 3)**:
  - *Scenario*: Profitability is clear, user has said feed is "Polished & On-Brand".
  - *Good Question*: "What is the biggest strategic opportunity for their content?"
  - *Good Options*: ["Reaching a wider audience (Top of Funnel)", "Increasing engagement with current followers (Middle of Funnel)", "Converting followers into clients (Bottom of Funnel)"]

---
**Scoring Model (Max 100 - ONLY calculate if analysis is complete):**

- **Part 1: Foundation Score (Business Viability)**
  - Base Score: 10
  - Is a Business: 'yes' (+15)
  - Profitability Potential: 'high' (+20), 'medium' (+10), 'low' (-15)
  - Sales Funnel Strength: 'strong' (+10), 'weak' (+5)
  - Audience Size: followerCount > 10000 (+10), followerCount > 1000 (+5)
- **Part 2: Opportunity Score (Problems We Can Solve)**
  - Content/Strategy Problem: 'contentPillarClarity' is 'unclear' (+10)
  - Engagement Problem: 'hasLowEngagement' is 'yes' (+10)
  - Visuals/Branding Problem: 'hasInconsistentGrid' is 'yes' (+10)
  - CTA/Bio Problem: 'hasNoClearCTA' is 'yes' (+5)
- **Final Score = Foundation Score + Opportunity Score**

---
Now, perform the analysis for **{{instagramHandle}}** according to the SOP.
`,
}));

const qualifyProspectFlow = ai.defineFlow(
  {
    name: 'qualifyProspectFlow',
    inputSchema: QualifyProspectInputSchema,
    outputSchema: QualifyProspectOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

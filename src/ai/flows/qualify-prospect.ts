
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
  
  // The application now manages state and sends the current qualification data to the AI.
  qualificationData: QualificationDataSchema.optional().describe("The current, partially-filled qualification data. The AI will use this to determine the next step."),

  // These fields are no longer needed as the application handles the state update before calling the AI.
  lastQuestion: z.string().nullable().optional().describe("This field is deprecated."),
  clarificationResponse: z.string().nullable().optional().describe("This field is deprecated."),
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
  prompt: `You are a senior Instagram growth strategist executing a strict, step-by-step qualification process. Your job is to look at the data you are given and determine the next step.

**PROSPECT DATA:**
- **Handle:** {{instagramHandle}}
- **Bio:** "{{#if biography}}{{biography}}{{else}}Not available{{/if}}"
- **Followers:** {{#if followerCount}}{{followerCount}}{{else}}N/A{{/if}}
- **Posts:** {{#if postCount}}{{postCount}}{{else}}N/A{{/if}}
- **Avg. Likes:** {{#if avgLikes}}{{avgLikes}}{{else}}N/A{{/if}}
- **Avg. Comments:** {{#if avgComments}}{{avgComments}}{{else}}N/A{{/if}}

**CURRENT QUALIFICATION STATE (Your input):**
{{#if qualificationData}}
- isBusiness: **{{qualificationData.isBusiness}}**
- hasInconsistentGrid: **{{qualificationData.hasInconsistentGrid}}**
- hasLowEngagement: **{{qualificationData.hasLowEngagement}}**
- hasNoClearCTA: **{{qualificationData.hasNoClearCTA}}**
- valueProposition: **{{qualificationData.valueProposition}}**
- profitabilityPotential: **{{qualificationData.profitabilityPotential}}**
- contentPillarClarity: **{{qualificationData.contentPillarClarity}}**
- salesFunnelStrength: **{{qualificationData.salesFunnelStrength}}**
{{else}}
The qualification process is just starting.
{{/if}}

**STANDARD OPERATING PROCEDURE (SOP):**

**Step 1: Initial Analysis (only if \`qualificationData\` is not provided)**
- If you are starting fresh (no \`qualificationData\` provided), perform a quick analysis of the raw prospect data to create a baseline \`qualificationData\` object.
  - Based on bio, is there a CTA? Is the funnel weak (linktree) or strong (sales page)?
  - Is the engagement rate low? (e.g., likes are < 1% of followers).
  - Can you determine if it's a business from the bio?
  - Fill in what you can, and set the rest to 'unknown'.

**Step 2: Ask The Next Required Question**
- After establishing the current state (either from your initial analysis or from the input), check the data in this **strict priority order**:
  1. Is \`profitabilityPotential\` 'unknown'? If YES, ask the Profitability Question and **STOP**.
  2. Is \`hasInconsistentGrid\` 'unknown'? If YES, ask the Visual Feed Question and **STOP**.
  3. Is \`valueProposition\` 'unknown'? If YES, ask the Content Strategy Question and **STOP**.

- To ask a question, you MUST return a "Paused State":
   - Set \`clarificationRequest\` to the question object.
   - Set \`leadScore\`, \`painPoints\`, \`goals\` to \`null\`.
   - Set \`summary\` to a message like "Awaiting input to complete qualification."
   - You MUST return the \`qualificationData\` object that represents the current state.

**Step 3: Final Analysis (Only if all questions are answered)**
- If \`profitabilityPotential\`, \`hasInconsistentGrid\`, and \`valueProposition\` ALL have a value other than 'unknown', then and only then do you perform the Final Analysis.
- Set \`clarificationRequest\` to \`null\`.
- Fill out the complete \`qualificationData\` object.
- Calculate the final \`leadScore\` based on the scoring model.
- Determine the \`painPoints\` and \`goals\` based on your complete knowledge base.
- Write the final, comprehensive \`summary\`.

---
**Question Templates:**
- **Profitability Question**: "What's the primary way this account seems to make money (or plans to)?" with options ["Selling high-ticket services (coaching, consulting)", "Selling physical products", "Affiliate marketing / brand deals", "It's a personal blog or hobby account"]
- **Visual Feed Question**: "Based on their feed, how would you describe their visual branding?" with options ["Polished & On-Brand (Strong visuals, consistent aesthetic)", "Clean but Generic (Lacks personality, looks like a template)", "Messy & Inconsistent (No clear style, feels unplanned)", "Not Enough Content (Too new or inactive to judge)"]
- **Content Strategy Question**: "What is the biggest strategic opportunity for their content?" with options ["Reaching a wider audience (Top of Funnel)", "Increasing engagement with current followers (Middle of Funnel)", "Converting followers into clients (Bottom of Funnel)"]

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
Now, execute the SOP for **{{instagramHandle}}** based on the provided qualification state.
`,
});

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


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

**Phase 1: Initial Triage & Question Generation**

1.  **Analyze Data & Identify Ambiguities**: Review the provided prospect data. Perform an initial analysis of their business model, profitability, and content funnel based on their bio and metrics.
2.  **Determine Next Question**: Based on your initial analysis, decide what is the *single most important piece of information* you need to complete the qualification. Follow this strict priority order:
    *   **Priority 1: Profitability.** If you cannot determine the business model or its potential to be profitable, you MUST ask about this first.
    *   **Priority 2: Visual Feed Assessment.** If profitability is clear (or has been answered), you MUST ask for the user's visual assessment of the feed. This is non-negotiable as you cannot see the images.
    *   **Priority 3: Content Strategy.** If both profitability and visuals are clear, you may ask a question about their content strategy to find the best angle for outreach.

**Phase 2: Output Generation**

**IF a \`clarificationResponse\` IS PROVIDED in the input:**
This means the user has answered your previous question. Use this new information as ground truth.
1.  **Incorporate User Feedback**: Update your analysis based on the user's \`clarificationResponse\`.
2.  **Check for More Questions**: After incorporating the feedback, re-evaluate if there is another, lower-priority question you must ask (e.g., you just got profitability, now you MUST ask about visuals). If so, generate the next question and PAUSE again (go back to the "IF a question IS NEEDED" block below).
3.  **Perform Full Analysis**: If no more questions are needed, proceed to the full analysis.
    - Finalize the \`qualificationData\` object.
    - Identify the most relevant \`painPoints\` and \`goals\`.
    - Calculate the final \`leadScore\` using the scoring model below.
    - Write the final, comprehensive \`summary\`.
    - Set \`clarificationRequest\` to \`null\`.

**IF a \`clarificationResponse\` IS NOT PROVIDED and a question IS NEEDED:**
This is the initial run, or you need to ask another question in the sequence.
1.  **Generate the Question**: Formulate the single, highest-priority question based on your analysis and the priority order. Use the question examples below as a guide.
2.  **PAUSE ANALYSIS**: You must wait for the user's input.
3.  **Return a Paused State**:
    - Set \`clarificationRequest\` to the question object you just generated.
    - Set \`leadScore\` to \`null\`.
    - Set \`painPoints\` and \`goals\` to \`null\` or empty arrays.
    - Set \`summary\` to a message indicating you are waiting for user input (e.g., "Awaiting visual feed analysis to complete qualification.").
    - Fill out the \`qualificationData\` with what you know, using 'unknown' for fields that depend on the user's answer.

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

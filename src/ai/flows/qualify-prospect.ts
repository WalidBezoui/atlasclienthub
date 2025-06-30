
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
import type { PainPoint, Goal } from '@/lib/types';
import { PAIN_POINTS, GOALS } from '@/lib/types';

// Based on NonNullable<OutreachProspect['qualificationData']>
const QualificationDataSchema = z.object({
    isBusiness: z.enum(['yes', 'no', 'unknown']).describe("Is this a business/creator account, not a personal one?"),
    hasInconsistentGrid: z.enum(['yes', 'no', 'unknown']).describe("Does their grid seem inconsistent or lack clear branding? Base this on general marketing principles."),
    hasLowEngagement: z.enum(['yes', 'no', 'unknown']).describe("Is their engagement (likes/comments) low for their follower count?"),
    hasNoClearCTA: z.enum(['yes', 'no', 'unknown']).describe("Does their bio have a weak, unclear, or missing Call-to-Action?"),
    valueProposition: z.enum(['visuals', 'leads', 'engagement', 'unknown']).describe("What is the #1 area we can help them with? (Visuals/Branding, Leads/Sales, or Engagement/Growth)"),
});

const QualifyProspectInputSchema = z.object({
  instagramHandle: z.string().describe("The prospect's Instagram handle."),
  followerCount: z.number().nullable().describe("The prospect's follower count."),
  postCount: z.number().nullable().describe("The prospect's post count."),
  avgLikes: z.number().nullable().describe("Average likes on recent posts."),
  avgComments: z.number().nullable().describe("Average comments on recent posts."),
  biography: z.string().nullable().describe("The prospect's Instagram bio text."),
  userClarification: z.string().nullable().optional().describe("DEPRECATED. Use clarificationResponse instead."),
  clarificationResponse: z.string().nullable().optional().describe("The user's selected answer from a previous multiple-choice clarification request."),
});
export type QualifyProspectInput = z.infer<typeof QualifyProspectInputSchema>;

const QualifyProspectOutputSchema = z.object({
  qualificationData: QualificationDataSchema.describe("The structured qualification assessment."),
  leadScore: z.number().min(0).max(100).describe("A calculated lead score from 0-100 based on the provided scoring model."),
  painPoints: z.array(z.enum(PAIN_POINTS)).describe("A list of likely pain points based on the analysis."),
  goals: z.array(z.enum(GOALS)).describe("A list of likely goals based on the analysis."),
  summary: z.string().describe("A concise, 1-2 sentence summary of your analysis and the prospect's primary opportunity."),
  clarificationRequest: z.object({
    question: z.string().describe("The question for the user."),
    options: z.array(z.string()).min(2).max(4).describe("A list of 2-4 options for the user to choose from."),
  }).nullable().optional().describe("If the AI needs more info, it will return this object with a multiple-choice question. If not, this will be null."),
});
export type QualifyProspectOutput = z.infer<typeof QualifyProspectOutputSchema>;

export async function qualifyProspect(input: QualifyProspectInput): Promise<QualifyProspectOutput> {
  return qualifyProspectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'qualifyProspectPrompt',
  input: {schema: QualifyProspectInputSchema},
  output: {schema: QualifyProspectOutputSchema},
  prompt: `You are an expert Instagram growth strategist. Your task is to analyze a new prospect based on their metrics and bio to determine their potential as a lead.

**PROSPECT DATA:**
- **Handle:** {{instagramHandle}}
- **Bio:** "{{#if biography}}{{biography}}{{else}}Not available{{/if}}"
- **Followers:** {{#if followerCount}}{{followerCount}}{{else}}N/A{{/if}}
- **Posts:** {{#if postCount}}{{postCount}}{{else}}N/A{{/if}}
- **Avg. Likes:** {{#if avgLikes}}{{avgLikes}}{{else}}N/A{{/if}}
- **Avg. Comments:** {{#if avgComments}}{{avgComments}}{{else}}N/A{{/if}}

{{#if userClarification}}
**ADDITIONAL USER-PROVIDED CONTEXT:**
{{{userClarification}}}
---
Use this new context to refine your entire analysis.
---
{{/if}}

{{#if clarificationResponse}}
**ADDITIONAL USER-PROVIDED CONTEXT (from their choice):**
The user has clarified that the prospect's business is best described as: "{{clarificationResponse}}".
---
Use this new, definitive context to refine your entire analysis. This is the ground truth.
---
{{/if}}


**ANALYSIS & QUALIFICATION TASK:**

1.  **Analyze the Data**: Deeply analyze all the provided data, including any user clarifications.
    -   Read the bio to understand their niche, what they do, and who they serve. Look for keywords like "coach," "shop," "founder," "e-commerce," "service," etc. This will determine if it's a business.
    -   Check the bio for a clear Call-to-Action (CTA). Is there a link? Does it tell users what to do (e.g., "Shop now," "Book a call")? A missing or vague CTA is a significant pain point.
    -   Evaluate the engagement rate. A rule of thumb is that 1-3% engagement (avg likes / followers) is average. Anything lower suggests a low engagement problem, especially if follower count is high.
    -   While you cannot see the grid, you can infer potential inconsistency. If their bio says they are a high-end brand but their metrics are very low, it might suggest a visual mismatch. Use your judgment.
    -   Based on their bio and niche, determine the most likely area of value we can provide (Visuals, Leads, or Engagement).

2.  **Fill Qualification Data**: Based on your analysis, complete the 'qualificationData' object. Be decisive.

3.  **Identify Pain Points & Goals**: Based on your findings, select the most relevant pain points and goals from the provided lists.
    -   *Example:* If \`hasNoClearCTA\` is 'yes', a pain point is "No clear CTA / no DMs" and a goal is "Sell more / monetize IG".
    -   *Example:* If \`hasLowEngagement\` is 'yes', a pain point is "Low engagement" and a goal is "Boost engagement".

4.  **Calculate Lead Score**: Use the following model to calculate a lead score. Adhere strictly to this scoring.
    -   **Base Score:** 25 points.
    -   **isBusiness = 'yes'**: +20 points.
    -   **hasInconsistentGrid = 'yes'**: +15 points.
    -   **hasLowEngagement = 'yes'**: +15 points.
    -   **hasNoClearCTA = 'yes'**: +10 points.
    -   **valueProposition is not 'unknown'**: +5 points.
    -   **followerCount > 500**: +10 points.
    -   **Maximum Score:** 100 points.

5.  **Write Summary**: Provide a very brief, sharp summary (1-2 sentences) of your findings. Example: "This is an established product brand with a decent following but very low engagement and a weak bio CTA. The primary opportunity is to improve their content strategy to convert existing followers into customers."

6.  **Ask for Clarification (If Needed)**:
    -   **IF** the bio is vague, the niche is unclear, or you cannot confidently determine the business model (e.g., it just says "Creator | NYC"), you **MUST** ask for clarification.
    -   **HOW**: Formulate a single, concise multiple-choice question with 2-4 distinct, easy-to-understand options that would best clarify the situation.
    -   **Example**: For a bio saying "Creative Entrepreneur", your question could be "What best describes their creative business?" with options ["Handmade Jewelry", "Digital Art & Prints", "Brand Consulting", "Photography Services"].
    -   **Action**: Return this in the \`clarificationRequest\` object.
    -   **IF** the analysis is clear and you have enough information, set \`clarificationRequest\` to \`null\`. Do not ask a question if you are confident.


Now, perform the analysis and return the complete JSON object.`,
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

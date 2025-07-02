
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
    profitabilityPotential: z.enum(['low', 'medium', 'high', 'unknown']).describe("An assessment of the prospect's likely ability to afford services, based on their branding, offer, and online presence."),
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
  summary: z.string().describe("A concise, 1-2 sentence summary of your analysis and the prospect's primary opportunity, including a note on their business viability."),
  clarificationRequest: z.object({
    question: z.string().describe("The question for the user."),
    options: z.array(z.string()).min(2).max(4).describe("A list of 2-4 options for the user to choose from."),
  }).nullable().optional().describe("If the AI needs more info to determine profitability or business model, it will return this object with a multiple-choice question. If not, this will be null."),
});
export type QualifyProspectOutput = z.infer<typeof QualifyProspectOutputSchema>;

export async function qualifyProspect(input: QualifyProspectInput): Promise<QualifyProspectOutput> {
  return qualifyProspectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'qualifyProspectPrompt',
  input: {schema: QualifyProspectInputSchema},
  output: {schema: QualifyProspectOutputSchema},
  prompt: `You are an expert Instagram growth strategist and business analyst. Your task is to analyze a new prospect based on their metrics and bio to determine their potential as a lead, with a **strong focus on their potential profitability and ability to invest in marketing services.**

**PROSPECT DATA:**
- **Handle:** {{instagramHandle}}
- **Bio:** "{{#if biography}}{{biography}}{{else}}Not available{{/if}}"
- **Followers:** {{#if followerCount}}{{followerCount}}{{else}}N/A{{/if}}
- **Posts:** {{#if postCount}}{{postCount}}{{else}}N/A{{/if}}
- **Avg. Likes:** {{#if avgLikes}}{{avgLikes}}{{else}}N/A{{/if}}
- **Avg. Comments:** {{#if avgComments}}{{avgComments}}{{else}}N/A{{/if}}

{{#if clarificationResponse}}
**ADDITIONAL USER-PROVIDED CONTEXT:**
The user has clarified that the prospect's business is best described as: "{{clarificationResponse}}".
---
Use this new, definitive context to refine your entire analysis, especially the profitability assessment. This is the ground truth.
---
{{/if}}

**ANALYSIS & QUALIFICATION TASK (THINK STEP-BY-STEP):**

1.  **Business & Niche Analysis**: First, determine if this is a business or a personal account. Read the bio to understand their niche, what they do, and who they serve. Look for commercial keywords like "coach," "shop," "founder," "e-commerce," "service," "book a call," etc. Set \`isBusiness\` accordingly.

2.  **Profitability Potential Analysis (CRITICAL)**: Assess the prospect's likely financial standing. Your goal is to determine if this is a hobby or a serious business that can afford services.
    -   **High Potential**: Look for signals of a real business with revenue. Examples: Sells high-ticket services (coaching, consulting, agency services), has a professional website with a custom domain, established e-commerce store, multiple employees mentioned, very polished branding.
    -   **Medium Potential**: Look for signals of a growing or small business. Examples: Sells physical products (e.g., Etsy, clothing), offers paid services but branding is less polished, uses Linktree but it's well-organized, active but smaller-scale commercial activity.
    -   **Low Potential**: Look for signals of a hobbyist or pre-revenue venture. Examples: Personal blog, affiliate marketing focus, no clear product/service, selling low-cost digital items (e-books, templates), unprofessional bio.
    -   **Action**: Based on this analysis, set the \`profitabilityPotential\` field to 'low', 'medium', or 'high'.

3.  **Engagement & Opportunity Analysis**:
    -   Evaluate their Call-to-Action (CTA) in the bio. Is it clear, vague, or missing? Set \`hasNoClearCTA\`.
    -   Evaluate their engagement rate. A rule of thumb is 1-3% (avg likes / followers) is average. If it's low, especially with high followers, set \`hasLowEngagement\` to 'yes'.
    -   Infer grid consistency. If their bio claims a professional service but engagement is very low, it might suggest a visual or branding mismatch. Set \`hasInconsistentGrid\`.

4.  **Fill Qualification Data**: Complete the full 'qualificationData' object based on your analysis.

5.  **Identify Pain Points & Goals**: Based on your findings, select the most relevant pain points and goals.
    -   *Example:* If \`profitabilityPotential\` is 'high' but \`hasLowEngagement\` is 'yes', a pain point is "Not converting followers to clients" and a goal is "Boost engagement".
    -   *Example:* If \`isBusiness\` is 'yes' but \`hasNoClearCTA\` is 'yes', a pain point is "No clear CTA / no DMs" and a goal is "Sell more / monetize IG".

6.  **Calculate Lead Score**: Use the following model precisely. Cap the final score at 100.
    -   **Base Score:** 20 points.
    -   **isBusiness = 'yes'**: +20 points.
    -   **Profitability Potential**:
        -   'high': +25 points.
        -   'medium': +15 points.
        -   'low': -10 points.
    -   **Opportunity Signals (Pain Points)**:
        -   'hasInconsistentGrid' = 'yes': +10 points.
        -   'hasLowEngagement' = 'yes': +10 points.
        -   'hasNoClearCTA' = 'yes': +10 points.
    -   **Audience Metric**:
        -   followerCount > 1000: +5 points.
        -   followerCount > 10000: +5 additional points (total of 10 for >10k).

7.  **Write Summary**: Provide a sharp, 1-2 sentence summary covering the business type, key opportunity, and a concluding remark on their viability as a client (e.g., "...making them a strong potential lead," or "...making them a lower-priority lead due to unclear monetization.").

8.  **Ask for Clarification (If Needed)**:
    -   **IF** you cannot confidently determine the business model and thus their profitability potential, you **MUST** ask a clarifying question.
    -   **HOW**: Formulate a single, concise multiple-choice question designed to resolve the ambiguity about their business model.
    -   **Example**: For a bio like "Wellness | Movement | NYC", a good question would be "What best describes their wellness business?" with options like ["High-ticket 1-on-1 coaching", "Selling physical products (e.g., yoga mats)", "Promoting affiliate links & brand deals", "It's a personal blog for sharing tips"].
    -   **Action**: Return this in the \`clarificationRequest\` object. If you are confident, set it to \`null\`.

Now, perform the analysis and return the complete JSON object.`,
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

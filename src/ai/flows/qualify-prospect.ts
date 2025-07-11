
'use server';
/**
 * @fileOverview Qualifies an Instagram prospect using AI.
 *
 * - qualifyProspect - Analyzes metrics and user assessment to generate a lead score and qualification data.
 * - QualifyProspectInput - Input type for the function.
 * - QualifyProspectOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PainPoint, Goal, QualificationData } from '@/lib/types';
import { PAIN_POINTS, GOALS } from '@/lib/types';

// This schema remains internal as the AI needs it for structured output.
const QualificationDataSchema = z.object({
    isBusiness: z.enum(['yes', 'no', 'unknown']).describe("Is this a business/creator account, not a personal one?"),
    industry: z.string().nullable().describe("The specific industry or niche of the prospect (e.g., 'Skincare - Organic products')."),
    hasInconsistentGrid: z.enum(['yes', 'no', 'unknown']).describe("Does their grid seem inconsistent or lack clear branding? (Based on user's visual assessment)"),
    hasLowEngagement: z.enum(['yes', 'no', 'unknown']).describe("Is their engagement (likes/comments) low for their follower count?"),
    hasNoClearCTA: z.enum(['yes', 'no', 'unknown']).describe("Does their bio have a weak, unclear, or missing Call-to-Action?"),
    valueProposition: z.enum(['visuals', 'leads', 'engagement', 'unknown']).describe("What is the #1 area we can help them with? (Visuals/Branding, Leads/Sales, or Engagement/Growth)"),
    profitabilityPotential: z.enum(['low', 'medium', 'high', 'unknown']).describe("Assessment of the prospect's likely ability to afford services."),
    contentPillarClarity: z.enum(['unclear', 'somewhat-clear', 'very-clear', 'unknown']).describe("How clear are their main content topics or pillars from their bio and recent posts?"),
    salesFunnelStrength: z.enum(['none', 'weak', 'strong', 'unknown']).describe("How effective is their sales funnel from their Instagram bio? 'strong' = direct booking/sales page; 'weak' = generic linktree; 'none' = no link."),
    postingConsistency: z.enum(['consistent', 'inconsistent', 'unknown']).describe("How consistently are they posting content? Check post dates if available.")
});

// New input schema that takes all data at once.
const QualifyProspectInputSchema = z.object({
  // Fetched Metrics
  instagramHandle: z.string().describe("The prospect's Instagram handle."),
  followerCount: z.number().nullable().describe("The prospect's follower count."),
  postCount: z.number().nullable().describe("The prospect's post count."),
  avgLikes: z.number().nullable().describe("Average likes on recent posts."),
  avgComments: z.number().nullable().describe("Average comments on recent posts."),
  biography: z.string().nullable().describe("The prospect's Instagram bio text."),

  // User's Manual Assessment
  industry: z.string().describe("User's answer about the prospect's industry and niche."),
  userProfitabilityAssessment: z.string().describe("User's answer to the question about how the account makes money."),
  userVisualsAssessment: z.string().describe("User's answer to the question about the account's visual branding."),
  userCtaAssessment: z.string().describe("User's answer to the question about the account's bio and call-to-action."),
});
export type QualifyProspectInput = z.infer<typeof QualifyProspectInputSchema>;

const QualifyProspectOutputSchema = z.object({
  qualificationData: QualificationDataSchema.describe("The structured qualification assessment."),
  leadScore: z.number().min(0).max(100).describe("A calculated lead score from 0-100."),
  painPoints: z.array(z.enum(PAIN_POINTS)).optional().describe("A list of likely pain points."),
  goals: z.array(z.enum(GOALS)).optional().describe("A list of likely goals."),
  summary: z.string().describe("A concise, 1-2 sentence summary of the final analysis."),
});
export type QualifyProspectOutput = z.infer<typeof QualifyProspectOutputSchema>;

export async function qualifyProspect(input: QualifyProspectInput): Promise<QualifyProspectOutput> {
  return qualifyProspectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'qualifyProspectPrompt',
  input: {schema: QualifyProspectInputSchema},
  output: {schema: QualifyProspectOutputSchema},
  prompt: `You are a senior Instagram growth strategist performing a final qualification analysis. You have been provided with raw data fetched from Instagram AND a manual assessment from a human user. Your job is to synthesize all of this information into a complete qualification report.

**PROSPECT DATA (from Instagram):**
- **Handle:** {{instagramHandle}}
- **Bio:** "{{#if biography}}{{biography}}{{else}}Not available{{/if}}"
- **Followers:** {{#if followerCount}}{{followerCount}}{{else}}N/A{{/if}}
- **Posts:** {{#if postCount}}{{postCount}}{{else}}N/A{{/if}}
- **Avg. Likes:** {{#if avgLikes}}{{avgLikes}}{{else}}N/A{{/if}}
- **Avg. Comments:** {{#if avgComments}}{{avgComments}}{{else}}N/A{{/if}}

**USER'S MANUAL ASSESSMENT:**
- **Industry & Niche:** "{{industry}}"
- **Primary way this account makes money:** "{{userProfitabilityAssessment}}"
- **Description of their visual branding:** "{{userVisualsAssessment}}"
- **State of their bio and Call-to-Action (CTA):** "{{userCtaAssessment}}"

---
**YOUR TASK:**

1.  **Synthesize All Information**: Combine the raw data with the user's expert assessment. The user's input is a critical signal.
2.  **Fill QualificationData Object**: Populate every field in the \`qualificationData\` object.
    -   Set \`industry\` directly from the user's input.
    -   Infer \`isBusiness\`, \`hasLowEngagement\`, and \`postingConsistency\` from the raw data. A business account sells something or has a professional purpose.
    -   **Crucially, map the user's text assessments to the correct enum values**:
        -   For \`profitabilityPotential\`: Map "{{userProfitabilityAssessment}}" to 'high', 'medium', or 'low'. (e.g., "high-ticket" -> 'high'; "products" -> 'medium'; "hobby" -> 'low').
        -   For \`hasInconsistentGrid\`: Map "{{userVisualsAssessment}}" to 'yes' if it's "Inconsistent & Messy", "Great content, messy grid", or "Outdated", otherwise 'no'.
        -   For \`hasNoClearCTA\` and \`salesFunnelStrength\`: Map "{{userCtaAssessment}}". If "No link", set CTA to 'yes' and funnel to 'none'. If "Generic linktree", set CTA to 'yes' and funnel to 'weak'. If "Strong, direct link", set CTA to 'no' and funnel to 'strong'.
        -   For \`contentPillarClarity\`: Infer this based on all other info. If visuals are messy and CTA is weak, pillars are likely 'unclear'. If visuals are clean and monetization is clear, pillars are likely 'very-clear'.
    -   Based on the synthesis, determine the primary \`valueProposition\` we can offer: 'visuals' (if grid/branding is weak), 'leads' (if they sell but have low engagement/weak funnel), or 'engagement' (if they have good content but low interaction).
3.  **Calculate Lead Score**: Use the finalized \`qualificationData\` to calculate the \`leadScore\` based on the scoring model below.
4.  **Identify Pain Points & Goals**: Based on the complete picture, select the most relevant \`painPoints\` and \`goals\`. For example, if \`hasInconsistentGrid\` is 'yes', a pain point is 'Inconsistent grid'. If \`valueProposition\` is 'leads', a goal is 'Attract ideal clients'. The user's assessments are a huge hint for their goals.
5.  **Write Summary**: Create a concise, 1-2 sentence summary of your analysis, mentioning the industry.

---
**Scoring Model (Max 100):**
- **Part 1: Foundation Score (Business Viability)**
  - Base Score: 10
  - Is a Business: 'yes' (+15)
  - Profitability Potential: 'high' (+20), 'medium' (+10), 'low' (-15)
  - Sales Funnel Strength: 'strong' (+10), 'weak' (+5)
  - Audience Size: followerCount > 10000 (+10), followerCount > 1000 (+5)
- **Part 2: Opportunity Score (Problems We Can Solve)**
  - Content/Strategy Problem: 'contentPillarClarity' is 'unclear' (+10), 'somewhat-clear' (+5)
  - Engagement Problem: 'hasLowEngagement' is 'yes' (+10)
  - Visuals/Branding Problem: 'hasInconsistentGrid' is 'yes' (+10)
  - CTA/Bio Problem: 'hasNoClearCTA' is 'yes' (+5)
- **Final Score = Foundation Score + Opportunity Score**

---
Now, execute the final analysis for **{{instagramHandle}}**.
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

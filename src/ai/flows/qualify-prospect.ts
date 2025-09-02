
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

const QualifyProspectInputSchema = z.object({
  instagramHandle: z.string().describe("The prospect's Instagram handle."),
  followerCount: z.number().nullable().describe("The prospect's follower count."),
  postCount: z.number().nullable().describe("The prospect's post count."),
  avgLikes: z.number().nullable().describe("Average likes on recent posts."),
  avgComments: z.number().nullable().describe("Average comments on recent posts."),
  biography: z.string().nullable().describe("The prospect's Instagram bio text."),
  userProfitabilityAssessment: z.array(z.string()).describe("User's answers to how the account makes money."),
  userVisualsAssessment: z.array(z.string()).describe("User's answers about the account's visual branding."),
  userCtaAssessment: z.array(z.string()).describe("User's answers about the account's bio and CTA."),
  industry: z.string().describe("User's answer about the prospect's industry and niche."),
  userStrategicGapAssessment: z.array(z.string()).describe("User's answers identifying the prospect's primary strategic gap."),
});
export type QualifyProspectInput = z.infer<typeof QualifyProspectInputSchema>;

const QualifyProspectOutputSchema = z.object({
  qualificationData: QualificationDataSchema.describe("The structured qualification assessment."),
  leadScore: z.number().min(0).max(100).describe("A calculated lead score from 0-100."),
  scoreRationale: z.string().describe("A step-by-step explanation of how the lead score was calculated, detailing points for both Foundation and Opportunity scores."),
  painPoints: z.array(z.enum(PAIN_POINTS)).optional().describe("A list of likely pain points."),
  goals: z.array(z.enum(GOALS)).optional().describe("A list of likely goals."),
  summary: z.string().describe("A concise, 1-2 sentence summary of the final analysis."),
});
export type QualifyProspectOutput = z.infer<typeof QualifyProspectOutputSchema>;


export async function qualifyProspect(input: QualifyProspectInput): Promise<QualifyProspectOutput> {
  return qualifyProspectFlow(input);
}


const analysisPrompt = ai.definePrompt({
  name: 'qualifyProspectAnalysisPrompt',
  input: { schema: QualifyProspectInputSchema },
  output: { schema: z.object({
    qualificationData: QualificationDataSchema,
    painPoints: z.array(z.enum(PAIN_POINTS)).optional(),
    goals: z.array(z.enum(GOALS)).optional(),
    summary: z.string(),
  })},
  prompt: `You are a senior Instagram growth strategist performing a qualification analysis. You have been provided with raw data from Instagram AND a manual assessment from a human user. Your job is to synthesize all of this information into a structured analysis.

**PROSPECT DATA (from Instagram):**
- **Handle:** {{instagramHandle}}
- **Bio:** "{{#if biography}}{{biography}}{{else}}Not available{{/if}}"
- **Followers:** {{#if followerCount}}{{followerCount}}{{else}}N/A{{/if}}
- **Posts:** {{#if postCount}}{{postCount}}{{else}}N/A{{/if}}
- **Avg. Likes:** {{#if avgLikes}}{{avgLikes}}{{else}}N/A{{/if}}
- **Avg. Comments:** {{#if avgComments}}{{avgComments}}{{else}}N/A{{/if}}

**USER'S MANUAL ASSESSMENT (Based on 5-Point Checklist):**
- **Industry & Niche:** "{{industry}}"
- **Primary way this account makes money:**{{#each userProfitabilityAssessment}}
  - {{this}}{{/each}}
- **Description of their visual branding:**{{#each userVisualsAssessment}}
  - {{this}}{{/each}}
- **State of their bio and Call-to-Action (CTA):**{{#each userCtaAssessment}}
  - {{this}}{{/each}}
- **The biggest "Strategic Gap" to fix:**{{#each userStrategicGapAssessment}}
  - {{this}}{{/each}}

---
**YOUR TASK:**

1.  **Synthesize All Information**: Combine the raw data with the user's expert assessment. The user's input is a critical signal, especially the "Strategic Gap".

2.  **Fill QualificationData Object**: Populate EVERY field in the \`qualificationData\` object based on your synthesis.
    -   Set \`industry\` directly from the user's input.
    -   Infer \`isBusiness\` from all available data. A business account sells something or has a professional purpose. If the user assessment includes "hobby", it's 'no'. Otherwise, 'yes'.
    -   Infer \`postingConsistency\`. If user notes "hasn't posted in a while", mark 'inconsistent'. Otherwise 'consistent'.
    -   **Map user's text assessments to enum values**:
        -   For \`profitabilityPotential\`: "high-ticket" -> 'high'; "products" or "local business" -> 'medium'; "hobby" -> 'low'. Default to 'medium'.
        -   For \`hasInconsistentGrid\`: 'yes' if assessments include "Inconsistent & Messy", "Great content, messy grid", or "Outdated". Otherwise 'no'.
        -   For \`hasNoClearCTA\` and \`salesFunnelStrength\`: If "No link", set CTA to 'yes' and funnel to 'none'. If "Generic linktree" or "Weak CTA", set CTA to 'yes' and funnel to 'weak'. If "Strong, direct link", set CTA to 'no' and funnel to 'strong'.
        -   For \`contentPillarClarity\`: If visuals are messy and CTA is weak, pillars are likely 'unclear'. If visuals are "Clean but Generic", pillars might be 'somewhat-clear'.
    -   Based on the synthesis, determine the primary \`valueProposition\` we can offer, heavily influenced by the "Strategic Gap". If the gap is visuals, set 'visuals'. If it's about getting clients/sales, set 'leads'. If it's about reach, set 'engagement'.

3.  **Smart Engagement Analysis**: Calculate the engagement rate (Avg. Likes + Avg. Comments) / Follower Count if possible.
    -   If rate is < 1%, set \`hasLowEngagement\` to 'yes'.
    -   If rate is >= 1%, set \`hasLowEngagement\` to 'no'.
    -   If data is unavailable, set to 'unknown'.

4.  **Identify Pain Points & Goals**: Based on the complete picture, select the most relevant \`painPoints\` and \`goals\`. The "Strategic Gap" should heavily influence the pain points.

5.  **Write Summary**: Create a concise, 1-2 sentence summary of your analysis, mentioning the industry and the primary strategic gap.

---
Now, execute the analysis for **{{instagramHandle}}**.
`,
});


const qualifyProspectFlow = ai.defineFlow(
  {
    name: 'qualifyProspectFlow',
    inputSchema: QualifyProspectInputSchema,
    outputSchema: QualifyProspectOutputSchema,
  },
  async (input) => {
    // 1. Get the structured analysis from the AI
    const { output: analysis } = await analysisPrompt(input);
    if (!analysis) {
        throw new Error("Failed to get analysis from AI.");
    }
    const { qualificationData, painPoints, goals, summary } = analysis;

    // 2. Calculate the lead score based on the AI's structured data
    let foundationScore = 10;
    let opportunityScore = 0;
    const rationale: string[] = [];
    
    // Foundation Score (Max 60)
    if (qualificationData.isBusiness === 'yes') {
        foundationScore += 15;
        rationale.push("Foundation: Is a Business (+15)");
    }
    if (qualificationData.profitabilityPotential === 'high') {
        foundationScore += 20;
        rationale.push("Foundation: High Profitability (+20)");
    } else if (qualificationData.profitabilityPotential === 'medium') {
        foundationScore += 10;
        rationale.push("Foundation: Medium Profitability (+10)");
    } else if (qualificationData.profitabilityPotential === 'low') {
        foundationScore -= 15;
        rationale.push("Foundation: Low Profitability (-15)");
    }
    
    if (qualificationData.salesFunnelStrength === 'strong') {
        foundationScore += 10;
        rationale.push("Foundation: Strong Funnel (+10)");
    } else if (qualificationData.salesFunnelStrength === 'weak') {
        foundationScore += 5;
        rationale.push("Foundation: Weak Funnel (+5)");
    }

    if (input.followerCount && input.followerCount > 10000) {
        foundationScore += 15;
        rationale.push("Foundation: Audience > 10k (+15)");
    } else if (input.followerCount && input.followerCount > 1000) {
        foundationScore += 5;
        rationale.push("Foundation: Audience > 1k (+5)");
    }

    // Opportunity Score (Max 40)
    if (qualificationData.contentPillarClarity === 'unclear') {
        opportunityScore += 10;
        rationale.push("Opportunity: Unclear Content Strategy (+10)");
    } else if (qualificationData.contentPillarClarity === 'somewhat-clear') {
        opportunityScore += 5;
        rationale.push("Opportunity: Content Strategy needs work (+5)");
    }
    if (qualificationData.hasLowEngagement === 'yes') {
        opportunityScore += 10;
        rationale.push("Opportunity: Low Engagement (+10)");
    }
    if (qualificationData.hasInconsistentGrid === 'yes') {
        opportunityScore += 10;
        rationale.push("Opportunity: Inconsistent Grid (+10)");
    }
    if (qualificationData.hasNoClearCTA === 'yes') {
        opportunityScore += 10;
        rationale.push("Opportunity: No Clear CTA (+10)");
    }

    const leadScore = Math.max(0, Math.min(100, foundationScore + opportunityScore));
    const scoreRationale = `Foundation Score: ${foundationScore}/60 | Opportunity Score: ${opportunityScore}/40\n- ${rationale.join('\n- ')}`;

    // 3. Return the final combined output
    return {
      qualificationData,
      leadScore,
      scoreRationale,
      painPoints: painPoints || [],
      goals: goals || [],
      summary,
    };
  }
);

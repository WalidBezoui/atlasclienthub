
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
  clarificationResponse: z.string().nullable().optional().describe("The user's selected answer from a previous multiple-choice clarification request (could be about profitability, visuals, or content strategy)."),
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
  prompt: `You are a senior Instagram growth strategist and business analyst. Your primary objective is to qualify a new prospect by analyzing their metrics and bio to determine their potential as a high-quality lead, with a **strong focus on their ability and likelihood to invest in marketing services.**

**PROSPECT DATA:**
- **Handle:** {{instagramHandle}}
- **Bio:** "{{#if biography}}{{biography}}{{else}}Not available{{/if}}"
- **Followers:** {{#if followerCount}}{{followerCount}}{{else}}N/A{{/if}}
- **Posts:** {{#if postCount}}{{postCount}}{{else}}N/A{{/if}}
- **Avg. Likes:** {{#if avgLikes}}{{avgLikes}}{{else}}N/A{{/if}}
- **Avg. Comments:** {{#if avgComments}}{{avgComments}}{{else}}N/A{{/if}}

{{#if clarificationResponse}}
**USER-PROVIDED CONTEXT:**
The user has provided this definitive clarification: "{{clarificationResponse}}".
---
**ACTION:** Use this new ground-truth context to refine your entire analysis. This overrides any previous assumptions. If the clarification was about profitability, visuals, or content, update the relevant field (\`profitabilityPotential\`, \`hasInconsistentGrid\`, etc.). Recalculate and regenerate the entire output based on this new information.
---
{{/if}}

**STANDARD OPERATING PROCEDURE (SOP):**

**Step 1: Business Model Triage**
- Is this a business or a personal account? Look for commercial keywords ("coach," "shop," "founder," "e-commerce," "service," "book a call," etc.). Set \`isBusiness\`.
- What do they sell? Is it a product, a service, or content? Is it high-ticket or low-ticket? This is the first clue for profitability.

**Step 2: Profitability Assessment (CRITICAL)**
- Assess the prospect's likely financial standing. Your goal is to determine if this is a serious business that can afford services.
- **High Potential**: Sells high-ticket services (coaching, consulting), has a professional website with a custom domain, established e-commerce store with multiple products, has a physical location, or polished branding that implies significant investment.
- **Medium Potential**: Sells physical products (e.g., Etsy, clothing), offers paid services but branding is less polished, uses a Linktree but it's well-organized with clear offers.
- **Low Potential**: Hobbyist or pre-revenue venture. Focus on affiliate marketing, selling low-cost digital items (templates, e-books), no clear product/service, unprofessional bio.
- **Action**: Set the \`profitabilityPotential\` field to 'low', 'medium', or 'high'. This is a major factor in the lead score.

**Step 3: Content & Funnel Analysis (Infer from Bio)**
- **Content Pillars**: How clear is their value proposition from the bio? Is it a generic "Helping you glow" or a specific "I help dermatologists get clients via SEO"? Set \`contentPillarClarity\`.
- **Sales Funnel**: Analyze the link in their bio. A direct booking page or a well-designed product page is 'strong'. A Linktree with many unfocused links is 'weak'. No link is 'none'. Set \`salesFunnelStrength\`.
- **Call-to-Action (CTA)**: Is there a clear action in the bio text itself (e.g., "DM me 'GROW'")? Set \`hasNoClearCTA\`.

**Step 4: Opportunity Analysis (Inferring from Data)**
- Since you cannot see the feed, you must make logical inferences.
- **Engagement**: An average engagement rate is 1-3% (avg likes / followers). If the rate is very low, especially with many followers, it's a strong signal their content isn't resonating. Set \`hasLowEngagement\`.
- **Visuals/Branding**: This is hard to infer. Initially, set \`hasInconsistentGrid\` to 'unknown'. It will be updated by the user's feedback.

**Step 5: Synthesize & Score**
- Based on the analysis, complete the \`qualificationData\` object.
- Select the most relevant \`painPoints\` and \`goals\`.
- Calculate the \`leadScore\` using the model below. Max score is 100.
    - **Base Score:** 20
    - **isBusiness = 'yes'**: +20
    - **Profitability Potential**: 'high' (+25), 'medium' (+15), 'low' (-10)
    - **salesFunnelStrength**: 'strong' (+10), 'weak' (+5), 'none' (0)
    - **Opportunity Signals**: 'hasInconsistentGrid' = 'yes' (+10), 'hasLowEngagement' = 'yes' (+10), 'hasNoClearCTA' = 'yes' (+10), 'contentPillarClarity' = 'unclear' (+10)
    - **Audience Metric**: followerCount > 1000 (+5), followerCount > 10000 (+5 more, for a total of 10)

**Step 6: The Verdict (Summary)**
- Provide a sharp, 1-2 sentence summary. Start with the business type, identify the single biggest opportunity or risk, and conclude with their viability as a lead.
- *Example Good Summary*: "This is a high-ticket coaching business with a large but disengaged audience. The primary opportunity is to improve their content strategy to convert existing followers into clients, making them a strong potential lead."

**Step 7: Prioritized Clarification Questions**
- **YOUR GOAL**: Identify the single most important ambiguity and ask a clarifying question to resolve it. If you have no important ambiguities, return null for \`clarificationRequest\`.
- **PRIORITY ORDER**:
    1. Profitability (If unknown, ask this first).
    2. Visuals (If profitability is clear, ask this next).
    3. Content Strategy (If both profitability and visuals are clear, ask this).

- **A. Profitability Question (if needed)**:
  - Scenario: Bio is "Wellness | Movement | NYC". Problem: Could be free tips or $5k retreats.
  - Good Question: "What best describes their wellness business?"
  - Good Options: ["High-ticket 1-on-1 coaching", "Selling physical products (e.g., yoga mats)", "Promoting affiliate links & brand deals", "It's a personal blog for sharing tips"]

- **B. Visual Feed Question (if needed)**:
  - Scenario: Product-based business with clear profitability.
  - Problem: Is their branding strong enough to sell a product?
  - Good Question: "Looking at their feed, how would you describe their visual branding?"
  - GoodOptions: ["Looks professional, consistent, and on-brand", "It's clean but looks like a generic product catalog", "The grid feels a bit messy and unplanned", "There's not enough content to tell"]

- **C. Content Strategy Question (if needed)**:
  - Scenario: A coach with clear profitability and the user said their feed looks "Polished and cohesive".
  - Problem: We need to know what strategic lever to pull.
  - Good Question: "Given their polished feed, what's the biggest strategic opportunity for their content?"
  - Good Options: ["Reaching a wider audience (Top of Funnel)", "Increasing engagement with existing followers (Middle of Funnel)", "Converting followers into paying clients (Bottom of Funnel)", "Their strategy seems solid already"]

Now, perform the analysis and return the complete JSON object according to the SOP.`,
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

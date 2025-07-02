
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
  clarificationResponse: z.string().nullable().optional().describe("The user's selected answer from a previous multiple-choice clarification request (could be about profitability or visuals)."),
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
  }).nullable().optional().describe("If the AI needs more info (either on profitability or visuals), it will return this object with a multiple-choice question. If not, this will be null."),
});
export type QualifyProspectOutput = z.infer<typeof QualifyProspectOutputSchema>;

export async function qualifyProspect(input: QualifyProspectInput): Promise<QualifyProspectOutput> {
  return qualifyProspectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'qualifyProspectPrompt',
  input: {schema: QualifyProspectInputSchema},
  output: {schema: QualifyProspectOutputSchema},
  prompt: `You are an expert Instagram growth strategist and business analyst. Your primary objective is to qualify a new prospect by analyzing their metrics and bio to determine their potential as a high-quality lead, with a **strong focus on their ability and likelihood to invest in marketing services.**

**PROSPECT DATA:**
- **Handle:** {{instagramHandle}}
- **Bio:** "{{#if biography}}{{biography}}{{else}}Not available{{/if}}"
- **Followers:** {{#if followerCount}}{{followerCount}}{{else}}N/A{{/if}}
- **Posts:** {{#if postCount}}{{postCount}}{{else}}N/A{{/if}}
- **Avg. Likes:** {{#if avgLikes}}{{avgLikes}}{{else}}N/A{{/if}}
- **Avg. Comments:** {{#if avgComments}}{{avgComments}}{{else}}N/A{{/if}}

{{#if clarificationResponse}}
**USER-PROVIDED CONTEXT:**
The user has provided this clarification: "{{clarificationResponse}}".
---
**ACTION:** Use this new, definitive context to refine your entire analysis. This is the ground truth. If the clarification was about profitability, update that assessment. If it was about visuals, use it to set \`hasInconsistentGrid\`. Recalculate and regenerate the entire output based on this new information.
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
- **Action**: Set the \`profitabilityPotential\` field to 'low', 'medium', or 'high'. This is the most important factor in the lead score.

**Step 3: Opportunity Analysis (Inferring from Data)**
- Since you cannot see the feed, you must make logical inferences.
- **CTA**: Analyze the bio's Call-to-Action. Is it strong ("Book a call"), weak ("link in bio"), or missing? Set \`hasNoClearCTA\`.
- **Engagement**: An average engagement rate is 1-3% (avg likes / followers). If the rate is very low, especially with many followers, it's a strong signal their content isn't resonating. Set \`hasLowEngagement\`.
- **Visuals/Branding**: This is hard to infer. Initially, set \`hasInconsistentGrid\` to 'unknown'. It will be updated by the user's feedback in Step 6.

**Step 4: Synthesize & Score**
- Based on the analysis, complete the \`qualificationData\` object.
- Select the most relevant \`painPoints\` and \`goals\`. For example, a high-profitability business with low engagement likely needs help converting followers, not just getting more likes.
- Calculate the \`leadScore\` using the model below. Max score is 100.
    - **Base Score:** 20
    - **isBusiness = 'yes'**: +20
    - **Profitability Potential**: 'high' (+25), 'medium' (+15), 'low' (-10)
    - **Opportunity Signals**: 'hasInconsistentGrid' = 'yes' (+10), 'hasLowEngagement' = 'yes' (+10), 'hasNoClearCTA' = 'yes' (+10)
    - **Audience Metric**: followerCount > 1000 (+5), followerCount > 10000 (+5 more, for a total of 10)

**Step 5: The Verdict (Summary)**
- Provide a sharp, 1-2 sentence summary. Start with the business type, identify the single biggest opportunity or risk, and conclude with their viability as a lead.
- *Example Good Summary*: "This is a high-ticket coaching business with a large but disengaged audience. The primary opportunity is to improve their content strategy to convert existing followers into clients, making them a strong potential lead."

**Step 6: Profitability Clarification (Ask if necessary)**
- **YOUR GOAL**: If there is a critical ambiguity that prevents you from confidently assessing \`profitabilityPotential\`, you MUST ask a clarifying question.
- **THE RULE**: Formulate a single, concise multiple-choice question to resolve the ambiguity. The options should represent different business models with different profitability levels.
- **If you are confident in your profitability analysis, DO NOT generate a question here. Proceed to Step 7.**

- **SCENARIO A: Ambiguous Business Model**
  - Bio: "Wellness | Movement | NYC"
  - Problem: "Wellness" could mean anything from free tips to $5k retreats. Profitability is unknown.
  - Good Question: "What best describes their wellness business?"
  - Good Options: ["High-ticket 1-on-1 coaching", "Selling physical products (e.g., yoga mats)", "Promoting affiliate links & brand deals", "It's a personal blog for sharing tips"]

- **SCENARIO B: Vague Offer**
  - Bio: "Helping you live your best life ✨"
  - Problem: The offer is too generic to assess value or price point.
  - Good Question: "To help me understand their business, what's the main way they help people?"
  - Good Options: ["Through 1-on-1 coaching programs", "By selling digital courses or e-books", "With a physical product like supplements", "It's a community/content platform"]


**Step 7: Visual Feed Clarification (Ask if profitability is clear)**
- **YOUR GOAL**: If, AND ONLY IF, you did NOT generate a profitability question in Step 6 AND the user has not provided a visual clarification yet, you MUST ask a question about the visual quality of their feed. Since you cannot see images, this is essential.
- **THE RULE**: Formulate a single, concise multiple-choice question to understand the feed's quality. This will help determine the \`hasInconsistentGrid\` field and the \`valueProposition\`.

- **SCENARIO A: Product-based Business (e.g., e-commerce, fashion, cosmetics)**
  - Problem: Is their visual branding strong enough to sell products?
  - Good Question: "Looking at their feed, how would you describe their visual branding?"
  - Good Options: ["Looks professional, consistent, and on-brand", "It's clean but looks like a generic product catalog", "The grid feels a bit messy and unplanned", "There's not enough content to tell"]

- **SCENARIO B: Service-based or Personal Brand (e.g., coach, consultant, creator)**
  - Problem: Does their content look authoritative and trustworthy?
  - Good Question: "What's your first impression of their content's visual style?"
  - Good Options: ["Very polished and visually cohesive", "A mix of good posts and some that look amateur", "It's mostly text/selfies, not very visually appealing", "Seems unfocused and the branding is unclear"]

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

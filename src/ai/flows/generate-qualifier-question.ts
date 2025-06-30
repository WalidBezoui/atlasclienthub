
'use server';
/**
 * @fileOverview Generates a pre-audit qualifier question.
 *
 * - generateQualifierQuestion - A function to generate the question.
 * - GenerateQualifierInput - Input type for question generation.
 * - GenerateQualifierOutput - Output type for question generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PainPoint, Goal, BusinessType, AccountStage } from '@/lib/types';
import { PAIN_POINTS, GOALS, BUSINESS_TYPES, ACCOUNT_STAGES } from '@/lib/types';


const GenerateQualifierInputSchema = z.object({
  prospectName: z.string().nullable().optional().describe("The prospect's name."),
  igHandle: z.string().nullable().optional().describe("The prospect's Instagram handle."),
  businessType: z.enum(BUSINESS_TYPES).nullable().optional().describe("The type of business the prospect runs."),
  lastMessage: z.string().nullable().optional().describe("The last message snippet received from the prospect."),
  goals: z.array(z.enum(GOALS)).nullable().optional().describe("List of goals the prospect might want to achieve."),
  painPoints: z.array(z.enum(PAIN_POINTS)).nullable().optional().describe("List of common pain points the prospect might be facing."),
  accountStage: z.enum(ACCOUNT_STAGES).nullable().optional().describe("The prospect's business stage."),
});
export type GenerateQualifierInput = z.infer<typeof GenerateQualifierInputSchema>;

const GenerateQualifierOutputSchema = z.object({
  question: z.string().describe('The generated qualifier question.'),
});
export type GenerateQualifierOutput = z.infer<typeof GenerateQualifierOutputSchema>;

export async function generateQualifierQuestion(input: GenerateQualifierInput): Promise<GenerateQualifierOutput> {
  return generateQualifierQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQualifierQuestionPrompt',
  input: {schema: GenerateQualifierInputSchema},
  output: {schema: GenerateQualifierOutputSchema},
  prompt: `You are an expert Instagram strategist. A prospect named {{prospectName}} has just agreed to a free audit.
Your task is to generate ONE perfect follow-up question. This question's purpose is to gather the final, crucial piece of information needed to make the audit hyper-relevant and to demonstrate your strategic insight.

**PROSPECT CONTEXT:**
- **Name**: {{prospectName}}
- **IG Handle**: @{{igHandle}}
- **Business Type**: {{businessType}}
- **Account Stage**: {{accountStage}}
- **Their Last Message**: "{{lastMessage}}"
- **Their Potential Goals**: {{#if goals}}{{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}
- **Their Potential Pain Points**: {{#if painPoints}}{{#each painPoints}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}

---
**YOUR STRATEGIC ANALYSIS (THINK STEP-BY-STEP):**

1.  **Synthesize the Data**: What is the overall story of this prospect? Is it a new product brand struggling with brand awareness? An established coach who wants to convert existing followers into high-ticket clients? A local business that needs foot traffic from Instagram?

2.  **Identify the Core Tension or Opportunity**: Look for key relationships or contradictions in the data.
    - *Tension Example*: "They have high followers (Established) but their pain point is 'Low engagement'." This suggests their content isn't resonating with their audience.
    - *Opportunity Example*: "Their goal is to 'Attract ideal clients' and their business type is 'Personal Brand (coach, consultant)'." This suggests a need for bottom-of-the-funnel content that converts.
    - *Clarity Example*: "Their pain is 'Inconsistent grid' and their business is 'Product Brand'." This points to a direct visual identity problem that impacts sales.

3.  **Deduce the Highest-Leverage Focus Area**: Based on the tension/opportunity, what is the ONE area that, if improved, would have the biggest impact?
    - **Top-of-Funnel (Awareness & Visuals)**: Branding, grid consistency, reaching new followers.
    - **Middle-of-Funnel (Engagement & Community)**: Content resonating, getting saves/shares, building trust.
    - **Bottom-of-Funnel (Conversion & Leads)**: Turning followers into DMs, inquiries, and sales.

4.  **Choose a Strategic Angle for the Question**: Based on the focus area, select the most appropriate angle to frame your question.
    - **The "Business Outcome" Angle**: Connect a social media problem to a tangible business result. This is powerful for prospects focused on ROI.
    - **The "Choice A vs. B" Angle**: Present two valid strategic paths to see which one resonates more. This shows you understand the nuances.
    - **The "Specific Pain Point" Angle**: Zoom in on a very likely problem and ask for clarification. This shows you've done your homework.

---
**QUESTION GENERATION INSTRUCTIONS:**

Now, using your analysis, generate the final question. The entire output should be just the question itself, ready to be sent as a DM.

**Rules for the Question:**
1.  **Acknowledge & Transition**: Start with a brief, positive phrase (e.g., "Awesome, looking forward to it!", "Perfect, happy to dive in!").
2.  **Frame with Insight**: Briefly state the "why" behind your question to show you're being thoughtful (e.g., "So I can make this super targeted for you...", "To make sure the audit is as valuable as possible...").
3.  **Ask the ONE Strategic Question**: Use the angle you chose in your analysis.
4.  **Keep it Conversational**: It must sound like a real DM. Keep it short, friendly, and easy to answer. Avoid jargon.

---
**EXAMPLES OF HIGH-QUALITY OUTPUT:**

*   **Scenario**: A coach with 10k followers (Established) but their pain is "Low engagement" and their goal is "Attract ideal clients".
    *   **Analysis**: The core tension is between a large audience and low-quality engagement. The focus should be on bottom-of-funnel conversion. The best angle is "Business Outcome".
    *   **Example Question**: "Perfect, happy to dive in! So I can make this super targeted, what's the bigger priority for you right now: boosting overall engagement on your posts, or getting more of the *right* people to send you a DM about your coaching?"

*   **Scenario**: A new e-commerce fashion brand (New account) with an "Inconsistent grid" pain point.
    *   **Analysis**: The core problem is visual identity, which is critical for a new fashion brand. The focus is top-of-funnel awareness. The best angle is "Choice A vs. B".
    *   **Example Question**: "Awesome, looking forward to it! To make sure this is valuable, should I focus the audit more on creating a cohesive visual theme for your grid, or on specific content ideas to attract your first core group of followers?"

*   **Fallback Scenario (Minimal Data)**: A prospect with no specified goals or pain points.
    *   **Analysis**: We have little to go on, so we need a broad but strategic question to guide us. The best angle is a general "Choice A vs. B" on the marketing funnel.
    *   **Example Question**: "Great, happy to get started! To make sure I focus on what's most important to you, is the main goal right now to build your brand and grow your audience, or to convert the followers you already have into clients?"

---
**Now, generate the single best qualifier question for {{prospectName}}:**
`,
});

const generateQualifierQuestionFlow = ai.defineFlow(
  {
    name: 'generateQualifierQuestionFlow',
    inputSchema: GenerateQualifierInputSchema,
    outputSchema: GenerateQualifierOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { config: { temperature: 0.8, maxOutputTokens: 100 } });
    return output!;
  }
);

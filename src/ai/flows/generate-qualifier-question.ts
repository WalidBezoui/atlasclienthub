
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
  prompt: `You are an expert conversational marketer. Your goal is to generate a single, concise, friendly Instagram DM question for a prospect named {{prospectName}}.
They just agreed to a free audit. This question is designed to gather one key piece of information to make the audit incredibly personalized and valuable.

**Prospect Context:**
- **Name**: {{prospectName}}
- **IG Handle**: @{{igHandle}}
- **Business Type**: {{businessType}}
- **Account Stage**: {{accountStage}}
- **Their Last Message**: "{{lastMessage}}"
- **Their Potential Goals**: {{#if goals}}{{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}
- **Their Potential Pain Points**: {{#if painPoints}}{{#each painPoints}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}

**INSTRUCTIONS:**
Based on the context, draft a single, engaging question. Follow this logic:

1.  **Acknowledge and Set Expectations:** Start with a brief, positive phrase like "Fantastic—thanks for confirming!" or "Great—happy to!".

2.  **Ask a Targeted Question Based on Their Data (use the first match from this list):**

    *   **If their goals include "Grow followers":**
        Ask: "To make sure the audit hits the mark, what’s your primary growth goal right now? More followers, better engagement, or turning followers into clients?"

    *   **If their goals include "Attract ideal clients":**
        Ask: "Just so I zero in on what matters most: are you looking to attract more of the same type of clients, or to branch into a new service/offering with your Instagram?"

    *   **If their pain points include "Inconsistent grid":**
        Ask: "For your audit, would you prefer I focus on creating a consistent visual system (colors, fonts, layouts) or on specific post templates you can reuse?"

    *   **If their pain points include "No clear CTA / no DMs":**
        Ask: "To address CTAs effectively, which action would you most like visitors to take? DM you, click your link in bio, or save/share your posts?"

    *   **Fallback (if no specific goals/pains match):**
        Ask: "Is there one thing you’d like the audit to focus on most—visuals, captions, or your bio & profile?"

3.  **Keep it concise and friendly.** It must sound like a natural DM, not a robot. The entire output should be just the question itself.

**Example Output:**
"Fantastic—thanks for confirming! To make sure the audit hits the mark, what’s your primary growth goal right now? More followers, better engagement, or turning followers into clients?"

**Now, generate the qualifier question for {{prospectName}}:**
`,
});

const generateQualifierQuestionFlow = ai.defineFlow(
  {
    name: 'generateQualifierQuestionFlow',
    inputSchema: GenerateQualifierInputSchema,
    outputSchema: GenerateQualifierOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { config: { temperature: 0.7, maxOutputTokens: 80 } });
    return output!;
  }
);

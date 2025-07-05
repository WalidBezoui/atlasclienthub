
'use server';
/**
 * @fileOverview Generates contextual Instagram comments without prospect context.
 *
 * - generateGenericComment - A function to generate a comment.
 * - GenerateGenericCommentInput - The input type for the function.
 * - GenerateGenericCommentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { COMMENT_TYPES } from '@/lib/types';

const GenerateGenericCommentInputSchema = z.object({
  postDescription: z.string().describe("A description of the Instagram post to comment on."),
  commentType: z.enum(COMMENT_TYPES).describe("The desired style of the comment."),
  postAuthorInfo: z.string().optional().describe("Optional context about the post's author, e.g., 'A local coffee shop', 'A freelance graphic designer'."),
});
export type GenerateGenericCommentInput = z.infer<typeof GenerateGenericCommentInputSchema>;

const GenerateGenericCommentOutputSchema = z.object({
  comment: z.string().describe('The generated, ready-to-use Instagram comment.'),
});
export type GenerateGenericCommentOutput = z.infer<typeof GenerateGenericCommentOutputSchema>;

export async function generateGenericComment(input: GenerateGenericCommentInput): Promise<GenerateGenericCommentOutput> {
  return generateGenericCommentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateGenericCommentPrompt',
  input: {schema: GenerateGenericCommentInputSchema},
  output: {schema: GenerateGenericCommentOutputSchema},
  prompt: `You are an expert social media growth strategist who writes engaging, human-sounding Instagram comments.
Your task is to write ONE high-quality comment based on a post's description and a desired comment style.

**CRITICAL INSTRUCTIONS:**
1.  **NO GENERIC COMMENTS:** Avoid clichés like "Great post!", "Love this!", "So true!". Your comment must be specific and demonstrate you've actually engaged with the content.
2.  **SOUND HUMAN:** Write conversationally. Use emojis where appropriate, but don't overdo it. Keep it concise and easy to read.

---
{{#if postAuthorInfo}}
**POST AUTHOR CONTEXT:**
{{{postAuthorInfo}}}
{{/if}}
---
**POST TO COMMENT ON:**
"{{{postDescription}}}"
---
**COMMENT STYLE REQUIRED: "{{commentType}}"**

Here's how to approach each style:
*   **Value-add:** Provide a short, actionable tip or a valuable insight that builds on their post.
*   **Question:** Ask a thoughtful, open-ended question that encourages a real response, not just a 'yes/no'.
*   **Compliment:** Give a specific, detailed compliment about the content.
*   **Story-based:** Briefly relate their post to a personal experience or observation.
---
Now, generate the comment based on all the information provided.
`,
});

const generateGenericCommentFlow = ai.defineFlow(
  {
    name: 'generateGenericCommentFlow',
    inputSchema: GenerateGenericCommentInputSchema,
    outputSchema: GenerateGenericCommentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { config: { temperature: 0.9 }});
    return output!;
  }
);

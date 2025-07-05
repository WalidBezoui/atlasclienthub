
'use server';
/**
 * @fileOverview Generates contextual Instagram comments.
 *
 * - generateComment - A function to generate a comment based on prospect context and a post description.
 * - GenerateCommentInput - The input type for the generateComment function.
 * - GenerateCommentOutput - The return type for the generateComment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { COMMENT_TYPES } from '@/lib/types';

const ProspectContextSchema = z.string().describe("A summary of the prospect including their name, industry, business type, pain points, goals, and recent conversation history.");

const GenerateCommentInputSchema = z.object({
  prospectContext: ProspectContextSchema,
  postDescription: z.string().describe("A description of the Instagram post to comment on."),
  commentType: z.enum(COMMENT_TYPES).describe("The desired style of the comment."),
});
export type GenerateCommentInput = z.infer<typeof GenerateCommentInputSchema>;

const GenerateCommentOutputSchema = z.object({
  comment: z.string().describe('The generated, ready-to-use Instagram comment.'),
});
export type GenerateCommentOutput = z.infer<typeof GenerateCommentOutputSchema>;

export async function generateComment(input: GenerateCommentInput): Promise<GenerateCommentOutput> {
  return generateCommentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCommentPrompt',
  input: {schema: GenerateCommentInputSchema},
  output: {schema: GenerateCommentOutputSchema},
  prompt: `You are an expert social media growth strategist who writes engaging, human-sounding Instagram comments to build relationships and attract leads for your agency, Atlas Social Studio.

Your task is to write ONE high-quality comment based on the prospect's context and their recent post.

**CRITICAL INSTRUCTIONS:**
1.  **NO GENERIC COMMENTS:** Avoid clichés like "Great post!", "Love this!", "So true!". Your comment must be specific and demonstrate you've actually engaged with the content.
2.  **SOUND HUMAN:** Write conversationally. Use emojis where appropriate, but don't overdo it. Keep it concise and easy to read.
3.  **BE STRATEGIC:** The comment should subtly align with the prospect's potential needs (their pain points and goals).

---
**PROSPECT CONTEXT:**
{{{prospectContext}}}

---
**POST TO COMMENT ON:**
"{{{postDescription}}}"

---
**COMMENT STYLE REQUIRED: "{{commentType}}"**

Here's how to approach each style:

*   **Value-add:** Provide a short, actionable tip or a valuable insight that builds on their post. Position yourself as a helpful expert. Example: "This is a great breakdown. I've found that using a bolder font for just the hook (first 3 words) can also increase retention by another 10-15%!"
*   **Question:** Ask a thoughtful, open-ended question that encourages a real response, not just a 'yes/no'. Your question should show you've understood the post's core message. Example: "Love this perspective on branding. What's the biggest challenge you see new businesses face when they try to implement this?"
*   **Compliment:** Give a specific, detailed compliment. Instead of "Nice design," say "The way you used the mustard yellow to highlight the key stats in slide 3 is brilliant. Really makes the data pop."
*   **Story-based:** Briefly relate their post to a personal experience or observation. This builds rapport and shows you're on the same wavelength. Example: "This reminds me of when I first started my agency. I made the exact same mistake with my pricing. This advice would have saved me months of struggle!"

---
Now, generate the comment based on all the information provided.
`,
});

const generateCommentFlow = ai.defineFlow(
  {
    name: 'generateCommentFlow',
    inputSchema: GenerateCommentInputSchema,
    outputSchema: GenerateCommentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { config: { temperature: 0.9 }});
    return output!;
  }
);

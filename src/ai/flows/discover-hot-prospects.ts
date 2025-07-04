'use server';
/**
 * @fileOverview An AI agent for automatically discovering high-potential Instagram prospects.
 *
 * - discoverHotProspects - A function that searches for high-engagement, profitable prospects without a query.
 * - DiscoverProspectsOutput - The return type (re-used from discover-prospects).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DiscoverProspectsOutputSchema } from '../schemas/prospect-schemas';
export type { DiscoverProspectsOutput, DiscoveredProspect } from '../schemas/prospect-schemas';

export async function discoverHotProspects(): Promise<DiscoverProspectsOutput> {
  return discoverHotProspectsFlow();
}

const prompt = ai.definePrompt({
  name: 'discoverHotProspectsPrompt',
  output: {schema: DiscoverProspectsOutputSchema},
  prompt: `You are an expert growth hacker for a social media agency called "Atlas Social Studio".
Your mission is to automatically find 15-20 "undervalued" Instagram accounts that have high potential but are currently underperforming. These are hidden gems we can help.

**CRITERIA FOR AN "UNDERVALUED" PROSPECT:**

1.  **Good Product/Service, Poor Marketing:** The core offering (product, coaching, service) must be legitimate and appealing. However, their marketing is weak. Look for signs like:
    *   Inconsistent visual theme or messy grid.
    *   Low-quality photos, poor lighting, or bad graphics.
    *   Captions are unengaging or non-existent.
    *   They clearly sell something, but their profile doesn't communicate its value well.

2.  **Passionate but Small Audience (Hidden Gems):** Prioritize accounts with a follower count between **1,000 and 50,000**. Look for signs of a real, engaged community, even if it's small. This means looking for genuine, conversational comments, not just fire emojis. An account with 3,000 followers and 20 real comments is better than an account with 100,000 followers and 5 spam comments.

3.  **Clear Monetization but Weak Funnel:** The account is clearly trying to make money, but they are leaving money on the table.
    *   Their bio has a generic Linktree or no link at all.
    *   They post products but have no clear "Shop Now" call-to-action.
    *   They are a coach or consultant but don't explain how to book a session.

4.  **Diverse & Niche Industries:** Brainstorm a diverse list. Go beyond typical fashion and cosmetic brands. Think about: local businesses with an online presence, niche hobby-to-business creators (e.g., custom pottery, specialized baking), B2B consultants, etc.

**VERY IMPORTANT**: Your suggestions will be automatically verified for existence. Therefore, it is better to provide more diverse and plausible candidates rather than fewer.

For each prospect you brainstorm, provide their Instagram handle, their name, an estimated follower and post count, and a concise reason for why they are a good "undervalued" prospect based on the criteria above.
`,
});

const discoverHotProspectsFlow = ai.defineFlow(
  {
    name: 'discoverHotProspectsFlow',
    outputSchema: DiscoverProspectsOutputSchema,
  },
  async () => {
    const {output} = await prompt({});
    return output!;
  }
);

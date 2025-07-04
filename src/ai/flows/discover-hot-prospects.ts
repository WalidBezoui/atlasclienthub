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
Your mission is to automatically find 15-20 "undervalued" Instagram accounts that are high-potential, profitable prospects we can help. These are hidden gems.

**CRITERIA FOR A HIGH-POTENTIAL, "UNDERVALUED" PROSPECT:**

1.  **Active & Recently Posting:** This is critical. The account MUST be active. Look for signs of recent posts (e.g., within the last week or two). Do not suggest abandoned or inactive accounts.

2.  **Good Product/Service, Poor Marketing:** The core offering (product, coaching, service) must be legitimate and appealing. However, their marketing, visual identity, or content strategy is weak. Look for signs like:
    *   Inconsistent visual theme, messy grid, or generic templates.
    *   Low-quality photos, poor lighting, or amateurish graphics.
    *   Captions are unengaging, short, or non-existent.
    *   They clearly sell something valuable, but their profile doesn't communicate its value effectively.

3.  **Passionate but Underserved Audience (1k-50k Followers):** Prioritize accounts with a follower count between **1,000 and 50,000**. This is the sweet spot. We are looking for accounts with a real, engaged community, even if it's small. Genuine, conversational comments are more important than a high follower count with spammy engagement.

4.  **Clear Monetization but Weak Sales Funnel:** The account is clearly trying to make money but is leaving a lot on the table.
    *   Their bio has a generic Linktree, a broken link, or no link at all.
    *   They post products but have no clear "Shop Now" call-to-action.
    *   They are a coach or consultant but don't clearly explain how to book a session or see their offerings.

5.  **Diverse & Niche Industries:** Brainstorm a diverse list. Go beyond typical fashion and cosmetic brands. Think about: local businesses with an online presence, niche hobby-to-business creators (e.g., custom pottery, specialized baking), B2B consultants, authors, etc.

**VERY IMPORTANT**: Your suggestions will be automatically verified for existence. Therefore, it is better to provide more diverse and plausible candidates rather than fewer.

For each prospect you brainstorm, provide their Instagram handle, their name, an estimated follower and post count, and a concise reason for why they are a good "undervalued" prospect based on the criteria above, especially noting their marketing weaknesses.
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

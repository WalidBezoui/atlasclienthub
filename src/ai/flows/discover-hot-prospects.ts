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
  prompt: `You are an expert market researcher and Instagram prospector for a social media agency called "Atlas Social Studio".
Your task is to automatically brainstorm a list of 15-20 "hot prospects". These are accounts that show strong signs of being profitable businesses with high community engagement.

**CRITERIA FOR A "HOT PROSPECT":**
1.  **Profitability:** The account MUST be a business that sells products or services. Prioritize e-commerce brands (fashion, cosmetics, home goods), service providers (coaches, designers, consultants), and local businesses with a strong online presence. Avoid suggesting personal blogs, hobby accounts, or meme pages unless they have obvious monetization (e.g., extensive brand partnerships, selling courses).
2.  **High Engagement Signal:** Look for accounts that seem to have a vibrant community. This is more important than a huge follower count. Suggest accounts that likely have genuine comments and a loyal following, not just millions of followers with few interactions. A follower count between 5,000 and 100,000 is the sweet spot.
3.  **Aesthetic Potential:** The brand should have a decent product or service, but their visual branding or content strategy could be elevated. They are doing well, but could be doing great with expert help.

**VERY IMPORTANT**: Your suggestions will be automatically verified for existence. Therefore, it is better to provide more diverse and plausible candidates rather than fewer. Focus on finding businesses, creators, or personal brands that would genuinely benefit from social media services.

For each prospect you brainstorm, provide their Instagram handle, their name, an estimated follower and post count, and a concise reason for why they are a good "hot prospect" based on the criteria above.

Generate a broad and diverse list of ideas that fit these criteria.
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

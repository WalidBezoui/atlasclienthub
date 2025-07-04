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
  prompt: `You are a market researcher specializing in finding high-potential Instagram accounts for a social media agency.
Your task is to identify 15-20 Instagram accounts that are prime candidates for growth services.

**CRITICAL INSTRUCTIONS - READ CAREFULLY:**

1.  **VERIFIABLE ACCOUNTS ONLY:** The Instagram handles you provide **MUST** be real, public accounts. Your suggestions will be automatically checked. Providing fake or non-existent handles will fail the task. It is better to provide fewer, real accounts than many fake ones.

2.  **TARGET FOLLOWER RANGE: 5,000 to 50,000.** This is a strict requirement. **DO NOT suggest accounts with less than 5,000 followers.** Focus on accounts that have an established audience but are not yet massive corporations.

3.  **IDENTIFY THE "DIAMOND IN THE ROUGH":** The best candidates are businesses or creators with a good product, service, or message, but their Instagram marketing is weak. Look for these signs of weakness:
    *   Inconsistent or messy visual grid.
    *   Low-quality photos or amateur graphics.
    *   Unengaging or very short captions.
    *   A weak call-to-action (or no CTA) in their bio.

4.  **DIVERSIFY YOUR SEARCH:** Think beyond common niches. Explore areas like:
    *   Local businesses with an online presence (e.g., artisan bakeries, boutique fitness studios).
    *   Niche B2B consultants (e.g., financial advisors for freelancers, marketing coaches for therapists).
    *   Skilled creators who haven't monetized well (e.g., potters, woodworkers, custom painters).

**OUTPUT FORMAT:**
For each prospect, provide their Instagram handle (without the '@'), their name, an estimated follower and post count, and a concise reason explaining *why* they are a good "diamond in the rough" based on the criteria above.
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

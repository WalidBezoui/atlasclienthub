
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
  prompt: `You are an expert market researcher specializing in finding "diamond in the rough" Instagram accounts for a high-end social media agency.
Your task is to identify 15-20 Instagram accounts that are prime candidates for growth and visual identity services. These are accounts with clear potential but are currently underperforming.

**CRITICAL INSTRUCTIONS - READ CAREFULLY:**

1.  **VERIFIABLE ACCOUNTS ONLY:** The Instagram handles you provide **MUST** be real, public accounts. Your suggestions will be automatically checked. Providing fake or non-existent handles will fail the task. It is better to provide fewer, real accounts than many fake ones.

2.  **TARGET FOLLOWER RANGE: 5,000 to 50,000.** This is a strict requirement. **DO NOT suggest accounts with less than 5,000 followers.** Focus on accounts that have an established audience but are not yet massive corporations.

3.  **IDENTIFY THE "DIAMOND IN THE ROUGH":** This is the most important part of your task. You must find accounts with a good product, service, or message, but their Instagram marketing is weak. Look for these specific signs of weakness:
    *   **Visuals:** Inconsistent or messy grid. Low-quality photos, amateur graphics, poor color coordination. The content itself is good, but the presentation is lacking.
    *   **Engagement:** A decent follower count but very low likes or comments (e.g., 20k followers but only 100 likes and 5 comments per post). This signals a disconnect with their audience.
    *   **Strategy:** No clear Call-to-Action (CTA) in their bio (e.g., "DM for info" instead of a direct link). Captions are short, uninspired, or don't encourage interaction.
    *   **Examples of good candidates:** A talented chef with amazing food photos but a messy grid; a consultant with great advice but generic stock photos; a product brand with a beautiful product but low engagement.

4.  **DIVERSIFY YOUR SEARCH (THINK LIKE A PROSPECTOR):** Explore beyond common niches. Uncover hidden gems in areas like:
    *   Local businesses with an online presence (e.g., artisan bakeries, boutique fitness studios, custom furniture makers).
    *   Niche B2B consultants (e.g., financial advisors for freelancers, marketing coaches for therapists).
    *   Skilled creators who haven't monetized well (e.g., potters, woodworkers, custom painters).
    *   Service providers with a strong local reputation but a weak online one.
    *   **AVOID:** Meme accounts, dropshippers, purely personal blogs, and large, well-established brands.

**OUTPUT FORMAT:**
For each prospect, provide their Instagram handle (without the '@'), their name, an estimated follower and post count, and a concise reason explaining *specifically why* they are a good "diamond in the rough" based on the weakness criteria above. Be specific in your reasoning (e.g., "Reason: High-quality leather products, but their grid is inconsistent and captions lack engagement").

Now, begin your prospecting.`,
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


'use server';
/**
 * @fileOverview An AI agent for discovering new Instagram prospects.
 *
 * - discoverProspects - A function that searches for potential prospects based on a query.
 * - DiscoverProspectsInput - The input type for the discoverProspects function.
 * - DiscoverProspectsOutput - The return type for the discoverProspects function.
 * - DiscoveredProspect - The type for a single discovered prospect.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DiscoveredProspectSchema, DiscoverProspectsOutputSchema } from '../schemas/prospect-schemas';
export type { DiscoveredProspect, DiscoverProspectsOutput } from '../schemas/prospect-schemas';


const DiscoverProspectsInputSchema = z.object({
  query: z.string().describe('The search query for discovering prospects. This can include industry, location, keywords, etc. For example: "Moroccan skincare brands using handmade ingredients".'),
  minFollowerCount: z.number().nullable().optional().describe('The minimum number of followers a prospect should have. If provided, only suggest accounts with at least this many followers.'),
});
export type DiscoverProspectsInput = z.infer<typeof DiscoverProspectsInputSchema>;


export async function discoverProspects(input: DiscoverProspectsInput): Promise<DiscoverProspectsOutput> {
  return discoverProspectsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'discoverProspectsPrompt',
  input: {schema: DiscoverProspectsInputSchema},
  output: {schema: DiscoverProspectsOutputSchema},
  prompt: `You are an expert market researcher and Instagram prospector for a high-end social media agency called "Atlas Social Studio".
Your task is to identify potential leads who would be a perfect fit for the agency's services, which focus on elevating brands through premium visual identity and content strategy.

**IDEAL CLIENT PROFILE:**
The agency targets businesses, creators, or personal brands who have a great product/service but are underperforming on Instagram. They are the "diamonds in the rough". We are NOT looking for huge corporations, meme accounts, or dropshipping stores.

**CRITICAL INSTRUCTIONS:**
1.  **VERIFIABLE ACCOUNTS ONLY:** The Instagram handles you provide **MUST** be real, public accounts. Your suggestions will be automatically checked. It is better to provide fewer, real accounts than many fake ones.
2.  **BRAINSTORM BROADLY:** Based on the user's search query, brainstorm 15-20 potential accounts. Think creatively. For example, if the query is "local coffee shops", think about related niches like "artisan bakeries", "specialty tea houses", or "local cafes with unique aesthetics".
3.  **FILTER FOR QUALITY:** From your brainstormed list, select accounts that show signs of needing help. Look for these specific weaknesses:
    *   Inconsistent or messy visual grid.
    *   Low-quality photos or amateurish graphics.
    *   Unengaging or very short captions.
    *   A weak call-to-action (or no CTA) in their bio.
    *   Good follower count but disproportionately low engagement (likes/comments).
4.  **ESTIMATE, DON'T HALLUCINATE:** Follower and post counts are estimates. Do not make up numbers. If you cannot estimate, it is acceptable to leave them null.
{{#if minFollowerCount}}
5.  **FOLLOWER COUNT REQUIREMENT:** Only suggest accounts with **at least {{minFollowerCount}} followers.** This is a strict minimum. Do not suggest accounts below this threshold.
{{/if}}

**OUTPUT FORMAT:**
For each prospect, provide their Instagram handle (without the '@'), their name, an estimated follower and post count, and a concise reason explaining *why* they are a good "diamond in therough" candidate based on the criteria above.

**Search Query:** "{{query}}"

Now, begin your research and generate the prospect list.`,
});

const discoverProspectsFlow = ai.defineFlow(
  {
    name: 'discoverProspectsFlow',
    inputSchema: DiscoverProspectsInputSchema,
    outputSchema: DiscoverProspectsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

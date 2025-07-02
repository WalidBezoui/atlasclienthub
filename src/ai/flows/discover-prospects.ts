'use server';
/**
 * @fileOverview An AI agent for discovering new Instagram prospects.
 *
 * - discoverProspects - A function that searches for potential prospects based on a query.
 * - DiscoverProspectsInput - The input type for the discoverProspects function.
 * - DiscoverProspectsOutput - The return type for the discoverProspects function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const DiscoveredProspectSchema = z.object({
  instagramHandle: z.string().describe("The Instagram handle of the prospect, without the '@' symbol."),
  name: z.string().describe("The name of the brand or person."),
  reason: z.string().describe("A brief, one-sentence reason why this prospect is a good fit based on the search query."),
});

const DiscoverProspectsInputSchema = z.object({
  query: z.string().describe('The search query for discovering prospects. This can include industry, location, keywords, etc. For example: "Moroccan skincare brands using handmade ingredients".'),
});
export type DiscoverProspectsInput = z.infer<typeof DiscoverProspectsInputSchema>;

const DiscoverProspectsOutputSchema = z.object({
  prospects: z.array(DiscoveredProspectSchema).describe('A list of potential prospects found.'),
});
export type DiscoverProspectsOutput = z.infer<typeof DiscoverProspectsOutputSchema>;


export async function discoverProspects(input: DiscoverProspectsInput): Promise<DiscoverProspectsOutput> {
  return discoverProspectsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'discoverProspectsPrompt',
  input: {schema: DiscoverProspectsInputSchema},
  output: {schema: DiscoverProspectsOutputSchema},
  prompt: `You are an expert market researcher and Instagram prospector. Your task is to find potential leads for a social media agency called "Atlas Social Studio".
The agency specializes in helping brands (especially in Morocco but also globally) improve their visual identity and content strategy.

Based on the user's search query, find 5 to 10 potential Instagram accounts that fit the description.
Focus on finding businesses, creators, or personal brands that look like they could benefit from professional social media services. Avoid large, established corporations or personal accounts with no commercial intent.

For each prospect you find, provide their Instagram handle, their name, and a concise reason for why they are a good match.

Search Query: "{{query}}"
`,
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

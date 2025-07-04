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

export const DiscoveredProspectSchema = z.object({
  instagramHandle: z.string().describe("The Instagram handle of the prospect, without the '@' symbol."),
  name: z.string().describe("The name of the brand or person."),
  reason: z.string().describe("A brief, one-sentence reason why this prospect is a good fit based on the search query."),
  followerCount: z.number().nullable().optional().describe("An estimated follower count for the Instagram account. Can be null if not easily found."),
  postCount: z.number().nullable().optional().describe("An estimated number of posts for the Instagram account. Can be null if not easily found."),
});
export type DiscoveredProspect = z.infer<typeof DiscoveredProspectSchema>;

const DiscoverProspectsInputSchema = z.object({
  query: z.string().describe('The search query for discovering prospects. This can include industry, location, keywords, etc. For example: "Moroccan skincare brands using handmade ingredients".'),
  minFollowerCount: z.number().nullable().optional().describe('The minimum number of followers a prospect should have. If provided, only suggest accounts with at least this many followers.'),
});
export type DiscoverProspectsInput = z.infer<typeof DiscoverProspectsInputSchema>;

export const DiscoverProspectsOutputSchema = z.object({
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
  prompt: `You are an expert market researcher and Instagram prospector. Your task is to brainstorm potential leads for a social media agency called "Atlas Social Studio".
The agency specializes in helping brands improve their visual identity and content strategy.

Based on the user's search query, brainstorm 15 to 20 potential Instagram accounts that could fit the description.
**VERY IMPORTANT**: Your suggestions will be automatically verified for existence. Therefore, it is better to provide more diverse and plausible candidates rather than fewer. Focus on finding businesses, creators, or personal brands that might benefit from social media services. Avoid large, established corporations.

{{#if minFollowerCount}}
**CRITICAL REQUIREMENT: Only suggest accounts with at least {{minFollowerCount}} followers.** This is a strict minimum. Do not suggest accounts below this threshold.
{{/if}}

For each prospect you brainstorm, provide their Instagram handle, their name, their estimated follower and post count, and a concise reason for why they are a good match. The follower/post counts are estimates and don't need to be precise.

Your suggestions are critical for the first step of a discovery process. Generate a broad list of ideas.

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

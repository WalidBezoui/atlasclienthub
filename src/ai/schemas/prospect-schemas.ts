import {z} from 'genkit';

export const DiscoveredProspectSchema = z.object({
  instagramHandle: z.string().describe("The Instagram handle of the prospect, without the '@' symbol."),
  name: z.string().describe("The name of the brand or person."),
  reason: z.string().describe("A brief, one-sentence reason why this prospect is a good fit based on the search query."),
  followerCount: z.number().nullable().optional().describe("An estimated follower count for the Instagram account. Can be null if not easily found."),
  postCount: z.number().nullable().optional().describe("An estimated number of posts for the Instagram account. Can be null if not easily found."),
});
export type DiscoveredProspect = z.infer<typeof DiscoveredProspectSchema>;

export const DiscoverProspectsOutputSchema = z.object({
  prospects: z.array(DiscoveredProspectSchema).describe('A list of potential prospects found.'),
});
export type DiscoverProspectsOutput = z.infer<typeof DiscoverProspectsOutputSchema>;

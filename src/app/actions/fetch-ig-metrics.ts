
'use server';

import { z } from 'zod';

// Define Zod schemas for the parts of the Instagram response we care about
const InstagramMediaNodeSchema = z.object({
  edge_liked_by: z.object({
    count: z.number(),
  }),
  edge_media_to_comment: z.object({
    count: z.number(),
  }),
  // __typename: z.string().optional(), // Useful for differentiating post types if needed
  // id: z.string().optional(),
  // shortcode: z.string().optional(),
  // taken_at_timestamp: z.number().optional(),
});

const InstagramMediaEdgeSchema = z.object({
  node: InstagramMediaNodeSchema,
});

const InstagramUserMediaSchema = z.object({
  count: z.number(),
  edges: z.array(InstagramMediaEdgeSchema).optional(),
});

const InstagramUserSchema = z.object({
  edge_followed_by: z.object({
    count: z.number(),
  }),
  edge_owner_to_timeline_media: InstagramUserMediaSchema,
  // fbid: z.string().optional(),
  // full_name: z.string().optional(),
  // id: z.string().optional(),
  // is_private: z.boolean().optional(),
  // username: z.string().optional(),
});

const InstagramGraphQLResponseSchema = z.object({
  user: InstagramUserSchema.nullable().optional(), // User can be null if profile is private or not found easily
});

const InstagramMainResponseSchema = z.object({
  graphql: InstagramGraphQLResponseSchema.optional(), // Top level graphql object might be missing on errors
  // For other types of responses (like login pages), graphql might not be present
  error_type: z.string().optional(), // For specific error messages from IG
  message: z.string().optional(), // Error message
  status: z.string().optional(), // e.g. "fail"
});


export type InstagramMetrics = {
  followerCount: number;
  postCount: number;
  avgLikes: number;
  avgComments: number;
};

export async function fetchInstagramMetrics(
  username: string
): Promise<{ data?: InstagramMetrics; error?: string }> {
  if (!username || typeof username !== 'string' || username.trim() === '') {
    return { error: 'Instagram username is required.' };
  }

  const igHandle = username.replace('@', '').trim();
  if (!igHandle) {
    return { error: 'Valid Instagram username is required.'}
  }

  const url = `https://www.instagram.com/${igHandle}/?__a=1&__d=dis`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    // 'x-ig-app-id': '936619743392459', // Common app ID, might need to be present
    // Some recommend adding sec-fetch-* headers too, but keep it simple first
  };

  try {
    const response = await fetch(url, { headers, cache: 'no-store' });

    if (!response.ok) {
      if (response.status === 404) {
        return { error: `Instagram profile @${igHandle} not found or is private.` };
      }
      // Attempt to read error body for more details
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) { /* ignore if can't read body */ }
      console.error(`Error fetching Instagram data for @${igHandle}: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0,500)}`);
      return { error: `Failed to fetch. IG Server responded with Status: ${response.status}. The profile might be private, or access is restricted.` };
    }

    const rawJson = await response.json();
    
    // Try to parse the received JSON against our schema
    const parsedResponse = InstagramMainResponseSchema.safeParse(rawJson);

    if (!parsedResponse.success) {
      console.error(`Error parsing Instagram JSON structure for @${igHandle}:`, parsedResponse.error.errors);
      console.error('Raw JSON received:', JSON.stringify(rawJson, null, 2).substring(0, 1000));
      return { error: 'Failed to parse Instagram data. The API structure might have changed, or the profile is inaccessible.' };
    }
    
    const data = parsedResponse.data;

    if (!data.graphql || !data.graphql.user) {
        if (data.message) { // Instagram sometimes returns an error object directly
             console.warn(`Instagram API indicated an issue for @${igHandle}: ${data.message}`);
             return { error: data.message.includes("login") ? `Profile @${igHandle} may require login or is private.` : `Could not fetch data for @${igHandle}. IG message: ${data.message}` };
        }
        console.warn(`No user data found in GraphQL response for @${igHandle}. Raw: ${JSON.stringify(data, null, 2).substring(0,500)}`);
        return { error: `No user data found for @${igHandle}. The profile may be private or inaccessible.` };
    }


    const userData = data.graphql.user;
    const followerCount = userData.edge_followed_by.count;
    const postCount = userData.edge_owner_to_timeline_media.count;
    const recentPosts = userData.edge_owner_to_timeline_media.edges?.slice(0, 3) || [];

    let totalLikes = 0;
    let totalComments = 0;
    let validPostsCount = 0;

    if (recentPosts.length > 0) {
      for (const post of recentPosts) {
        totalLikes += post.node.edge_liked_by.count;
        totalComments += post.node.edge_media_to_comment.count;
        validPostsCount++;
      }
    }
    
    const avgLikes = validPostsCount > 0 ? parseFloat((totalLikes / validPostsCount).toFixed(1)) : 0;
    const avgComments = validPostsCount > 0 ? parseFloat((totalComments / validPostsCount).toFixed(1)) : 0;

    return {
      data: {
        followerCount,
        postCount,
        avgLikes,
        avgComments,
      },
    };
  } catch (error: any) {
    console.error(`Unexpected error fetching Instagram metrics for @${igHandle}:`, error);
    if (error instanceof SyntaxError) { // JSON.parse failed
        return { error: 'Received invalid JSON response from Instagram. The endpoint might be down or request was blocked.' };
    }
    return { error: error.message || 'An unexpected error occurred while fetching metrics.' };
  }
}

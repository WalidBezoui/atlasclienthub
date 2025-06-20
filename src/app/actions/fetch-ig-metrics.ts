
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
});

const InstagramGraphQLResponseSchema = z.object({
  user: InstagramUserSchema.nullable().optional(), 
});

const InstagramMainResponseSchema = z.object({
  graphql: InstagramGraphQLResponseSchema.optional(),
  error_type: z.string().optional(), 
  message: z.string().optional(), 
  status: z.string().optional(), 
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
  console.log(`[SERVER ACTION ENTRY] fetchInstagramMetrics called for username: "${username}"`);

  if (!username || typeof username !== 'string' || username.trim() === '') {
    console.error("[SERVER ACTION VALIDATION FAIL] Instagram username is required.");
    return { error: 'Instagram username is required.' };
  }

  const igHandle = username.replace('@', '').trim();
  if (!igHandle) {
    console.error("[SERVER ACTION VALIDATION FAIL] Valid Instagram username is required (after trim/replace).");
    return { error: 'Valid Instagram username is required.'}
  }

  const url = `https://www.instagram.com/${igHandle}/?__a=1&__d=dis`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'x-ig-app-id': '1217981644879628', 
  };

  console.log(`[SERVER ACTION PRE-FETCH] Fetching Instagram metrics for @${igHandle} from URL: ${url}`);
  console.log(`[SERVER ACTION PRE-FETCH] Headers: ${JSON.stringify(headers)}`);

  try {
    const response = await fetch(url, { headers, cache: 'no-store' });

    console.log(`[SERVER ACTION POST-FETCH] Response status for @${igHandle}: ${response.status}`);

    if (!response.ok) {
      let errorBodyText = `Status: ${response.status} ${response.statusText}. No response body readable.`;
      try {
        // Attempt to read the response body as text
        const rawBody = await response.text();
        errorBodyText = rawBody; // Store the raw body
        console.error(`[SERVER ACTION ERROR-BODY @${igHandle}] RAW Response Text (Status ${response.status}):\n${rawBody}`);
      } catch (e: any) {
        console.error(`[SERVER ACTION ERROR @${igHandle}] Failed to read error response body (Status ${response.status}): ${e.message}`);
      }

      if (response.status === 404) {
        return { error: `Instagram profile @${igHandle} not found or is private.` };
      }
      if (response.status === 400) {
        return { error: `Instagram rejected the request for @${igHandle} (Status 400 - Bad Request). Details: ${errorBodyText.substring(0,150)}...` };
      }
      return { error: `Failed to fetch. IG Server responded with Status: ${response.status} for @${igHandle}. Details: ${errorBodyText.substring(0,150)}...` };
    }

    // If response.ok is true
    const rawJson = await response.json();
    // console.log(`[SERVER ACTION SUCCESS-RAW-JSON @${igHandle}]:`, JSON.stringify(rawJson, null, 2)); // Optional: log full raw JSON if needed for debugging successful but malformed responses

    const parsedResponse = InstagramMainResponseSchema.safeParse(rawJson);

    if (!parsedResponse.success) {
      console.error(`[SERVER ACTION PARSE-ERROR @${igHandle}] Error parsing Instagram JSON structure:`, parsedResponse.error.errors);
      console.error(`[SERVER ACTION PARSE-ERROR @${igHandle}] Raw JSON received that failed parsing:`, JSON.stringify(rawJson, null, 2).substring(0, 1000));
      return { error: 'Failed to parse Instagram data. The API structure might have changed, or the profile is inaccessible.' };
    }
    
    const data = parsedResponse.data;

    if (data.status === 'fail' || data.error_type) {
        const igErrorMessage = data.message || data.error_type || 'Unknown Instagram error after 200 OK';
        console.warn(`[SERVER ACTION IG-ERROR @${igHandle}] Instagram API indicated an issue: ${igErrorMessage}. Raw data: ${JSON.stringify(data).substring(0,500)}`);
        return { error: `Could not fetch data for @${igHandle}. Instagram message: ${igErrorMessage}` };
    }
    
    if (!data.graphql || !data.graphql.user) {
        if (data.message) { 
             console.warn(`[SERVER ACTION NO-USER-DATA @${igHandle}] Instagram API message: ${data.message}`);
             return { error: data.message.includes("login") ? `Profile @${igHandle} may require login or is private.` : `Could not fetch data for @${igHandle}. IG message: ${data.message}` };
        }
        console.warn(`[SERVER ACTION NO-USER-DATA @${igHandle}] No user data found in GraphQL response. Raw: ${JSON.stringify(data, null, 2).substring(0,500)}`);
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

    console.log(`[SERVER ACTION SUCCESS @${igHandle}] Metrics: Followers ${followerCount}, Posts ${postCount}, AvgLikes ${avgLikes}, AvgComments ${avgComments}`);
    return {
      data: {
        followerCount,
        postCount,
        avgLikes,
        avgComments,
      },
    };

  } catch (error: any) {
    console.error(`[SERVER ACTION CRITICAL-ERROR @${igHandle}] Unexpected error during fetchInstagramMetrics:`, error.message);
    console.error(`[SERVER ACTION CRITICAL-ERROR @${igHandle}] Error stack:`, error.stack);
    if (error instanceof SyntaxError) { 
        return { error: `Received invalid JSON response from Instagram for @${igHandle}. Endpoint might be down or request blocked.` };
    }
    return { error: `An unexpected error occurred while fetching metrics for @${igHandle}: ${error.message || 'Unknown error'}` };
  }
}

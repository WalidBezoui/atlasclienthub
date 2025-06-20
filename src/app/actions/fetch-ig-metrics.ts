
'use server';

import { z } from 'zod';

// Zod schema for the expected output of an Instagram profile item from Apify
const ApifyInstagramPostSchema = z.object({
  likesCount: z.number().optional().nullable(),
  commentsCount: z.number().optional().nullable(),
  // Add other post fields if needed, like timestamp or mediaUrl
});

const ApifyInstagramProfileSchema = z.object({
  username: z.string(),
  followersCount: z.number().optional().nullable(),
  postsCount: z.number().optional().nullable(),
  latestPosts: z.array(ApifyInstagramPostSchema).optional().nullable(),
  // Add other profile fields if available and needed, e.g., biography, fullName, isPrivate
});

// Zod schema for Apify actor run start response
const ApifyRunStartResponseDataSchema = z.object({
  id: z.string(),
  actId: z.string(),
  userId: z.string(),
  startedAt: z.string().datetime({ offset: true }),
  status: z.string(), // e.g., "READY", "RUNNING"
  defaultDatasetId: z.string(),
});
const ApifyRunStartResponseSchema = z.object({
  data: ApifyRunStartResponseDataSchema,
});

// Zod schema for Apify actor run status response
const ApifyRunStatusResponseDataSchema = z.object({
  status: z.string(), // e.g., "SUCCEEDED", "FAILED", "RUNNING"
});
const ApifyRunStatusResponseSchema = z.object({
  data: ApifyRunStatusResponseDataSchema,
});


export type InstagramMetrics = {
  followerCount: number;
  postCount: number;
  avgLikes: number;
  avgComments: number;
};

// --- Apify Configuration ---
// IMPORTANT: Replace with the actual Apify actor ID you want to use.
// This could be something like 'apify/instagram-profile-scraper' or a custom actor.
const ACTOR_ID = 'apify/instagram-profile-scraper'; // Example: 'username/actor-name'
const APIFY_BASE_URL = 'https://api.apify.com/v2';
const MAX_POLL_RETRIES = 20; // Max number of times to poll for status (e.g., 20 * 6s = 120s timeout)
const POLL_INTERVAL_MS = 6000; // 6 seconds

export async function fetchInstagramMetrics(
  username: string
): Promise<{ data?: InstagramMetrics; error?: string }> {
  const APIFY_TOKEN = process.env.APIFY_API_KEY;

  console.log(`[SERVER ACTION ENTRY] fetchInstagramMetrics called for username: "${username}" using Apify.`);

  if (!APIFY_TOKEN) {
    console.error("[SERVER ACTION ERROR] Apify API key (APIFY_API_KEY) is not configured in .env.");
    return { error: 'Apify API key is not configured. Please set APIFY_API_KEY in your environment variables.' };
  }
  if (!username || typeof username !== 'string' || username.trim() === '') {
    console.error("[SERVER ACTION VALIDATION FAIL] Instagram username is required.");
    return { error: 'Instagram username is required.' };
  }

  const igHandle = username.replace('@', '').trim();
  if (!igHandle) {
    console.error("[SERVER ACTION VALIDATION FAIL] Valid Instagram username is required.");
    return { error: 'Valid Instagram username is required.' };
  }

  // Actor input might vary based on the specific actor.
  // This example assumes the actor accepts an array of usernames.
  const actorInput = {
    usernames: [igHandle],
    // Add other actor-specific input fields here if needed
    // e.g., resultsLimit: 1, proxyConfiguration: { useApifyProxy: true }
  };

  console.log(`[APIFY ACTION] Starting actor run for ${igHandle} with actor ID ${ACTOR_ID}. Input:`, JSON.stringify(actorInput));

  try {
    // 1. Start the actor run
    const runResponse = await fetch(`${APIFY_BASE_URL}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actorInput),
      cache: 'no-store',
    });

    if (!runResponse.ok) {
      let errorBodyText = `Status: ${runResponse.status} ${runResponse.statusText}.`;
      try {
        const errorData = await runResponse.json();
        errorBodyText = `Apify: Failed to start actor run - ${errorData?.error?.message || runResponse.statusText}. Full error: ${JSON.stringify(errorData)}`;
        console.error(`[APIFY ACTION ERROR] Failed to start actor. Status: ${runResponse.status}. Body:`, errorData);
      } catch (e) {
        console.error(`[APIFY ACTION ERROR] Failed to start actor and parse error body. Status: ${runResponse.status}.`);
      }
      return { error: errorBodyText };
    }

    const parsedRunStart = ApifyRunStartResponseSchema.safeParse(await runResponse.json());
    if (!parsedRunStart.success) {
        console.error("[APIFY ACTION ERROR] Failed to parse Apify run start response:", parsedRunStart.error.errors);
        return { error: "Apify: Unexpected response format when starting actor run." };
    }
    const runId = parsedRunStart.data.data.id;
    const datasetId = parsedRunStart.data.data.defaultDatasetId;
    console.log(`[APIFY ACTION] Actor run started. Run ID: ${runId}, Dataset ID: ${datasetId}`);

    // 2. Poll for actor run completion
    let actorStatus = parsedRunStart.data.data.status;
    let retries = 0;

    while (['READY', 'RUNNING'].includes(actorStatus) && retries < MAX_POLL_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      retries++;
      console.log(`[APIFY ACTION] Polling run status for ${runId} (Attempt ${retries}/${MAX_POLL_RETRIES})`);

      const statusFetchResponse = await fetch(`${APIFY_BASE_URL}/acts/${ACTOR_ID}/runs/${runId}?token=${APIFY_TOKEN}`, { cache: 'no-store' });
      if (!statusFetchResponse.ok) {
        console.warn(`[APIFY ACTION WARNING] Failed to fetch run status for ${runId}. Status: ${statusFetchResponse.status}. Will continue polling.`);
        // Optionally, break if status fetching fails multiple times
        continue; 
      }
      
      const parsedStatus = ApifyRunStatusResponseSchema.safeParse(await statusFetchResponse.json());
      if (!parsedStatus.success) {
        console.warn(`[APIFY ACTION WARNING] Failed to parse run status for ${runId}. Will continue polling. Error:`, parsedStatus.error.errors);
        continue;
      }
      actorStatus = parsedStatus.data.data.status;
      console.log(`[APIFY ACTION] Run ${runId} status: ${actorStatus}`);
    }

    if (actorStatus !== 'SUCCEEDED') {
      console.error(`[APIFY ACTION ERROR] Actor run ${runId} for ${igHandle} did not succeed. Final status: ${actorStatus}.`);
      return { error: `Apify: Actor run for ${igHandle} did not succeed. Status: ${actorStatus}. This could be due to an invalid username, private profile, or actor issue.` };
    }

    // 3. Get dataset items
    console.log(`[APIFY ACTION] Fetching dataset items from ${datasetId} for run ${runId}.`);
    const datasetItemsResponse = await fetch(`${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&clean=1&limit=1`, { cache: 'no-store' });

    if (!datasetItemsResponse.ok) {
      let errorBodyText = `Status: ${datasetItemsResponse.status} ${datasetItemsResponse.statusText}.`;
      try {
        const errorData = await datasetItemsResponse.json();
        errorBodyText = `Apify: Failed to fetch dataset items - ${errorData?.error?.message || datasetItemsResponse.statusText}`;
        console.error(`[APIFY ACTION ERROR] Failed to fetch dataset items. Status: ${datasetItemsResponse.status}. Body:`, errorData);
      } catch (e) {
         console.error(`[APIFY ACTION ERROR] Failed to fetch dataset items and parse error body. Status: ${datasetItemsResponse.status}.`);
      }
      return { error: errorBodyText };
    }

    const results: unknown[] = await datasetItemsResponse.json();

    if (!Array.isArray(results) || results.length === 0) {
      console.warn(`[APIFY ACTION WARNING] No data returned from Apify actor for ${igHandle}. Actor might have found no public data or profile is private/non-existent.`);
      return { error: `Apify: No data returned from actor for @${igHandle}. The profile might be private, non-existent, or the actor found no public information.` };
    }

    const parsedProfile = ApifyInstagramProfileSchema.safeParse(results[0]);

    if (!parsedProfile.success) {
      console.error(`[APIFY ACTION ERROR] Failed to parse profile data from Apify for ${igHandle}:`, parsedProfile.error.errors);
      console.error(`[APIFY ACTION ERROR] Raw data received:`, JSON.stringify(results[0]).substring(0,1000));
      return { error: `Apify: Failed to parse profile data for @${igHandle}. Actor output structure might have changed.` };
    }
    
    const profileData = parsedProfile.data;

    const followerCount = profileData.followersCount ?? 0;
    const postCount = profileData.postsCount ?? 0;
    const recentPosts = profileData.latestPosts?.slice(0, 3) || [];

    let totalLikes = 0;
    let totalComments = 0;
    let validPostsCount = 0;

    if (recentPosts.length > 0) {
      for (const post of recentPosts) {
        if (post.likesCount !== null && post.likesCount !== undefined) {
          totalLikes += post.likesCount;
        }
        if (post.commentsCount !== null && post.commentsCount !== undefined) {
          totalComments += post.commentsCount;
        }
        // Consider a post valid for averaging if it has either likes or comments data.
        // Actor might return null for these if it couldn't fetch them.
        if (post.likesCount !== null || post.commentsCount !== null) {
             validPostsCount++;
        }
      }
    }
    
    const avgLikes = validPostsCount > 0 ? parseFloat((totalLikes / validPostsCount).toFixed(1)) : 0;
    const avgComments = validPostsCount > 0 ? parseFloat((totalComments / validPostsCount).toFixed(1)) : 0;

    console.log(`[APIFY ACTION SUCCESS @${igHandle}] Metrics: Followers ${followerCount}, Posts ${postCount}, AvgLikes ${avgLikes}, AvgComments ${avgComments}`);
    return {
      data: {
        followerCount,
        postCount,
        avgLikes,
        avgComments,
      },
    };

  } catch (error: any) {
    console.error(`[APIFY ACTION CRITICAL-ERROR @${igHandle}] Unexpected error during Apify fetchInstagramMetrics:`, error.message);
    console.error(`[APIFY ACTION CRITICAL-ERROR @${igHandle}] Error stack:`, error.stack);
    return { error: `Apify: An unexpected error occurred while fetching metrics for @${igHandle}: ${error.message || 'Unknown error'}` };
  }
}

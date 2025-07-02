
'use server';

import { z } from 'zod';

// Zod schema for the expected output of an Instagram profile item from Apify
const ApifyInstagramPostSchema = z.object({
  likesCount: z.number().optional().nullable(),
  commentsCount: z.number().optional().nullable(),
  // Add other post fields if needed, like timestamp or mediaUrl
});

const ApifyInstagramProfileSchema = z.object({
  username: z.string().optional().nullable(), // Make username optional as actor might not always return it
  followersCount: z.number().optional().nullable(),
  postsCount: z.number().optional().nullable(),
  latestPosts: z.array(ApifyInstagramPostSchema).optional().nullable(),
  biography: z.string().optional().nullable(),
  // Add other profile fields if available and needed, e.g., fullName, isPrivate
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
  biography?: string | null;
};

// --- Apify Configuration ---
// IMPORTANT: Replace with the actual Apify actor ID you want to use.
// This could be something like 'apify/instagram-profile-scraper' or a custom actor.
const ACTOR_ID = 'apify/instagram-profile-scraper'; // Example: 'username/actor-name'
const APIFY_BASE_URL = 'https://api.apify.com/v2';
const MAX_POLL_RETRIES = 10; // Max number of times to poll for status (e.g., 10 * 6s = 60s timeout)
const POLL_INTERVAL_MS = 6000; // 6 seconds

export async function fetchInstagramMetrics(
  username: string
): Promise<{ data?: InstagramMetrics; error?: string }> {
  const APIFY_TOKEN = process.env.APIFY_API_KEY;
  const formattedActorId = ACTOR_ID.replace('/', '~');

  console.log(`[APIFY ACTION ENTRY] fetchInstagramMetrics called for username: "${username}" using Apify actor ${formattedActorId}.`);

  if (!APIFY_TOKEN) {
    console.error("[APIFY ACTION ERROR] Apify API key (APIFY_API_KEY) is not configured in .env.");
    return { error: 'Apify API key is not configured. Please set APIFY_API_KEY in your environment variables.' };
  }
  if (!username || typeof username !== 'string' || username.trim() === '') {
    console.error("[APIFY ACTION VALIDATION FAIL] Instagram username is required.");
    return { error: 'Instagram username is required.' };
  }

  const igHandle = username.replace('@', '').trim();
  if (!igHandle) {
    console.error("[APIFY ACTION VALIDATION FAIL] Valid Instagram username is required.");
    return { error: 'Valid Instagram username is required.' };
  }

  // Actor input might vary based on the specific actor.
  // This example assumes the actor accepts an array of usernames.
  const actorInput = {
    usernames: [igHandle],
    // Add other actor-specific input fields here if needed
    // e.g., resultsLimit: 1, proxyConfiguration: { useApifyProxy: true }
  };

  console.log(`[APIFY ACTION] Starting actor run for ${igHandle} with actor ID ${formattedActorId}. Input:`, JSON.stringify(actorInput));
  const startRunUrl = `${APIFY_BASE_URL}/acts/${formattedActorId}/runs?token=${APIFY_TOKEN}`;
  console.log(`[APIFY ACTION] Start run URL: ${startRunUrl}`);

  try {
    // 1. Start the actor run
    const runResponse = await fetch(startRunUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actorInput),
      cache: 'no-store',
    });

    if (!runResponse.ok) {
      const errorBodyText = await runResponse.text();
      console.error(`[APIFY ACTION ERROR] Failed to start actor. Status: ${runResponse.status} ${runResponse.statusText}. URL: ${startRunUrl}. Raw Response:`, errorBodyText);
      let parsedError;
      try { parsedError = JSON.parse(errorBodyText); } catch (e) { /* ignore if not json */ }
      return { error: `Apify: Failed to start actor run - ${parsedError?.error?.message || runResponse.statusText}. Status: ${runResponse.status}. Check server logs for details.` };
    }
    
    const runResponseJson = await runResponse.json();
    const parsedRunStart = ApifyRunStartResponseSchema.safeParse(runResponseJson);

    if (!parsedRunStart.success) {
        console.error("[APIFY ACTION ERROR] Failed to parse Apify run start response. URL: ${startRunUrl}. Errors:", parsedRunStart.error.errors);
        console.error("[APIFY ACTION ERROR] Raw JSON response from Apify:", runResponseJson);
        return { error: "Apify: Unexpected response format when starting actor run. Check server logs." };
    }
    const runId = parsedRunStart.data.data.id;
    const datasetId = parsedRunStart.data.data.defaultDatasetId;
    console.log(`[APIFY ACTION] Actor run started. Run ID: ${runId}, Dataset ID: ${datasetId}`);

    // 2. Poll for actor run completion
    let actorStatus = parsedRunStart.data.data.status;
    let retries = 0;
    const pollStatusUrlBase = `${APIFY_BASE_URL}/acts/${formattedActorId}/runs/${runId}?token=${APIFY_TOKEN}`;

    while (['READY', 'RUNNING'].includes(actorStatus) && retries < MAX_POLL_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      retries++;
      console.log(`[APIFY ACTION] Polling run status for ${runId} (Attempt ${retries}/${MAX_POLL_RETRIES}). URL: ${pollStatusUrlBase}`);

      const statusFetchResponse = await fetch(pollStatusUrlBase, { cache: 'no-store' });
      if (!statusFetchResponse.ok) {
        const errorBodyText = await statusFetchResponse.text();
        console.warn(`[APIFY ACTION WARNING] Failed to fetch run status for ${runId}. Status: ${statusFetchResponse.status} ${statusFetchResponse.statusText}. URL: ${pollStatusUrlBase}. Raw Response:`, errorBodyText);
        continue; 
      }
      
      const statusResponseJson = await statusFetchResponse.json();
      const parsedStatus = ApifyRunStatusResponseSchema.safeParse(statusResponseJson);
      if (!parsedStatus.success) {
        console.warn(`[APIFY ACTION WARNING] Failed to parse run status for ${runId}. URL: ${pollStatusUrlBase}. Errors:`, parsedStatus.error.errors);
        console.warn(`[APIFY ACTION WARNING] Raw JSON response for status:`, statusResponseJson);
        continue;
      }
      actorStatus = parsedStatus.data.data.status;
      console.log(`[APIFY ACTION] Run ${runId} status: ${actorStatus}`);
    }

    if (actorStatus !== 'SUCCEEDED') {
      console.error(`[APIFY ACTION ERROR] Actor run ${runId} for ${igHandle} did not succeed. Final status: ${actorStatus}.`);
      return { error: `Apify: Actor run for ${igHandle} did not succeed. Status: ${actorStatus}. This could be due to an invalid username, private profile, or actor issue. Check server logs.` };
    }

    // 3. Get dataset items
    const datasetItemsUrl = `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&clean=1&limit=1`;
    console.log(`[APIFY ACTION] Fetching dataset items from ${datasetId} for run ${runId}. URL: ${datasetItemsUrl}`);
    const datasetItemsResponse = await fetch(datasetItemsUrl, { cache: 'no-store' });

    if (!datasetItemsResponse.ok) {
      const errorBodyText = await datasetItemsResponse.text();
      console.error(`[APIFY ACTION ERROR] Failed to fetch dataset items. Status: ${datasetItemsResponse.status} ${datasetItemsResponse.statusText}. URL: ${datasetItemsUrl}. Raw Response:`, errorBodyText);
      let parsedError;
      try { parsedError = JSON.parse(errorBodyText); } catch (e) { /* ignore */ }
      return { error: `Apify: Failed to fetch dataset items - ${parsedError?.error?.message || datasetItemsResponse.statusText}. Check server logs.` };
    }

    const results: unknown[] = await datasetItemsResponse.json();

    if (!Array.isArray(results) || results.length === 0) {
      console.warn(`[APIFY ACTION WARNING] No data returned from Apify actor for ${igHandle}. Actor might have found no public data or profile is private/non-existent.`);
      return { error: `Apify: No data returned from actor for @${igHandle}. The profile might be private, non-existent, or the actor found no public information.` };
    }

    const parsedProfile = ApifyInstagramProfileSchema.safeParse(results[0]);

    if (!parsedProfile.success) {
      console.error(`[APIFY ACTION ERROR] Failed to parse profile data from Apify for ${igHandle}. Errors:`, parsedProfile.error.errors);
      console.error(`[APIFY ACTION ERROR] Raw data received from dataset for ${igHandle}:`, JSON.stringify(results[0]).substring(0,2000)); // Log more of the raw data
      return { error: `Apify: Failed to parse profile data for @${igHandle}. Actor output structure might have changed. Check server logs.` };
    }
    
    const profileData = parsedProfile.data;

    const followerCount = profileData.followersCount ?? 0;
    const postCount = profileData.postsCount ?? 0;
    const biography = profileData.biography ?? null;
    // Ensure latestPosts is an array and slice the first 3, or default to empty array
    const recentPosts = Array.isArray(profileData.latestPosts) ? profileData.latestPosts.slice(0, 3) : [];


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
        biography,
      },
    };

  } catch (error: any) {
    console.error(`[APIFY ACTION CRITICAL-ERROR @${igHandle}] Unexpected error during Apify fetchInstagramMetrics:`, error.message);
    console.error(`[APIFY ACTION CRITICAL-ERROR @${igHandle}] Error stack:`, error.stack);
    return { error: `Apify: An unexpected error occurred while fetching metrics for @${igHandle}: ${error.message || 'Unknown error'}. Check server logs.` };
  }
}

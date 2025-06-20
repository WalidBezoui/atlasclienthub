
export type ClientStatus = "Active" | "On Hold" | "Past";
export type Client = {
  id: string;
  userId: string; // Added for Firebase
  name: string;
  contactEmail: string;
  contactPhone?: string;
  companyName: string;
  status: ClientStatus;
  joinedDate: string; // ISO date string
  instagramHandle?: string;
  notes?: string;
  industry?: string; // Added for context
};

export const BUSINESS_TYPES = ["Creator / Influencer", "Personal Brand (coach, consultant)", "Local Business (salon, café, dentist)", "Online Business (ecom, services)", "Product Brand (fashion, cosmetics, etc.)", "Other"] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];

export const ACCOUNT_STAGES = ["New (0–100 followers)", "Growing (100–1k followers)", "Established (>1k followers)"] as const;
export type AccountStage = typeof ACCOUNT_STAGES[number];

export const PAIN_POINTS = ["Low engagement", "Inconsistent grid", "No clear CTA / no DMs", "Weak branding or visuals", "Outdated profile or bio", "Posting with no result", "Not converting followers to clients", "New account / just starting"] as const;
export type PainPoint = typeof PAIN_POINTS[number];

export const GOALS = ["Grow followers", "Attract ideal clients", "Boost engagement", "Clean up design / grid", "Build credibility", "Sell more / monetize IG"] as const;
export type Goal = typeof GOALS[number];

export const PROSPECT_LOCATIONS = ["Morocco", "Global", "Other"] as const;
export type ProspectLocation = typeof PROSPECT_LOCATIONS[number];

export const LEAD_SOURCES = ["IG comment", "Hashtag", "Explore", "DM Reply", "Referral", "Website", "LinkedIn", "Other"] as const;
export type LeadSource = typeof LEAD_SOURCES[number];

export const OFFER_INTERESTS = ["Requested Audit", "Asked for Pricing", "Wants Branding/Post Creation", "Wants IG Strategy", "No Reply"] as const;
export type OfferInterest = typeof OFFER_INTERESTS[number];

export const TONE_PREFERENCES = ["Friendly & casual", "Confident & professional", "Creative & bold"] as const;
export type TonePreference = typeof TONE_PREFERENCES[number];

// Refined Lead Stages for Outreach
export type OutreachLeadStage = "To Contact" | "Cold" | "Warm" | "Replied" | "Audit Sent" | "Closed - Won" | "Closed - Lost" | "Not Interested";
export const OUTREACH_LEAD_STAGE_OPTIONS: OutreachLeadStage[] = ["To Contact", "Cold", "Warm", "Replied", "Audit Sent", "Closed - Won", "Closed - Lost", "Not Interested"];


export type OutreachProspect = {
  id: string;
  userId: string; 
  
  // Section 1: Basic Prospect Info
  name: string; 
  instagramHandle?: string | null;
  businessName?: string | null;
  website?: string | null; 
  prospectLocation?: ProspectLocation | null;
  industry?: string | null; // General industry text input
  email?: string | null; // Kept email as optional
  visualStyle?: string | null; // New field from guide
  bioSummary?: string | null; // New field from guide

  // Section 2: Business Type
  businessType?: BusinessType | null;
  businessTypeOther?: string | null;

  // Engagement Metrics (manual or fetched)
  accountStage?: AccountStage | null;
  followerCount?: number | null;
  postCount?: number | null;
  avgLikes?: number | null;
  avgComments?: number | null;

  // Section 3: Current Problems / Pain Points
  painPoints?: PainPoint[] | null;

  // Section 4: Goals They Might Want
  goals?: Goal[] | null;

  // Section 5: Lead Warmth / Status
  status: OutreachLeadStage; // Using the refined lead stages
  source?: LeadSource | null;
  lastContacted?: string | null; // ISO date string
  followUpDate?: string | null; // ISO date string
  followUpNeeded?: boolean | null;

  // Section 6: Offer Interest
  offerInterest?: OfferInterest[] | null;

  // Section 7: Smart Question Prompts
  uniqueNote?: string | null;
  helpStatement?: string | null; 
  tonePreference?: TonePreference | null;
  
  notes?: string | null;
};


export type AuditStatus = "Requested" | "In Progress" | "Completed" | "Exported" | "Canceled" | "Needs Follow-up";
export const AUDIT_STATUS_OPTIONS: AuditStatus[] = ["Requested", "In Progress", "Completed", "Exported", "Canceled", "Needs Follow-up"];

export type InstagramAudit = {
  id: string;
  userId: string; 
  entityId?: string; 
  entityName?: string; 
  entityType?: 'Client' | 'Prospect';
  instagramHandle: string;
  status: AuditStatus;
  requestedDate: string; // ISO date string
  completedDate?: string; // ISO date string
  questionnaireResponses: string;
  auditReport?: string; 
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type MonthlyActivity = {
  month: string;
  clients: number;
  outreach: number;
  audits: number;
};

// For Script Snippets
export type ScriptSnippetType = "Cold Outreach DM" | "Warm Follow-Up DM" | "Audit Delivery Message" | "Closing Pitch" | "Caption Idea" | "Other";
export const SCRIPT_SNIPPET_TYPES: ScriptSnippetType[] = ["Cold Outreach DM", "Warm Follow-Up DM", "Audit Delivery Message", "Closing Pitch", "Caption Idea", "Other"];

export type ScriptSnippet = {
  id: string;
  userId: string;
  prospectId?: string | null; // Optional: link to a specific prospect
  prospectName?: string | null; // Optional: for display convenience
  scriptType: ScriptSnippetType;
  content: string;
  tags?: string[] | null; // Optional: for categorization
  createdAt: string; // ISO date string
};


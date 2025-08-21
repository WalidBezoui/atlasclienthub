

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

export const ACCOUNT_STAGES = ["New (0–1k followers)", "Growing (1k–10k followers)", "Established (>10k followers)"] as const;
export type AccountStage = typeof ACCOUNT_STAGES[number];

export const PAIN_POINTS = ["Low engagement", "Inconsistent grid", "No clear CTA / no DMs", "Weak branding or visuals", "Outdated profile or bio", "Posting with no result", "Not converting followers to clients", "New account / just starting"] as const;
export type PainPoint = typeof PAIN_POINTS[number];

export const GOALS = ["Grow followers", "Attract ideal clients", "Boost engagement", "Clean up design / grid", "Build credibility", "Sell more / monetize IG"] as const;
export type Goal = typeof GOALS[number];

export const PROSPECT_LOCATIONS = ["Morocco", "Global", "Other"] as const;
export type ProspectLocation = typeof PROSPECT_LOCATIONS[number];

export const LEAD_SOURCES = ["IG comment", "Hashtag", "Explore", "DM Reply", "Referral", "Website", "LinkedIn", "Discovery Tool", "Rapid Add", "Other"] as const;
export type LeadSource = typeof LEAD_SOURCES[number];

export const OFFER_INTERESTS = ["Requested Audit", "Asked for Pricing", "Wants Branding/Post Creation", "Wants IG Strategy", "No Reply"] as const;
export type OfferInterest = typeof OFFER_INTERESTS[number];

export const TONE_PREFERENCES = ["Friendly & casual", "Confident & professional", "Creative & bold"] as const;
export type TonePreference = typeof TONE_PREFERENCES[number];

// Refined Lead Stages for Outreach
export type OutreachLeadStage = "To Contact" | "Warming Up" | "Cold" | "Warm" | "Replied" | "Interested" | "Qualifier Sent" | "Ready for Audit" | "Audit Delivered" | "Quote Sent" | "Quote Delivered" | "Closed - Won" | "Closed - Lost" | "Not Interested";
export const OUTREACH_LEAD_STAGE_OPTIONS: OutreachLeadStage[] = ["To Contact", "Warming Up", "Cold", "Warm", "Replied", "Interested", "Qualifier Sent", "Ready for Audit", "Audit Delivered", "Quote Sent", "Quote Delivered", "Closed - Won", "Closed - Lost", "Not Interested"];

export const COMMENT_TYPES = ["Value-add", "Question", "Compliment", "Story-based"] as const;
export type CommentType = typeof COMMENT_TYPES[number];

export type GeneratedComment = {
  id: string; // Will use crypto.randomUUID() on the client
  postDescription: string;
  commentText: string;
  commentType: CommentType;
  generatedAt: string; // ISO date string
};

export type StatusHistoryItem = {
  status: OutreachLeadStage | 'Added';
  date: string; // ISO date string
};

export type WarmUpAction = 'Liked Posts' | 'Viewed Story' | 'Left Comment' | 'Replied to Story';

export type WarmUpActivity = {
  id: string; // Use a unique ID for each activity to allow deletion
  action: WarmUpAction;
  date: string; // ISO string
  nextActionDue?: string; // ISO string for when the next action should be scheduled
  note?: string; // e.g., the comment text
};

export type QualificationData = {
  isBusiness: 'yes' | 'no' | 'unknown';
  industry: string | null;
  hasInconsistentGrid: 'yes' | 'no' | 'unknown';
  hasLowEngagement: 'yes' | 'no' | 'unknown';
  hasNoClearCTA: 'yes' | 'no' | 'unknown';
  valueProposition: 'visuals' | 'leads' | 'engagement' | 'unknown';
  profitabilityPotential: 'low' | 'medium' | 'high' | 'unknown';
  contentPillarClarity: 'unclear' | 'somewhat-clear' | 'very-clear' | 'unknown';
  salesFunnelStrength: 'none' | 'weak' | 'strong' | 'unknown';
  postingConsistency: 'consistent' | 'inconsistent' | 'unknown';
};

export type OutreachProspect = {
  id: string;
  userId: string; 
  createdAt: string; // ISO date string for when prospect was added
  
  // Section 1: Basic Prospect Info
  name: string; 
  instagramHandle?: string | null;
  businessName?: string | null;
  website?: string | null; 
  prospectLocation?: ProspectLocation | null;
  industry?: string | null; // General industry text input
  email?: string | null; // Kept email as optional
  visualStyle?: string | null; 
  bioSummary?: string | null; 

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
  statusHistory?: StatusHistoryItem[]; // Tracks every status change
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
  
  // New CRM / Tracking Fields
  lastMessageSnippet?: string | null; // Last message from prospect
  lastScriptSent?: string | null; // Identifier for the last script we sent
  linkSent?: boolean | null; // e.g., a link to an audit was sent
  carouselOffered?: boolean | null; // e.g., a free sample was offered
  nextStep?: string | null; // Manually defined next action
  conversationHistory?: string | null;
  comments?: GeneratedComment[] | null;

  // Qualifier Question Fields
  qualifierQuestion?: string | null;
  qualifierSentAt?: string | null; // ISO date string
  qualifierReply?: string | null;

  notes?: string | null;
  
  // New Scoring & Qualification Fields
  leadScore?: number | null;
  qualificationData?: QualificationData | null;
  
  // New Warm-up Tracking Fields
  warmUp?: WarmUpActivity[];
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

export type AgendaItemType = 'FOLLOW_UP' | 'WARM_UP_ACTION' | 'SEND_QUALIFIER';

export type AgendaItem = {
  type: AgendaItemType;
  prospect: Pick<OutreachProspect, 'id' | 'name' | 'instagramHandle' | 'status'>;
  dueDate?: string;
  description?: string; // Add description for more context
};

export type MonthlyActivity = {
  month: string;
  clients: number;
  outreach: number;
  audits: number;
  prospects: number;
};

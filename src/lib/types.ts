
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
};

export const BUSINESS_TYPES = ["Creator / Influencer", "Personal Brand (coach, consultant)", "Local Business (salon, café, dentist)", "Online Business (ecom, services)", "Product Brand (fashion, cosmetics, etc.)", "Other"] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];

export const PAIN_POINTS = ["Low engagement", "Inconsistent grid", "No clear CTA / no DMs", "Weak branding or visuals", "Outdated profile or bio", "Posting with no result", "Not converting followers to clients", "New account / just starting"] as const;
export type PainPoint = typeof PAIN_POINTS[number];

export const GOALS = ["Grow followers", "Attract ideal clients", "Boost engagement", "Clean up design / grid", "Build credibility", "Sell more / monetize IG"] as const;
export type Goal = typeof GOALS[number];

export const LEAD_SOURCES = ["IG comment", "Hashtag", "Explore", "DM", "Referral", "Website", "LinkedIn", "Other"] as const;
export type LeadSource = typeof LEAD_SOURCES[number];

export const OFFER_INTERESTS = ["Interested in free audit", "Asked for pricing", "Wants branding/post creation", "Wants IG strategy", "Didn’t reply"] as const;
export type OfferInterest = typeof OFFER_INTERESTS[number];

export const TONE_PREFERENCES = ["Friendly & casual", "Confident & professional", "Creative & bold"] as const;
export type TonePreference = typeof TONE_PREFERENCES[number];

export type OutreachStatus = "To Contact" | "Contacted" | "Replied" | "Interested" | "Not Interested" | "Follow-up";
export const OUTREACH_STATUS_OPTIONS: OutreachStatus[] = ["To Contact", "Contacted", "Replied", "Interested", "Not Interested", "Follow-up"];

export type OutreachProspect = {
  id: string;
  userId: string; 
  name: string; // Prospect Name
  email: string; // Still keep email as an option
  instagramHandle?: string; // IG Handle

  // Section 1: Basic Prospect Info
  businessName?: string; // Business Name
  website?: string; // Website (optional)
  prospectLocation?: string; // Prospect Location (e.g., "Morocco", "Global", "Casablanca")
  
  // Section 2: Business Type
  businessType?: BusinessType;
  businessTypeOther?: string; // If businessType is "Other"

  // Section 3: Current Problems / Pain Points
  painPoints?: PainPoint[];

  // Section 4: Goals They Might Want
  goals?: Goal[];

  // Section 5: Lead Warmth (existing status field covers "Lead Stage" concept, lastContacted for "Contacted?")
  status: OutreachStatus; // Existing field, covers "Lead Stage" like Cold/Warm/Replied
  source?: LeadSource; // New field for lead source
  lastContacted?: string; // ISO date string
  followUpDate?: string; // ISO date string
  
  // Section 6: Offer Interest (If they’ve replied)
  offerInterest?: OfferInterest[];

  // Section 7: Smart Question Prompts
  uniqueNote?: string; // What’s unique or interesting about this brand?
  helpStatement?: string; // If you had to help them in 1 sentence...
  tonePreference?: TonePreference;
  
  notes?: string; // General notes (existing field)
  industry?: string; // Existing field, can be supplementary
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

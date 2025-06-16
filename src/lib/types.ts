
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

export type OutreachStatus = "To Contact" | "Contacted" | "Replied" | "Interested" | "Not Interested" | "Follow-up";
export type OutreachProspect = {
  id: string;
  userId: string; // Added for Firebase
  name: string;
  email: string;
  company?: string;
  status: OutreachStatus;
  lastContacted?: string; // ISO date string
  followUpDate?: string; // ISO date string
  notes?: string;
  instagramHandle?: string;
};

export type AuditStatus = "Requested" | "In Progress" | "Completed" | "Exported" | "Canceled" | "Needs Follow-up";
export const AUDIT_STATUS_OPTIONS: AuditStatus[] = ["Requested", "In Progress", "Completed", "Exported", "Canceled", "Needs Follow-up"];

export type InstagramAudit = {
  id: string;
  userId: string; // Added for Firebase
  entityId?: string; // Link to Client or OutreachProspect ID
  entityName?: string; // Name of Client or OutreachProspect
  entityType?: 'Client' | 'Prospect';
  instagramHandle: string;
  status: AuditStatus;
  requestedDate: string; // ISO date string
  completedDate?: string; // ISO date string
  questionnaireResponses: string;
  auditReport?: string; // The AI generated report
};

// Utility type for form values, helps with Partial updates
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Data for dashboard charts
export type MonthlyActivity = {
  month: string;
  clients: number;
  outreach: number;
  audits: number;
};


import { db, auth } from './config';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  Timestamp,
  orderBy,
  serverTimestamp,
  getCountFromServer
} from 'firebase/firestore';
import { subMonths, format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

import type { Client, InstagramAudit, OutreachProspect, MonthlyActivity } from '@/lib/types';

// Generic function to get current user ID
const getCurrentUserId = (): string | null => {
  return auth.currentUser ? auth.currentUser.uid : null;
};

// --- Client Services ---
const clientsCollection = collection(db, 'clients');

export const addClient = async (clientData: Omit<Client, 'id' | 'userId'>): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const dataForFirestore: any = {
    userId,
    name: clientData.name,
    contactEmail: clientData.contactEmail,
    companyName: clientData.companyName,
    status: clientData.status,
    joinedDate: Timestamp.fromDate(new Date(clientData.joinedDate)),
  };

  if (clientData.contactPhone) dataForFirestore.contactPhone = clientData.contactPhone;
  if (clientData.instagramHandle) dataForFirestore.instagramHandle = clientData.instagramHandle;
  if (clientData.notes) dataForFirestore.notes = clientData.notes;
  if (clientData.industry) dataForFirestore.industry = clientData.industry;
  
  const docRef = await addDoc(clientsCollection, dataForFirestore);
  return docRef.id;
};

export const getClients = async (): Promise<Client[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(clientsCollection, where('userId', '==', userId), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data, 
      joinedDate: (data.joinedDate as Timestamp).toDate().toISOString().split('T')[0] 
    } as Client;
  });
};

export const updateClient = async (id: string, clientData: Partial<Omit<Client, 'id' | 'userId'>>): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const clientDoc = doc(db, 'clients', id);
  
  const updateData:any = { ...clientData };
  if (clientData.joinedDate) {
    updateData.joinedDate = Timestamp.fromDate(new Date(clientData.joinedDate));
  }
  for (const key in updateData) {
    if (updateData[key] === undefined) {
      delete updateData[key]; 
    }
  }

  await updateDoc(clientDoc, updateData);
};

export const deleteClient = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  await deleteDoc(doc(db, 'clients', id));
};

// --- Outreach Prospect Services ---
const prospectsCollection = collection(db, 'prospects');

export const addProspect = async (prospectData: Omit<OutreachProspect, 'id' | 'userId'>): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  
  const dataForFirestore: any = { userId, ...prospectData };

  // Convert dates to Timestamps
  if (prospectData.lastContacted) dataForFirestore.lastContacted = Timestamp.fromDate(new Date(prospectData.lastContacted));
  if (prospectData.followUpDate) dataForFirestore.followUpDate = Timestamp.fromDate(new Date(prospectData.followUpDate));

  // Ensure numeric fields are numbers or undefined
  const numericFields: (keyof OutreachProspect)[] = ['followerCount', 'postCount', 'avgLikes', 'avgComments'];
  numericFields.forEach(field => {
    if (prospectData[field] !== undefined && prospectData[field] !== null && !isNaN(Number(prospectData[field]))) {
      dataForFirestore[field] = Number(prospectData[field]);
    } else {
      dataForFirestore[field] = undefined; // Or null, depending on how you want to store empty numbers
    }
  });
  
  // Ensure boolean fields are booleans
  if (prospectData.followUpNeeded === undefined) dataForFirestore.followUpNeeded = false;


  // Remove undefined fields to avoid Firestore errors, unless they are meant to be explicitly null
  for (const key in dataForFirestore) {
    if (dataForFirestore[key] === undefined) {
      // For array fields, store empty array if undefined
      if (key === 'painPoints' || key === 'goals' || key === 'offerInterest') {
          dataForFirestore[key] = [];
      } else if (key !== 'lastContacted' && key !== 'followUpDate' && !numericFields.includes(key as keyof OutreachProspect)) { 
          // Keep undefined for dates and numeric fields if they were intentionally set as such to be cleared
          delete dataForFirestore[key];
      }
    }
  }
  
  const docRef = await addDoc(prospectsCollection, dataForFirestore);
  return docRef.id;
};

export const getProspects = async (): Promise<OutreachProspect[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(prospectsCollection, where('userId', '==', userId), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const prospect: OutreachProspect = {
      id: docSnap.id,
      userId: data.userId,
      name: data.name,
      status: data.status || 'Cold', // Default status if not set
      // Basic Info
      instagramHandle: data.instagramHandle,
      businessName: data.businessName,
      website: data.website,
      prospectLocation: data.prospectLocation,
      industry: data.industry,
      email: data.email,
      // Business Type
      businessType: data.businessType,
      businessTypeOther: data.businessTypeOther,
      // Engagement Metrics
      accountStage: data.accountStage,
      followerCount: data.followerCount,
      postCount: data.postCount,
      avgLikes: data.avgLikes,
      avgComments: data.avgComments,
      // Pain Points & Goals
      painPoints: data.painPoints || [],
      goals: data.goals || [],
      // Lead Warmth
      source: data.source,
      lastContacted: data.lastContacted ? (data.lastContacted as Timestamp).toDate().toISOString().split('T')[0] : undefined,
      followUpDate: data.followUpDate ? (data.followUpDate as Timestamp).toDate().toISOString().split('T')[0] : undefined,
      followUpNeeded: data.followUpNeeded || false,
      // Offer Interest
      offerInterest: data.offerInterest || [],
      // Smart Questions
      uniqueNote: data.uniqueNote,
      helpStatement: data.helpStatement,
      tonePreference: data.tonePreference,
      // Notes
      notes: data.notes,
    };
    return prospect;
  });
};

export const updateProspect = async (id: string, prospectData: Partial<Omit<OutreachProspect, 'id' | 'userId'>>): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const prospectDoc = doc(db, 'prospects', id);
  
  const dataToUpdate: any = { ...prospectData };
  
  if (prospectData.lastContacted) {
    dataToUpdate.lastContacted = Timestamp.fromDate(new Date(prospectData.lastContacted));
  } else if (prospectData.hasOwnProperty('lastContacted') && prospectData.lastContacted === undefined) {
    dataToUpdate.lastContacted = null; 
  }

  if (prospectData.followUpDate) {
    dataToUpdate.followUpDate = Timestamp.fromDate(new Date(prospectData.followUpDate));
  } else if (prospectData.hasOwnProperty('followUpDate') && prospectData.followUpDate === undefined) {
    dataToUpdate.followUpDate = null;
  }
  
  const numericFields: (keyof OutreachProspect)[] = ['followerCount', 'postCount', 'avgLikes', 'avgComments'];
  numericFields.forEach(field => {
    if (prospectData.hasOwnProperty(field)) { // Check if field is explicitly in the update
      const value = prospectData[field];
      if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
        dataToUpdate[field] = null; // Set to null to clear in Firestore
      } else {
        dataToUpdate[field] = Number(value);
      }
    }
  });

  if (prospectData.hasOwnProperty('followUpNeeded')) {
    dataToUpdate.followUpNeeded = prospectData.followUpNeeded || false;
  }
  
  // Ensure array fields are handled correctly (can be set to empty array or updated)
  const arrayFields: (keyof OutreachProspect)[] = ['painPoints', 'goals', 'offerInterest'];
  arrayFields.forEach(field => {
    if (prospectData.hasOwnProperty(field)) {
      dataToUpdate[field] = prospectData[field] || [];
    }
  });

  // Remove any other fields that are explicitly undefined from the partial update
  // unless they are dates or numbers being cleared (handled above by setting to null)
  for (const key in dataToUpdate) {
    if (dataToUpdate[key] === undefined && 
        key !== 'lastContacted' && 
        key !== 'followUpDate' && 
        !numericFields.includes(key as keyof OutreachProspect) &&
        !arrayFields.includes(key as keyof OutreachProspect) &&
        key !== 'followUpNeeded'
        ) {
      delete dataToUpdate[key];
    }
  }
  await updateDoc(prospectDoc, dataToUpdate);
};

export const deleteProspect = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  await deleteDoc(doc(db, 'prospects', id));
};


// --- Instagram Audit Services ---
const auditsCollection = collection(db, 'audits');

export const addAudit = async (auditData: Omit<InstagramAudit, 'id' | 'userId' | 'requestedDate'> & { requestedDate?: string }): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  
  const dataForFirestore: any = {
    userId,
    instagramHandle: auditData.instagramHandle,
    status: auditData.status,
    questionnaireResponses: auditData.questionnaireResponses,
    requestedDate: auditData.requestedDate ? Timestamp.fromDate(new Date(auditData.requestedDate)) : serverTimestamp(),
  };

  if (auditData.entityName) dataForFirestore.entityName = auditData.entityName;
  if (auditData.entityType) dataForFirestore.entityType = auditData.entityType;
  if (auditData.auditReport) dataForFirestore.auditReport = auditData.auditReport;
  
  if (auditData.completedDate) {
    dataForFirestore.completedDate = Timestamp.fromDate(new Date(auditData.completedDate));
  }


  const docRef = await addDoc(auditsCollection, dataForFirestore);
  return docRef.id;
};

export const getAudits = async (): Promise<InstagramAudit[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(auditsCollection, where('userId', '==', userId), orderBy('requestedDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      requestedDate: (data.requestedDate as Timestamp).toDate().toISOString(),
      completedDate: data.completedDate ? (data.completedDate as Timestamp).toDate().toISOString() : undefined,
    } as InstagramAudit;
  });
};

export const getAuditById = async (id: string): Promise<InstagramAudit | null> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated or audit does not exist.');
  
  const auditDocRef = doc(db, 'audits', id);
  const auditSnap = await getDoc(auditDocRef);

  if (!auditSnap.exists() || auditSnap.data().userId !== userId) {
    return null;
  }
  const data = auditSnap.data();
  return {
    id: auditSnap.id,
    ...data,
    requestedDate: (data.requestedDate as Timestamp).toDate().toISOString(),
    completedDate: data.completedDate ? (data.completedDate as Timestamp).toDate().toISOString() : undefined,
  } as InstagramAudit;
};

export const updateAudit = async (id: string, auditData: Partial<Omit<InstagramAudit, 'id' | 'userId'>>): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const auditDoc = doc(db, 'audits', id);
  
  const dataToUpdate: any = { ...auditData };

  if (auditData.requestedDate) dataToUpdate.requestedDate = Timestamp.fromDate(new Date(auditData.requestedDate));
  
  if (auditData.hasOwnProperty('completedDate')) { 
    dataToUpdate.completedDate = auditData.completedDate ? Timestamp.fromDate(new Date(auditData.completedDate)) : null;
  }

  for (const key in dataToUpdate) {
    if (dataToUpdate[key] === undefined && key !== 'completedDate' && key !== 'auditReport' && key !== 'entityName' && key !== 'entityType') { 
      delete dataToUpdate[key];
    } else if (key === 'auditReport' && auditData.auditReport === undefined) {
        dataToUpdate.auditReport = null; // Allow clearing audit report
    } else if (key === 'entityName' && auditData.entityName === undefined) {
        dataToUpdate.entityName = null;
    } else if (key === 'entityType' && auditData.entityType === undefined) {
        dataToUpdate.entityType = null;
    }
  }
  await updateDoc(auditDoc, dataToUpdate);
};


export const deleteAudit = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  await deleteDoc(doc(db, 'audits', id));
};


// --- Dashboard Services ---
export const getDashboardOverview = async (): Promise<{
  activeClients: number;
  auditsInProgress: number;
  outreachSentThisMonth: number;
  newLeadsThisMonth: number; 
}> => {
  const userId = getCurrentUserId();
  if (!userId) return { activeClients: 0, auditsInProgress: 0, outreachSentThisMonth: 0, newLeadsThisMonth: 0 };

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const currentMonthStartTimestamp = Timestamp.fromDate(currentMonthStart);
  const currentMonthEndTimestamp = Timestamp.fromDate(currentMonthEnd);

  const clientsQuery = query(clientsCollection, where('userId', '==', userId), where('status', '==', 'Active'));
  const auditsQuery = query(auditsCollection, where('userId', '==', userId), where('status', '==', 'In Progress'));
  
  const outreachSentQuery = query(prospectsCollection, 
    where('userId', '==', userId), 
    where('lastContacted', '>=', currentMonthStartTimestamp),
    where('lastContacted', '<=', currentMonthEndTimestamp)
    // This counts any contact, not just "Sent" status. Consider refining if needed.
  );
  
  const newLeadsQuery = query(prospectsCollection, 
    where('userId', '==', userId), 
    where('status', '==', 'Interested'), // From old status type
    // Consider if "Replied" or other new OutreachLeadStage values count as new leads
    // For now, aligning with previous logic.
    // This query needs to be updated if "Interested" is not the primary signal for a new lead.
    where('lastContacted', '>=', currentMonthStartTimestamp), 
    where('lastContacted', '<=', currentMonthEndTimestamp)
  );


  const [
    clientsSnapshot, 
    auditsSnapshot, 
    outreachSentSnapshot, 
    newLeadsSnapshot
  ] = await Promise.all([
    getCountFromServer(clientsQuery),
    getCountFromServer(auditsQuery),
    getCountFromServer(outreachSentQuery),
    getCountFromServer(newLeadsQuery)
  ]);

  return {
    activeClients: clientsSnapshot.data().count,
    auditsInProgress: auditsSnapshot.data().count,
    outreachSentThisMonth: outreachSentSnapshot.data().count,
    newLeadsThisMonth: newLeadsSnapshot.data().count,
  };
};

export const getMonthlyActivityData = async (): Promise<MonthlyActivity[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const today = new Date();
  const activityData: MonthlyActivity[] = [];
  const monthLabels: string[] = [];

  for (let i = 5; i >= 0; i--) {
    monthLabels.push(format(subMonths(today, i), 'MMM'));
  }
  
  for (const monthName of monthLabels) {
    activityData.push({ month: monthName, clients: 0, outreach: 0, audits: 0 });
  }

  const sixMonthsAgo = startOfMonth(subMonths(today, 5));
  const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgo);
  const nowTimestamp = Timestamp.fromDate(endOfMonth(today)); 

  const clientsQuery = query(clientsCollection, 
    where('userId', '==', userId), 
    where('joinedDate', '>=', sixMonthsAgoTimestamp),
    where('joinedDate', '<=', nowTimestamp)
  );
  const outreachQuery = query(prospectsCollection, 
    where('userId', '==', userId), 
    where('lastContacted', '>=', sixMonthsAgoTimestamp),
    where('lastContacted', '<=', nowTimestamp) 
    // Counts any interaction in the month as "outreach activity" for the chart
  );
  const auditsQuery = query(auditsCollection, 
    where('userId', '==', userId), 
    where('requestedDate', '>=', sixMonthsAgoTimestamp),
    where('requestedDate', '<=', nowTimestamp)
  );

  const [clientsDocs, outreachDocs, auditsDocs] = await Promise.all([
    getDocs(clientsQuery),
    getDocs(outreachQuery),
    getDocs(auditsQuery),
  ]);

  clientsDocs.forEach(doc => {
    const joinedDate = (doc.data().joinedDate as Timestamp).toDate();
    const monthName = format(joinedDate, 'MMM');
    const monthData = activityData.find(m => m.month === monthName);
    if (monthData) monthData.clients++;
  });

  outreachDocs.forEach(doc => {
    const lastContacted = (doc.data().lastContacted as Timestamp)?.toDate();
    if (lastContacted) {
      const monthName = format(lastContacted, 'MMM');
      const monthData = activityData.find(m => m.month === monthName);
      if (monthData) monthData.outreach++;
    }
  });

  auditsDocs.forEach(doc => {
    const requestedDate = (doc.data().requestedDate as Timestamp).toDate();
    const monthName = format(requestedDate, 'MMM');
    const monthData = activityData.find(m => m.month === monthName);
    if (monthData) monthData.audits++;
  });
  
  const correctlyOrderedActivityData = monthLabels.map(label => {
    return activityData.find(ad => ad.month === label) || { month: label, clients: 0, outreach: 0, audits: 0 };
  });

  return correctlyOrderedActivityData;
};

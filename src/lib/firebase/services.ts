
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
  // Ensure undefined optional fields are handled or omitted by Firestore
  for (const key in updateData) {
    if (updateData[key] === undefined) {
      delete updateData[key]; // Or set to null if appropriate for your schema
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
  
  const dataForFirestore: any = { 
    userId,
    name: prospectData.name,
    email: prospectData.email,
    status: prospectData.status,
  };

  if (prospectData.company) dataForFirestore.company = prospectData.company;
  if (prospectData.industry) dataForFirestore.industry = prospectData.industry;
  if (prospectData.instagramHandle) dataForFirestore.instagramHandle = prospectData.instagramHandle;
  if (prospectData.notes) dataForFirestore.notes = prospectData.notes;
  if (prospectData.lastContacted) dataForFirestore.lastContacted = Timestamp.fromDate(new Date(prospectData.lastContacted));
  if (prospectData.followUpDate) dataForFirestore.followUpDate = Timestamp.fromDate(new Date(prospectData.followUpDate));

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
    return {
      id: docSnap.id,
      ...data,
      industry: data.industry || undefined, // Ensure industry is mapped
      lastContacted: data.lastContacted ? (data.lastContacted as Timestamp).toDate().toISOString().split('T')[0] : undefined,
      followUpDate: data.followUpDate ? (data.followUpDate as Timestamp).toDate().toISOString().split('T')[0] : undefined,
    } as OutreachProspect;
  });
};

export const updateProspect = async (id: string, prospectData: Partial<Omit<OutreachProspect, 'id' | 'userId'>>): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const prospectDoc = doc(db, 'prospects', id);
  
  const dataToUpdate: any = { ...prospectData };
  if (prospectData.lastContacted) dataToUpdate.lastContacted = Timestamp.fromDate(new Date(prospectData.lastContacted));
  if (prospectData.followUpDate) dataToUpdate.followUpDate = Timestamp.fromDate(new Date(prospectData.followUpDate));
  // No specific conversion for industry as it's a string
  
  for (const key in dataToUpdate) {
    if (dataToUpdate[key] === undefined) {
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

  // Add optional fields only if they have a value (not undefined)
  if (auditData.entityName) dataForFirestore.entityName = auditData.entityName;
  if (auditData.entityType) dataForFirestore.entityType = auditData.entityType;
  if (auditData.auditReport) dataForFirestore.auditReport = auditData.auditReport;
  
  // If completedDate is provided and valid, convert it to Timestamp.
  // If it's not provided (undefined), it won't be added to dataForFirestore, avoiding the error.
  if (auditData.completedDate) {
    dataForFirestore.completedDate = Timestamp.fromDate(new Date(auditData.completedDate));
  } else {
    // Explicitly ensure completedDate is not set to undefined if it's missing
    // This field is optional, so if not present, it shouldn't be in dataForFirestore
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
  
  // Handle completedDate specifically: allow setting to null or a new date
  if (auditData.hasOwnProperty('completedDate')) { // Check if completedDate key is explicitly in auditData
    dataToUpdate.completedDate = auditData.completedDate ? Timestamp.fromDate(new Date(auditData.completedDate)) : null;
  }

  // Remove any other fields that might be undefined from the partial update
  for (const key in dataToUpdate) {
    if (dataToUpdate[key] === undefined && key !== 'completedDate') { // Don't delete completedDate if it was intentionally set to null
      delete dataToUpdate[key];
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
  newLeadsThisMonth: number; // "Interested" prospects this month
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
  );
  
  const newLeadsQuery = query(prospectsCollection, 
    where('userId', '==', userId), 
    where('status', '==', 'Interested'),
    // Assuming status 'Interested' is set around the time of last contact or a follow-up action.
    // For a more precise "new leads this month", you might need a dedicated "becameLeadDate" field.
    // Using lastContacted as a proxy for recent activity leading to "Interested".
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


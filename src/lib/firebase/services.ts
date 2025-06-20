
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

import type { Client, InstagramAudit, OutreachProspect, MonthlyActivity, OutreachLeadStage, ScriptSnippet, ScriptSnippetType } from '@/lib/types';

// Generic function to get current user ID
const getCurrentUserId = (): string | null => {
  return auth.currentUser ? auth.currentUser.uid : null;
};

// --- Client Services ---
const clientsCollection = collection(db, 'clients');

export const addClient = async (clientData: Omit<Client, 'id' | 'userId'>): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const dataForFirestore = {
    userId,
    name: clientData.name,
    contactEmail: clientData.contactEmail,
    companyName: clientData.companyName,
    status: clientData.status,
    joinedDate: clientData.joinedDate && clientData.joinedDate.trim() !== '' ? Timestamp.fromDate(new Date(clientData.joinedDate)) : serverTimestamp(),
    contactPhone: clientData.contactPhone || null,
    instagramHandle: clientData.instagramHandle || null,
    notes: clientData.notes || null,
    industry: clientData.industry || null,
  };
  
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
    updateData.joinedDate = (clientData.joinedDate && clientData.joinedDate.trim() !== '') 
                            ? Timestamp.fromDate(new Date(clientData.joinedDate))
                            : null;
  }
  
  if (clientData.hasOwnProperty('contactPhone')) updateData.contactPhone = clientData.contactPhone || null;
  if (clientData.hasOwnProperty('instagramHandle')) updateData.instagramHandle = clientData.instagramHandle || null;
  if (clientData.hasOwnProperty('notes')) updateData.notes = clientData.notes || null;
  if (clientData.hasOwnProperty('industry')) updateData.industry = clientData.industry || null;


  for (const key in updateData) {
    if (updateData[key] === undefined && !clientData.hasOwnProperty(key as keyof Client)) { 
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
  
  const dataForFirestore: Partial<OutreachProspect> & { userId: string } = {
    userId,
    name: prospectData.name,
    status: prospectData.status || 'To Contact' as OutreachLeadStage,
    instagramHandle: prospectData.instagramHandle || null,
    businessName: prospectData.businessName || null,
    website: prospectData.website || null,
    prospectLocation: prospectData.prospectLocation || null,
    industry: prospectData.industry || null,
    email: prospectData.email || null,
    visualStyle: prospectData.visualStyle || null, 
    bioSummary: prospectData.bioSummary || null, 
    businessType: prospectData.businessType || null,
    businessTypeOther: prospectData.businessTypeOther || null,
    accountStage: prospectData.accountStage || null,
    
    followerCount: (prospectData.followerCount !== undefined && prospectData.followerCount !== null && !isNaN(Number(prospectData.followerCount))) ? Number(prospectData.followerCount) : null,
    postCount: (prospectData.postCount !== undefined && prospectData.postCount !== null && !isNaN(Number(prospectData.postCount))) ? Number(prospectData.postCount) : null,
    avgLikes: (prospectData.avgLikes !== undefined && prospectData.avgLikes !== null && !isNaN(Number(prospectData.avgLikes))) ? Number(prospectData.avgLikes) : null,
    avgComments: (prospectData.avgComments !== undefined && prospectData.avgComments !== null && !isNaN(Number(prospectData.avgComments))) ? Number(prospectData.avgComments) : null,

    painPoints: prospectData.painPoints || [],
    goals: prospectData.goals || [],
    
    source: prospectData.source || null,
    // Explicitly default lastContacted to serverTimestamp if not a valid provided date string
    lastContacted: (prospectData.lastContacted && prospectData.lastContacted.trim() !== '')
                   ? Timestamp.fromDate(new Date(prospectData.lastContacted))
                   : serverTimestamp(),
    // Explicitly default followUpDate to null if not a valid provided date string
    followUpDate: (prospectData.followUpDate && prospectData.followUpDate.trim() !== '')
                  ? Timestamp.fromDate(new Date(prospectData.followUpDate))
                  : null,
    followUpNeeded: prospectData.followUpNeeded || false,
    
    offerInterest: prospectData.offerInterest || [],
    
    uniqueNote: prospectData.uniqueNote || null,
    helpStatement: prospectData.helpStatement || null,
    tonePreference: prospectData.tonePreference || null,
    notes: prospectData.notes || null,
  };
  
  const docRef = await addDoc(prospectsCollection, dataForFirestore as any);
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
      status: data.status || 'To Contact', 
      instagramHandle: data.instagramHandle,
      businessName: data.businessName,
      website: data.website,
      prospectLocation: data.prospectLocation,
      industry: data.industry,
      email: data.email,
      visualStyle: data.visualStyle, 
      bioSummary: data.bioSummary, 
      businessType: data.businessType,
      businessTypeOther: data.businessTypeOther,
      accountStage: data.accountStage,
      followerCount: data.followerCount,
      postCount: data.postCount,
      avgLikes: data.avgLikes,
      avgComments: data.avgComments,
      painPoints: data.painPoints || [],
      goals: data.goals || [],
      source: data.source,
      lastContacted: data.lastContacted ? (data.lastContacted as Timestamp).toDate().toISOString().split('T')[0] : undefined,
      followUpDate: data.followUpDate ? (data.followUpDate as Timestamp).toDate().toISOString().split('T')[0] : undefined,
      followUpNeeded: data.followUpNeeded || false,
      offerInterest: data.offerInterest || [],
      uniqueNote: data.uniqueNote,
      helpStatement: data.helpStatement,
      tonePreference: data.tonePreference,
      notes: data.notes,
    };
    return prospect;
  });
};

export const updateProspect = async (id: string, prospectData: Partial<Omit<OutreachProspect, 'id' | 'userId'>>): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const prospectDoc = doc(db, 'prospects', id);
  
  const dataToUpdate: any = { ...prospectData }; // Start with all provided data
  
  // Handle date fields: convert valid strings to Timestamps, or set to null if cleared/invalid
  if (prospectData.hasOwnProperty('lastContacted')) {
    dataToUpdate.lastContacted = (prospectData.lastContacted && prospectData.lastContacted.trim() !== '')
                                 ? Timestamp.fromDate(new Date(prospectData.lastContacted))
                                 : null;
  }
  if (prospectData.hasOwnProperty('followUpDate')) {
    dataToUpdate.followUpDate = (prospectData.followUpDate && prospectData.followUpDate.trim() !== '')
                                ? Timestamp.fromDate(new Date(prospectData.followUpDate))
                                : null;
  }
  
  const numericFields: (keyof OutreachProspect)[] = ['followerCount', 'postCount', 'avgLikes', 'avgComments'];
  numericFields.forEach(field => {
    if (prospectData.hasOwnProperty(field)) {
      const value = prospectData[field];
      if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
        dataToUpdate[field] = null;
      } else {
        dataToUpdate[field] = Number(value);
      }
    }
  });

  if (prospectData.hasOwnProperty('followUpNeeded')) {
    dataToUpdate.followUpNeeded = prospectData.followUpNeeded || false;
  }
  
  const arrayFields: (keyof OutreachProspect)[] = ['painPoints', 'goals', 'offerInterest'];
  arrayFields.forEach(field => {
    if (prospectData.hasOwnProperty(field)) {
      dataToUpdate[field] = prospectData[field] || [];
    }
  });

  // Ensure other optional fields are set to null if explicitly cleared or empty,
  // but only if they were part of the prospectData payload.
  const optionalFieldsToNullifyIfPresent: (keyof OutreachProspect)[] = [
      'instagramHandle', 'businessName', 'website', 'prospectLocation', 'industry', 'email',
      'visualStyle', 'bioSummary', 
      'businessType', 'businessTypeOther', 'accountStage', 'source',
      'uniqueNote', 'helpStatement', 'tonePreference', 'notes'
  ];
  optionalFieldsToNullifyIfPresent.forEach(field => {
      if (prospectData.hasOwnProperty(field) && (prospectData[field] === undefined || prospectData[field] === '' || prospectData[field] === null) ) {
          dataToUpdate[field] = null;
      }
  });

  // Clean up any fields that were in prospectData but became undefined through processing
  // (This step might be redundant if the above handling is comprehensive)
  for (const key in dataToUpdate) {
    if (dataToUpdate[key] === undefined && prospectData.hasOwnProperty(key as keyof OutreachProspect) ) {
        // If a field was provided in prospectData but resulted in undefined in dataToUpdate, set to null
        // Example: if a numeric field was an invalid string, it might become NaN then null.
        // Or if a date was invalid and didn't convert.
        // This ensures we don't send undefined to Firestore.
         dataToUpdate[key] = null;
    }
  }
  // Remove fields from dataToUpdate that were not in prospectData (unless they are special like userId)
  // This is to ensure we only update what was intended.
  const finalUpdateData: Partial<OutreachProspect> = {};
  for (const key of Object.keys(dataToUpdate) as Array<keyof OutreachProspect>) {
      if(prospectData.hasOwnProperty(key)) {
          finalUpdateData[key] = dataToUpdate[key];
      }
  }


  if (Object.keys(finalUpdateData).length > 0) {
    await updateDoc(prospectDoc, finalUpdateData);
  }
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
  
  const dataForFirestore = {
    userId,
    instagramHandle: auditData.instagramHandle,
    status: auditData.status,
    questionnaireResponses: auditData.questionnaireResponses,
    requestedDate: (auditData.requestedDate && auditData.requestedDate.trim() !== '') 
                   ? Timestamp.fromDate(new Date(auditData.requestedDate)) 
                   : serverTimestamp(),
    entityName: auditData.entityName || null,
    entityType: auditData.entityType || null,
    auditReport: auditData.auditReport || null,
    completedDate: (auditData.completedDate && auditData.completedDate.trim() !== '') 
                   ? Timestamp.fromDate(new Date(auditData.completedDate)) 
                   : null,
  };
  
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
  
  const dataToUpdate: any = {};

  // Only include fields that are actually present in auditData
  for (const key in auditData) {
    if (auditData.hasOwnProperty(key as keyof InstagramAudit)) {
      (dataToUpdate as any)[key] = (auditData as any)[key];
    }
  }

  if (dataToUpdate.hasOwnProperty('requestedDate')) {
     dataToUpdate.requestedDate = (dataToUpdate.requestedDate && dataToUpdate.requestedDate.trim() !== '')
                                  ? Timestamp.fromDate(new Date(dataToUpdate.requestedDate))
                                  : null; // Or serverTimestamp() if update should set a new request date
  }
  
  if (dataToUpdate.hasOwnProperty('completedDate')) { 
    dataToUpdate.completedDate = (dataToUpdate.completedDate && dataToUpdate.completedDate.trim() !== '')
                                 ? Timestamp.fromDate(new Date(dataToUpdate.completedDate)) 
                                 : null;
  }
  
  if (dataToUpdate.hasOwnProperty('entityName')) dataToUpdate.entityName = dataToUpdate.entityName || null;
  if (dataToUpdate.hasOwnProperty('entityType')) dataToUpdate.entityType = dataToUpdate.entityType || null;
  if (dataToUpdate.hasOwnProperty('auditReport')) dataToUpdate.auditReport = dataToUpdate.auditReport || null;
  
  if (Object.keys(dataToUpdate).length > 0) {
    await updateDoc(auditDoc, dataToUpdate);
  }
};


export const deleteAudit = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  await deleteDoc(doc(db, 'audits', id));
};


// --- Script Snippet Services ---
const snippetsCollection = collection(db, 'snippets');

export const addSnippet = async (snippetData: Omit<ScriptSnippet, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const dataForFirestore = {
    userId,
    scriptType: snippetData.scriptType,
    content: snippetData.content,
    prospectId: snippetData.prospectId || null,
    prospectName: snippetData.prospectName || null,
    tags: snippetData.tags || [],
    createdAt: serverTimestamp(), 
  };

  const docRef = await addDoc(snippetsCollection, dataForFirestore);
  return docRef.id;
};

export const getSnippets = async (): Promise<ScriptSnippet[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(snippetsCollection, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    } as ScriptSnippet;
  });
};

export const deleteSnippet = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  await deleteDoc(doc(db, 'snippets', id));
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
  // Use startOfDay and endOfDay for more precise boundaries
  const currentMonthStartBoundary = startOfDay(startOfMonth(now));
  const currentMonthEndBoundary = endOfDay(endOfMonth(now));
  
  const currentMonthStartTimestamp = Timestamp.fromDate(currentMonthStartBoundary);
  const currentMonthEndTimestamp = Timestamp.fromDate(currentMonthEndBoundary);

  const clientsQuery = query(clientsCollection, where('userId', '==', userId), where('status', '==', 'Active'));
  const auditsQuery = query(auditsCollection, where('userId', '==', userId), where('status', '==', 'In Progress'));
  
  const outreachSentQuery = query(prospectsCollection, 
    where('userId', '==', userId), 
    where('lastContacted', '>=', currentMonthStartTimestamp),
    where('lastContacted', '<=', currentMonthEndTimestamp)
  );
  
  const newLeadsQuery = query(prospectsCollection, 
    where('userId', '==', userId), 
    where('status', '==', 'Interested'), // Assuming 'Interested' is a valid OutreachLeadStage for new leads
    where('lastContacted', '>=', currentMonthStartTimestamp), 
    where('lastContacted', '<=', currentMonthEndTimestamp)
  );


  const [
    clientsSnapshot, 
    auditsSnapshot, 
    outreachSentSnapshot, 
    newLeadsSnapshotResults // Renamed to avoid conflict with its use as argument
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
    newLeadsThisMonth: newLeadsSnapshotResults.data().count,
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

  const sixMonthsAgoBoundary = startOfDay(startOfMonth(subMonths(today, 5)));
  const nowBoundary = endOfDay(endOfMonth(today)); 

  const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgoBoundary);
  const nowTimestamp = Timestamp.fromDate(nowBoundary); 

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
    const joinedDate = (doc.data().joinedDate as Timestamp)?.toDate();
    if (joinedDate) {
      const monthName = format(joinedDate, 'MMM');
      const monthData = activityData.find(m => m.month === monthName);
      if (monthData) monthData.clients++;
    }
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
    const requestedDate = (doc.data().requestedDate as Timestamp)?.toDate();
    if (requestedDate) {
      const monthName = format(requestedDate, 'MMM');
      const monthData = activityData.find(m => m.month === monthName);
      if (monthData) monthData.audits++;
    }
  });
  
  const correctlyOrderedActivityData = monthLabels.map(label => {
    return activityData.find(ad => ad.month === label) || { month: label, clients: 0, outreach: 0, audits: 0 };
  });

  return correctlyOrderedActivityData;
};


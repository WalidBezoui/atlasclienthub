
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
    joinedDate: clientData.joinedDate ? Timestamp.fromDate(new Date(clientData.joinedDate)) : serverTimestamp(),
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
    updateData.joinedDate = Timestamp.fromDate(new Date(clientData.joinedDate));
  }
  // Ensure optional fields that might be cleared are set to null
  if (clientData.hasOwnProperty('contactPhone')) updateData.contactPhone = clientData.contactPhone || null;
  if (clientData.hasOwnProperty('instagramHandle')) updateData.instagramHandle = clientData.instagramHandle || null;
  if (clientData.hasOwnProperty('notes')) updateData.notes = clientData.notes || null;
  if (clientData.hasOwnProperty('industry')) updateData.industry = clientData.industry || null;


  for (const key in updateData) {
    if (updateData[key] === undefined && !clientData.hasOwnProperty(key)) { 
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
    lastContacted: prospectData.lastContacted ? Timestamp.fromDate(new Date(prospectData.lastContacted)) : null,
    followUpDate: prospectData.followUpDate ? Timestamp.fromDate(new Date(prospectData.followUpDate)) : null,
    followUpNeeded: prospectData.followUpNeeded || false,
    
    offerInterest: prospectData.offerInterest || [],
    
    uniqueNote: prospectData.uniqueNote || null,
    helpStatement: prospectData.helpStatement || null,
    tonePreference: prospectData.tonePreference || null,
    notes: prospectData.notes || null,
  };
  
  const docRef = await addDoc(prospectsCollection, dataForFirestore as any); // Cast to any to bypass strict Omit checks temporarily
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
  
  const dataToUpdate: any = { ...prospectData };
  
  if (prospectData.hasOwnProperty('lastContacted')) {
    dataToUpdate.lastContacted = prospectData.lastContacted ? Timestamp.fromDate(new Date(prospectData.lastContacted)) : null;
  }
  if (prospectData.hasOwnProperty('followUpDate')) {
    dataToUpdate.followUpDate = prospectData.followUpDate ? Timestamp.fromDate(new Date(prospectData.followUpDate)) : null;
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

  const optionalFieldsToNullify: (keyof OutreachProspect)[] = [
      'instagramHandle', 'businessName', 'website', 'prospectLocation', 'industry', 'email',
      'businessType', 'businessTypeOther', 'accountStage', 'source',
      'uniqueNote', 'helpStatement', 'tonePreference', 'notes'
  ];
  optionalFieldsToNullify.forEach(field => {
      if (prospectData.hasOwnProperty(field) && (prospectData[field] === undefined || prospectData[field] === '')) {
          dataToUpdate[field] = null;
      }
  });

  for (const key in dataToUpdate) {
    if (!prospectData.hasOwnProperty(key as keyof OutreachProspect)) {
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
  
  const dataForFirestore = {
    userId,
    instagramHandle: auditData.instagramHandle,
    status: auditData.status,
    questionnaireResponses: auditData.questionnaireResponses,
    requestedDate: auditData.requestedDate ? Timestamp.fromDate(new Date(auditData.requestedDate)) : serverTimestamp(),
    entityName: auditData.entityName || null,
    entityType: auditData.entityType || null,
    auditReport: auditData.auditReport || null,
    completedDate: auditData.completedDate ? Timestamp.fromDate(new Date(auditData.completedDate)) : null,
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
  
  const dataToUpdate: any = { ...auditData };

  if (auditData.hasOwnProperty('requestedDate') && auditData.requestedDate) {
     dataToUpdate.requestedDate = Timestamp.fromDate(new Date(auditData.requestedDate));
  }
  
  if (auditData.hasOwnProperty('completedDate')) { 
    dataToUpdate.completedDate = auditData.completedDate ? Timestamp.fromDate(new Date(auditData.completedDate)) : null;
  }
  
  if (auditData.hasOwnProperty('entityName')) dataToUpdate.entityName = auditData.entityName || null;
  if (auditData.hasOwnProperty('entityType')) dataToUpdate.entityType = auditData.entityType || null;
  if (auditData.hasOwnProperty('auditReport')) dataToUpdate.auditReport = auditData.auditReport || null;
  
   for (const key in dataToUpdate) {
    if (!auditData.hasOwnProperty(key as keyof InstagramAudit)) {
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


// --- Script Snippet Services ---
const snippetsCollection = collection(db, 'snippets');

export const addSnippet = async (snippetData: Omit<ScriptSnippet, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const dataForFirestore = {
    ...snippetData,
    userId,
    prospectId: snippetData.prospectId || null,
    prospectName: snippetData.prospectName || null,
    tags: snippetData.tags || [],
    createdAt: serverTimestamp(), // Use serverTimestamp for creation
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

// (Future enhancement: getSnippetsByProspectId, updateSnippet)


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
  );
  
  const newLeadsQuery = query(prospectsCollection, 
    where('userId', '==', userId), 
    where('status', '==', 'Interested'), 
    // Assuming 'Interested' status is set when they reply or show interest.
    // If 'dateMarkedAsInterested' field exists, use that instead of lastContacted for more accuracy.
    // For now, using lastContacted within the month as a proxy.
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
    getCountFromServer(newLeadsSnapshot)
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

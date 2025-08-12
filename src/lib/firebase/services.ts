

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
  getCountFromServer,
  limit,
  arrayUnion,
} from 'firebase/firestore';
import { subMonths, format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, isToday } from 'date-fns';

import type { Client, InstagramAudit, OutreachProspect, MonthlyActivity, OutreachLeadStage, AgendaItem, StatusHistoryItem, WarmUpActivity } from '@/lib/types';

// Generic function to get current user ID
const getCurrentUserId = (): string | null => {
  return auth.currentUser ? auth.currentUser.uid : null;
};

const convertTimestampToISO = (timestamp: any): string | undefined => {
    if (!timestamp) {
        return undefined;
    }
    // Check for Firebase Timestamp
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
    }
    // Check if it's already a Date object
    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }
    // Check if it's a string that can be parsed into a valid date
    if (typeof timestamp === 'string') {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }
    // Return undefined for any other type or invalid string
    return undefined;
};


// --- Client Services ---
const clientsCollection = collection(db, 'clients');

export const addClient = async (clientData: Omit<Client, 'id' | 'userId'>): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  let joinedDateTimestamp;
  if (typeof clientData.joinedDate === 'string' && clientData.joinedDate.trim() !== '') {
    const parsedDate = new Date(clientData.joinedDate);
    if (!isNaN(parsedDate.getTime())) {
        joinedDateTimestamp = Timestamp.fromDate(parsedDate);
    } else {
        console.warn(`Invalid date string for joinedDate: "${clientData.joinedDate}". Defaulting to serverTimestamp.`);
        joinedDateTimestamp = serverTimestamp();
    }
  } else {
      joinedDateTimestamp = serverTimestamp();
  }

  const dataForFirestore = {
    userId,
    name: clientData.name,
    contactEmail: clientData.contactEmail,
    companyName: clientData.companyName,
    status: clientData.status,
    joinedDate: joinedDateTimestamp,
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

  if (clientData.hasOwnProperty('joinedDate')) {
    if (typeof clientData.joinedDate === 'string' && clientData.joinedDate.trim() !== '') {
        const parsedDate = new Date(clientData.joinedDate);
        if (!isNaN(parsedDate.getTime())) {
            updateData.joinedDate = Timestamp.fromDate(parsedDate);
        } else {
            console.warn(`Invalid date string for joinedDate in update: "${clientData.joinedDate}". Setting to null.`);
            updateData.joinedDate = null;
        }
    } else {
        updateData.joinedDate = null; // Clear if empty string, null, or undefined
    }
  }
  
  if (clientData.hasOwnProperty('contactPhone')) updateData.contactPhone = clientData.contactPhone || null;
  if (clientData.hasOwnProperty('instagramHandle')) updateData.instagramHandle = clientData.instagramHandle || null;
  if (clientData.hasOwnProperty('notes')) updateData.notes = clientData.notes || null;
  if (clientData.hasOwnProperty('industry')) updateData.industry = clientData.industry || null;


  // Ensure only fields present in clientData are in updateData, or handle specific defaults
  const finalUpdateData: Partial<Client> = {};
  for (const key of Object.keys(updateData) as Array<keyof Client>) {
      if(clientData.hasOwnProperty(key)) { // Strict check: only update if key was in original payload
          (finalUpdateData as any)[key] = updateData[key];
      }
  }

  if (Object.keys(finalUpdateData).length > 0) {
    await updateDoc(clientDoc, finalUpdateData);
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  await deleteDoc(doc(db, 'clients', id));
};

// --- Outreach Prospect Services ---
const prospectsCollection = collection(db, 'prospects');

const processDateForFirestore = (dateInput: any, defaultToNow: boolean = false): Timestamp | null => {
    if (dateInput instanceof Timestamp) {
      return dateInput;
    }
    if (typeof dateInput === 'string' && dateInput.trim() !== '') {
        const parsedDate = new Date(dateInput);
        if (!isNaN(parsedDate.getTime())) {
            return Timestamp.fromDate(parsedDate);
        }
    }
    if (defaultToNow) return Timestamp.now();
    return null;
};


export const addProspect = async (prospectData: Omit<OutreachProspect, 'id' | 'userId'>): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  
  const dataForFirestore = {
    userId,
    createdAt: processDateForFirestore(prospectData.createdAt, true),
    name: prospectData.name,
    status: prospectData.status || 'To Contact' as OutreachLeadStage,
    statusHistory: [],
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
    lastContacted: processDateForFirestore(prospectData.lastContacted),
    followUpDate: processDateForFirestore(prospectData.followUpDate),
    followUpNeeded: prospectData.followUpNeeded || false,
    
    offerInterest: prospectData.offerInterest || [],
    
    uniqueNote: prospectData.uniqueNote || null,
    helpStatement: prospectData.helpStatement || null,
    tonePreference: prospectData.tonePreference || null,
    
    lastMessageSnippet: prospectData.lastMessageSnippet || null,
    lastScriptSent: prospectData.lastScriptSent || null,
    linkSent: prospectData.linkSent || false,
    carouselOffered: prospectData.carouselOffered || false,
    nextStep: prospectData.nextStep || null,
    conversationHistory: prospectData.conversationHistory || null,
    comments: prospectData.comments || [],
    warmUp: [],

    qualifierQuestion: prospectData.qualifierQuestion || null,
    qualifierSentAt: processDateForFirestore(prospectData.qualifierSentAt),
    qualifierReply: prospectData.qualifierReply || null,

    notes: prospectData.notes || null,
    leadScore: prospectData.leadScore ?? null,
    qualificationData: prospectData.qualificationData || null,
  };
  
  const docRef = await addDoc(prospectsCollection, dataForFirestore as any);
  return docRef.id;
};

export const getProspects = async (): Promise<OutreachProspect[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];
  // No longer sorting by createdAt on the server to ensure all docs are fetched
  const q = query(prospectsCollection, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const prospect: OutreachProspect = {
      id: docSnap.id,
      userId: data.userId,
      createdAt: convertTimestampToISO(data.createdAt) || new Date(0).toISOString(),
      name: data.name || '',
      status: data.status || 'To Contact',
      statusHistory: (data.statusHistory || []).map((item: any) => ({
          ...item,
          date: convertTimestampToISO(item.date) || new Date().toISOString(),
      })),
      instagramHandle: data.instagramHandle || null,
      businessName: data.businessName || null,
      website: data.website || null,
      prospectLocation: data.prospectLocation || null,
      industry: data.industry || null,
      email: data.email || null,
      visualStyle: data.visualStyle || null, 
      bioSummary: data.bioSummary || null, 
      businessType: data.businessType || null,
      businessTypeOther: data.businessTypeOther || null,
      accountStage: data.accountStage || null,
      followerCount: data.followerCount ?? null,
      postCount: data.postCount ?? null,
      avgLikes: data.avgLikes ?? null,
      avgComments: data.avgComments ?? null,
      painPoints: data.painPoints || [],
      goals: data.goals || [],
      source: data.source || null,
      lastContacted: convertTimestampToISO(data.lastContacted),
      followUpDate: convertTimestampToISO(data.followUpDate),
      followUpNeeded: data.followUpNeeded || false,
      offerInterest: data.offerInterest || [],
      uniqueNote: data.uniqueNote || null,
      helpStatement: data.helpStatement || null,
      tonePreference: data.tonePreference || null,
      lastMessageSnippet: data.lastMessageSnippet || null,
      lastScriptSent: data.lastScriptSent || null,
      linkSent: data.linkSent || false,
      carouselOffered: data.carouselOffered || false,
      nextStep: data.nextStep || null,
      conversationHistory: data.conversationHistory || null,
      comments: data.comments || null,
      warmUp: (data.warmUp || []).map((activity: any) => ({
        ...activity,
        date: convertTimestampToISO(activity.date) || new Date().toISOString(),
        nextActionDue: convertTimestampToISO(activity.nextActionDue),
      })),
      qualifierQuestion: data.qualifierQuestion || null,
      qualifierSentAt: convertTimestampToISO(data.qualifierSentAt),
      qualifierReply: data.qualifierReply || null,
      notes: data.notes || null,
      leadScore: data.leadScore ?? null,
      qualificationData: data.qualificationData || null,
    };
    return prospect;
  });
};

export const updateProspect = async (id: string, prospectData: Partial<Omit<OutreachProspect, 'id' | 'userId' | 'createdAt'>>): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const prospectDoc = doc(db, 'prospects', id);
  
  const dataToUpdate: any = { ...prospectData }; 
  
  if (prospectData.hasOwnProperty('lastContacted')) {
    dataToUpdate.lastContacted = processDateForFirestore(prospectData.lastContacted);
  }
  if (prospectData.hasOwnProperty('followUpDate')) {
    dataToUpdate.followUpDate = processDateForFirestore(prospectData.followUpDate);
  }
  if (prospectData.hasOwnProperty('qualifierSentAt')) {
    dataToUpdate.qualifierSentAt = processDateForFirestore(prospectData.qualifierSentAt);
  }
  if (prospectData.hasOwnProperty('statusHistory')) {
    const history = prospectData.statusHistory || [];
    if (Array.isArray(history)) {
      dataToUpdate.statusHistory = history.map(item => ({
        status: item.status,
        date: processDateForFirestore(item.date, true)
      }));
    } else {
      dataToUpdate.statusHistory = [];
    }
  }
  if (prospectData.hasOwnProperty('warmUp')) {
    const warmUp = prospectData.warmUp || [];
    if (Array.isArray(warmUp)) {
      dataToUpdate.warmUp = warmUp.map((item: WarmUpActivity) => ({
        ...item,
        date: processDateForFirestore(item.date, true),
        nextActionDue: processDateForFirestore(item.nextActionDue),
      }));
    } else {
      dataToUpdate.warmUp = [];
    }
  }

  
  const numericFields: (keyof OutreachProspect)[] = ['followerCount', 'postCount', 'avgLikes', 'avgComments', 'leadScore'];
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

  const booleanFields: (keyof OutreachProspect)[] = ['followUpNeeded', 'linkSent', 'carouselOffered'];
  booleanFields.forEach(field => {
    if (prospectData.hasOwnProperty(field)) {
      dataToUpdate[field] = prospectData[field] || false;
    }
  });
  
  const arrayFields: (keyof OutreachProspect)[] = ['painPoints', 'goals', 'offerInterest', 'comments'];
  arrayFields.forEach(field => {
    if (prospectData.hasOwnProperty(field)) {
      dataToUpdate[field] = prospectData[field] || [];
    }
  });

  const optionalStringFields: (keyof OutreachProspect)[] = [
      'name', 'instagramHandle', 'businessName', 'website', 'industry', 'email', 'visualStyle', 'bioSummary', 
      'businessTypeOther', 'uniqueNote', 'helpStatement', 'notes', 'lastMessageSnippet', 'lastScriptSent', 'nextStep', 'conversationHistory',
      'qualifierQuestion', 'qualifierReply'
  ];
  optionalStringFields.forEach(field => {
      if (prospectData.hasOwnProperty(field)) {
          dataToUpdate[field] = prospectData[field] || null;
      }
  });
  
  const optionalEnumFields: (keyof OutreachProspect)[] = ['prospectLocation', 'businessType', 'accountStage', 'source', 'tonePreference'];
  optionalEnumFields.forEach(field => {
      if (prospectData.hasOwnProperty(field)) {
          dataToUpdate[field] = prospectData[field] || null;
      }
  });
  
  if (prospectData.hasOwnProperty('qualificationData')) {
    dataToUpdate.qualificationData = prospectData.qualificationData || null;
  }
  
  const finalUpdateData: Partial<OutreachProspect> = {};
  for (const key of Object.keys(dataToUpdate) as Array<keyof OutreachProspect>) {
      if(prospectData.hasOwnProperty(key)) {
          (finalUpdateData as any)[key] = dataToUpdate[key];
      }
  }

  if (Object.keys(finalUpdateData).length > 0) {
    await updateDoc(prospectDoc, finalUpdateData);
  }
};


export const deleteProspect = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const prospectDocRef = doc(db, 'prospects', id);
  
  const prospectSnap = await getDoc(prospectDocRef);
  if (!prospectSnap.exists()) {
    console.warn(`Prospect with id ${id} not found for deletion, it may have already been deleted.`);
    return;
  }
  if (prospectSnap.data().userId !== userId) {
    throw new Error("You do not have permission to delete this prospect.");
  }

  await deleteDoc(prospectDocRef);
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
    requestedDate: processDateForFirestore(auditData.requestedDate, true),
    entityName: auditData.entityName || null,
    entityType: auditData.entityType || null,
    auditReport: auditData.auditReport || null,
    completedDate: processDateForFirestore(auditData.completedDate),
  };
  
  const docRef = await addDoc(auditsCollection, dataForFirestore as any);
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

  for (const key in auditData) {
    if (auditData.hasOwnProperty(key as keyof InstagramAudit)) {
      (dataToUpdate as any)[key] = (auditData as any)[key];
    }
  }

  if (dataToUpdate.hasOwnProperty('requestedDate')) {
     dataToUpdate.requestedDate = processDateForFirestore(dataToUpdate.requestedDate);
  }
  
  if (dataToUpdate.hasOwnProperty('completedDate')) { 
    dataToUpdate.completedDate = processDateForFirestore(dataToUpdate.completedDate);
  }
  
  if (dataToUpdate.hasOwnProperty('entityName')) dataToUpdate.entityName = dataToUpdate.entityName || null;
  if (dataToUpdate.hasOwnProperty('entityType')) dataToUpdate.entityType = dataToUpdate.entityType || null;
  if (dataToUpdate.hasOwnProperty('auditReport')) dataToUpdate.auditReport = dataToUpdate.auditReport || null;

  const finalUpdateData: Partial<InstagramAudit> = {};
   for (const key of Object.keys(dataToUpdate) as Array<keyof InstagramAudit>) {
      if(auditData.hasOwnProperty(key)) {
          (finalUpdateData as any)[key] = dataToUpdate[key];
      }
  }
  
  if (Object.keys(finalUpdateData).length > 0) {
    await updateDoc(auditDoc, finalUpdateData);
  }
};


export const deleteAudit = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  await deleteDoc(doc(db, 'audits', id));
};


// --- Dashboard Services ---
export const getDashboardOverview = async (): Promise<{
  activeClients: number;
  prospectsInWarmUp: number;
  followUpsDue: number;
  auditsReady: number;
}> => {
  const userId = getCurrentUserId();
  if (!userId) return { activeClients: 0, prospectsInWarmUp: 0, followUpsDue: 0, auditsReady: 0 };

  // Queries
  const activeClientsQuery = query(clientsCollection, where('userId', '==', userId), where('status', '==', 'Active'));
  const warmingUpQuery = query(prospectsCollection, where('userId', '==', userId), where('status', '==', 'Warming Up'));
  const followUpQuery = query(prospectsCollection, where('userId', '==', userId), where('followUpNeeded', '==', true));
  const readyForAuditQuery = query(prospectsCollection, where('userId', '==', userId), where('status', '==', 'Ready for Audit'));

  const [
    clientsSnapshot,
    warmingUpSnapshot,
    followUpSnapshot,
    auditsReadySnapshot,
  ] = await Promise.all([
    getCountFromServer(activeClientsQuery),
    getCountFromServer(warmingUpQuery),
    getCountFromServer(followUpQuery),
    getCountFromServer(readyForAuditQuery),
  ]);

  return {
    activeClients: clientsSnapshot.data().count,
    prospectsInWarmUp: warmingUpSnapshot.data().count,
    followUpsDue: followUpSnapshot.data().count,
    auditsReady: auditsReadySnapshot.data().count,
  };
};

export const getDailyAgendaItems = async (): Promise<AgendaItem[]> => {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const now = new Date();
    const todayEnd = endOfDay(now);
    let agendaItems: AgendaItem[] = [];
    const processedIds = new Set<string>();
    const AGENDA_LIMIT = 5;

    // Priority 1: Overdue or due today follow-ups
    const followUpQuery = query(
        prospectsCollection,
        where('userId', '==', userId),
        where('followUpNeeded', '==', true),
        orderBy('followUpDate', 'asc'),
        limit(AGENDA_LIMIT)
    );
    
    // Priority 2: Prospects needing a qualifier question
    const needsQualifierQuery = query(
        prospectsCollection,
        where('userId', '==', userId),
        where('status', 'in', ['Interested', 'Replied']),
        limit(AGENDA_LIMIT)
    );

    // Priority 3: Prospects in "Warming Up" stage with next action due
    const warmingUpQuery = query(
        prospectsCollection,
        where('userId', '==', userId),
        where('status', '==', 'Warming Up'),
        limit(AGENDA_LIMIT * 2) // Fetch more to filter client-side
    );

    const [followUpSnapshot, needsQualifierSnapshot, warmingUpSnapshot] = await Promise.all([
        getDocs(followUpQuery),
        getDocs(needsQualifierQuery),
        getDocs(warmingUpQuery),
    ]);

    // Process in order of priority
    followUpSnapshot.forEach(doc => {
        if (agendaItems.length >= AGENDA_LIMIT || processedIds.has(doc.id)) return;
        const prospect = doc.data() as OutreachProspect;
        const dueDate = prospect.followUpDate ? new Date(prospect.followUpDate) : new Date();
        if (dueDate <= todayEnd) {
            agendaItems.push({
                type: 'FOLLOW_UP',
                prospect: { id: doc.id, name: prospect.name, instagramHandle: prospect.instagramHandle, status: prospect.status },
                dueDate: prospect.followUpDate,
            });
            processedIds.add(doc.id);
        }
    });

    needsQualifierSnapshot.forEach(doc => {
        if (agendaItems.length >= AGENDA_LIMIT || processedIds.has(doc.id)) return;
        const prospect = doc.data() as OutreachProspect;
        if (!prospect.qualifierQuestion) {
            agendaItems.push({
                type: 'SEND_QUALIFIER',
                prospect: { id: doc.id, name: prospect.name, instagramHandle: prospect.instagramHandle, status: prospect.status },
                description: "Prospect is interested. Send a qualifier question."
            });
            processedIds.add(doc.id);
        }
    });

    warmingUpSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as OutreachProspect }))
        .sort((a, b) => { // Sort by the most recent nextActionDue date
            const aDate = a.warmUp?.[a.warmUp.length - 1]?.nextActionDue;
            const bDate = b.warmUp?.[b.warmUp.length - 1]?.nextActionDue;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return new Date(aDate).getTime() - new Date(bDate).getTime();
        })
        .forEach(prospect => {
            if (agendaItems.length >= AGENDA_LIMIT || processedIds.has(prospect.id)) return;
            
            const lastActivity = prospect.warmUp?.[prospect.warmUp.length - 1];
            if (!lastActivity?.nextActionDue || new Date(lastActivity.nextActionDue) > todayEnd) {
                return; // Skip if no next action is due or it's in the future
            }

            const actions = new Set(prospect.warmUp?.map(a => a.action));
            let nextAction = "Like Posts";
            if (actions.has('Liked Posts')) nextAction = "View Story";
            if (actions.has('Viewed Story')) nextAction = "Left Comment";
            if (actions.has('Left Comment')) nextAction = "Replied to Story";
            if (actions.has('Replied to Story')) return; // All warm up actions complete
            
            agendaItems.push({
                type: 'WARM_UP_ACTION',
                prospect: { id: prospect.id, name: prospect.name, instagramHandle: prospect.instagramHandle, status: prospect.status },
                description: `Next action: ${nextAction}`,
                dueDate: lastActivity.nextActionDue,
            });
            processedIds.add(doc.id);
        });

    return agendaItems;
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
    activityData.push({ month: monthName, clients: 0, outreach: 0, audits: 0, prospects: 0 });
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
  const prospectsQuery = query(prospectsCollection,
    where('userId', '==', userId),
    where('createdAt', '>=', sixMonthsAgoTimestamp),
    where('createdAt', '<=', nowTimestamp)
  );

  const [clientsDocs, outreachDocs, auditsDocs, prospectsDocs] = await Promise.all([
    getDocs(clientsQuery),
    getDocs(outreachQuery),
    getDocs(auditsQuery),
    getDocs(prospectsQuery),
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
      if (monthData) {
          monthData.outreach++;
      }
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

  prospectsDocs.forEach(doc => {
    const createdAt = (doc.data().createdAt as Timestamp)?.toDate();
    if (createdAt) {
      const monthName = format(createdAt, 'MMM');
      const monthData = activityData.find(m => m.month === monthName);
      if (monthData && monthData.prospects !== undefined) monthData.prospects++;
    }
  });
  
  const correctlyOrderedActivityData = monthLabels.map(label => {
    return activityData.find(ad => ad.month === label) || { month: label, clients: 0, outreach: 0, audits: 0, prospects: 0 };
  });
  return correctlyOrderedActivityData;
};

export const updateMissingProspectTimestamps = async (): Promise<number> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const q = query(prospectsCollection, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const updatePromises: Promise<void>[] = [];
    let updatedCount = 0;

    const fallbackDate = Timestamp.fromDate(new Date('2023-01-01'));

    snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.createdAt) {
            const docRef = doc(db, 'prospects', docSnap.id);
            updatePromises.push(updateDoc(docRef, { createdAt: fallbackDate }));
            updatedCount++;
        }
    });

    if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
    }

    return updatedCount;
};

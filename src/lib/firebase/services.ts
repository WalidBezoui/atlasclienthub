
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
  limit,
  startOfMonth,
  endOfMonth,
  serverTimestamp
} from 'firebase/firestore';

import type { Client, InstagramAudit, OutreachProspect, ClientStatus, AuditStatus, OutreachStatus, MonthlyActivity } from '@/lib/types';

// Generic function to get current user ID
const getCurrentUserId = (): string | null => {
  return auth.currentUser ? auth.currentUser.uid : null;
};

// --- Client Services ---
const clientsCollection = collection(db, 'clients');

export const addClient = async (clientData: Omit<Client, 'id' | 'userId'>): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const docRef = await addDoc(clientsCollection, { ...clientData, userId, joinedDate: Timestamp.fromDate(new Date(clientData.joinedDate)) });
  return docRef.id;
};

export const getClients = async (): Promise<Client[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(clientsCollection, where('userId', '==', userId), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), joinedDate: (doc.data().joinedDate as Timestamp).toDate().toISOString().split('T')[0] } as Client));
};

export const updateClient = async (id: string, clientData: Partial<Omit<Client, 'id' | 'userId'>>): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  // Potentially add a check here to ensure the client belongs to the user before updating
  const clientDoc = doc(db, 'clients', id);
   const updateData = { ...clientData };
  if (clientData.joinedDate) {
    (updateData as any).joinedDate = Timestamp.fromDate(new Date(clientData.joinedDate));
  }
  await updateDoc(clientDoc, updateData);
};

export const deleteClient = async (id: string): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  // Potentially add a check here
  await deleteDoc(doc(db, 'clients', id));
};

// --- Outreach Prospect Services ---
const prospectsCollection = collection(db, 'prospects');

export const addProspect = async (prospectData: Omit<OutreachProspect, 'id' | 'userId'>): Promise<string> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  const dataToSave: any = { ...prospectData, userId };
  if (prospectData.lastContacted) dataToSave.lastContacted = Timestamp.fromDate(new Date(prospectData.lastContacted));
  if (prospectData.followUpDate) dataToSave.followUpDate = Timestamp.fromDate(new Date(prospectData.followUpDate));

  const docRef = await addDoc(prospectsCollection, dataToSave);
  return docRef.id;
};

export const getProspects = async (): Promise<OutreachProspect[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(prospectsCollection, where('userId', '==', userId), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
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
  
  const dataToSave = {
    ...auditData,
    userId,
    requestedDate: auditData.requestedDate ? Timestamp.fromDate(new Date(auditData.requestedDate)) : serverTimestamp(),
    completedDate: auditData.completedDate ? Timestamp.fromDate(new Date(auditData.completedDate)) : undefined,
  };
  const docRef = await addDoc(auditsCollection, dataToSave);
  return docRef.id;
};

export const getAudits = async (): Promise<InstagramAudit[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(auditsCollection, where('userId', '==', userId), orderBy('requestedDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
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
    return null; // Or throw an error for unauthorized access
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
  // Add check to ensure user owns this audit before updating
  const dataToUpdate: any = { ...auditData };
  if (auditData.requestedDate) dataToUpdate.requestedDate = Timestamp.fromDate(new Date(auditData.requestedDate));
  if (auditData.completedDate) dataToUpdate.completedDate = Timestamp.fromDate(new Date(auditData.completedDate));
  else if (auditData.completedDate === null) dataToUpdate.completedDate = null; // Allow clearing completedDate

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
  outreachSentThisMonth: number; // This one is tricky without tracking individual outreach actions.
  newLeadsThisMonth: number; // Assuming "Interested" prospects are leads.
}> => {
  const userId = getCurrentUserId();
  if (!userId) return { activeClients: 0, auditsInProgress: 0, outreachSentThisMonth: 0, newLeadsThisMonth: 0 };

  const clientsQuery = query(clientsCollection, where('userId', '==', userId), where('status', '==', 'Active'));
  const auditsQuery = query(auditsCollection, where('userId', '==', userId), where('status', '==', 'In Progress'));
  
  // For outreach and leads, we need to consider dates. This is a simplified version.
  // A more accurate "outreachSentThisMonth" would require storing each outreach event.
  // "newLeadsThisMonth" assumes prospects marked "Interested" recently.
  // For simplicity, we'll count total "Interested" prospects.
  const prospectsQuery = query(prospectsCollection, where('userId', '==', userId), where('status', '==', 'Interested'));


  const [clientsSnapshot, auditsSnapshot, prospectsSnapshot] = await Promise.all([
    getDocs(clientsQuery),
    getDocs(auditsQuery),
    getDocs(prospectsQuery),
  ]);

  // outreachSentThisMonth is a placeholder, as we don't have detailed tracking for sent outreach.
  // For now, we can count prospects contacted this month if `lastContacted` is tracked.
  // This is a simplified version for "outreach sent this month".
  const allProspectsQuery = query(prospectsCollection, where('userId', '==', userId));
  const allProspectsSnapshot = await getDocs(allProspectsQuery);
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const outreachThisMonth = allProspectsSnapshot.docs.filter(docSnap => {
      const prospect = docSnap.data() as OutreachProspect;
      return prospect.lastContacted && new Date(prospect.lastContacted) >= firstDayOfMonth;
  }).length;


  return {
    activeClients: clientsSnapshot.size,
    auditsInProgress: auditsSnapshot.size,
    outreachSentThisMonth: outreachThisMonth, // Placeholder
    newLeadsThisMonth: prospectsSnapshot.size, // Simplified: total interested prospects
  };
};

export const getMonthlyActivityData = async (): Promise<MonthlyActivity[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const activity: MonthlyActivity[] = months.slice(0,6).map(month => ({ month, clients: 0, outreach: 0, audits: 0 })); // Display last 6 months by default

  const clientDocs = await getDocs(query(clientsCollection, where('userId', '==', userId)));
  const prospectDocs = await getDocs(query(prospectsCollection, where('userId', '==', userId)));
  const auditDocs = await getDocs(query(auditsCollection, where('userId', '==', userId)));

  // This is a simplified aggregation. For accurate monthly counts,
  // you'd typically query by date ranges for each month.
  // Here, we just distribute the total counts for demonstration.
  // A real implementation would involve more complex date-based queries or pre-aggregated data.

  clientDocs.forEach(docSnap => {
    const client = docSnap.data() as Client;
    const joinedDate = (client.joinedDate as unknown as Timestamp).toDate();
    if (joinedDate.getFullYear() === currentYear) {
      const monthIndex = joinedDate.getMonth();
      if (activity[monthIndex]) activity[monthIndex].clients++;
    }
  });
  
  prospectDocs.forEach(docSnap => {
    const prospect = docSnap.data() as OutreachProspect;
    if (prospect.lastContacted) {
        const contactDate = new Date(prospect.lastContacted);
         if (contactDate.getFullYear() === currentYear) {
            const monthIndex = contactDate.getMonth();
            if (activity[monthIndex]) activity[monthIndex].outreach++;
         }
    }
  });

  auditDocs.forEach(docSnap => {
    const audit = docSnap.data() as InstagramAudit;
    const requestedDate = (audit.requestedDate as unknown as Timestamp).toDate();
     if (requestedDate.getFullYear() === currentYear) {
        const monthIndex = requestedDate.getMonth();
        if (activity[monthIndex]) activity[monthIndex].audits++;
     }
  });
  
  // Dummy data if actual data is sparse for the chart
  const defaultChartData = [
    { month: "Jan", clients: 0, outreach: 0, audits: 0 },
    { month: "Feb", clients: 0, outreach: 0, audits: 0 },
    { month: "Mar", clients: 0, outreach: 0, audits: 0 },
    { month: "Apr", clients: 0, outreach: 0, audits: 0 },
    { month: "May", clients: 0, outreach: 0, audits: 0 },
    { month: "Jun", clients: 0, outreach: 0, audits: 0 },
  ];

  const populatedActivity = activity.map((item, index) => {
      // Ensure some data for charting demo purposes
      return {
          month: item.month,
          clients: item.clients > 0 ? item.clients : (index + 1) * 2, // dummy progression
          outreach: item.outreach > 0 ? item.outreach : (index + 1) * 30, // dummy progression
          audits: item.audits > 0 ? item.audits : (index + 1) * 1, // dummy progression
      }
  }).slice(0,6); // Take first 6 months

  return populatedActivity.length > 0 ? populatedActivity : defaultChartData;
};


// This file is for server-side Firestore functions ONLY.
// Do NOT add 'use client' to this file.

import { collection, writeBatch, doc, getDocs, getDoc, query, where, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';


// UTILITY
function safeFormatDate(date: any, formatString: string = "yyyy-MM-dd"): string {
    if (!date) return '';
    try {
        if (date.toDate) { // Firestore Timestamp
            return format(date.toDate(), formatString);
        }
        const d = new Date(date); // String or number
        if (isNaN(d.getTime())) return '';
        return format(d, formatString);
    } catch (error) {
        console.warn(`Could not format date: ${date}`, error);
        return '';
    }
}

async function getBusinessProfileForServer(userId: string): Promise<any | null> {
    if (!userId) return null;
    const docRef = doc(db, 'users', userId, 'profile', 'business');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...docSnap.data() } : null;
}


export async function getInvoiceByIdForServer(userId: string, invoiceId: string): Promise<any | null> {
    if (!userId) return null;
    try {
        const docRef = doc(db, 'users', userId, 'invoices', invoiceId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const invoiceData = { id: docSnap.id, ...docSnap.data() };
            const businessProfile = await getBusinessProfileForServer(userId);
            const formattedInvoiceData = {
                ...invoiceData,
                issueDate: safeFormatDate(invoiceData.issueDate, "PP"),
                dueDate: safeFormatDate(invoiceData.dueDate, "PP")
            };
            return { ...formattedInvoiceData, businessProfile };
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error getting document on server:", error);
        return null;
    }
}

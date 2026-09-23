
'use client';

import { collection, getDocs, query, orderBy, limit, runTransaction, doc, getDoc, addDoc, where, setDoc, writeBatch, deleteDoc, Query, startAfter, documentId, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { format, isValid, parseISO } from "date-fns";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


// =================================================================================================
// UTILITY
// =================================================================================================

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
        return '';
    }
}

function safeISODate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
        return new Date().toISOString();
    }
}


// =================================================================================================
// GENERIC & GETTERS
// =================================================================================================

async function getCollectionData(userId: string, collectionName: string, q?: Query) {
    if (!userId) {
        console.warn(`User not authenticated, cannot fetch ${collectionName}.`);
        return [];
    }

    try {
        const queryToExecute = q || query(collection(db, 'users', userId, collectionName));
        const querySnapshot = await getDocs(queryToExecute);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        return [];
    }
}


export async function getCustomers(userId: string): Promise<any[]> {
    const q = query(collection(db, 'users', userId, 'customers'), orderBy("name", "asc"));
    return getCollectionData(userId, 'customers', q);
}

export async function getInvoices(userId: string): Promise<any[]> {
    const q = query(collection(db, 'users', userId, 'invoices'), orderBy("issueDate", "desc"));
    const data = await getCollectionData(userId, 'invoices', q);
    return data.map(invoice => ({
        ...invoice,
        issueDate: safeFormatDate(invoice.issueDate),
        dueDate: safeFormatDate(invoice.dueDate),
        amount: Number(invoice.amount) || 0,
        amountPaid: Number(invoice.amountPaid) || 0,
        paymentMethod: invoice.paymentMethod || invoice.paymentMode || 'Credit',
    }));
}

export async function getInvoiceById(userId: string, invoiceId: string): Promise<any | null> {
    if (!userId) return null;
    try {
        const docRef = doc(db, 'users', userId, 'invoices', invoiceId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const invoiceData = { id: docSnap.id, ...docSnap.data() };
            const businessProfile = await getBusinessProfile(userId);
            const formattedInvoiceData = {
                ...invoiceData,
                issueDate: safeFormatDate(invoiceData.issueDate, "PP"),
                dueDate: safeFormatDate(invoiceData.dueDate, "PP"),
                paymentMethod: invoiceData.paymentMethod || invoiceData.paymentMode || 'Credit',
            };
            return { ...formattedInvoiceData, businessProfile };
        }
        return null;
    } catch (error) {
        console.error("Error getting document:", error);
        return null;
    }
}


export async function getExpenses(userId: string): Promise<any[]> {
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const q = query(expensesRef, orderBy("date", "desc"));
    const data = await getCollectionData(userId, 'expenses', q);
    return data.map(expense => ({
        ...expense,
        date: safeFormatDate(expense.date),
        amount: Number(expense.amount) || 0
    }));
}

export async function getExpenseById(userId: string, expenseId: string): Promise<any | null> {
    if (!userId) return null;
    const docRef = doc(db, 'users', userId, 'expenses', expenseId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
    };
}


export async function getInventory(userId: string): Promise<any[]> {
    const q = query(collection(db, 'users', userId, 'inventory'), orderBy("name", "asc"));
    return getCollectionData(userId, 'inventory', q);
}

export async function getInventoryItemById(userId: string, itemId: string): Promise<any | null> {
    if (!userId) return null;
    const docRef = doc(db, 'users', userId, 'inventory', itemId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function getInventoryHistory(userId: string): Promise<any[]> {
    if (!userId) return [];
    const historyRef = collection(db, 'users', userId, 'inventoryHistory');
    const q = query(historyRef, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: safeFormatDate(doc.data().date, "yyyy-MM-dd"),
    }));
}

export async function getSales(userId: string): Promise<any[]> {
    return getCollectionData(userId, 'sales');
}


export async function getBusinessProfile(userId: string): Promise<any | null> {
    if (!userId) return null;
    const docRef = doc(db, 'users', userId, 'profile', 'business');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...docSnap.data() } : null;
}


// =================================================================================================
// SETTERS / WRITE OPERATIONS
// =================================================================================================

export async function addInventoryItem(userId: string, data: { name: string, quantity: number, unitCost: number, category?: string, supplier?: string, reorderLevel?: number, sku?: string }) {
    if (!userId) throw new Error("User not authenticated.");
    
    const sku = data.sku || `${data.name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const inventoryCollectionRef = collection(db, 'users', userId, 'inventory');
    const payload = {
        ...data,
        sku,
        userId: userId, 
        createdAt: Timestamp.fromDate(new Date()),
    };

    try {
        await addDoc(inventoryCollectionRef, payload);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: inventoryCollectionRef.path,
                operation: 'create',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}

export async function updateInventoryItem(userId: string, itemId: string, data: { name: string, quantity: number, unitCost: number, category?: string, supplier?: string, reorderLevel?: number, sku?: string }) {
    if (!userId) throw new Error("User not authenticated.");
    if (!itemId) throw new Error("Item ID is missing.");
    
    const itemRef = doc(db, 'users', userId, 'inventory', itemId);
    const payload = { ...data, userId };
    try {
        await updateDoc(itemRef, payload);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: itemRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}

export async function deleteInventoryItem(userId: string, itemId: string) {
    if (!userId) throw new Error("User not authenticated.");
    if (!itemId) throw new Error("Item ID is missing.");
    
    const itemRef = doc(db, 'users', userId, 'inventory', itemId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) {
                throw new Error("Item not found.");
            }

            const itemData = itemDoc.data();
            
            const historyCollectionRef = collection(db, 'users', userId, 'inventoryHistory');
            const newHistoryDocRef = doc(historyCollectionRef);
            
            transaction.set(newHistoryDocRef, {
                itemId: itemId,
                itemName: itemData.name,
                userId: userId, 
                date: Timestamp.fromDate(new Date()),
                type: 'Deleted',
                change: -(itemData.quantity || 0),
                newQuantity: 0,
                details: 'Item permanently deleted',
            });
            
            transaction.delete(itemRef);
        });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: itemRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}


export async function createInvoice(userId: string, data: { invoiceNumber?: string, customerName: string, lineItems: { productId: string, name: string, quantity: number, unitPrice: number }[], issueDate?: Date, dueDate?: Date, paymentMethod?: 'Credit' | 'Cash' | 'Transfer' | 'Others', status?: 'Pending' | 'Paid' | 'Overdue', customerPhone?: string, customerCompany?: string, customerAddress?: string, vatAmount?: number }) {
    if (!userId) throw new Error("User not authenticated.");

    try {
        return await runTransaction(db, async (transaction) => {
            const businessProfileRef = doc(db, 'users', userId, 'profile', 'business');
            const businessProfileDoc = await transaction.get(businessProfileRef);
            const businessProfile = businessProfileDoc.exists() ? businessProfileDoc.data() : null;
            
            const customerId = data.customerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const customerRef = doc(db, 'users', userId, 'customers', customerId);
            const customerDoc = await transaction.get(customerRef);

            const productsToUpdate: any[] = [];
            for (const item of data.lineItems) {
                if (!item.productId || item.productId === 'none') continue;
                const productRef = doc(db, 'users', userId, 'inventory', item.productId);
                const productDoc = await transaction.get(productRef);
                if (!productDoc.exists()) throw new Error(`Product "${item.name}" not found.`);
                
                const productData = productDoc.data();
                if (productData.quantity < item.quantity) {
                    throw new Error(`Not enough stock for ${item.name}.`);
                }
                productsToUpdate.push({ productRef, productDoc, itemData: item });
            }

            let prefix = "INV";
            if (businessProfile?.businessName) {
                const initials = businessProfile.businessName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                prefix = initials.slice(0, 3);
            }
            const invoiceNumber = data.invoiceNumber || `${prefix}-${Date.now()}`;

            const subtotal = data.lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
            const totalAmount = subtotal + (Number(data.vatAmount) || 0);

            for (const { productRef, productDoc, itemData } of productsToUpdate) {
                const newQuantity = (productDoc.data().quantity || 0) - itemData.quantity;
                transaction.update(productRef, { quantity: newQuantity });
                
                const historyRef = doc(collection(db, 'users', userId, 'inventoryHistory'));
                transaction.set(historyRef, {
                    itemId: itemData.productId,
                    itemName: itemData.name,
                    userId: userId, 
                    date: Timestamp.fromDate(new Date()),
                    type: 'Sale',
                    change: -itemData.quantity,
                    newQuantity: newQuantity,
                    details: `Sold on Invoice #${invoiceNumber}`
                });
            }
            
            const customerData = customerDoc?.exists() ? customerDoc.data() : {};
            const status = data.paymentMethod === 'Cash' || data.paymentMethod === 'Transfer' ? 'Paid' : 'Pending';
            const amountPaidOnThisInvoice = status === 'Paid' ? totalAmount : 0;
            
            transaction.set(customerRef, {
                name: data.customerName,
                amountOwed: (customerData.amountOwed || 0) + (totalAmount - amountPaidOnThisInvoice),
                amountPaid: (customerData.amountPaid || 0) + amountPaidOnThisInvoice,
                totalSpent: (customerData.totalSpent || 0) + totalAmount, 
                userId: userId 
            }, { merge: true });

            const newInvoiceRef = doc(collection(db, 'users', userId, 'invoices'));
            transaction.set(newInvoiceRef, {
                ...data,
                invoiceNumber,
                amount: totalAmount,
                amountPaid: amountPaidOnThisInvoice,
                customerId: customerRef.id,
                userId: userId, 
                issueDate: Timestamp.fromDate(data.issueDate || new Date()),
                dueDate: Timestamp.fromDate(data.dueDate || new Date()),
                status: status,
                createdAt: Timestamp.fromDate(new Date()),
            });

            const publicReceiptRef = doc(db, 'publicInvoices', newInvoiceRef.id);
            transaction.set(publicReceiptRef, {
                userId: userId,
                invoiceNumber,
                customerName: data.customerName,
                amount: totalAmount,
                status: status,
                issueDate: Timestamp.fromDate(data.issueDate || new Date()),
                businessName: businessProfile?.businessName || 'Sprout Track Business',
                lineItems: data.lineItems.map(li => ({ name: li.name, quantity: li.quantity, unitPrice: li.unitPrice })),
            });

            return { invoiceNumber, id: newInvoiceRef.id };
        });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: `Transaction: Invoices, Customers, or Mirror`,
                operation: 'create',
                requestResourceData: { customer: data.customerName, userId },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}

export async function updateInvoice(userId: string, invoiceId: string, data: any) {
    if (!userId) throw new Error("User not authenticated.");

    try {
        return await runTransaction(db, async (transaction) => {
            const invoiceRef = doc(db, 'users', userId, 'invoices', invoiceId);
            const invoiceDoc = await transaction.get(invoiceRef);
            if (!invoiceDoc.exists()) throw new Error("Invoice not found.");
            
            const oldData = invoiceDoc.data();
            const subtotal = data.lineItems.reduce((acc: number, item: any) => acc + item.quantity * item.unitPrice, 0);
            const newTotal = subtotal + (Number(data.vatAmount) || 0);

            transaction.update(invoiceRef, {
                ...data,
                userId: userId,
                amount: newTotal,
                issueDate: Timestamp.fromDate(data.issueDate),
                dueDate: Timestamp.fromDate(data.dueDate),
                updatedAt: Timestamp.fromDate(new Date()),
            });

            const publicReceiptRef = doc(db, 'publicInvoices', invoiceId);
            transaction.set(publicReceiptRef, {
                userId: userId, 
                customerName: data.customerName,
                amount: newTotal,
                lineItems: data.lineItems.map((li: any) => ({ name: li.name, quantity: li.quantity, unitPrice: li.unitPrice })),
            }, { merge: true });

            return { invoiceNumber: oldData.invoiceNumber };
        });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: `publicInvoices/${invoiceId}`,
                operation: 'update',
                requestResourceData: { invoice: invoiceId, userId },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}


export async function recordExpense(userId: string, data: { description: string, amount: number, category?: string, date: Date }) {
    if (!userId) throw new Error("User not authenticated.");
    const expensesCollectionRef = collection(db, 'users', userId, 'expenses');
    const payload = {
        description: data.description,
        amount: data.amount,
        userId: userId,
        category: data.category || 'General',
        date: Timestamp.fromDate(data.date),
        createdAt: Timestamp.fromDate(new Date()),
    };
    try {
        await addDoc(expensesCollectionRef, payload);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: expensesCollectionRef.path,
                operation: 'create',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}

export async function updateExpense(userId: string, expenseId: string, data: { description: string, amount: number, category?: string, date: Date }) {
    if (!userId) throw new Error("User not authenticated.");
    if (!expenseId) throw new Error("Expense ID is missing.");
    const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
    const payload = {
        ...data,
        userId,
        date: Timestamp.fromDate(data.date),
    };
    try {
        await updateDoc(expenseRef, payload);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: expenseRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}

export async function deleteExpense(userId: string, expenseId: string) {
    if (!userId) throw new Error("User not authenticated.");
    if (!expenseId) throw new Error("Expense ID is missing.");
    const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
    try {
        await deleteDoc(expenseRef);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: expenseRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}

export async function deleteInvoice(userId: string, invoiceId: string, lineItems: any[]) {
    if (!userId) throw new Error("User not authenticated.");
    
    const invoiceRef = doc(db, 'users', userId, 'invoices', invoiceId);
    const mirrorRef = doc(db, 'publicInvoices', invoiceId);
    
    try {
        await runTransaction(db, async (transaction) => {
            // 1. ALL READS MUST HAPPEN FIRST
            const invoiceDoc = await transaction.get(invoiceRef);
            if (!invoiceDoc.exists()) return; // Already deleted
            const invoiceData = invoiceDoc.data();

            // Read the customer to update their balance
            const customerRef = doc(db, 'users', userId, 'customers', invoiceData.customerId);
            const customerDoc = await transaction.get(customerRef);

            // Read all products involved to restock them
            const productsToUpdate = [];
            for (const item of lineItems) {
                if (item.productId && item.productId !== 'none') {
                    const productRef = doc(db, 'users', userId, 'inventory', item.productId);
                    const productSnap = await transaction.get(productRef);
                    if (productSnap.exists()) {
                        productsToUpdate.push({ ref: productRef, data: productSnap.data(), restockQty: Number(item.quantity) });
                    }
                }
            }

            // 2. ALL WRITES HAPPEN AFTER ALL READS
            for (const p of productsToUpdate) {
                transaction.update(p.ref, { quantity: (p.data.quantity || 0) + p.restockQty });
            }

            // Update customer totals (rollback the spending and debt)
            if (customerDoc.exists()) {
                const customerData = customerDoc.data();
                const refundAmount = Number(invoiceData.amount) || 0;
                const refundPaid = Number(invoiceData.amountPaid) || 0;

                transaction.update(customerRef, {
                    totalSpent: Math.max(0, (customerData.totalSpent || 0) - refundAmount),
                    amountPaid: Math.max(0, (customerData.amountPaid || 0) - refundPaid),
                    amountOwed: Math.max(0, (customerData.amountOwed || 0) - (refundAmount - refundPaid)),
                });
            }
            
            const historyRef = doc(collection(db, 'users', userId, 'inventoryHistory'));
            transaction.set(historyRef, {
                userId: userId,
                itemName: `Restock (Deleted Invoice #${invoiceData.invoiceNumber})`,
                date: Timestamp.fromDate(new Date()),
                type: 'Goods Return',
                change: lineItems.length,
                newQuantity: 0,
                details: 'Invoice deleted, stock returned and balance corrected.',
            });
            
            transaction.delete(invoiceRef);
            transaction.delete(mirrorRef);
        });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: `Transaction: users/${userId}/invoices/${invoiceId} + publicMirror`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}


export async function recordInvoicePayment(userId: string, invoiceId: string, paymentAmount: number, paymentMethod: string = 'Cash', notes: string = '') {
    if (!userId) throw new Error("User not authenticated.");

    const invoiceRef = doc(db, 'users', userId, 'invoices', invoiceId);
    try {
        await runTransaction(db, async (transaction) => {
            const invoiceDoc = await transaction.get(invoiceRef);
            if (!invoiceDoc.exists()) throw new Error(`Invoice not found.`);
            const invoiceData = invoiceDoc.data();

            const customerRef = doc(db, 'users', userId, 'customers', invoiceData.customerId);
            const customerDoc = await transaction.get(customerRef);
            if (!customerDoc.exists()) throw new Error(`Customer not found.`);
            const customerData = customerDoc.data();

            const newAmountPaidOnInvoice = (Number(invoiceData.amountPaid) || 0) + paymentAmount;
            const newStatus = newAmountPaidOnInvoice >= (Number(invoiceData.amount) || 0) ? 'Paid' : invoiceData.status;

            transaction.update(invoiceRef, { 
                amountPaid: newAmountPaidOnInvoice, 
                status: newStatus,
                paymentMethod: paymentMethod, 
                userId: userId,
                lastPaymentAt: Timestamp.fromDate(new Date())
            });
            
            transaction.update(customerRef, {
                amountPaid: (Number(customerData.amountPaid) || 0) + paymentAmount,
                amountOwed: Math.max(0, (Number(customerData.amountOwed) || 0) - paymentAmount),
                userId: userId,
            });

            const publicReceiptRef = doc(db, 'publicInvoices', invoiceId);
            transaction.set(publicReceiptRef, { 
                status: newStatus,
                userId: userId 
            }, { merge: true });
        });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: `Transaction: Payment for ${invoiceId}`,
                operation: 'update',
                requestResourceData: { status: 'payment-recorded', userId },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}


export async function adjustInventoryQuantity(userId: string, itemId: string, adjustment: number, reason: string) {
    if (!userId) throw new Error("User not authenticated.");
    const itemRef = doc(db, 'users', userId, 'inventory', itemId);
    try {
        await runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) throw new Error("Item not found.");
            
            const newQuantity = (itemDoc.data().quantity || 0) + adjustment;
            transaction.update(itemRef, { quantity: newQuantity });
            
            const historyRef = doc(collection(db, 'users', userId, 'inventoryHistory'));
            transaction.set(historyRef, {
                itemId: itemId,
                itemName: itemDoc.data().name,
                userId: userId,
                date: Timestamp.fromDate(new Date()),
                type: 'Adjustment',
                change: adjustment,
                newQuantity: newQuantity,
                details: reason,
            });
        });
    } catch (error: any) {
         if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: itemRef.path,
                operation: 'update',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}


export async function updateBusinessProfile(userId: string, data: any) {
    if (!userId) throw new Error("User not authenticated.");
    const profileRef = doc(db, 'users', userId, 'profile', 'business');
    try {
        await setDoc(profileRef, { ...data, userId }, { merge: true });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: profileRef.path,
                operation: 'update',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}


// =================================================================================================
// DASHBOARD & REPORTING
// =================================================================================================

function getMonthlyBreakdown(invoices: any[], expenses: any[]) {
    const monthlyData: {[key: string]: { income: number, expenses: number }} = {};
    const today = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for(let i=5; i>=0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthName = `${monthNames[d.getMonth()]} ${String(year).slice(-2)}`;
      monthlyData[monthName] = { income: 0, expenses: 0 };
    }

    invoices.forEach(inv => {
        if(inv.status === 'Paid' && inv.issueDate) {
            try {
              const date = new Date(inv.issueDate);
              if (isNaN(date.getTime())) return;
              const year = date.getFullYear();
              const monthName = `${monthNames[date.getMonth()]} ${String(year).slice(-2)}`;
              if(monthlyData[monthName] !== undefined) {
                  monthlyData[monthName].income += Number(inv.amountPaid || inv.amount) || 0;
              }
            } catch {}
        }
    });

    expenses.forEach(exp => {
        if (exp.date) {
            try {
              const date = new Date(exp.date);
              if (isNaN(date.getTime())) return;
              const year = date.getFullYear();
              const monthName = `${monthNames[date.getMonth()]} ${String(year).slice(-2)}`;
              if(monthlyData[monthName] !== undefined) {
                  monthlyData[monthName].expenses += Number(exp.amount) || 0;
              }
            } catch {}
        }
    });
    
    return monthlyData;
}

export async function getDashboardData(userId: string) {
    if (!userId) return null;

    try {
        const [invoices, expenses, inventory, customers] = await Promise.all([
            getInvoices(userId),
            getExpenses(userId),
            getInventory(userId),
            getCustomers(userId),
        ]);

        const totalRevenue = invoices.filter(inv => inv.status === 'Paid').reduce((acc, inv) => acc + (Number(inv.amountPaid) || Number(inv.amount)), 0);
        const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        const outstandingInvoices = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue').reduce((acc, inv) => acc + (Number(inv.amount) - (Number(inv.amountPaid) || 0)), 0);
        
        const totalStockValue = inventory.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitCost || 0)), 0);
        const totalItemsInStock = inventory.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
        
        const topCustomers = [...customers]
            .sort((a, b) => (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0))
            .slice(0, 5);

        const topDebtors = [...customers]
            .filter(c => (Number(c.amountOwed) || 0) > 0)
            .sort((a, b) => Number(b.amountOwed) - Number(a.amountOwed))
            .slice(0, 5);
            
        const monthlyData = getMonthlyBreakdown(invoices, expenses);
        const cashFlowData = Object.keys(monthlyData).map(monthName => ({
            name: monthName.split(' ')[0],
            income: monthlyData[monthName].income,
            expenses: monthlyData[monthName].expenses,
        }));
        
        const lowStockItems = inventory.filter(item => Number(item.quantity) <= (Number(item.reorderLevel) || 0));

        const mappedIncomes = invoices.slice(0, 10).map(inv => ({
            id: `income-${inv.id}`,
            type: 'Income' as const,
            description: `Invoice #${inv.invoiceNumber}`,
            date: safeISODate(inv.issueDate),
            amount: Number(inv.amountPaid) || Number(inv.amount)
        }));

        const mappedExpenses = expenses.slice(0, 10).map(exp => ({
            id: `expense-${exp.id}`,
            type: 'Expense' as const,
            description: exp.description,
            date: safeISODate(exp.date),
            amount: Number(exp.amount)
        }));

        const recentTransactions = [...mappedIncomes, ...mappedExpenses]
            .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
            })
            .slice(0, 10);

        return {
            totalRevenue, totalExpenses, netProfit, outstandingInvoices,
            cashFlowData, totalStockValue, totalItemsInStock,
            profitMargin, topCustomers, topDebtors, lowStockItems,
            recentTransactions
        }
    } catch (error) {
        console.error("Dashboard data fetch failed:", error);
        throw error;
    }
}

export async function getReportsData(userId: string) {
     if (!userId) return { pnl: [], cashFlow: [] };
    
    try {
        const [invoices, expenses] = await Promise.all([
            getInvoices(userId),
            getExpenses(userId)
        ]);

        const monthlyData = getMonthlyBreakdown(invoices, expenses);

        const pnl = Object.keys(monthlyData).map(monthName => ({
            month: monthName.split(' ')[0],
            income: monthlyData[monthName].income,
            expenses: monthlyData[monthName].expenses,
            profit: monthlyData[monthName].income - monthlyData[monthName].expenses,
        }));

        const cashFlow = Object.keys(monthlyData).map(monthName => ({
            name: monthName.split(' ')[0],
            income: monthlyData[monthName].income,
            expenses: monthlyData[monthName].expenses,
        }));
        
        return { pnl, cashFlow };
    } catch (error) {
        console.error("Reports data fetch failed:", error);
        return { pnl: [], cashFlow: [] };
    }
}

export async function getRecentTransactions(userId: string, page: number = 1, pageSize: number = 5) {
    if (!userId) return { recentTransactions: [], hasMore: false };
    
    try {
        const [invoices, expenses] = await Promise.all([
            getInvoices(userId),
            getExpenses(userId)
        ]);

        const mappedIncomes = invoices.map(inv => ({
            id: `income-${inv.id}`,
            type: 'Income' as const,
            description: `Invoice #${inv.invoiceNumber}`,
            date: safeISODate(inv.issueDate),
            amount: Number(inv.amountPaid) || Number(inv.amount)
        }));

        const mappedExpenses = expenses.map(exp => ({
            id: `expense-${exp.id}`,
            type: 'Expense' as const,
            description: exp.description,
            date: safeISODate(exp.date),
            amount: Number(exp.amount)
        }));

        const all = [...mappedIncomes, ...mappedExpenses].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });
        
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return {
            recentTransactions: all.slice(start, end),
            hasMore: all.length > end
        };
    } catch (error) {
        console.error("Recent transactions fetch failed:", error);
        return { recentTransactions: [], hasMore: false };
    }
}

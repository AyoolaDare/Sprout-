
# ULTIMATE BUILD PROMPT: BizBalance (Sprout Track)

## 1. Executive Summary
**Project Name**: BizBalance (Sprout Track)
**Concept**: A professional, mobile-first PWA for small business owners to manage invoicing (Receipts/Invoices), Inventory, Customers (CRM), and Expenses. It features a dashboard with real-time financial metrics, automated inventory syncing, and offline-ready functionality using Firebase.

---

## 2. Technical Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database/Auth**: Firebase Firestore & Firebase Authentication
- **Styling**: Tailwind CSS + ShadCN UI
- **Icons**: Lucide React
- **Charts**: Recharts (with ShadCN Chart wrappers)
- **PWA**: Service Workers (sw.js), Manifest, and A2HS (Add to Home Screen) support.
- **PDF/QR**: jsPDF, html2canvas, and qrcode.
- **Notifications**: Web-Push (VAPID) for browser-based push notifications.

---

## 3. Visual Identity (Design System)
### Color Palette (HSL)
- **Background**: `165 27% 96%` (#f0f7f6)
- **Foreground**: `211 40% 12%` (#121c2a)
- **Primary**: `211 39% 23%` (#253953) - Deep professional blue.
- **Secondary/Border**: `165 27% 84%` (#b3dad4)
- **Muted Foreground**: `158 29% 30%`
- **Destructive**: `0 84% 60%`
- **Accent**: `165 27% 90%`

### Typography & Layout
- **Font**: Inter (sans-serif)
- **Rounding**: `radius: 0.5rem`
- **Mobile First**: All tables must have a "Card View" for mobile (hidden on md) and a "Table View" for desktop (hidden on sm).

---

## 4. Data Architecture (Firestore)
All user-specific data must be nested under: `/users/{userId}/...`

### Core Collections:
1.  **profile/business**: (Single Doc) `businessName`, `logoUrl`, `email`, `phone`, `address`, `accounts[]` (Bank details).
2.  **customers**: `name`, `phone`, `address`, `totalSpent`, `amountPaid`, `amountOwed`.
3.  **inventory**: `name`, `sku`, `quantity`, `unitCost`, `reorderLevel`, `category`.
4.  **invoices**: `invoiceNumber`, `customerName`, `customerId`, `issueDate`, `dueDate`, `status` (Paid/Pending/Overdue), `amount`, `amountPaid`, `lineItems[]`, `vatAmount`.
5.  **expenses**: `description`, `amount`, `category`, `date`.
6.  **inventoryHistory**: `itemId`, `itemName`, `type` (Sale/Adjustment/Creation/Return), `change`, `newQuantity`, `details`.
7.  **sales**: `productId`, `productName`, `quantity`, `unitPrice`, `total`, `date`.

---

## 5. Mission-Critical Logic (Secret Sauce)

### A. The Invoicing Transaction (Atomicity)
When an invoice is created:
1.  **Read** Inventory: Check if all items have enough stock.
2.  **Write** Inventory: Decrement stock quantity.
3.  **Write** InventoryHistory: Log the sale.
4.  **Write** Customer: Update `totalSpent` and `amountOwed`. If customer doesn't exist, create them.
5.  **Write** Sales: Record line items for reporting.
6.  **Write** Invoice: Save the final document.
*This MUST happen in a single Firestore `runTransaction`.*

### B. The "Smart Edit" Logic
When editing an existing invoice:
1.  **Qty Difference**: Compare old line items with new ones. If qty decreased, return items to stock. If qty increased, deduct more items.
2.  **Financial Sync**: Calculate the difference in total amount. Update the customer's `totalSpent` and `amountOwed` by that specific delta.
3.  **Status Sync**: If the new total is <= the current `amountPaid`, automatically flip the status to 'Paid'.

### C. PDF Generation with Proxy
To avoid CORS issues when drawing business logos on a canvas:
- Implement a Next.js API Route (`/api/image-proxy`) that fetches the remote `logoUrl` and returns a Base64 data URI. Use this URI for `html2canvas`.

---

## 6. Module Specifications

### Dashboard (`/`)
- **Stats**: Total Revenue (Paid Invoices), Expenses, Net Profit, Profit Margin (%).
- **Charts**: Cash Flow (Bar Chart) showing 6 months of Income vs Expenses.
- **Alerts**: "Items to Restock" (Inventory where `qty <= reorderLevel`).
- **Recent Activity**: Combined list of last 5 Invoices, Expenses, or Returns.

### Invoices/Receipts
- **Dynamic Form**: Users add/remove line items. Qty and Price auto-calculate subtotals.
- **VAT Toggle**: Toggle for 7.5% VAT calculation.
- **Payment Recording**: Feature to record partial payments on pending invoices.
- **Verification**: Generate a unique QR code on every PDF that links to a public verification page (`/receipts/verify/[id]`).

### Inventory
- **Stock Adjustment**: A dedicated flow for adjustments (returns, spoilage, restock) with required reason logging.
- **Auto-SKU**: Generate SKUs based on product name initials and random digits.

### Expenses
- **Categorization**: Simple categorization for tax reporting.

---

## 7. Implementation Rules
1.  **Strict Typing**: No `any` types for core data models.
2.  **Server Components**: Use React Server Components for data fetching where possible; use Client Components for interactive forms.
3.  **Loading States**: Use ShadCN Skeleton loaders for every data-driven card.
4.  **Error Handling**: Use Toast notifications for errors. Use a custom `errorEmitter` to catch Firestore permission errors and display debug info during development.
5.  **Security Rules**: Firestore rules must enforce `request.auth.uid == userId` for all paths.
6.  **Hydration**: Date formatting must be handled carefully to avoid server/client mismatch (use `useEffect` for relative time or localized strings).

---

## 8. Export & Migration (Developer Only)
- Provide a strategy for bulk exports via the Admin SDK or `gcloud firestore export`. The system should be able to produce a unified JSON dump of all user collections for easy migration to other SQL or NoSQL services.

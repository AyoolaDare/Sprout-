'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInvoiceById } from '@/lib/firestore';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Download, Loader2, Edit, CreditCard, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sprout } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { createRoot } from 'react-dom/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


export default function InvoiceDetailsPage() {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { toast } = useToast();

  useEffect(() => {
    async function fetchInvoice() {
      if (user && id) {
        setLoading(true);
        try {
          const invoiceData = await getInvoiceById(user.uid, id as string);
          setInvoice(invoiceData);
        } catch (error) {
          console.error("Failed to fetch invoice:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch invoice details.' });
        } finally {
          setLoading(false);
        }
      }
    }
    fetchInvoice();
  }, [user, id, toast]);

  const handleDownloadPdf = async () => {
    if (!invoice) return;

    setIsDownloading(true);
    toast({ title: 'Generating PDF...', description: 'Please wait a moment.' });

    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '820px';
    printContainer.style.backgroundColor = 'white';
    document.body.appendChild(printContainer);

    try {
      // 1. Fetch logo and generate QR code
      let logoUrl = null;
      if (invoice.businessProfile?.logoUrl) {
        try {
          const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(invoice.businessProfile.logoUrl)}`);
          if (!response.ok) throw new Error('Failed to fetch logo via proxy.');
          const { dataUrl } = await response.json();
          logoUrl = dataUrl;
        } catch (imgError) {
          console.warn("Could not fetch logo for PDF, proceeding without it.", imgError);
        }
      }
      
      const verificationUrl = `${window.location.origin}/receipts/verify/${invoice.id}`;
      const qrCodeUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: 'H' });
      
      // 2. Render PDF content into the off-screen div
      const derivedStatus = getDerivedStatus();
      const root = createRoot(printContainer);
      
      await new Promise<void>((resolve) => {
          root.render(
            <SimpleInvoiceContentForPdf 
              invoice={invoice} 
              formatCurrency={formatCurrency} 
              logoDataUrl={logoUrl} 
              qrCodeDataUrl={qrCodeUrl} 
              derivedStatus={derivedStatus} 
              onRendered={resolve}
            />
          );
      });
      
      // 3. Capture the canvas
      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      // 4. Generate PDF
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;
      const ratio = imgWidth / imgHeight;

      let finalWidth = pdfWidth;
      let finalHeight = finalWidth / ratio;
      if (finalHeight > pdfHeight) {
          finalHeight = pdfHeight;
          finalWidth = finalHeight * ratio;
      }
      const x = (pdfWidth - finalWidth) / 2;
      const y = 0;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);

    } catch (error: any) {
      console.error('Failed to generate PDF:', error);
      toast({
        variant: 'destructive',
        title: 'PDF Generation Failed',
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsDownloading(false);
      // Clean up the off-screen element
      document.body.removeChild(printContainer);
    }
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };
  
  const getDerivedStatus = () => {
    if (!invoice) return '';
    if (invoice.status === 'Paid') {
        return 'Paid';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    if (dueDate < today) {
        return 'Overdue';
    }
    return 'Pending';
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-10 w-48" />
        <Card><CardContent className="p-6"><Skeleton className="h-[600px] w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20">
        <h2 className="text-2xl font-bold">Invoice not found</h2>
        <p className="text-muted-foreground">The requested invoice could not be found.</p>
        <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
      </div>
    );
  }
  
  const derivedStatus = getDerivedStatus();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push('/invoices')} className="w-full sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            {(derivedStatus === 'Pending' || derivedStatus === 'Overdue') && (
                <Button variant="secondary" onClick={() => router.push(`/invoices/${invoice.id}/record-payment`)}>
                    <CreditCard className="mr-2 h-4 w-4" /> Offset Balance
                </Button>
            )}
            <Button variant="outline" onClick={() => router.push(`/invoices/${invoice.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. Deleting this invoice will automatically return all sold items to your inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.push(`/invoices/${invoice.id}/delete`)}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleDownloadPdf} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isDownloading ? 'Generating...' : 'Download PDF'}
            </Button>
        </div>
      </div>
      
      <Card className="w-full border-transparent shadow-none">
        <CardContent className="p-4 sm:p-6 md:p-8">
           <SimpleInvoiceContent invoice={invoice} formatCurrency={formatCurrency} derivedStatus={derivedStatus} />
        </CardContent>
      </Card>
    </div>
  );
}

const SimpleInvoiceContent = ({ invoice, formatCurrency, derivedStatus }: { invoice: any, formatCurrency: (val: number) => string, derivedStatus: string }) => {
  const businessProfile = invoice.businessProfile || {};
  const subtotal = invoice.lineItems.reduce((acc: number, item: any) => acc + item.quantity * item.unitPrice, 0);
  const tax = invoice.vatAmount || 0;
  const total = subtotal + tax;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'Paid':
            return 'text-green-600';
        case 'Pending':
            return 'text-yellow-600';
        case 'Overdue':
            return 'text-red-600';
        default:
            return 'text-slate-600';
    }
  }

  return (
     <div className="w-full bg-background text-foreground font-serif">
      <header className="mb-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-4">
            <div className="relative flex items-center justify-center overflow-hidden shrink-0 w-16 h-16 sm:w-20 sm:h-20">
              {businessProfile.logoUrl ? <Image src={businessProfile.logoUrl} alt="Business Logo" fill className="object-contain p-2" /> : <Sprout className="h-8 w-8 text-primary" />}
            </div>
            <div className="text-sm text-muted-foreground pt-1">
              <p className="font-bold text-lg sm:text-xl text-foreground">{businessProfile.businessName || 'Your Business'}</p>
              <p className="text-xs">{businessProfile.address || ''}</p>
              <p className="text-xs">{businessProfile.email || ''}</p>
              <p className="text-xs">{businessProfile.phone || ''}</p>
            </div>
          </div>
          <div className="text-right">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground/90">
                {derivedStatus === 'Paid' ? 'RECEIPT' : 'INVOICE'}
              </h2>
              {derivedStatus === 'Paid' ? (
                <p className="font-bold text-4xl text-green-600 mt-1">
                  PAID
                </p>
              ) : (
                <p className={cn("font-semibold text-lg", getStatusBadgeClass(derivedStatus))}>{derivedStatus.toUpperCase()}</p>
              )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm my-8">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Billed To</h3>
          <p className="font-bold text-base">{invoice.customerName}</p>
          <p className="text-muted-foreground">{invoice.customerAddress || ''}</p>
          <p className="text-muted-foreground">{invoice.customerPhone || ''}</p>
        </div>
        <div className="text-left sm:text-right space-y-1">
          <p><span className="text-muted-foreground">Invoice #:</span> <span className="font-medium">{invoice.invoiceNumber}</span></p>
          <p><span className="text-muted-foreground">Invoice Date:</span> <span className="font-medium">{invoice.issueDate}</span></p>
          {derivedStatus !== 'Paid' && <p><span className="text-muted-foreground">Due Date:</span> <span className="font-medium">{invoice.dueDate}</span></p>}
          {derivedStatus === 'Paid' && invoice.paymentMethod && <p><span className="text-muted-foreground">Payment Method:</span> <span className="font-medium">{invoice.paymentMethod}</span></p>}
        </div>
      </div>
      
      <div className="my-6 overflow-x-auto">
        <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
                <tr className="text-muted-foreground">
                    <th className="p-3 text-left font-medium">Item</th>
                    <th className="p-3 text-right font-medium">Qty</th>
                    <th className="p-3 text-right font-medium">Price</th>
                    <th className="p-3 text-right font-medium">Total</th>
                </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item: any, index: number) => (
                <tr key={index} className="border-b">
                  <td className="p-3 font-medium text-left">{item.name}</td>
                  <td className="p-3 text-right">{item.quantity.toLocaleString()}</td>
                  <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
      
      <div className="flex justify-end my-8">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          {tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">VAT (7.5%):</span><span className="font-medium">{formatCurrency(tax)}</span></div>}
          <div className="flex justify-between font-bold text-base pt-2"><span >Total:</span><span >{formatCurrency(total)}</span></div>
          {invoice.amountPaid > 0 && <div className="flex justify-between text-green-600 font-medium"><span >Amount Paid:</span><span >- {formatCurrency(invoice.amountPaid)}</span></div>}
          {derivedStatus !== 'Paid' && (
            <div className="flex justify-between font-bold text-lg text-foreground p-3 bg-slate-100 dark:bg-slate-800 rounded-md mt-2">
              <span>Amount Due:</span>
              <span>{formatCurrency(total - (invoice.amountPaid || 0))}</span>
            </div>
          )}
        </div>
      </div>

      {(invoice.paymentNotes || (invoice.paymentMethod && derivedStatus === 'Paid')) && (
          <div className="my-6 p-4 rounded-lg bg-muted/30 border text-sm">
              <h4 className="font-bold mb-2">Payment Details</h4>
              {invoice.paymentMethod && <p><span className="text-muted-foreground">Settled Via:</span> {invoice.paymentMethod}</p>}
              {invoice.paymentNotes && <p className="mt-1"><span className="text-muted-foreground">Notes:</span> {invoice.paymentNotes}</p>}
          </div>
      )}

      <footer className="text-center text-muted-foreground text-xs pt-6 border-t mt-8">
        {derivedStatus !== 'Paid' && businessProfile?.accounts?.length > 0 && businessProfile.accounts.some((acc: any) => acc.bankName && acc.accountNumber) && (
          <div className="mb-6 bg-muted/50 p-4 rounded-lg">
            <h4 className="font-bold text-sm text-foreground mb-3">Payment Information</h4>
            <div className="space-y-3">
              {businessProfile.accounts.map((acc: any, i: number) => (
                acc.bankName && acc.accountNumber && (
                  <div key={i} className="text-sm text-foreground/90">
                    <p className="font-semibold">{acc.bankName}</p>
                    <p>
                      <span className="text-muted-foreground">Account Number:</span> {acc.accountNumber}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Account Name:</span> {acc.accountName}
                    </p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
        <p>Thank you for your business!</p>
      </footer>
    </div>
  );
}


// PDF-ONLY COMPONENT WITH FIXED SAFE COLORS
const SimpleInvoiceContentForPdf = ({ invoice, formatCurrency, logoDataUrl, qrCodeDataUrl, derivedStatus, onRendered }: { invoice: any, formatCurrency: (val: number) => string, logoDataUrl: string | null, qrCodeDataUrl: string | null, derivedStatus: string, onRendered?: () => void }) => {
    const businessProfile = invoice.businessProfile || {};
    const subtotal = invoice.lineItems.reduce((acc: number, item: any) => acc + item.quantity * item.unitPrice, 0);
    const tax = invoice.vatAmount || 0;
    const total = subtotal + tax;
    
    useEffect(() => {
        onRendered?.();
    }, [onRendered]);

    // Internal standard color variables to avoid oklch parsing errors in html2canvas
    const colors = {
        primary: '#253953',
        secondary: '#f0f7f6',
        text: '#121c2a',
        muted: '#64748b',
        border: '#e2e8f0',
        success: '#16a34a',
        pending: '#ca8a04',
        overdue: '#dc2626'
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Paid': return colors.success;
            case 'Pending': return colors.pending;
            case 'Overdue': return colors.overdue;
            default: return colors.muted;
        }
    }


    return (
        <div style={{ padding: '40px', backgroundColor: 'white', color: colors.text, fontFamily: 'serif', position: 'relative' }}>
            <div>
                <header style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ position: 'relative', width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {logoDataUrl ? <img src={logoDataUrl} alt="Logo" style={{ objectFit: 'contain', padding: '8px', height: '100%', width: '100%' }}/> : <Sprout size={40} color={colors.primary} />}
                            </div>
                            <div>
                                <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{businessProfile.businessName || 'Your Business'}</p>
                                <p style={{ fontSize: '12px', color: colors.muted, marginTop: '4px' }}>{businessProfile.address || ''}<br/>{businessProfile.email || ''}<br/>{businessProfile.phone || ''}</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                            {derivedStatus === 'Paid' ? 'RECEIPT' : 'INVOICE'}
                          </h2>
                          {derivedStatus === 'Paid' ? (
                            <p style={{ fontWeight: 'bold', fontSize: '36px', color: colors.success, marginTop: '4px' }}>
                              PAID
                            </p>
                          ) : (
                             <p style={{ fontWeight: 'semibold', fontSize: '18px', color: getStatusColor(derivedStatus), margin: '8px 0 0' }}>{derivedStatus.toUpperCase()}</p>
                          )}
                        </div>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', margin: '32px 0', fontSize: '14px' }}>
                    <div>
                        <h3 style={{ fontSize: '12px', fontWeight: 'semibold', color: colors.muted, marginBottom: '4px', textTransform: 'uppercase' }}>Billed To</h3>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{invoice.customerName}</p>
                        <p style={{ color: colors.muted, margin: '2px 0' }}>{invoice.customerAddress || ''}</p>
                        <p style={{ color: colors.muted, margin: 0 }}>{invoice.customerPhone || ''}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '2px 0' }}><span style={{ color: colors.muted }}>Invoice #:</span> <span style={{ fontWeight: '500' }}>{invoice.invoiceNumber}</span></p>
                        <p style={{ margin: '2px 0' }}><span style={{ color: colors.muted }}>Invoice Date:</span> <span style={{ fontWeight: '500' }}>{invoice.issueDate}</span></p>
                        {derivedStatus !== 'Paid' && <p style={{ margin: '2px 0' }}><span style={{ color: colors.muted }}>Due Date:</span> <span style={{ fontWeight: '500' }}>{invoice.dueDate}</span></p>}
                        {derivedStatus === 'Paid' && invoice.paymentMethod && <p style={{ margin: '2px 0' }}><span style={{ color: colors.muted }}>Payment Method:</span> <span style={{ fontWeight: '500' }}>{invoice.paymentMethod}</span></p>}
                    </div>
                </div>

                <table style={{ width: '100%', fontSize: '14px', margin: '32px 0', borderCollapse: 'collapse' }}>
                    <thead style={{ borderBottom: `2px solid ${colors.border}` }}>
                        <tr style={{ color: colors.muted }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Item</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Qty</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Price</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.lineItems.map((item: any, index: number) => (
                            <tr key={index} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                                <td style={{ padding: '12px', fontWeight: '500' }}>{item.name}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity.toLocaleString()}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>{formatCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '32px 0' }}>
                    <div style={{ width: '100%', maxWidth: '300px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><span style={{ color: colors.muted }}>Subtotal:</span><span style={{ fontWeight: '500' }}>{formatCurrency(subtotal)}</span></div>
                        {tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><span style={{ color: colors.muted }}>VAT (7.5%):</span><span style={{ fontWeight: '500' }}>{formatCurrency(tax)}</span></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', paddingTop: '8px', borderTop: `2px solid ${colors.border}` }}><span >Total:</span><span >{formatCurrency(total)}</span></div>
                        {invoice.amountPaid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.success, fontWeight: '500', margin: '4px 0' }}><span >Amount Paid:</span><span >- {formatCurrency(invoice.amountPaid)}</span></div>}
                        {derivedStatus !== 'Paid' ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', marginTop: '8px' }}>
                                <span>Amount Due:</span>
                                <span>{formatCurrency(total - (invoice.amountPaid || 0))}</span>
                            </div>
                        ) : (
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '8px' }}><span style={{ color: colors.muted }}>Method:</span><span style={{ fontWeight: '500' }}>{invoice.paymentMethod || 'N/A'}</span></div>
                        )}
                    </div>
                </div>

                <footer style={{ color: colors.muted, fontSize: '12px', paddingTop: '32px', marginTop: '32px', borderTop: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="QR" style={{ width: '80px', height: '80px' }}/>}
                            <div>
                                <h4 style={{ fontWeight: 'bold', fontSize: '16px', color: '#334155', margin: 0 }}>Scan to Verify</h4>
                                <p style={{ margin: '4px 0 0' }}>Authentic document verified by Sprout Track</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {derivedStatus !== 'Paid' && businessProfile?.accounts?.length > 0 && businessProfile.accounts.some((acc: any) => acc.bankName && acc.accountNumber) && (
                            <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', textAlign: 'left' }}>
                              <h4 style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b', marginBottom: '12px', margin: 0 }}>Payment Info</h4>
                              <div style={{ marginTop: '8px' }}>
                                {businessProfile.accounts.map((acc: any, i: number) => (
                                  acc.bankName && acc.accountNumber && (
                                    <div key={i} style={{ fontSize: '12px', marginBottom: '8px' }}>
                                      <p style={{ fontWeight: '600', margin: 0 }}>{acc.bankName}</p>
                                      <p style={{ margin: 0 }}>Acct: {acc.accountNumber}</p>
                                      <p style={{ margin: 0 }}>Name: {acc.accountName}</p>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          )}
                          <p style={{ margin: 0 }}>Thank you for your business!</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

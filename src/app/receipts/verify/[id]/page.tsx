
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Sprout } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default async function VerifyReceiptPage({ params }: { params: { id: string }}) {
    let invoice = null;
    let wasFound = false;

    try {
        // Read from the PublicMirror collection instead of private user data
        const publicDocRef = doc(db, 'publicInvoices', params.id);
        const docSnap = await getDoc(publicDocRef);
        
        if (docSnap.exists()) {
            invoice = docSnap.data();
            wasFound = true;
        }
    } catch (error) {
        console.error("Verification fetch error:", error);
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    const formatDate = (ts: any) => ts?.toDate ? format(ts.toDate(), "PP") : 'N/A';

    return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto">
                {wasFound && invoice ? (
                     <Card className="shadow-lg">
                        <CardHeader className="text-center bg-background/50">
                             <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-2">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl">Document Verified</CardTitle>
                            <CardDescription>This document is authentic and has been verified in our system.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="text-sm text-muted-foreground pt-1">
                                    <p className="font-bold text-lg sm:text-xl text-foreground">{invoice.businessName}</p>
                                    <p className="text-xs">Securely verified via Sprout Track</p>
                                  </div>
                                  <div className="relative bg-muted rounded-md flex items-center justify-center border overflow-hidden shrink-0 w-20 h-20">
                                      <Sprout className="h-8 w-8 text-primary" />
                                  </div>
                                </div>

                                <Separator />
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Billed To:</p>
                                        <p className="font-bold">{invoice.customerName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted-foreground">Invoice #:</p>
                                        <p className="font-bold">{invoice.invoiceNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Date Issued:</p>
                                        <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted-foreground">Status:</p>
                                        <Badge variant="outline" className={cn("border-transparent", invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>{invoice.status}</Badge>
                                    </div>
                                </div>
                                
                                 <div className="my-6 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="border-b bg-muted/50">
                                            <tr className="text-muted-foreground">
                                                <th className="p-3 text-left font-medium">Item</th>
                                                <th className="p-3 text-right font-medium">Qty</th>
                                                <th className="p-3 text-right font-medium">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                          {invoice.lineItems?.map((item: any, index: number) => (
                                            <tr key={index} className="border-b">
                                              <td className="p-3 font-medium text-left">{item.name}</td>
                                              <td className="p-3 text-right">{item.quantity.toLocaleString()}</td>
                                              <td className="p-3 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                         <tfoot>
                                            <tr className="font-bold">
                                                <td colSpan={2} className="p-3 text-right">Grand Total</td>
                                                <td className="p-3 text-right">{formatCurrency(invoice.amount)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                  </div>

                            </div>
                        </CardContent>
                     </Card>
                ) : (
                    <Card className="border-destructive shadow-lg">
                        <CardHeader className="text-center">
                             <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
                                <AlertTriangle className="h-10 w-10 text-destructive" />
                            </div>
                            <CardTitle className="text-2xl">Verification Failed</CardTitle>
                            <CardDescription>This document could not be found in our system. It may be invalid, forged, or deleted.</CardDescription>
                        </CardHeader>
                    </Card>
                )}

                 <p className="text-center text-xs text-muted-foreground mt-4">
                    Powered by Sprout Track Security
                </p>
            </div>
        </div>
    );
}

export const dynamic = 'force-dynamic';

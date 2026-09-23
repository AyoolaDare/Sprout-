
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getInvoiceById, recordInvoicePayment } from '@/lib/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const paymentSchema = z.object({
  amount: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Must be a valid number" }).pipe(z.coerce.number().min(0.01, 'Payment amount must be greater than zero.')),
  notes: z.string().min(1, 'A description or reference note is required.'),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function OffsetBalancePage() {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { id } = params;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      notes: '',
    },
  });

  useEffect(() => {
    async function fetchInvoice() {
      if (user && id) {
        setLoading(true);
        const invoiceData = await getInvoiceById(user.uid, id as string);
        setInvoice(invoiceData);
        if (invoiceData) {
            const amountDue = (invoiceData.amount || 0) - (invoiceData.amountPaid || 0);
            form.setValue('amount', amountDue);
        }
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [user, id, form]);

  const onSubmit = async (data: PaymentFormValues) => {
    if (!user || !invoice) return;

    startTransition(async () => {
      try {
        // We pass 'Offset' as a generic method now that the dropdown is removed
        await recordInvoicePayment(user.uid, invoice.id, Number(data.amount), 'Offset', data.notes || '');
        toast({
          title: 'Balance Offset Success!',
          description: `A payment of ₦${data.amount.toLocaleString()} has been recorded.`,
        });
        router.push(`/invoices/${invoice.id}`);
      } catch (error: any) {
        console.error('Error recording payment:', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'There was a problem recording the payment.',
        });
      }
    });
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };
  
  if (loading) {
    return <Skeleton className="h-96 w-full max-w-lg mx-auto" />
  }

  if (!invoice) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <h2 className="text-2xl font-bold">Invoice not found</h2>
            <Button onClick={() => router.push('/invoices')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
            </Button>
        </div>
    );
  }

  const amountDue = (invoice.amount || 0) - (invoice.amountPaid || 0);

  return (
    <div className="max-w-lg mx-auto">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-primary" />
             </div>
             <div>
                <CardTitle>Offset Outstanding Balance</CardTitle>
                <CardDescription>Record a payment for {invoice.customerName}</CardDescription>
             </div>
          </div>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2 border">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Original Invoice Total:</span>
                            <span className="font-medium">{formatCurrency(invoice.amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Previously Paid:</span>
                            <span className="font-medium text-emerald-600">{formatCurrency(invoice.amountPaid)}</span>
                        </div>
                         <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Balance Remaining:</span>
                            <span className="text-red-600">{formatCurrency(amountDue)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Current Payment (₦)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="text" 
                                        inputMode="decimal"
                                        className="text-lg font-bold"
                                        {...field} 
                                    />
                                </FormControl>
                                <FormDescription>Enter the amount being cleared now.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                         <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Transaction Reference / Description</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="e.g., Cash payment, Cheque #123, or Partial credit swap"
                                        className="resize-none"
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button type="submit" disabled={isPending} className="w-full h-12 text-base">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm and Offset Balance
                    </Button>
                    <p className="text-xs text-center text-muted-foreground italic">
                        This action recorded against invoice #{invoice.invoiceNumber}. It will automatically update the customer's total ledger.
                    </p>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}

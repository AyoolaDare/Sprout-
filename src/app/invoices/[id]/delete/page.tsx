
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getInvoiceById, deleteInvoice } from '@/lib/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Trash2, AlertTriangle, Undo2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DeleteInvoicePage() {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { id } = params;

  useEffect(() => {
    async function fetchItem() {
      if (user && id) {
        setLoading(true);
        const itemData = await getInvoiceById(user.uid, id as string);
        setInvoice(itemData);
        setLoading(false);
      }
    }
    fetchItem();
  }, [user, id]);

  const handleDelete = async () => {
    if (!user || !invoice) return;

    startDeleteTransition(async () => {
      try {
        await deleteInvoice(user.uid, invoice.id, invoice.lineItems);
        toast({
          title: 'Success!',
          description: `Invoice "${invoice.invoiceNumber}" has been deleted and items have been restocked.`,
        });
        router.push('/invoices');
      } catch (error: any) {
        console.error('Error deleting invoice:', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'There was a problem deleting the invoice.',
        });
      }
    });
  };

  if (loading) {
    return <Skeleton className="h-96 w-full max-w-lg mx-auto" />
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-2xl font-bold">Invoice not found</h2>
        <Button onClick={() => router.push('/invoices')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel and Go Back
      </Button>
      <Card className="border-destructive">
        <CardHeader className="text-center">
            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="mt-4">Are you absolutely sure?</CardTitle>
            <CardDescription>
                This action cannot be undone. This will permanently delete invoice
                <span className="font-bold text-foreground"> #{invoice.invoiceNumber} </span>
                for <span className="font-bold text-foreground">{invoice.customerName}</span>.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Alert>
                <Undo2 className="h-4 w-4" />
                <AlertTitle className="font-semibold">This is a Goods Return</AlertTitle>
                <AlertDescription>
                    Deleting this invoice will automatically return all sold items to your inventory.
                </AlertDescription>
            </Alert>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row-reverse gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Yes, delete this invoice
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/invoices')}
            disabled={isDeleting}
            className="w-full"
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

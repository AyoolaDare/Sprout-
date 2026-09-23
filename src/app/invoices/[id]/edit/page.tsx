'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInvoiceById } from '@/lib/firestore';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { EditInvoiceForm } from '../../edit-invoice-form';

export default function EditInvoicePage() {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    async function fetchInvoice() {
      if (user && id) {
        setLoading(true);
        const data = await getInvoiceById(user.uid, id as string);
        setInvoice(data);
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [user, id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
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

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <EditInvoiceForm invoice={invoice} />
    </div>
  );
}

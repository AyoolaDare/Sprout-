
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInventoryItemById } from '@/lib/firestore';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Edit, Package, Trash2, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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

export default function InventoryItemDetailsPage() {
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    async function fetchItem() {
      if (user && id) {
        setLoading(true);
        const itemData = await getInventoryItemById(user.uid, id as string);
        setItem(itemData);
        setLoading(false);
      }
    }
    fetchItem();
  }, [user, id]);
  
  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };
  
  const formatNumber = (num: number) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };


  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/4 mt-2" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-2xl font-bold">Item not found</h2>
        <p className="text-muted-foreground">The requested inventory item could not be found.</p>
        <Button onClick={() => router.push('/inventory')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory</Button>
      </div>
    );
  }

  const isLowStock = item.quantity <= (item.reorderLevel || 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/inventory')} className="w-full sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
        </Button>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button className="w-full" onClick={() => router.push(`/inventory/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the item <span className="font-bold text-foreground">{item.name}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.push(`/inventory/${id}/delete`)}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
      
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <CardTitle className="text-3xl">{item.name}</CardTitle>
              <CardDescription>{item.category || 'No Category'}</CardDescription>
            </div>
            {isLowStock ? (
                <Badge variant="destructive" className="whitespace-nowrap"><AlertTriangle className="h-3 w-3 mr-1.5"/>Low Stock</Badge>
              ) : (
                <Badge variant="secondary" className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">In Stock</Badge>
              )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Quantity</p>
              <p className="font-bold text-2xl">{formatNumber(item.quantity)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Unit Cost</p>
              <p className="font-medium">{formatCurrency(item.unitCost)}</p>
            </div>
             <div className="space-y-1">
              <p className="text-muted-foreground">Stock Value</p>
              <p className="font-medium">{formatCurrency(item.quantity * item.unitCost)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">SKU</p>
              <p className="font-mono bg-muted/50 px-2 py-1 rounded-md w-fit">{item.sku}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Reorder Level</p>
              <p className="font-medium">{formatNumber(item.reorderLevel)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Supplier</p>
              <p className="font-medium">{item.supplier || 'N/A'}</p>
            </div>
          </div>
           <Separator />
           <Button variant="outline" className="w-full" onClick={() => router.push(`/inventory/${id}/adjust-stock`)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Adjust Stock Quantity
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getInventoryItemById, adjustInventoryQuantity } from '@/lib/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const stockAdjustmentSchema = z.object({
  adjustment: z.string().refine(val => /^-?\d+$/.test(val), { message: "Must be a valid integer" }).pipe(z.coerce.number().int().refine(val => val !== 0, 'Adjustment cannot be zero.')),
  reason: z.string().min(1, 'A reason for the adjustment is required.'),
});

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;

export default function AdjustStockPage() {
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { id } = params;

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      adjustment: undefined,
      reason: '',
    },
  });

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

  const onSubmit = async (data: StockAdjustmentFormValues) => {
    if (!user || !item) return;

    startTransition(async () => {
      try {
        await adjustInventoryQuantity(user.uid, item.id, Number(data.adjustment), data.reason);
        toast({
          title: 'Success!',
          description: 'Stock quantity has been successfully updated.',
        });
        router.push('/inventory');
      } catch (error: any) {
        console.error('Error adjusting stock:', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'There was a problem adjusting the stock.',
        });
      }
    });
  };

  const formatNumber = (num: number) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  if (loading) {
    return <Skeleton className="h-96 w-full max-w-lg mx-auto" />
  }

  if (!item) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold">Inventory Item not found</h2>
            <Button onClick={() => router.push('/inventory')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
            </Button>
        </div>
    );
  }

  const currentQuantity = item.quantity || 0;

  return (
    <div className="max-w-lg mx-auto">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      <Card>
        <CardHeader>
          <CardTitle>Adjust Stock</CardTitle>
          <CardDescription>For {item.name}</CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-muted-foreground">Current Quantity</p>
                        <p className="text-3xl font-bold">{formatNumber(currentQuantity)}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="adjustment"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Adjustment</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="e.g., 10 or -5"
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Reason</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="text" 
                                        placeholder="e.g., New shipment"
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Adjust Stock
                </Button>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}


'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getInventoryItemById, updateInventoryItem } from '@/lib/firestore';
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

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required.'),
  sku: z.string().min(1, 'SKU is required.'),
  category: z.string().optional(),
  supplier: z.string().optional(),
  unitCost: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Must be a valid number" }).pipe(z.coerce.number().min(0, 'Unit cost must be a positive number.')),
  quantity: z.string().refine(val => /^\d+$/.test(val), { message: "Must be a valid integer" }).pipe(z.coerce.number().int().min(0, 'Quantity must be a positive integer.')),
  reorderLevel: z.string().refine(val => /^\d+$/.test(val), { message: "Must be a valid integer" }).pipe(z.coerce.number().int().min(0, 'Reorder level must be a positive integer.')),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditInventoryPage() {
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { id } = params;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    async function fetchItem() {
      if (user && id) {
        setLoading(true);
        const itemData = await getInventoryItemById(user.uid, id as string);
        if (itemData) {
          setItem(itemData);
          form.reset({
            name: itemData.name || '',
            sku: itemData.sku || '',
            category: itemData.category || '',
            supplier: itemData.supplier || '',
            unitCost: String(itemData.unitCost || '0'),
            quantity: String(itemData.quantity || '0'),
            reorderLevel: String(itemData.reorderLevel || '0'),
          });
        }
        setLoading(false);
      }
    }
    fetchItem();
  }, [user, id, form]);

  const onSubmit = async (data: ProductFormValues) => {
    if (!user || !item) return;

    startTransition(async () => {
      try {
        await updateInventoryItem(user.uid, item.id, {
            ...data,
            unitCost: Number(data.unitCost),
            quantity: Number(data.quantity),
            reorderLevel: Number(data.reorderLevel)
        });
        toast({
          title: 'Success!',
          description: 'Inventory item has been successfully updated.',
        });
        router.push('/inventory');
      } catch (error: any) {
        console.error('Error updating item:', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'There was a problem updating the item.',
        });
      }
    });
  };
  
  if (loading) {
    return <Skeleton className="h-96 w-full max-w-3xl mx-auto" />
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

  return (
    <div className="max-w-3xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex items-center gap-4 mb-8">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
              {item.name}
            </h1>
            <div className="hidden items-center gap-2 md:ml-auto md:flex">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Product
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>Update the details for your inventory item.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                    )}/>
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                    )}/>
                    <FormField
                        control={form.control}
                        name="unitCost"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Unit Cost (₦)</FormLabel>
                                <FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                    )}/>
                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantity in Stock</FormLabel>
                                <FormControl><Input type="text" inputMode="numeric" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                    )}/>
                    <FormField
                        control={form.control}
                        name="reorderLevel"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reorder Level</FormLabel>
                                <FormControl><Input type="text" inputMode="numeric" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                    )}/>
                    <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Supplier</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                    )}/>
                </div>
            </CardContent>
          </Card>
           <div className="mt-4 flex items-center justify-end gap-2 md:hidden">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Product
              </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}

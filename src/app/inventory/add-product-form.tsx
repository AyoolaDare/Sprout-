
'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2 } from 'lucide-react';
import { addInventoryItem } from '@/lib/firestore'; // Use centralized function
import { useAuth } from '@/components/auth-provider';

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

export function AddProductForm({ onProductAdded }: { onProductAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();
  const [skuRandomPart, setSkuRandomPart] = useState<number>(0);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      category: '',
      supplier: '',
      unitCost: "0",
      quantity: "0",
      reorderLevel: "0",
    },
  });

  const watchedName = form.watch('name');

  useEffect(() => {
    if (open) {
      setSkuRandomPart(Math.floor(100 + Math.random() * 900));
      form.reset({
        name: '',
        sku: '',
        category: '',
        supplier: '',
        unitCost: "0",
        quantity: "0",
        reorderLevel: "0",
      });
    }
  }, [open, form]);


  useEffect(() => {
    if (watchedName && skuRandomPart) {
      const nameParts = watchedName.toUpperCase().split(' ').filter(Boolean);
      let generatedSku = '';
      if (nameParts.length > 1) {
        generatedSku = nameParts.slice(0, 2).map(part => part.slice(0, 3)).join('-');
      } else if (nameParts.length === 1) {
        generatedSku = nameParts[0].slice(0, 3);
      }
      
      if (generatedSku) {
        form.setValue('sku', `${generatedSku}-${skuRandomPart}`, { shouldValidate: true });
      }
    }
  }, [watchedName, form, skuRandomPart]);


  async function onSubmit(data: ProductFormValues) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to add a product.',
      });
      return;
    }

    startTransition(async () => {
      try {
        await addInventoryItem(user.uid, {
            ...data,
            unitCost: Number(data.unitCost),
            quantity: Number(data.quantity),
            reorderLevel: Number(data.reorderLevel)
        });
        toast({
          title: 'Success!',
          description: `Product "${data.name}" has been added.`,
        });
        form.reset();
        setOpen(false);
        onProductAdded();
      } catch (error) {
        console.error("Error adding product:", error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: 'There was a problem with your request.',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add a New Product</DialogTitle>
          <DialogDescription>
            Enter the details of the new product to add it to your inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-1 py-4 -mx-1 sm:px-6 sm:-mx-6">
          <Form {...form}>
            <form id="add-product-form" className="space-y-6 px-5 sm:px-0">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Organic Coffee Beans" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-generated SKU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input placeholder="e.g., Food & Groceries" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost (₦)</FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="reorderLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Level</FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Acme Roasters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} form="add-product-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

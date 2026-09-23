'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns";

import { Button } from '@/components/ui/button';
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
import { getInventory, updateInvoice } from '@/lib/firestore'; 
import { PlusCircle, Loader2, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

const lineItemSchema = z.object({
  productId: z.string().min(1, "Please select a product."),
  name: z.string(),
  quantity: z.string().refine(val => /^\d+$/.test(val), { message: "Must be a valid integer" }).pipe(z.coerce.number().int().min(1, "Quantity must be at least 1.")),
  unitPrice: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Must be a valid number" }).pipe(z.coerce.number().min(0, "Price must be a positive number.")),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  customerName: z.string().min(1, 'Customer name is required.'),
  customerPhone: z.string().optional(),
  customerCompany: z.string().optional(),
  customerAddress: z.string().optional(),
  issueDate: z.date({ required_error: "An issue date is required." }),
  dueDate: z.date({ required_error: "A due date is required." }),
  paymentMethod: z.enum(['Credit', 'Cash', 'Transfer', 'Others']),
  calculateVat: z.boolean().default(false),
  lineItems: z.array(lineItemSchema).min(1, "Please add at least one product to the invoice."),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export function EditInvoiceForm({ invoice }: { invoice: any }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const { user } = useAuth();
  const router = useRouter();
 
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone || '',
      customerCompany: invoice.customerCompany || '',
      customerAddress: invoice.customerAddress || '',
      paymentMethod: invoice.paymentMethod || 'Credit',
      lineItems: invoice.lineItems.map((item: any) => ({
          ...item,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice)
      })),
      issueDate: new Date(invoice.issueDate),
      dueDate: new Date(invoice.dueDate),
      calculateVat: !!invoice.vatAmount,
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });
  
  const watchedIssueDate = form.watch('issueDate');

  useEffect(() => {
    async function fetchInventoryItems() {
        if (user) {
            const items = await getInventory(user.uid);
            setInventory(items);
        }
    }
    fetchInventoryItems();
  }, [user]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      const lineItems = value.lineItems || [];
      const subtotal = lineItems.reduce((acc, item) => acc + ((Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0)), 0);
      setTotalAmount(subtotal);

      const shouldCalculateVat = value.calculateVat;
      const calculatedVat = shouldCalculateVat ? subtotal * 0.075 : 0;
      setVatAmount(calculatedVat);
      
      setGrandTotal(subtotal + calculatedVat);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleProductSelect = (productId: string, index: number) => {
    const product = inventory.find(p => p.id === productId);
    if (product) {
      form.setValue(`lineItems.${index}.productId`, product.id, { shouldValidate: true });
      form.setValue(`lineItems.${index}.name`, product.name);
      form.setValue(`lineItems.${index}.unitPrice`, String(product.unitPrice || product.unitCost || 0), { shouldValidate: true });
    }
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  async function onSubmit(data: InvoiceFormValues) {
    if (!user) return;

    startTransition(async () => {
      try {
        await updateInvoice(user.uid, invoice.id, {
            ...data,
            lineItems: data.lineItems.map(item => ({...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice)})),
            vatAmount: vatAmount
        });

        toast({
          title: 'Success!',
          description: `Invoice ${invoice.invoiceNumber} has been successfully updated.`,
        });
        router.push(`/invoices/${invoice.id}`);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'There was a problem updating the invoice.',
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Invoice #{invoice.invoiceNumber}</CardTitle>
        <CardDescription>Adjust the details of this transaction. Inventory will be synced automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form id="edit-invoice-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                        <FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="customerPhone" render={({ field }) => (
                        <FormItem><FormLabel>Customer Phone (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="customerCompany" render={({ field }) => (
                        <FormItem><FormLabel>Customer Company (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="customerAddress" render={({ field }) => (
                        <FormItem><FormLabel>Customer Address (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="issueDate" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl>
                              <Input 
                                  type="date"
                                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                  onChange={(e) => field.onChange(new Date(e.target.value))}
                                  className="w-full"
                              />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                              <Input 
                                  type="date"
                                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                  onChange={(e) => field.onChange(new Date(e.target.value))}
                                  min={format(watchedIssueDate, 'yyyy-MM-dd')}
                                  className="w-full"
                              />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}/>
                   <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem><FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a payment method" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Credit">Credit</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Transfer">Transfer</SelectItem>
                                <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )}/>
                </div>
                <FormField control={form.control} name="calculateVat" render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-3 rounded-md border p-4 h-full">
                      <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Calculate VAT (7.5%)</FormLabel>
                      </div>
                  </FormItem>
                )}/>
            
                <Separator />

                <div>
                    <h3 className="text-lg font-medium mb-4">Line Items</h3>
                    <div className="space-y-4">
                        {fields.map((field, index) => (
                        <div key={field.id} className="grid gap-4 rounded-md border p-4 relative">
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 h-7 w-7">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <FormField
                                control={form.control}
                                name={`lineItems.${index}.productId`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Product</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); handleProductSelect(value, index); }} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a product" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>{inventory.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <FormField
                                control={form.control}
                                name={`lineItems.${index}.quantity`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl><Input type="text" inputMode="numeric" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`lineItems.${index}.unitPrice`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unit Price (₦)</FormLabel>
                                    <FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <div className="hidden sm:flex flex-col justify-end">
                                <p className="text-sm font-medium text-muted-foreground">Line Total</p>
                                    <p className="w-full h-10 flex items-center text-sm font-bold">
                                    {formatCurrency((Number(form.watch(`lineItems.${index}.quantity`)) || 0) * (Number(form.watch(`lineItems.${index}.unitPrice`)) || 0))}
                                    </p>
                            </div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>

                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', name: '', quantity: "1", unitPrice: "0" })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
                </Button>
            </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center border-t p-6 gap-4">
          <div className="text-center sm:text-left">
              <p className="text-muted-foreground text-sm">Total: {formatCurrency(totalAmount)} + VAT: {formatCurrency(vatAmount)}</p>
              <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
              <Button type="submit" form="edit-invoice-form" disabled={isPending} className="flex-grow sm:flex-grow-0">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
              </Button>
          </div>
      </CardFooter>
    </Card>
  );
}

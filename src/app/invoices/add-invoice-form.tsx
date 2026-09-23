'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { startOfDay, format } from "date-fns";

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
import { getInventory, createInvoice, getBusinessProfile } from '@/lib/firestore'; 
import { PlusCircle, Loader2, Trash2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

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


export function AddInvoiceForm({ onInvoiceAdded }: { onInvoiceAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const { user } = useAuth();
 
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: '',
      customerName: '',
      customerPhone: '',
      customerCompany: '',
      customerAddress: '',
      paymentMethod: 'Credit',
      lineItems: [],
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      calculateVat: false,
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });
  
  const watchedIssueDate = form.watch('issueDate');

  const fetchAndSetup = useCallback(async () => {
      if (!user) return;
      
      const [items, profile] = await Promise.all([
          getInventory(user.uid),
          getBusinessProfile(user.uid)
      ]);
      setInventory(items);

      let prefix = "INV";
      if (profile?.businessName) {
          const initials = profile.businessName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
          prefix = initials.slice(0, 3);
      }
      
      const newInvoiceNumber = `${prefix}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      form.reset({
          invoiceNumber: newInvoiceNumber,
          customerName: '',
          customerPhone: '',
          customerCompany: '',
          customerAddress: '',
          paymentMethod: 'Credit',
          lineItems: [],
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          calculateVat: false,
      });

  }, [user, form]);


  useEffect(() => {
    if (open) {
        fetchAndSetup();
    }
  }, [open, fetchAndSetup]);


  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
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
      form.setValue(`lineItems.${index}.unitPrice`, String(product.unitCost), { shouldValidate: true });
    }
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };


  async function onSubmit(data: InvoiceFormValues) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create an invoice.',
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await createInvoice(user.uid, {
            ...data,
            status: data.paymentMethod === 'Cash' || data.paymentMethod === 'Transfer' ? 'Paid' : 'Pending',
            lineItems: data.lineItems.map(item => ({...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice)})),
            vatAmount: vatAmount
        });

        toast({
          title: 'Success!',
          description: `Invoice ${result.invoiceNumber} created and customer profile updated.`,
        });
        form.reset();
        setOpen(false);
        onInvoiceAdded();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'There was a problem with your request.';
        console.error("Error creating invoice:", errorMessage);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: errorMessage,
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Fill out the details below. This will also create or update a customer profile.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-1 py-4 -mx-1 sm:px-6 sm:-mx-6">
            <Form {...form}>
            <form id="add-invoice-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-5 sm:px-0">
                <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                    <FormItem><FormLabel>Invoice Number</FormLabel><FormControl><Input {...field} readOnly disabled /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                  <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem><FormLabel>Customer Phone (Optional)</FormLabel><FormControl><Input placeholder="e.g., 08012345678" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                  <FormField control={form.control} name="customerCompany" render={({ field }) => (
                    <FormItem><FormLabel>Customer Company (Optional)</FormLabel><FormControl><Input placeholder="e.g., Acme Inc." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                  <FormField control={form.control} name="customerAddress" render={({ field }) => (
                    <FormItem><FormLabel>Customer Address (Optional)</FormLabel><FormControl><Input placeholder="e.g., 123 Main St, Lagos" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="issueDate" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Issue Date</FormLabel>
                          <FormControl>
                              <Input 
                                  type="date"
                                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                  onChange={(e) => field.onChange(new Date(e.target.value))}
                                  className="w-full max-w-sm"
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
                                  className="w-full max-w-sm"
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
                </div>
            
                <Separator />

                <div>
                <h3 className="text-lg font-medium mb-4">Products</h3>
                <div className="space-y-4">
                    {fields.map((field, index) => (
                    <div key={field.id} className="grid gap-4 rounded-md border p-4 relative">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 h-7 w-7">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove Item</span>
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
                                    <SelectContent><SelectItem value="none">-- No Inventory --</SelectItem>{inventory.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
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
                                <FormControl><Input type="text" inputMode="numeric" placeholder="Qty" {...field} /></FormControl>
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
                                <FormControl><Input type="text" inputMode="decimal" placeholder="Price (₦)" {...field} /></FormControl>
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
                <FormMessage>{form.formState.errors.lineItems?.message}</FormMessage>
                <FormMessage>{form.formState.errors.lineItems?.root?.message}</FormMessage>
                </div>

                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ productId: 'none', name: '', quantity: "1", unitPrice: "0" })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
                </Button>
            </form>
            </Form>
        </div>
        <DialogFooter>
          <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4">
              <div className="text-center sm:text-left w-full">
                  <p className="text-muted-foreground text-sm">Total: {formatCurrency(totalAmount)} + VAT: {formatCurrency(vatAmount)}</p>
                  <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
              </div>
              <div className="flex gap-2 w-full justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
                  <Button type="submit" form="add-invoice-form" onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Invoice
                  </Button>
              </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

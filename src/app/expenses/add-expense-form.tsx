
'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, startOfDay } from "date-fns";
import { recordExpense } from '@/lib/firestore';
import { useAuth } from '@/components/auth-provider';
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
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const expenseSchema = z.object({
  date: z.date({ required_error: "An expense date is required." }),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().min(1, 'Description is required.'),
  amount: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Must be a valid number" }).pipe(z.coerce.number().min(0.01, 'Amount must be greater than 0.')),
  inventoryId: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export function AddExpenseForm({ onExpenseAdded }: { onExpenseAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<any[]>([]);
  const { user } = useAuth();
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      category: '',
      description: '',
      amount: "0",
      inventoryId: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        date: new Date(),
        category: '',
        description: '',
        amount: "0",
        inventoryId: '',
      });
    }
  }, [open, form]);

  useEffect(() => {
    async function fetchInventory() {
        if (!user || !open) return;
        
        async function getInventoryItems(userId: string): Promise<any[]> {
            if (!userId) return [];
            const inventoryCollectionRef = collection(db, 'users', userId, 'inventory');
            const querySnapshot = await getDocs(inventoryCollectionRef);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        const items = await getInventoryItems(user.uid);
        setInventory(items);
    }
    fetchInventory();
  }, [open, user]);

  async function onSubmit(data: ExpenseFormValues) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to add an expense.',
      });
      return;
    }

    startTransition(async () => {
      try {
        await recordExpense(user.uid, { ...data, date: data.date, amount: Number(data.amount) });
        toast({
          title: 'Success!',
          description: `Expense of ₦${Number(data.amount).toFixed(2)} has been recorded.`,
        });
        form.reset();
        setOpen(false);
        onExpenseAdded(); // Callback to refresh the list
      } catch (error) {
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
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Record a New Expense</DialogTitle>
          <DialogDescription>
            Enter the details for your expense below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mx-6 px-6 py-4">
          <Form {...form}>
            <form id="add-expense-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Input placeholder="e.g., Office supplies, Fuel for van" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                )}/>
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Expense Date</FormLabel>
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
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₦)</FormLabel>
                      <FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                )} />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <div className="relative">
                        <FormControl><Input placeholder="e.g., Transportation, Office Supplies" {...field} /></FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                )} />
                <FormField
                    control={form.control}
                    name="inventoryId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Related Inventory (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select an inventory item" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {inventory.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                )} />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="add-expense-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

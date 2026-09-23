'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getExpenseById, updateExpense } from '@/lib/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const expenseSchema = z.object({
  date: z.date({ required_error: "An expense date is required." }),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().min(1, 'Description is required.'),
  amount: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Must be a valid number" }).pipe(z.coerce.number().min(0.01, 'Amount must be greater than 0.')),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function EditExpensePage() {
  const [expense, setExpense] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { id } = params;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
  });

  useEffect(() => {
    async function fetchExpense() {
      if (user && id) {
        setLoading(true);
        const expenseData = await getExpenseById(user.uid, id as string);
        if (expenseData) {
          setExpense(expenseData);
          form.reset({
            ...expenseData,
            amount: String(expenseData.amount),
          });
        }
        setLoading(false);
      }
    }
    fetchExpense();
  }, [user, id, form]);

  const onSubmit = async (data: ExpenseFormValues) => {
    if (!user || !expense) return;

    startTransition(async () => {
      try {
        await updateExpense(user.uid, expense.id, { ...data, amount: Number(data.amount) });
        toast({
          title: 'Success!',
          description: 'Expense has been successfully updated.',
        });
        router.push('/expenses');
      } catch (error: any) {
        console.error('Error updating expense:', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'There was a problem updating the expense.',
        });
      }
    });
  };
  
  if (loading) {
    return <Skeleton className="h-96 w-full max-w-xl mx-auto" />
  }

  if (!expense) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold">Expense not found</h2>
            <Button onClick={() => router.push('/expenses')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Expenses
            </Button>
        </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex items-center gap-4 mb-8">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
              Edit Expense
            </h1>
            <div className="hidden items-center gap-2 md:ml-auto md:flex">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
              <CardDescription>Update the details for your expense.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      )}/>
                  </div>
                  <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Category</FormLabel>
                              <FormControl><Input placeholder="e.g., Operational Expenses" {...field} /></FormControl>
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
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

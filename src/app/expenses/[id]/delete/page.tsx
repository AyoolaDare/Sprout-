
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getExpenseById, deleteExpense } from '@/lib/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Trash2, AlertTriangle } from 'lucide-react';

export default function DeleteExpensePage() {
  const [expense, setExpense] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { id } = params;

  useEffect(() => {
    async function fetchExpense() {
      if (user && id) {
        setLoading(true);
        const expenseData = await getExpenseById(user.uid, id as string);
        setExpense(expenseData);
        setLoading(false);
      }
    }
    fetchExpense();
  }, [user, id]);

  const handleDelete = async () => {
    if (!user || !expense) return;

    startDeleteTransition(async () => {
      try {
        await deleteExpense(user.uid, expense.id);
        toast({
          title: 'Success!',
          description: `Expense "${expense.description}" has been deleted.`,
        });
        router.push('/expenses');
      } catch (error: any) {
        console.error('Error deleting expense:', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'There was a problem deleting the expense.',
        });
      }
    });
  };

  if (loading) {
    return <Skeleton className="h-96 w-full max-w-lg mx-auto" />
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
                This action cannot be undone. This will permanently delete the expense
                <span className="font-bold text-foreground"> {expense.description} </span>.
            </CardDescription>
        </CardHeader>
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
            Yes, delete this expense
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/expenses')}
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

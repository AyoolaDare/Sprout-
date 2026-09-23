
'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRecentTransactions } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useRouter } from 'next/navigation';

type TransactionType = 'Income' | 'Expense' | 'Refund';

export default function RecentTransactionsCard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchTransactions() {
      if (!user) return;
      
      setLoading(true);
      try {
          const { recentTransactions } = await getRecentTransactions(user.uid, 1, 5); // Fetch first 5
          setTransactions(recentTransactions);
      } catch (error) {
          console.error("Failed to fetch transactions", error);
      } finally {
          setLoading(false);
      }
    }
    fetchTransactions();
  }, [user]);

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };
  
  const getTransactionStyle = (type: TransactionType) => {
    switch (type) {
      case 'Income':
        return {
          amountClass: 'text-emerald-600',
          badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
          sign: '+'
        };
      case 'Expense':
        return {
          amountClass: 'text-red-600',
          badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
          sign: '-'
        };
      case 'Refund':
         return {
          amountClass: 'text-slate-600 dark:text-slate-400',
          badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
          sign: ''
        };
      default:
        return {
          amountClass: 'text-foreground',
          badgeClass: 'bg-slate-100 text-slate-800',
          sign: ''
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isValid(date)) {
        return format(date, "PP");
    }
    return "Invalid Date";
  }
  
  const renderSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          Your latest 5 financial activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative px-2 sm:px-6">
        {loading ? renderSkeleton() : (
          <>
            <div className="space-y-2">
                {transactions.map((transaction: any) => {
                    const style = getTransactionStyle(transaction.type);
                    return (
                        <div key={transaction.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 p-3 rounded-md border -mx-2 sm:mx-0">
                            <p className="font-medium truncate col-start-1">{transaction.description}</p>
                            <p className={cn("font-semibold row-start-1 col-start-2 text-right", style.amountClass)}>
                                {style.sign}{formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-sm text-muted-foreground col-start-1">{formatDate(transaction.date)}</p>
                            <Badge
                                variant="outline"
                                className={cn("border-transparent text-xs row-start-2 col-start-2 justify-self-end", style.badgeClass)}
                            >
                                {transaction.type}
                            </Badge>
                        </div>
                    );
                })}
            </div>
            {transactions.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8">No transactions found.</p>
            )}
          </>
        )}
      </CardContent>
      <CardContent>
        <Button variant="outline" className="w-full" onClick={() => router.push('/transactions')}>
            View All Transactions
            <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

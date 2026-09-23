
'use client';
import { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Search, ShoppingCart, Loader2, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getExpenses } from '@/lib/firestore';
import { AddExpenseForm } from './add-expense-form';
import { useAuth } from '@/components/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const refreshExpenses = useCallback(async () => {
      if (!user) return;
      setLoading(true);
      const expenseData = await getExpenses(user.uid);
      setExpenses(expenseData);
      setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshExpenses();
  }, [user, refreshExpenses]);

  const categories = useMemo(() => {
    const unique = new Set(expenses.map(e => e.category).filter(Boolean));
    return Array.from(unique);
  }, [expenses]);

  useEffect(() => {
    startTransition(() => {
        let results = expenses.filter(expense =>
          (expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (categoryFilter === 'all' || expense.category === categoryFilter)
        );

        results.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            }
        });

        setFilteredExpenses(results);
    });
  }, [searchTerm, expenses, categoryFilter, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
        setSortBy(field);
        setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage your business spending.</p>
        </div>
        <AddExpenseForm onExpenseAdded={refreshExpenses} />
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search description..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <Select value={categoryFilter} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full sm:w-[160px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 border-l pl-3 ml-auto sm:ml-0">
                            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => toggleSort('date')}>
                                Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => toggleSort('amount')}>
                                Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="relative">
           {isPending && (
             <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
           )}
           {filteredExpenses.length === 0 && !loading && (
             <div className="text-center py-12">
               <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
               <h3 className="mt-4 text-lg font-semibold">No Expenses Found</h3>
               <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or add a new expense.</p>
             </div>
           )}
           
           <div className="md:hidden space-y-4">
             {filteredExpenses.map(expense => (
               <Card key={expense.id} className="overflow-hidden" onClick={() => router.push(`/expenses/${expense.id}/edit`)}>
                 <CardContent className="p-4 flex gap-4">
                   <div className="flex-grow">
                       <div className="flex justify-between items-start">
                           <div className="flex-grow pr-4 overflow-hidden">
                               <p className="font-semibold truncate">{expense.description}</p>
                               <p className="text-xs text-muted-foreground">{expense.date}</p>
                           </div>
                           <div className="flex flex-col items-end gap-2 shrink-0">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 -mt-1 -mr-2" onClick={(e) => e.stopPropagation()}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => router.push(`/expenses/${expense.id}/edit`)}>Edit</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onSelect={() => router.push(`/expenses/${expense.id}/delete`)}>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <p className="text-base font-bold">{formatCurrency(expense.amount)}</p>
                           </div>
                       </div>
                       <div className="flex justify-between items-end mt-2">
                          <Badge variant="outline" className="text-[10px]">{expense.category}</Badge>
                       </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="cursor-pointer group" onClick={() => router.push(`/expenses/${expense.id}/edit`)}>
                        <TableCell className="text-sm whitespace-nowrap">{expense.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {expense.description}
                        </TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => router.push(`/expenses/${expense.id}/edit`)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onSelect={() => router.push(`/expenses/${expense.id}/delete`)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

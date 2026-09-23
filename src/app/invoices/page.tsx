
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
import { MoreHorizontal, Search, FileText, Loader2, Trash2, Edit, CreditCard, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInvoices } from '@/lib/firestore';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { AddInvoiceForm } from './add-invoice-form';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const getDerivedStatus = (invoice: any) => {
        if (invoice.status === 'Paid') return 'Paid';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(invoice.dueDate);
        if (dueDate < today) return 'Overdue';
        return 'Pending';
    };

    const triggerRefresh = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const invoiceData = await getInvoices(user.uid);
            setInvoices(invoiceData);
        } catch (error) {
            console.error("Failed to load invoices:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch invoices."
            });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);
    
    useEffect(() => {
        triggerRefresh();
    }, [user, triggerRefresh]);

    useEffect(() => {
      startTransition(() => {
        let results = invoices.filter(invoice => {
          const status = getDerivedStatus(invoice);
          const matchesSearch = invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStatus = statusFilter === 'all' || status === statusFilter;
          return matchesSearch && matchesStatus;
        });

        results.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.issueDate).getTime();
                const dateB = new Date(b.issueDate).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            }
        });

        setFilteredInvoices(results);
      });
    }, [searchTerm, invoices, statusFilter, sortBy, sortOrder]);
    
    const toggleSort = (field: 'date' | 'amount') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const getStatusBadgeClass = (status: string) => {
         switch (status) {
            case 'Paid':
                return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case 'Overdue':
                return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            default:
                return 'bg-slate-100 text-slate-800';
        }
    }

    const formatCurrency = (amount: number) => {
      if (typeof amount !== 'number') amount = 0;
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    if (loading && invoices.length === 0) {
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
      )
    }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage your sales and billing.</p>
        </div>
        <AddInvoiceForm onInvoiceAdded={triggerRefresh}/>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search customer or #..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="Paid">Paid</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Overdue">Overdue</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1 border-l pl-3 ml-auto sm:ml-0">
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleSort('date')}>
                                Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleSort('amount')}>
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
            {(!loading && filteredInvoices.length === 0) && (
               <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Invoices Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Adjust your search or status filters.</p>
              </div>
            )}
            
            <div className="md:hidden space-y-4">
              {filteredInvoices.map(invoice => {
                const derivedStatus = getDerivedStatus(invoice);
                return (
                <Card key={invoice.id} className="overflow-hidden cursor-pointer" onClick={() => router.push(`/invoices/${invoice.id}`)}>
                  <CardContent className="p-4 flex items-start gap-4">
                     <div className="flex-grow flex justify-between items-start overflow-hidden">
                        <div className="space-y-1 flex-grow overflow-hidden">
                          <p className="font-semibold truncate">{invoice.customerName}</p>
                          <p className="text-[10px] text-muted-foreground truncate uppercase font-mono">{invoice.invoiceNumber}</p>
                          <p className="text-base font-bold pt-1">{formatCurrency(invoice.amount)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-y-2 flex-shrink-0">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 -mt-1 -mr-2" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => router.push(`/invoices/${invoice.id}`)}>View</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => router.push(`/invoices/${invoice.id}/edit`)}>Edit</DropdownMenuItem>
                              {(derivedStatus !== 'Paid') && (
                                <DropdownMenuItem onSelect={() => router.push(`/invoices/${invoice.id}/record-payment`)}>Record Payment</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                               <DropdownMenuItem className="text-destructive" onSelect={() => router.push(`/invoices/${invoice.id}/delete`)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Badge variant="outline" className={cn("border-transparent text-[10px] px-2 py-0", getStatusBadgeClass(derivedStatus))}>{derivedStatus}</Badge>
                          <p className="text-[10px] text-muted-foreground">{invoice.issueDate}</p>
                        </div>
                     </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>

            <div className="overflow-x-auto hidden md:block">
              <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => {
                        const derivedStatus = getDerivedStatus(invoice);
                        return (
                        <TableRow key={invoice.id} className="cursor-pointer group" onClick={() => router.push(`/invoices/${invoice.id}`)}>
                          <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="font-semibold">{invoice.customerName}</TableCell>
                          <TableCell className="text-sm">{invoice.issueDate}</TableCell>
                          <TableCell className="text-sm font-medium">{invoice.dueDate}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(invoice.amount)}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn("border-transparent text-[10px] font-bold uppercase", getStatusBadgeClass(derivedStatus))}
                            >
                              {derivedStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => router.push(`/invoices/${invoice.id}`)}>View</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => router.push(`/invoices/${invoice.id}/edit`)}>Edit</DropdownMenuItem>
                                {(derivedStatus !== 'Paid') && (
                                  <DropdownMenuItem onSelect={() => router.push(`/invoices/${invoice.id}/record-payment`)}>Record Payment</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                 <DropdownMenuItem className="text-destructive" onSelect={() => router.push(`/invoices/${invoice.id}/delete`)}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        )
                      })}
                    </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

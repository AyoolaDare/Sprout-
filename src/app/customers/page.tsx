
'use client';
import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { getCustomers } from '@/lib/firestore';
import { useAuth } from '@/components/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Search, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      const customerData = await getCustomers(user.uid);
      setCustomers(customerData);
      setFilteredCustomers(customerData);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    const results = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.company && customer.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCustomers(results);
  }, [searchTerm, customers]);


  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  if (loading) {
     return (
       <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        </div>
        <Card>
            <CardHeader><CardTitle>Customer List</CardTitle><CardDescription>A list of all customers in your system.</CardDescription></CardHeader>
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
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database, automatically updated by invoices.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>
                A list of all customers in your system.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search customers..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {filteredCustomers.length === 0 && !loading && (
              <div className="text-center py-12">
                  <User className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No Customers Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Customers will appear here after you create an invoice.</p>
                </div>
            )}
            <div className="md:hidden space-y-4">
              {filteredCustomers.map(customer => (
                 <Card key={customer.id} className="overflow-hidden" onClick={() => router.push(`/customers/${customer.id}`)}>
                  <CardContent className="p-4 flex gap-4">
                    <div className="pt-1">
                       <User className="h-5 w-5 text-muted-foreground"/>
                    </div>
                    <div className="flex-grow overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="overflow-hidden">
                                <p className="font-semibold truncate">{customer.name}</p>
                                <p className="text-sm text-muted-foreground truncate">{customer.address || customer.phone || 'No contact info'}</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 -mt-1 -mr-2" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem disabled>View Details</DropdownMenuItem>
                                <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <Separator className="my-3" />
                        <div className="mt-2 space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Total Cost</span>
                                <span className="font-medium">{formatCurrency(customer.totalSpent)}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Paid</span>
                                <span className="font-medium text-emerald-600">{formatCurrency(customer.amountPaid)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Balance</span>
                                <span className="font-bold text-red-600">{formatCurrency(customer.amountOwed)}</span>
                            </div>
                        </div>
                    </div>
                  </CardContent>
                 </Card>
              ))}
            </div>
            
            <div className="overflow-x-auto hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="cursor-pointer" onClick={() => router.push(`/customers/${customer.id}`)}>
                      <TableCell className="font-medium truncate max-w-xs">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">{customer.address}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.totalSpent)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCurrency(customer.amountPaid)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(customer.amountOwed)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Customer Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem disabled>View Details</DropdownMenuItem>
                            <DropdownMenuItem disabled>Edit</DropdownMenuItem>
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
    </>
  );
}

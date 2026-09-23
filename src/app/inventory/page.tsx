
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
import { MoreHorizontal, Search, Package, Trash2, Loader2, History, Filter } from 'lucide-react';
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
import { getInventory } from '@/lib/firestore';
import { cn } from '@/lib/utils';
import { AddProductForm } from './add-product-form';
import { useAuth } from '@/components/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'cost'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const refreshInventory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const inventoryData = await getInventory(user.uid);
    setInventory(inventoryData);
    setLoading(false);
  }, [user]);
  
  useEffect(() => {
    if (user) {
      refreshInventory();
    }
  }, [user, refreshInventory]);

  const categories = useMemo(() => {
    const unique = new Set(inventory.map(i => i.category).filter(Boolean));
    return Array.from(unique);
  }, [inventory]);

  useEffect(() => {
    startTransition(() => {
        let results = inventory.filter(item => {
          const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               item.sku.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
          
          const isLow = item.quantity <= (item.reorderLevel || 0);
          const matchesStock = stockFilter === 'all' || 
                              (stockFilter === 'low' && isLow) || 
                              (stockFilter === 'in' && !isLow);
          
          return matchesSearch && matchesCategory && matchesStock;
        });

        results.sort((a, b) => {
            if (sortBy === 'name') {
                return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            } else if (sortBy === 'quantity') {
                return sortOrder === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
            } else {
                const costA = a.unitCost || 0;
                const costB = b.unitCost || 0;
                return sortOrder === 'asc' ? costA - costB : costB - costA;
            }
        });

        setFilteredInventory(results);
    });
  }, [searchTerm, inventory, categoryFilter, stockFilter, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const toggleSort = (field: 'name' | 'quantity' | 'cost') => {
    if (sortBy === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
        setSortBy(field);
        setSortOrder('asc');
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
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage your products and stock levels.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/inventory/history')}><History className="mr-2 h-4 w-4"/>History</Button>
            <AddProductForm onProductAdded={refreshInventory} />
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search SKU or Name..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={stockFilter} onValueChange={setStockFilter}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Stock Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stock</SelectItem>
                                <SelectItem value="low">Low Stock</SelectItem>
                                <SelectItem value="in">In Stock</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1 border-l pl-3 ml-auto sm:ml-0">
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleSort('name')}>
                                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleSort('quantity')}>
                                Qty {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
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
          {filteredInventory.length === 0 && !loading && (
             <div className="text-center py-12">
               <Package className="mx-auto h-12 w-12 text-muted-foreground" />
               <h3 className="mt-4 text-lg font-semibold">No Items Found</h3>
               <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or keywords.</p>
             </div>
           )}

          <div className="md:hidden space-y-4">
            {filteredInventory.map(item => {
               const isLowStock = item.quantity <= (item.reorderLevel || 0);
               return (
                  <Card key={item.id} className={cn("overflow-hidden", isLowStock && 'border-destructive/50')} onClick={() => router.push(`/inventory/${item.id}`)}>
                    <CardContent className="p-4 flex gap-4">
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                            <div className="overflow-hidden">
                              <p className="font-semibold truncate">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-mono">{item.sku}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 -mt-1 -mr-2" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onSelect={() => router.push(`/inventory/${item.id}/adjust-stock`)}>Adjust Stock</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => router.push(`/inventory/${item.id}/edit`)}>Edit</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onSelect={() => router.push(`/inventory/${item.id}/delete`)}>Delete Item</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {isLowStock ? (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 h-5">Low</Badge>
                                ) : (
                                    <Badge variant="secondary" className="border-transparent bg-emerald-100 text-emerald-800 text-[10px] px-1.5 h-5">In</Badge>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-4 flex items-end justify-between">
                          <div>
                             <p className="text-[10px] text-muted-foreground uppercase font-bold">Price</p>
                             <p className="font-medium text-xs">{formatCurrency(item.unitCost || 0)}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] text-muted-foreground uppercase font-bold">Qty</p>
                             <p className="font-bold text-xs">{formatNumber(item.quantity)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
               );
            })}
          </div>
          
          <div className="overflow-x-auto hidden md:block">
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => {
                    const isLowStock = item.quantity <= (item.reorderLevel || 0);
                    return (
                      <TableRow key={item.id} className={cn("cursor-pointer group", isLowStock && 'bg-destructive/5')} onClick={() => router.push(`/inventory/${item.id}`)}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">{item.category || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.unitCost || 0)}</TableCell>
                        <TableCell className="text-right font-bold">{formatNumber(item.quantity)}</TableCell>
                        <TableCell className="text-center">
                          {isLowStock ? (
                            <Badge variant="destructive" className="uppercase text-[10px] font-bold">Low Stock</Badge>
                          ) : (
                            <Badge variant="secondary" className="border-transparent bg-emerald-100 text-emerald-800 uppercase text-[10px] font-bold">In Stock</Badge>
                          )}
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
                              <DropdownMenuItem onSelect={() => router.push(`/inventory/${item.id}/adjust-stock`)}>Adjust Stock</DropdownMenuItem>
                               <DropdownMenuItem onSelect={() => router.push(`/inventory/${item.id}/edit`)}>Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onSelect={() => router.push(`/inventory/${item.id}/delete`)}>Delete Item</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

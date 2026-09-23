'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  LineChart as LineChartIcon,
  PackageX,
} from 'lucide-react';
import { getDashboardData } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth-provider';
import RecentTransactionsCard from './dashboard/recent-transactions-card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DashboardData {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    outstandingInvoices: number;
    cashFlowData: any[];
    totalStockValue: number;
    totalItemsInStock: number;
    profitMargin: number;
    lowStockItems: any[];
    topCustomers: any[];
    topDebtors: any[];
    recentTransactions: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const fetchLock = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user || fetchLock.current) return;
    
    fetchLock.current = true;
    setLoading(true);
    try {
      const dashboardData = await getDashboardData(user.uid);
      if (dashboardData) {
          setData(dashboardData);
      }
    } catch (error) {
      console.error("Dashboard fetch failed:", error);
    } finally {
      setLoading(false);
      fetchLock.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchData();
    }
  }, [user, fetchData]);

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') amount = 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };
  
  if (loading && !data) {
    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-5 w-2/4" /></CardHeader><CardContent><Skeleton className="h-7 w-1/4" /><Skeleton className="h-4 w-3/4 mt-2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-2/4" /></CardHeader><CardContent><Skeleton className="h-7 w-1/4" /><Skeleton className="h-4 w-3/4 mt-2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-2/4" /></CardHeader><CardContent><Skeleton className="h-7 w-1/4" /><Skeleton className="h-4 w-3/4 mt-2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-2/4" /></CardHeader><CardContent><Skeleton className="h-7 w-1/4" /><Skeleton className="h-4 w-3/4 mt-2" /></CardContent></Card>
            </div>
             <div className="grid gap-4 lg:grid-cols-2">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Cash Flow Overview</CardTitle>
                         <CardDescription>A summary of your income and expenses over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-[300px] items-center justify-center">
                            <Skeleton className="h-full w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }
  
  const { 
    totalRevenue = 0, 
    totalExpenses = 0, 
    netProfit = 0, 
    outstandingInvoices = 0,
    cashFlowData = [],
    totalStockValue = 0,
    totalItemsInStock = 0,
    profitMargin = 0,
    lowStockItems = [],
    topCustomers = [],
    topDebtors = [],
  } = data || {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    outstandingInvoices: 0,
    cashFlowData: [],
    totalStockValue: 0,
    totalItemsInStock: 0,
    profitMargin: 0,
    lowStockItems: [],
    topCustomers: [],
    topDebtors: [],
  };

  const renderTopList = (title: string, description: string, items: any[], nameKey: string, valueKey: string, currency: boolean = false) => (
     <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="md:hidden">
              {items && items.length > 0 ? (
                  <div className="space-y-3">
                      {items.map(item => (
                          <div key={item.id} className="flex justify-between items-center rounded-md border p-3">
                              <p className="font-medium truncate pr-2 break-all" title={item[nameKey]}>{item[nameKey]}</p>
                              <p className={`font-bold shrink-0 ${valueKey === 'amountOwed' ? 'text-red-600' : ''}`}>{currency ? formatCurrency(item[valueKey]) : item[valueKey]}</p>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="flex h-full min-h-[60px] items-center justify-center">
                      <p className="text-sm text-muted-foreground">No data yet.</p>
                  </div>
              )}
          </div>
           <div className="hidden md:block overflow-x-auto">
               {items && items.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">{currency ? 'Amount' : 'Total'}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="truncate block max-w-xs">{item[nameKey]}</span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{item[nameKey]}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className={`text-right font-bold ${valueKey === 'amountOwed' ? 'text-red-600' : ''}`}>{currency ? formatCurrency(item[valueKey]) : item[valueKey]}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
               ) : (
                <div className="flex h-full min-h-[60px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">No data yet.</p>
                </div>
               )}
           </div>
        </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</CardTitle>
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-600 font-bold text-xs">₦</div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight">{formatCurrency(totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Based on paid invoices</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Expenses</CardTitle>
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight">{formatCurrency(totalExpenses)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total recorded expenses</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Profit</CardTitle>
                    <div className={cn("p-1.5 rounded", netProfit >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                        {netProfit >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold tracking-tight", netProfit < 0 && 'text-red-500')}>{formatCurrency(netProfit)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Revenue minus expenses</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profit Margin</CardTitle>
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded">
                        <LineChartIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold tracking-tight", profitMargin < 0 ? 'text-red-500' : '')}>{profitMargin.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground mt-1">Net profit / total revenue</p>
                </CardContent>
            </Card>
       </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-2">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Cash Flow Overview</CardTitle>
                    <CardDescription>
                    A summary of your income and expenses over time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {cashFlowData && cashFlowData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cashFlowData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                            tickFormatter={(value) =>
                                `₦${(Number(value) / 1000).toLocaleString()}k`
                            }
                            />
                            <RechartsTooltip
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                            contentStyle={{
                                background: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                                fontSize: '12px'
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                            />
                            <Bar
                            dataKey="income"
                            fill="hsl(var(--chart-1))"
                            radius={[4, 4, 0, 0]}
                            barSize={32}
                            />
                            <Bar
                            dataKey="expenses"
                            fill="hsl(var(--chart-2))"
                            radius={[4, 4, 0, 0]}
                            barSize={32}
                            />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                        No cash flow data to display.
                      </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Inventory Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                     <div className="flex items-center justify-between">
                         <span className="text-muted-foreground font-medium">Total Items in Stock</span>
                         <span className="font-bold text-lg">{totalItemsInStock.toLocaleString()}</span>
                     </div>
                     <Separator />
                      <div className="flex items-center justify-between">
                         <span className="text-muted-foreground font-medium">Total Stock Value</span>
                         <span className="font-bold text-lg">{formatCurrency(totalStockValue)}</span>
                     </div>
                     <Separator />
                      <div className="flex items-center justify-between">
                         <span className="text-muted-foreground font-medium">Outstanding Invoices</span>
                         <span className="font-bold text-lg">{formatCurrency(outstandingInvoices)}</span>
                     </div>
                </CardContent>
            </Card>
        </div>
         <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
             <RecentTransactionsCard />
             <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Items to Restock</CardTitle>
                            <CardDescription>
                                Low on stock or finished.
                            </CardDescription>
                        </div>
                        <div className="bg-destructive/10 p-2 rounded-full">
                            <PackageX className="h-4 w-4 text-destructive" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                   {lowStockItems && lowStockItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-xs uppercase tracking-wider">Product</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider">Qty Left</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lowStockItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="py-2">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="truncate block max-w-[120px] sm:max-w-xs font-medium">{item.name}</span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>{item.name}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right py-2">
                                            <Badge variant="destructive" className="font-mono">{item.quantity}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                   ) : (
                    <div className="flex flex-col h-full min-h-[120px] items-center justify-center text-center">
                        <Package className="h-8 w-8 text-emerald-600 mb-2 opacity-50"/>
                        <p className="text-sm font-medium">All items well-stocked!</p>
                        <p className="text-xs text-muted-foreground">Nothing needs restocking.</p>
                    </div>
                   )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderTopList("Top Customers", "Top 5 customers by spending.", topCustomers, "name", "totalSpent", true)}
            {renderTopList("Top Debtors", "Highest outstanding balances.", topDebtors, "name", "amountOwed", true)}
        </div>
      </div>
    </div>
  );
}

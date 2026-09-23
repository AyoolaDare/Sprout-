
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getInventoryHistory } from '@/lib/firestore';
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
  TableCaption,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, Trash2, History, Package, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function InventoryHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      if (user) {
        setLoading(true);
        const historyData = await getInventoryHistory(user.uid);
        setHistory(historyData);
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const formatNumber = (num: number) => {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('en-US');
  };

  const getChangeIcon = (type: string, change: number) => {
    if (type === 'Deleted') {
      return <Trash2 className="h-4 w-4 text-red-600" />;
    }
    if (change > 0) {
      return <ArrowUp className="h-4 w-4 text-emerald-600" />;
    }
    return <ArrowDown className="h-4 w-4 text-red-600" />;
  };

  const getChangeColor = (type: string, change: number) => {
    if (type === 'Deleted' || change < 0) return 'text-red-600';
    if (change > 0) return 'text-emerald-600';
    return '';
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory History</h1>
          <p className="text-muted-foreground">
            A complete log of all stock movements and changes.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/inventory')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History Log</CardTitle>
          <CardDescription>
            Showing all creations, adjustments, sales, and deletions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            renderSkeleton()
          ) : history.length === 0 ? (
             <div className="flex flex-col items-center justify-center text-center py-12">
                <History className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No History Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Your inventory movements will appear here.</p>
             </div>
          ) : (
            <>
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {history.map((log) => (
                    <Card key={log.id} className="overflow-hidden">
                        <CardContent className="p-4 flex gap-4">
                            <div className="pt-1">
                                <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-grow space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold truncate max-w-48">{log.itemName}</p>
                                        <p className="text-sm text-muted-foreground">{log.date}</p>
                                    </div>
                                    <Badge variant={log.type === 'Deleted' ? 'destructive' : 'outline'}>
                                        {log.type}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Change</p>
                                        <p className={cn('font-medium flex items-center gap-1', getChangeColor(log.type, log.change))}>
                                            {getChangeIcon(log.type, log.change)}
                                            {formatNumber(log.change)}
                                        </p>
                                    </div>
                                     <div>
                                        <p className="text-xs text-muted-foreground">New Qty</p>
                                        <p className="font-bold">{formatNumber(log.newQuantity)}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground pt-1">{log.details}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>New Quantity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {log.date}
                      </TableCell>
                      <TableCell className="font-medium">{log.itemName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={log.type === 'Deleted' ? 'destructive' : 'outline'}
                        >
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn('font-medium', getChangeColor(log.type, log.change))}>
                        <div className="flex items-center gap-1">
                          {getChangeIcon(log.type, log.change)}
                          {formatNumber(log.change)}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatNumber(log.newQuantity)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

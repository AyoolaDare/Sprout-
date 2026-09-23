
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getInventoryItemById, deleteInventoryItem } from '@/lib/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Trash2, AlertTriangle } from 'lucide-react';

export default function DeleteInventoryPage() {
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { id } = params;

  useEffect(() => {
    async function fetchItem() {
      if (user && id) {
        setLoading(true);
        const itemData = await getInventoryItemById(user.uid, id as string);
        setItem(itemData);
        setLoading(false);
      }
    }
    fetchItem();
  }, [user, id]);

  const handleDelete = async () => {
    if (!user || !item) return;

    startDeleteTransition(async () => {
      try {
        await deleteInventoryItem(user.uid, item.id);
        toast({
          title: 'Success!',
          description: `Inventory item "${item.name}" has been deleted.`,
        });
        router.push('/inventory');
      } catch (error: any) {
        console.error('Error deleting item:', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'There was a problem deleting the item.',
        });
      }
    });
  };

  if (loading) {
    return <Skeleton className="h-96 w-full max-w-lg mx-auto" />
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-2xl font-bold">Inventory Item not found</h2>
        <Button onClick={() => router.push('/inventory')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
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
                This action cannot be undone. This will permanently delete the item
                <span className="font-bold text-foreground"> {item.name} </span>
                and all of its associated data.
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
            Yes, delete this item
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/inventory')}
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

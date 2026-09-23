
'use client';

import { useAuth, useProfile } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusCircle, Trash2, Sprout, UploadCloud } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { getBusinessProfile, updateBusinessProfile } from '@/lib/firestore';
import { useEffect, useState, useTransition, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { uploadFile } from '@/lib/storage';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';

const accountSchema = z.object({
    bankName: z.string().optional(),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
});

const businessProfileSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal('')),
  businessName: z.string().min(1, 'Business name is required.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  accounts: z.array(accountSchema).max(4, 'You can add a maximum of 4 accounts.'),
});

type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;

export default function BusinessProfileForm() {
  const { user } = useAuth();
  const { businessProfile, refreshProfile, loadingProfile } = useProfile();
  const { toast } = useToast();
  const [isSaving, startSaveTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      logoUrl: '',
      businessName: '',
      email: '',
      phone: '',
      address: '',
      accounts: [{ bankName: '', accountName: '', accountNumber: '' }],
    },
  });
  
  const logoUrl = form.watch('logoUrl');

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'accounts',
  });

  useEffect(() => {
    if (businessProfile) {
        const accounts = Array.isArray(businessProfile.accounts) && businessProfile.accounts.length > 0 
            ? businessProfile.accounts 
            : [{ bankName: '', accountName: '', accountNumber: '' }];
        form.reset({ ...businessProfile, accounts });
    }
  }, [businessProfile, form]);
  
  const onSubmit = async (data: BusinessProfileFormValues) => {
    if (!user) return;
    
    startSaveTransition(async () => {
      try {
        await updateBusinessProfile(user.uid, data);
        refreshProfile();
        toast({
          title: 'Success!',
          description: 'Your business profile has been updated.',
        });
      } catch (error) {
        console.error('Error updating business profile:', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: 'There was a problem updating your profile.',
        });
      }
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 2MB.' });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const oldLogoUrl = form.getValues('logoUrl');

    try {
        const downloadURL = await uploadFile(file, setUploadProgress, oldLogoUrl);
        form.setValue('logoUrl', downloadURL, { shouldDirty: true });
        
        await onSubmit(form.getValues());

        toast({ title: 'Logo updated successfully!' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload failed', description: error.message || 'Please try again.' });
    } finally {
        setIsUploading(false);
    }
  };


  if (loadingProfile) {
      return (
          <Card>
            <CardHeader>
                <Skeleton className="h-7 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
      )
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-center gap-4 mb-8">
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                  Business Profile
                </h1>
                <div className="hidden items-center gap-2 md:ml-auto md:flex">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Profile
                  </Button>
                </div>
            </div>
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Branding &amp; Contact</CardTitle>
                        <CardDescription>This information will appear on your invoices.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                         <FormField
                          control={form.control}
                          name="logoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Logo</FormLabel>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                 <div className="relative w-28 h-28 bg-muted rounded-md flex items-center justify-center border overflow-hidden shrink-0">
                                    {logoUrl ? (
                                        <Image src={logoUrl} alt="Company Logo" fill className="object-contain p-2"/>
                                    ) : (
                                        <Sprout className="w-10 h-10 text-muted-foreground"/>
                                    )}
                                 </div>
                                 <div className="flex-grow space-y-2 w-full">
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full sm:w-auto">
                                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4"/>}
                                        {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Logo'}
                                    </Button>
                                    {isUploading && <Progress value={uploadProgress} className="w-full h-2" />}
                                    <FormControl>
                                        <Input
                                            type="file"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleLogoUpload}
                                            accept="image/png, image/jpeg, image/gif"
                                         />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground mt-2">PNG, JPG, or GIF. 2MB max.</p>
                                 </div>
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="space-y-6">
                           <FormField control={form.control} name="businessName" render={({ field }) => (<FormItem><FormLabel>Business Name</FormLabel><FormControl><Input placeholder="Your Company LLC" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Business Email</FormLabel><FormControl><Input placeholder="contact@company.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                               <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1 (555) 123-4567" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                           </div>
                           <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St, Lagos, Nigeria" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Payment Details</CardTitle>
                        <CardDescription>This will be displayed on your invoices. You can add up to 4 accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-6 relative">
                                {fields.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                               <FormField control={form.control} name={`accounts.${index}.bankName`} render={({ field }) => (
                                   <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., Guaranty Trust Bank" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name={`accounts.${index}.accountName`} render={({ field }) => (
                                       <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name={`accounts.${index}.accountNumber`} render={({ field }) => (
                                       <FormItem><FormLabel>Bank Account Number</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </div>
                        ))}
                        {fields.length < 4 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ bankName: '', accountName: '', accountNumber: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Account
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
             <div className="mt-4 flex items-center justify-end gap-2 md:hidden">
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Profile
                </Button>
            </div>
        </form>
      </Form>
  );
}

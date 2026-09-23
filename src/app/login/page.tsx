
'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signInWithGoogle, signInWithEmailPassword, signUpWithEmailPassword, sendPasswordReset } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Separator } from '@/components/ui/separator';
import { Sprout, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const signUpSchema = z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});


// A simple placeholder for the Google icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.012,35.846,44,30.342,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error) {
      console.error('Error signing in with Google', error);
      signInForm.setError("root", { message: "Failed to sign in with Google." });
    }
  };

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  
  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });


  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    try {
      await signInWithEmailPassword(values.email, values.password);
      router.push('/');
    } catch (error) {
      console.error('Error signing in', error);
       signInForm.setError("root", { message: "Invalid email or password." });
    }
  };

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    try {
        await signUpWithEmailPassword(values.email, values.password);
        router.push('/');
    } catch (error: any) {
        console.error('Error signing up', error);
        if (error.code === 'auth/email-already-in-use') {
            signUpForm.setError('email', { message: 'This email is already in use.' });
        } else {
            signUpForm.setError("root", { message: "An unexpected error occurred." });
        }
    }
  };
  
   const handlePasswordReset = async (values: z.infer<typeof resetPasswordSchema>) => {
    try {
      await sendPasswordReset(values.email);
      toast({
        title: "Check your email",
        description: "A password reset link has been sent to your email address.",
      });
      setResetDialogOpen(false);
      resetPasswordForm.reset();
    } catch (error: any) {
       console.error('Error sending password reset email', error);
       if (error.code === 'auth/user-not-found') {
            resetPasswordForm.setError("email", { message: "No user found with this email address." });
       } else {
            resetPasswordForm.setError("root", { message: "Failed to send password reset email." });
       }
    }
  };


  return (
    <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
      <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-lg bg-primary p-2 text-primary-foreground">
                <Sprout className="h-10 w-10" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to Sprout Track</CardTitle>
            <CardDescription>
              Choose your sign in method to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                  <Form {...signInForm}>
                      <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4 pt-4">
                          <FormField
                              control={signInForm.control}
                              name="email"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Email</FormLabel>
                                      <FormControl>
                                          <Input placeholder="name@example.com" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={signInForm.control}
                              name="password"
                              render={({ field }) => (
                                  <FormItem>
                                      <div className="flex items-center justify-between">
                                          <FormLabel>Password</FormLabel>
                                           <DialogTrigger asChild>
                                              <Button variant="link" type="button" className="h-auto p-0 text-sm">
                                                  Forgot password?
                                              </Button>
                                          </DialogTrigger>
                                      </div>
                                      <FormControl>
                                          <Input type="password" placeholder="••••••••" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          {signInForm.formState.errors.root && (
                             <Alert variant="destructive">
                                 <AlertCircle className="h-4 w-4" />
                                 <AlertDescription>
                                     {signInForm.formState.errors.root.message}
                                 </AlertDescription>
                             </Alert>
                          )}
                          <Button type="submit" className="w-full" disabled={signInForm.formState.isSubmitting}>
                              {signInForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                              {signInForm.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
                          </Button>
                      </form>
                  </Form>
              </TabsContent>
              <TabsContent value="signup">
                   <Form {...signUpForm}>
                      <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4 pt-4">
                          <FormField
                              control={signUpForm.control}
                              name="email"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Email</FormLabel>
                                      <FormControl>
                                          <Input placeholder="name@example.com" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={signUpForm.control}
                              name="password"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Password</FormLabel>
                                      <FormControl>
                                          <Input type="password" placeholder="••••••••" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                           <FormField
                              control={signUpForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Confirm Password</FormLabel>
                                      <FormControl>
                                          <Input type="password" placeholder="••••••••" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          {signUpForm.formState.errors.root && (
                             <Alert variant="destructive">
                                 <AlertCircle className="h-4 w-4" />
                                 <AlertDescription>
                                     {signUpForm.formState.errors.root.message}
                                 </AlertDescription>
                             </Alert>
                          )}
                          <Button type="submit" className="w-full" disabled={signUpForm.formState.isSubmitting}>
                             {signUpForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                             {signUpForm.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
                          </Button>
                      </form>
                  </Form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6 text-center">
              <Separator />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                  <span className="bg-background px-2 text-sm text-muted-foreground">
                      OR
                  </span>
              </div>
            </div>

            <Button onClick={handleGoogleSignIn} variant="outline" className="w-full">
               <GoogleIcon className="mr-2 h-4 w-4" />
               Sign In with Google
            </Button>

          </CardContent>
        </Card>
      </div>
      <DialogContent>
          <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                  Enter your email address and we'll send you a link to reset your password.
              </DialogDescription>
          </DialogHeader>
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit(handlePasswordReset)} className="space-y-4">
                  <FormField
                      control={resetPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                  <Input placeholder="name@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                    {resetPasswordForm.formState.errors.root && (
                      <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                              {resetPasswordForm.formState.errors.root.message}
                          </AlertDescription>
                      </Alert>
                  )}
                  <DialogFooter>
                      <Button type="submit" disabled={resetPasswordForm.formState.isSubmitting}>
                          {resetPasswordForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                          Send Reset Link
                      </Button>
                  </DialogFooter>
              </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
}

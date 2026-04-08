import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    // Detect whether this page was reached via a password-reset email.
    // Supabase puts the token in the URL hash (implicit flow) or as ?code= (PKCE).
    const hash = window.location.hash;
    const search = window.location.search;
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const searchParams = new URLSearchParams(search);
    const hasRecoveryToken =
      hashParams.get('type') === 'recovery' ||    // implicit flow
      (hashParams.has('access_token') && !hash.includes('type=signup')) ||
      searchParams.has('code');                   // PKCE flow

    // Only react to PASSWORD_RECOVERY — ignore INITIAL_SESSION, SIGNED_IN, etc.
    // Those can fire first and are NOT a sign that the link is invalid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('UpdatePassword auth event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Fallback after 5 seconds in case PASSWORD_RECOVERY never fires:
    // - If the URL contained a recovery token, show the form anyway
    //   (some Supabase configs fire SIGNED_IN instead of PASSWORD_RECOVERY)
    // - Otherwise the user landed here without a valid link → redirect
    const fallback = setTimeout(() => {
      setSessionReady(prev => {
        if (prev) return prev; // Already ready, nothing to do
        if (hasRecoveryToken) {
          console.log('UpdatePassword: PASSWORD_RECOVERY not received but URL had recovery token — showing form');
          return true;
        }
        toast.error("Invalid or expired reset link. Please request a new one.");
        navigate('/forgot-password');
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigate]);

  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully! Please log in with your new password.');
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Update Your Password</CardTitle>
          <CardDescription>
            {sessionReady
              ? 'Enter a new password for your account.'
              : 'Verifying your reset link…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sessionReady ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Updating…' : 'Update Password'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdatePassword;

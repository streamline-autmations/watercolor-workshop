import { useState, useEffect, useRef } from 'react';
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
  // Track whether we've received a meaningful auth event from Supabase
  const receivedEventRef = useRef(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    // Supabase processes the #access_token hash from the reset email URL
    // and fires onAuthStateChange with PASSWORD_RECOVERY event.
    // We must wait for that event before deciding whether the session is valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      console.log('UpdatePassword auth event:', event);

      if (event === 'PASSWORD_RECOVERY') {
        // Valid reset link — allow the user to set a new password
        receivedEventRef.current = true;
        setSessionReady(true);
        return;
      }

      if (event === 'SIGNED_IN' && !receivedEventRef.current) {
        // Supabase sometimes fires SIGNED_IN before PASSWORD_RECOVERY on the
        // same token exchange. Wait a tick to see if PASSWORD_RECOVERY follows.
        receivedEventRef.current = true;
        setTimeout(() => {
          // If sessionReady wasn't set by PASSWORD_RECOVERY by now, the user
          // navigated here without a valid reset link.
          setSessionReady(prev => {
            if (!prev) {
              toast.error("Invalid or expired reset link. Please request a new one.");
              navigate('/forgot-password');
            }
            return prev;
          });
        }, 500);
        return;
      }

      // Any other event (SIGNED_OUT, USER_UPDATED, etc.) after we already
      // processed an event means something went wrong.
      if (receivedEventRef.current && event !== 'TOKEN_REFRESHED') {
        return;
      }

      // If no event has been received yet and we get something unexpected,
      // wait briefly — the PASSWORD_RECOVERY event may still be coming.
      if (!receivedEventRef.current) {
        receivedEventRef.current = true;
        setTimeout(() => {
          setSessionReady(prev => {
            if (!prev) {
              toast.error("Invalid or expired reset link. Please request a new one.");
              navigate('/forgot-password');
            }
            return prev;
          });
        }, 500);
      }
    });

    // Safety fallback: if no auth event fires within 3 seconds, the link is bad
    const fallbackTimer = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev && !receivedEventRef.current) {
          toast.error("Invalid or expired reset link. Please request a new one.");
          navigate('/forgot-password');
        }
        return prev;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
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

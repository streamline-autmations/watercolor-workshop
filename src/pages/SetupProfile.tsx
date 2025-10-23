import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthProvider';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, LoaderCircle, Terminal, X } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';

const passwordSchema = z.string()
  .min(10, 'Password must be at least 10 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*).');

const setupProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: z.string().min(7, 'A valid phone number is required.').regex(/^\+?[0-9 ]{7,20}$/, 'Use international format (e.g., +27 82 123 4567)'),
  password: passwordSchema,
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the Terms & Conditions and Privacy Policy.',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
});

type SetupProfileFormValues = z.infer<typeof setupProfileSchema>;

const PasswordChecklistItem = ({ isChecked, text }: { isChecked: boolean; text: string }) => (
  <li className={`flex items-center gap-2 text-sm ${isChecked ? 'text-green-600' : 'text-muted-foreground'}`}>
    {isChecked ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    <span>{text}</span>
  </li>
);

const PasswordStrengthMeter = ({ score }: { score: number }) => {
  const strength = {
    0: { label: 'Very Weak', color: 'bg-red-500', width: '10%' },
    1: { label: 'Weak', color: 'bg-red-500', width: '20%' },
    2: { label: 'Okay', color: 'bg-yellow-500', width: '40%' },
    3: { label: 'Good', color: 'bg-yellow-500', width: '60%' },
    4: { label: 'Strong', color: 'bg-green-500', width: '80%' },
    5: { label: 'Very Strong', color: 'bg-green-500', width: '100%' },
  }[score] || { label: 'Very Weak', color: 'bg-red-500', width: '0%' };

  return (
    <div>
      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-2 transition-all ${strength.color}`} style={{ width: strength.width }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{strength.label}</p>
    </div>
  );
};

export default function SetupProfile() {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("Setting up your account...");
  const [isAuthCallback, setIsAuthCallback] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const { user, session } = useAuth();

  // If no invite token, redirect to login
  useEffect(() => {
    console.log('🔍 SetupProfile useEffect:', {
      inviteToken,
      currentUrl: window.location.href,
      searchParams: Object.fromEntries(searchParams.entries()),
      hasUser: !!user,
      hasSession: !!session
    });
    
    if (!inviteToken) {
      console.log('🚫 No invite token found, redirecting to login');
      navigate('/login');
    }
  }, [inviteToken, navigate, searchParams, user, session]);

  // For invite users, we don't need to be authenticated yet
  // They'll authenticate during the signup process
  const isInviteUser = !!inviteToken;

  const form = useForm<SetupProfileFormValues>({
    resolver: zodResolver(setupProfileSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '+27 ', password: '', confirmPassword: '', terms: false },
  });

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');

  const passwordChecks = useMemo(() => ({
    len: password.length >= 10,
    up: /[A-Z]/.test(password),
    lo: /[a-z]/.test(password),
    num: /[0-9]/.test(password),
    sp: /[!@#$%^&*]/.test(password),
    match: password && password === confirmPassword,
  }), [password, confirmPassword]);

  const passwordScore = useMemo(() => Object.values(passwordChecks).filter(Boolean).length - (passwordChecks.match ? 1 : 0), [passwordChecks]);

  // Auth callback handler
  useEffect(() => {
    (async () => {
      try {
        // 0) sanity
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          throw new Error("Supabase env vars missing in build");
        }

        const href = window.location.href;

        // A) PKCE code
        const url = new URL(href);
        const code = url.searchParams.get("code");
        if (code) {
          setMsg("Creating your account…");
          setIsAuthCallback(true);
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw new Error("Exchange failed: " + error.message);
        } else {
          // B) Hash tokens
          const hash = new URLSearchParams(href.split("#")[1] || "");
          const at = hash.get("access_token");
          const rt = hash.get("refresh_token");
          if (at && rt) {
            setMsg("Creating your account…");
            setIsAuthCallback(true);
            const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
            if (error) throw new Error("setSession failed: " + error.message);
          }
        }

        if (isAuthCallback) {
          const { data: sess } = await supabase.auth.getSession();
          if (!sess.session) throw new Error("No active session after auth");

          setMsg("Finalizing profile…");
          const { data: me } = await supabase.auth.getUser();
          const uid = me.user?.id;
          if (!uid) throw new Error("No user id");

          const full_name = me.user?.user_metadata?.full_name || "";
          // IMPORTANT: upsert WITHOUT .select() to avoid extra RLS read
          const { error: pErr } = await supabase
            .from("profiles")
            .upsert({ user_id: uid, full_name, role: "student" }, { onConflict: "user_id" });
          if (pErr) throw new Error("Profile upsert: " + pErr.message);

          window.location.replace("/home");
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Unexpected error");
        setMsg("We hit a snag.");
        setIsAuthCallback(false);
      }
    })();
  }, [isAuthCallback]);

  useEffect(() => {
    const fetchUserMetadata = async () => {
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata as any;
      if (meta?.full_name) {
        const parts = String(meta.full_name).split(' ');
        form.setValue('firstName', parts[0] || '');
        form.setValue('lastName', parts.slice(1).join(' ') || '');
      }
    };
    fetchUserMetadata();
  }, [form]);

  const onSubmit = async (values: SetupProfileFormValues) => {
    setError(null);
    const toastId = toast.loading('Setting up your account...');

    try {
      console.log('🚀 Starting account setup process...');
      console.log('📝 Form values:', values);
      console.log('🎫 Invite token:', inviteToken);
      console.log('👤 Is invite user:', isInviteUser);

      // For invite users, we need to sign them up first
      if (isInviteUser && !user) {
        console.log('🎫 Processing invite user signup...');
        
        // Sign up the user with the provided details
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              first_name: values.firstName,
              last_name: values.lastName,
              phone: values.phone
            }
          }
        });

        if (signupError) {
          console.error('❌ Signup error:', signupError);
          throw new Error(`Signup failed: ${signupError.message}`);
        }

        console.log('✅ User signed up successfully:', signupData);
        
        // Wait for the user to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get current user (either existing or newly created)
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      console.log('👤 Current user:', currentUser);
      console.log('❌ User error:', userError);
      
      if (userError || !currentUser) {
        throw new Error('No authenticated user found. Please log in first.');
      }

      // Create the profile data
      const profileData = {
        user_id: currentUser.id,
        first_name: values.firstName,
        last_name: values.lastName,
        username: values.firstName.toLowerCase() + values.lastName.toLowerCase(),
        phone: values.phone,
        role: 'student',
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Attempting to save profile data:', profileData);
      
      // Try to save the profile with detailed error handling
      const { data: insertData, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select();

      console.log('📊 Profile insert result:', { data: insertData, error: profileError });

      if (profileError) {
        console.error('❌ Profile save error:', profileError);
        throw new Error(`Failed to save profile: ${profileError.message}`);
      }

      console.log('✅ Profile saved successfully');

      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the profile was saved correctly
      console.log('🔍 Verifying profile was saved...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      console.log('🔍 Profile verification result:', { data: verifyData, error: verifyError });
      
      if (verifyError) {
        console.error('❌ Profile verification error:', verifyError);
        throw new Error(`Failed to verify profile: ${verifyError.message}`);
      }

      console.log('✅ Profile verified successfully:', verifyData);

      toast.success('Account created successfully! Welcome.', { id: toastId });
      
      // Force a session refresh
      console.log('🔄 Refreshing session...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('❌ Session refresh error:', refreshError);
      } else {
        console.log('✅ Session refreshed successfully');
      }
      
      // Wait for the auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If they have an invite token, process it directly
      if (inviteToken) {
        console.log('🎫 Processing invite directly:', inviteToken);
        
        // Process the invite directly here instead of redirecting
        try {
          const { data, error } = await supabase.rpc('claim_course_invite', {
            p_token: inviteToken
          });
          
          if (error) {
            console.error('❌ Error claiming invite:', error);
            toast.error('Failed to process invite: ' + error.message);
            navigate('/home');
          } else {
            console.log('✅ Invite processed successfully:', data);
            toast.success('Welcome! You now have access to the course.');
            navigate('/home');
          }
        } catch (err: any) {
          console.error('❌ Error processing invite:', err);
          toast.error('Failed to process invite: ' + err.message);
          navigate('/home');
        }
      } else {
        console.log('🏠 Redirecting to home page');
        navigate('/home');
      }

    } catch (err: any) {
      console.error('❌ Account setup error:', err);
      const errorMessage = err.details || err.message || 'An unknown error occurred.';
      toast.error(errorMessage, { id: toastId });
      setError(errorMessage);
    }
  };

  // Show auth callback loading state
  if (isAuthCallback) {
    return (
      <div className="min-h-screen bg-account-setup-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="flex justify-center mb-8">
            <img src="/blom-academy.png" alt="BLOM Academy Logo" className="w-40" />
          </div>
          <Card className="shadow-md border-none rounded-2xl">
            <CardContent className="p-8 md:p-10 text-center">
              <LoaderCircle className="h-10 w-10 animate-spin mx-auto mb-4" />
              <p className="text-lg">{msg}</p>
              {error && <p className="text-red-600 mt-4">{error}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-account-setup-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8">
          <img src="/blom-academy.png" alt="BLOM Academy Logo" className="w-40" />
        </div>
        <Card className="shadow-md border-none rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-semibold text-gray-900">Welcome to BLOM Academy!</CardTitle>
            <CardDescription className="mt-2">Let’s get your account set up. Create a password and confirm your details.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 md:p-10">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (International)</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="tel"
                        placeholder="+27 82 123 4567"
                        {...field}
                        onChange={e => field.onChange(e.target.value.replace(/[^\d +]/g, ''))}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">Use your WhatsApp number if possible.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <PasswordStrengthMeter score={passwordScore} />
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  <PasswordChecklistItem isChecked={passwordChecks.len} text="At least 10 characters" />
                  <PasswordChecklistItem isChecked={passwordChecks.up} text="1 uppercase letter" />
                  <PasswordChecklistItem isChecked={passwordChecks.lo} text="1 lowercase letter" />
                  <PasswordChecklistItem isChecked={passwordChecks.num} text="1 number" />
                  <PasswordChecklistItem isChecked={passwordChecks.sp} text="1 special character" />
                </ul>

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="terms" render={({ field }) => (
                  <FormItem className="flex items-start gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="terms" className="text-sm text-gray-700 font-normal">
                        I agree to the{' '}
                        <Link to="/terms" target="_blank" rel="noreferrer" className="text-blue-600 underline">Terms & Conditions</Link>
                        {' '}and{' '}
                        <Link to="/privacy" target="_blank" rel="noreferrer" className="text-blue-600 underline">Privacy Policy</Link>.
                      </Label>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />

                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full rounded-xl bg-brand-pink text-white py-3 font-semibold shadow-sm transition hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed">
                  {form.formState.isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  {form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
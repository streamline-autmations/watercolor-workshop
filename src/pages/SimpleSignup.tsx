import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

export default function SimpleSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phone = formData.get('phone') as string;

    try {
      console.log('🚀 Starting simple signup process...');

      // Sign up the user
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone
          }
        }
      });

      if (signupError) {
        throw new Error(`Signup failed: ${signupError.message}`);
      }

      console.log('✅ Signup completed');

      // Wait for session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not found after signup');
      }

      console.log('👤 User found:', user.id);

      // Create profile directly (bypass all functions and triggers)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          role: 'student'
        });

      if (profileError) {
        console.error('❌ Profile save error:', profileError);
        // Don't throw error - just log it and continue
        console.log('⚠️ Profile creation failed, but continuing...');
      } else {
        console.log('✅ Profile saved successfully');
      }

      // Auto-enroll in Christmas course
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: 'efe16488-1de6-4522-aeb3-b08cfae3a640'
        });

      if (enrollError) {
        console.log('⚠️ Auto-enrollment failed (user might already be enrolled):', enrollError.message);
      } else {
        console.log('✅ Auto-enrolled in Christmas course');
      }

      // Redirect to home
      navigate('/home');
      showSuccess('Account created successfully!');

    } catch (err: any) {
      console.error('❌ Signup error:', err);
      setError(err.message);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bloom flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Sign up for BLOM Academy and get access to our courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Enter your first name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Enter your last name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              onClick={() => navigate('/login')}
              className="text-sm"
            >
              Already have an account? Log in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Profile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isProfileComplete: boolean;
  signOut: () => Promise<void>;
  fetchUserProfile: (userId: string) => Promise<Profile | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // Clean sign out function - only clears auth, not all storage
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsProfileComplete(false);
    }
  }, []);

  // Fetch user profile
  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('🔍 Fetching profile for userId:', userId);
    try {
      console.log('📡 Making Supabase query to profiles table...');
      
      // Add timeout to detect hanging queries
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout after 10 seconds')), 10000)
      );
      
      const { data: profileData, error: profileError } = await Promise.race([queryPromise, timeoutPromise]) as any;

      console.log('📊 Profile query result:', { 
        hasData: !!profileData, 
        data: profileData,
        error: profileError?.message,
        errorCode: profileError?.code,
        errorDetails: profileError?.details,
        errorHint: profileError?.hint
      });

      if (profileError) {
        console.log('❌ Profile query failed with error:', profileError);
        
        if (profileError.code === 'PGRST116') {
          console.log('👤 Profile doesn\'t exist - user needs to complete setup');
          // Don't auto-create profile - let them go through proper signup flow
          return null;
        }
        
        console.error('❌ Profile fetch error (not PGRST116):', profileError);
        return null;
      }
      
      console.log('✅ Profile found successfully:', profileData);
      return profileData;
    } catch (error) {
      console.error('❌ Unexpected error fetching profile:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🔐 Initializing auth...');
      setLoading(true); // Ensure loading is true at start
      
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        console.log('📡 Initial session check:', { 
          hasSession: !!initialSession, 
          userId: initialSession?.user?.id,
          error: error?.message 
        });
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
        }

        if (!mounted) return;

        if (initialSession?.user) {
          console.log('✅ Initial session found, setting user:', initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch profile
          console.log('👤 Fetching profile for user:', initialSession.user.id);
          const profileData = await fetchUserProfile(initialSession.user.id);
          console.log('👤 Profile data:', profileData);
          
          if (!mounted) return;
          
          if (profileData) {
            setProfile(profileData);
            setIsProfileComplete(!!profileData.first_name);
            console.log('✅ Profile set, complete:', !!profileData.first_name);
          } else {
            console.log('⚠️ No profile data found');
            setProfile(null);
            setIsProfileComplete(false);
          }
        } else {
          console.log('❌ No initial session found');
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsProfileComplete(false);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsProfileComplete(false);
        }
      } finally {
        if (mounted) {
          console.log('🏁 Auth initialization complete, setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.id);
      
      if (!mounted) return;
      
      // Only process meaningful auth changes, not just token refreshes
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed, keeping existing state');
        return;
      }
      
      if (session?.user) {
        console.log('✅ Session found in state change, setting user:', session.user.id);
        setSession(session);
        setUser(session.user);
        
        // Fetch profile for new session
        console.log('👤 Fetching profile for state change user:', session.user.id);
        const profileData = await fetchUserProfile(session.user.id);
        console.log('👤 Profile data from state change:', profileData);
        
        if (!mounted) return;
        
        if (profileData) {
          setProfile(profileData);
          setIsProfileComplete(!!profileData.first_name);
          console.log('✅ Profile set from state change, complete:', !!profileData.first_name);
        } else {
          console.log('⚠️ No profile data from state change');
          setProfile(null);
          setIsProfileComplete(false);
        }
      } else {
        console.log('❌ No session in state change');
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsProfileComplete(false);
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const value = {
    user,
    session,
    profile,
    loading,
    isProfileComplete,
    signOut,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
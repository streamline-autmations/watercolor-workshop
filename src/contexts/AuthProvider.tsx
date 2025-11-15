import { createContext, useState, useEffect, ReactNode, useCallback, useRef, useContext } from 'react';
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
  const [profileFetchFailed, setProfileFetchFailed] = useState(false);
  const profileFetchFailedRef = useRef(false);
  
  // Emergency fallback - disable profile fetching entirely if it keeps failing
  const DISABLE_PROFILE_FETCH = false; // Set to true to completely skip profile fetching
  
  // Optimized timeout for profile queries
  const PROFILE_QUERY_TIMEOUT = 5000; // 5 seconds - balanced for speed and reliability

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

  // Fetch user profile with timeout and better error handling
  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('🔍 Fetching profile for userId:', userId);
    
    try {
      console.log('⚙️ Making Supabase query to profiles table...');
      
      // Create a timeout promise with longer timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Profile query timeout after ${PROFILE_QUERY_TIMEOUT/1000} seconds`)), PROFILE_QUERY_TIMEOUT);
      });
      
      // Create the query promise with explicit timeout
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
        .abortSignal(AbortSignal.timeout(PROFILE_QUERY_TIMEOUT)); // Longer timeout
      
      // Race between query and timeout
      const { data: profileData, error: profileError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]);

      console.log('📊 Profile query result:', { 
        hasData: !!profileData, 
        data: profileData,
        error: profileError?.message,
        errorCode: profileError?.code,
        errorDetails: profileError?.details,
        errorHint: profileError?.hint
      });
      
      // Additional debugging for profile data
      if (profileData) {
        console.log('🔍 Profile data details:', {
          user_id: profileData.user_id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          username: profileData.username,
          phone: profileData.phone,
          role: profileData.role,
          isComplete: !!(profileData.first_name && profileData.last_name)
        });
      }

      if (profileError) {
        console.log('❌ Profile query failed with error:', profileError);
        
        if (profileError.code === 'PGRST116') {
          console.log('👤 Profile doesn\'t exist - user needs to complete setup');
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
      
      // If it's a timeout error, return null to continue without profile
      if (error instanceof Error && error.message.includes('timeout')) {
        console.log('⏰ Profile query timed out, continuing without profile');
        return null;
      }
      
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🔐 Initializing auth...');
      setLoading(true); // Ensure loading is true at start
      
      // Set a timeout to ensure loading gets set to false
      const loadingTimeout = setTimeout(() => {
        console.log('⏰ Loading timeout reached, forcing loading to false');
        setLoading(false);
      }, 2000); // Reduced to 2 seconds for faster loading
      
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
          
          // Try to fetch profile with fallback (skip if already failed or disabled)
          if (!DISABLE_PROFILE_FETCH && !profileFetchFailedRef.current) {
            try {
              console.log('👤 Fetching profile for user:', initialSession.user.id);
              const profileData = await fetchUserProfile(initialSession.user.id);
              console.log('👤 Profile data:', profileData);
              
              if (!mounted) return;
              
              if (profileData) {
                setProfile(profileData);
                setIsProfileComplete(!!(profileData.first_name && profileData.last_name));
                console.log('✅ Profile set, complete:', !!(profileData.first_name && profileData.last_name));
              } else {
                console.log('⚠️ No profile data found - user needs setup');
                setProfile(null);
                setIsProfileComplete(false);
              }
            } catch (profileError) {
              console.log('⚠️ Profile fetch failed, marking as failed and continuing:', profileError);
              if (!mounted) return;
              profileFetchFailedRef.current = true;
              setProfileFetchFailed(true);
              setProfile(null);
              setIsProfileComplete(false);
            }
          } else {
            console.log('⏭️ Skipping profile fetch - disabled or previously failed');
            if (!mounted) return;
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
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack'
        });
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsProfileComplete(false);
        }
      } finally {
        clearTimeout(loadingTimeout);
        console.log('🏁 Auth initialization complete, setting loading to false');
        setLoading(false);
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
        
        // Try to fetch profile for new session with fallback (skip if already failed or disabled)
        if (!DISABLE_PROFILE_FETCH && !profileFetchFailedRef.current) {
          try {
            console.log('👤 Fetching profile for state change user:', session.user.id);
            const profileData = await fetchUserProfile(session.user.id);
            console.log('👤 Profile data from state change:', profileData);
            
            if (!mounted) return;
            
            if (profileData) {
              setProfile(profileData);
              setIsProfileComplete(!!(profileData.first_name && profileData.last_name));
              console.log('✅ Profile set from state change, complete:', !!(profileData.first_name && profileData.last_name));
            } else {
              console.log('⚠️ No profile data from state change - user needs setup');
              setProfile(null);
              setIsProfileComplete(false);
            }
          } catch (profileError) {
            console.log('⚠️ Profile fetch failed in state change, marking as failed:', profileError);
            if (!mounted) return;
            profileFetchFailedRef.current = true;
            setProfileFetchFailed(true);
            setProfile(null);
            setIsProfileComplete(false);
          }
        } else {
          console.log('⏭️ Skipping profile fetch in state change - disabled or previously failed');
          if (!mounted) return;
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('📊 Profile query result:', { 
        hasData: !!profileData, 
        error: profileError?.message,
        errorCode: profileError?.code 
      });

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log('👤 Profile doesn\'t exist, creating new one...');
          // Profile doesn't exist, create it
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({ user_id: userId, role: 'student' }, { onConflict: 'user_id' });
          
          if (upsertError) {
            console.error('❌ Profile upsert error:', upsertError);
            return null;
          }
          
          console.log('✅ Profile created successfully');
          // Return basic profile
          return { user_id: userId, first_name: null, last_name: null, username: null, avatar_url: null };
        }
        
        console.error('❌ Profile fetch error:', profileError);
        return null;
      }
      
      console.log('✅ Profile found:', profileData);
      return profileData;
    } catch (error) {
      console.error('❌ Unexpected error fetching profile:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🔐 Initializing auth...');
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

        if (mounted) {
          if (initialSession?.user) {
            console.log('✅ Initial session found, setting user:', initialSession.user.id);
            setSession(initialSession);
            setUser(initialSession.user);
            
            // Fetch profile
            console.log('👤 Fetching profile for user:', initialSession.user.id);
            const profileData = await fetchUserProfile(initialSession.user.id);
            console.log('👤 Profile data:', profileData);
            
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
      
      if (mounted) {
        if (session?.user) {
          console.log('✅ Session found in state change, setting user:', session.user.id);
          setSession(session);
          setUser(session.user);
          
          // Fetch profile for new session
          console.log('👤 Fetching profile for state change user:', session.user.id);
          const profileData = await fetchUserProfile(session.user.id);
          console.log('👤 Profile data from state change:', profileData);
          
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

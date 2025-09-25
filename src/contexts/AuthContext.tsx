import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Profile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileComplete: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileComplete, setProfileComplete] = useState(false);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileComplete(false);
  }, []);

  // Function to fetch profile for a given user ID
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // If profile doesn't exist, create it
        if (profileError.code === 'PGRST116') {
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({ user_id: userId, role: 'student' }, { onConflict: 'user_id' });
          
          if (upsertError) {
            console.error('Profile upsert error:', upsertError);
            return null;
          }
          
          // Return a basic profile
          return { user_id: userId, first_name: null, last_name: null, username: null, avatar_url: null };
        }
        
        toast.error('Could not fetch your profile.');
        console.error('Profile fetch error:', profileError);
        await signOut();
        return null;
      }
      return profileData;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      toast.error('Unexpected error fetching profile.');
      await signOut();
      return null;
    }
  }, [signOut]);

  // Restore session with retry and fallback
  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to get current session
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('Error getting session:', error);
      }

      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);

        const profileData = await fetchUserProfile(currentSession.user.id);
        if (profileData) {
          setProfile(profileData);
          setProfileComplete(!!profileData.first_name);
        } else {
          setProfile(null);
          setProfileComplete(false);
        }
      } else {
        // No session, try to refresh using refresh token from storage
        const refreshToken = localStorage.getItem('sb-refresh-token') || localStorage.getItem('supabase.auth.token');
        if (refreshToken) {
          const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.warn('Error refreshing session:', refreshError);
            setSession(null);
            setUser(null);
            setProfile(null);
            setProfileComplete(false);
          } else if (refreshedSession?.session) {
            setSession(refreshedSession.session);
            setUser(refreshedSession.session.user);

            const profileData = await fetchUserProfile(refreshedSession.session.user.id);
            if (profileData) {
              setProfile(profileData);
              setProfileComplete(!!profileData.first_name);
            } else {
              setProfile(null);
              setProfileComplete(false);
            }
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
            setProfileComplete(false);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileComplete(false);
        }
      }
    } catch (err) {
      console.error('Error restoring session:', err);
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileComplete(false);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    let isMounted = true;

    restoreSession();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      console.debug('Auth state changed:', event);

      setIsLoading(true);
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const profileData = await fetchUserProfile(currentUser.id);
        if (!isMounted) return;

        if (profileData) {
          setProfile(profileData);
          setProfileComplete(!!profileData.first_name);
        } else {
          setProfile(null);
          setProfileComplete(false);
          await signOut();
        }
      } else {
        setProfile(null);
        setProfileComplete(false);
      }
      setIsLoading(false);
    });

    // Listen to localStorage changes for multi-tab sync fallback
    const onStorage = async (e: StorageEvent) => {
      if (e.key === 'sb-auth-token' || e.key === 'supabase.auth.token') {
        console.debug('Storage event detected for auth token key:', e.key);
        try {
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (!isMounted) return;

          setSession(newSession);
          const currentUser = newSession?.user ?? null;
          setUser(currentUser);

          if (currentUser) {
            const profileData = await fetchUserProfile(currentUser.id);
            if (!isMounted) return;

            if (profileData) {
              setProfile(profileData);
              setProfileComplete(!!profileData.first_name);
            } else {
              setProfile(null);
              setProfileComplete(false);
              await signOut();
            }
          } else {
            setProfile(null);
            setProfileComplete(false);
          }
        } catch (error) {
          console.error('Error handling storage event auth sync:', error);
        }
      }
    };

    window.addEventListener('storage', onStorage);

    // Optional: Use BroadcastChannel if available for better multi-tab sync
    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('supabase-auth');
      bc.onmessage = async (msg) => {
        if (!isMounted) return;
        if (msg.data === 'signOut' || msg.data === 'signIn') {
          console.debug('BroadcastChannel message received:', msg.data);
          try {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            setSession(newSession);
            const currentUser = newSession?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
              const profileData = await fetchUserProfile(currentUser.id);
              if (!isMounted) return;

              if (profileData) {
                setProfile(profileData);
                setProfileComplete(!!profileData.first_name);
              } else {
                setProfile(null);
                setProfileComplete(false);
                await signOut();
              }
            } else {
              setProfile(null);
              setProfileComplete(false);
            }
          } catch (error) {
            console.error('Error handling BroadcastChannel auth sync:', error);
          }
        }
      };
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('storage', onStorage);
      if (bc) {
        bc.close();
      }
    };
  }, [fetchUserProfile, signOut, restoreSession]);

  const value = {
    session,
    user,
    profile,
    isLoading,
    isProfileComplete,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
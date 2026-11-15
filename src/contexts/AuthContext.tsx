import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase/client';
import type { Profile } from '../types';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<{ error?: string; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  switchDemoUser: (userIndex: 1 | 2) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_USER_1: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'alex',
  display_name: 'Alex Johnson',
  bio: 'Building things at the speed of thought 🚀',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  is_discoverable: true,
  status_status: 'Online & testing Yo!!!',
  created_at: new Date().toISOString()
};

export const DEMO_USER_2: Profile = {
  id: '00000000-0000-0000-0000-000000000002',
  username: 'samira',
  display_name: 'Samira Chen',
  bio: 'Designer, dreamer, creator ✨',
  avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  is_discoverable: true,
  status_status: 'Available for calls',
  created_at: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsDemoMode(true);
      setUser(null);
      setLoading(false);
      return;
    }

    const checkUser = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            setUser(profile);
          } else {
            // Fallback profile if record is still syncing
            const meta = session.user.user_metadata || {};
            setUser({
              id: session.user.id,
              username: meta.username || 'user_' + session.user.id.slice(0, 6),
              display_name: meta.display_name || 'Yo User',
              is_discoverable: true,
              created_at: new Date().toISOString()
            });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('Auth check error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          setUser(profile);
        } else {
          const meta = session.user.user_metadata || {};
          setUser({
            id: session.user.id,
            username: meta.username || 'user_' + session.user.id.slice(0, 6),
            display_name: meta.display_name || 'Yo User',
            is_discoverable: true,
            created_at: new Date().toISOString()
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const switchDemoUser = (index: 1 | 2) => {
    setUser(index === 1 ? DEMO_USER_1 : DEMO_USER_2);
  };

  const signIn = async (email: string, pass: string) => {
    if (isDemoMode) {
      setUser(DEMO_USER_1);
      return {};
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: error.message };

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        setUser(profile);
      } else {
        const meta = data.user.user_metadata || {};
        setUser({
          id: data.user.id,
          username: meta.username || 'user',
          display_name: meta.display_name || 'Yo User',
          is_discoverable: true,
          created_at: new Date().toISOString()
        });
      }
    }
    return {};
  };

  const signUp = async (email: string, pass: string, username: string, displayName: string) => {
    if (isDemoMode) {
      setUser({
        ...DEMO_USER_1,
        username,
        display_name: displayName
      });
      return {};
    }

    const cleanUsername = username.toLowerCase().trim();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          username: cleanUsername,
          display_name: displayName.trim()
        }
      }
    });

    if (error) {
      return { error: error.message };
    }

    if (data.session && data.user) {
      // Immediate session created (Email confirm is off)
      const newProfile: Profile = {
        id: data.user.id,
        username: cleanUsername,
        display_name: displayName.trim(),
        is_discoverable: true,
        created_at: new Date().toISOString()
      };
      
      // Ensure profile exists in profiles table
      await supabase.from('profiles').upsert(newProfile);
      setUser(newProfile);
      return {};
    } else if (data.user && !data.session) {
      // Supabase project requires email confirmation
      return { requiresEmailConfirmation: true };
    }

    return {};
  };

  const signOut = async () => {
    if (!isDemoMode) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemoMode, signIn, signUp, signOut, switchDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

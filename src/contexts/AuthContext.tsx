import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase/client';
import type { Profile } from '../types';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  switchDemoUser: (userIndex: 1 | 2) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_USER_1: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'alex_yo',
  display_name: 'Alex Rivera',
  bio: 'Building things at the speed of thought 🚀',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  is_discoverable: true,
  status_status: 'Online & testing Yo!!!',
  created_at: new Date().toISOString()
};

export const DEMO_USER_2: Profile = {
  id: '00000000-0000-0000-0000-000000000002',
  username: 'sam_tech',
  display_name: 'Samira Chen',
  bio: 'Designer, dreamer, creator ✨',
  avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  is_discoverable: true,
  status_status: 'Available for calls',
  created_at: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(DEMO_USER_1);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsDemoMode(true);
      setUser(DEMO_USER_1);
      return;
    }

    // Supabase Auth listener
    const checkUser = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(profile || null);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(profile || null);
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
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return { error: error?.message };
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
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          username,
          display_name: displayName
        }
      }
    });
    return { error: error?.message };
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


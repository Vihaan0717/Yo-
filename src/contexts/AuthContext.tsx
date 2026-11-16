import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase/client';
import { IdentityService } from '../services/auth/IdentityService';
import type { Profile } from '../types';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isDemoMode: boolean;
  isEmailUnconfirmed: boolean;
  unconfirmedEmail: string | null;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<{ error?: string; requiresEmailConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  resendVerificationEmail: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  claimUsername: (username: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
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
  const [isEmailUnconfirmed, setIsEmailUnconfirmed] = useState<boolean>(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const fetchProfileForUser = async (userId: string, metadata: any = {}) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        setUser(profile);
      } else {
        // Fallback temporary profile if still claiming or onboarding
        setUser({
          id: userId,
          username: metadata.username || 'user_' + userId.slice(0, 8),
          display_name: metadata.display_name || metadata.full_name || 'Yo User',
          avatar_url: metadata.avatar_url || '',
          is_discoverable: true,
          created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Profile fetch error:', err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsDemoMode(true);
      setUser(null);
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Verify email status if email verification is enabled
          const emailConfirmed = Boolean(
            session.user.email_confirmed_at || 
            session.user.confirmed_at || 
            session.user.app_metadata?.provider === 'google'
          );

          if (!emailConfirmed) {
            setIsEmailUnconfirmed(true);
            setUnconfirmedEmail(session.user.email || null);
            setUser(null);
          } else {
            setIsEmailUnconfirmed(false);
            setUnconfirmedEmail(null);
            await fetchProfileForUser(session.user.id, session.user.user_metadata);
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

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const emailConfirmed = Boolean(
          session.user.email_confirmed_at || 
          session.user.confirmed_at || 
          session.user.app_metadata?.provider === 'google'
        );

        if (!emailConfirmed) {
          setIsEmailUnconfirmed(true);
          setUnconfirmedEmail(session.user.email || null);
          setUser(null);
        } else {
          setIsEmailUnconfirmed(false);
          setUnconfirmedEmail(null);
          await fetchProfileForUser(session.user.id, session.user.user_metadata);

          // If new signup or OAuth login, ensure username claim is completed
          if (event === 'SIGNED_IN' && session.user.user_metadata?.username) {
            await IdentityService.claimUsername(
              session.user.user_metadata.username,
              session.user.user_metadata.display_name
            );
          }
        }
      } else {
        setUser(null);
        setIsEmailUnconfirmed(false);
        setUnconfirmedEmail(null);
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass
    });

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setIsEmailUnconfirmed(true);
        setUnconfirmedEmail(email.trim().toLowerCase());
        return { error: 'Please verify your email address to log in. Check your inbox.' };
      }
      return { error: error.message };
    }

    if (data.user) {
      const emailConfirmed = Boolean(data.user.email_confirmed_at || data.user.confirmed_at);
      if (!emailConfirmed) {
        setIsEmailUnconfirmed(true);
        setUnconfirmedEmail(data.user.email || email);
        return { error: 'Please verify your email address before logging in.' };
      }
      await fetchProfileForUser(data.user.id, data.user.user_metadata);
    }

    return {};
  };

  const signUp = async (
    email: string, 
    pass: string, 
    username: string, 
    displayName: string
  ): Promise<{ error?: string; requiresEmailConfirmation?: boolean }> => {
    if (isDemoMode) {
      setUser({
        ...DEMO_USER_1,
        username,
        display_name: displayName
      });
      return {};
    }

    // Pre-validate username format and availability
    const check = await IdentityService.checkAvailability(username);
    if (!check.available) {
      return { error: check.reason || 'Username is not available' };
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
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
      // Immediate session (Email confirm disabled in Supabase project)
      const claimResult = await IdentityService.claimUsername(cleanUsername, displayName.trim());
      if (!claimResult.success) {
        console.warn('Initial username claim warning:', claimResult.error);
      }
      await fetchProfileForUser(data.user.id, { username: cleanUsername, display_name: displayName.trim() });
      return {};
    } else if (data.user && !data.session) {
      // Supabase requires email verification
      setIsEmailUnconfirmed(true);
      setUnconfirmedEmail(cleanEmail);
      return { requiresEmailConfirmation: true };
    }

    return {};
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    if (isDemoMode) {
      setUser(DEMO_USER_1);
      return {};
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Google Sign-in failed' };
    }
  };

  const resendVerificationEmail = async (): Promise<{ error?: string }> => {
    if (!unconfirmedEmail) return { error: 'No unconfirmed email address found' };
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unconfirmedEmail
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to resend confirmation email' };
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    if (isDemoMode) return {};
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to initiate password reset' };
    }
  };

  const claimUsername = async (username: string, displayName?: string) => {
    const res = await IdentityService.claimUsername(username, displayName);
    if (res.success && user) {
      setUser((prev) => prev ? { ...prev, username: res.username || username, display_name: displayName || prev.display_name } : null);
    }
    return res;
  };

  const signOut = async () => {
    if (!isDemoMode) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsEmailUnconfirmed(false);
    setUnconfirmedEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
        isEmailUnconfirmed,
        unconfirmedEmail,
        signIn,
        signUp,
        signInWithGoogle,
        resendVerificationEmail,
        resetPassword,
        claimUsername,
        signOut,
        switchDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

import { supabase, isSupabaseConfigured } from '../supabase/client';

export interface UsernameCheckResult {
  available: boolean;
  reason?: string;
  normalized?: string;
}

export const RESERVED_USERNAMES_LOCAL = new Set([
  'admin', 'administrator', 'support', 'help', 'official',
  'security', 'system', 'root', 'yo', 'yoapp', 'staff',
  'team', 'billing', 'moderator', 'bot', 'null', 'undefined', 'api'
]);

export class IdentityService {
  /**
   * Validate username format locally for immediate real-time feedback
   */
  static validateFormat(username: string): { valid: boolean; reason?: string } {
    const clean = username.trim().toLowerCase();

    if (!clean) {
      return { valid: false, reason: 'Username cannot be empty.' };
    }

    if (RESERVED_USERNAMES_LOCAL.has(clean)) {
      return { valid: false, reason: 'This username is reserved by Yo!!!' };
    }

    if (clean.length < 3) {
      return { valid: false, reason: 'Username must be at least 3 characters.' };
    }

    if (clean.length > 24) {
      return { valid: false, reason: 'Username cannot exceed 24 characters.' };
    }

    if (!/^[a-z]/.test(clean)) {
      return { valid: false, reason: 'Username must start with a letter (a-z).' };
    }

    if (clean.endsWith('.')) {
      return { valid: false, reason: 'Username cannot end with a period.' };
    }

    if (clean.includes('..')) {
      return { valid: false, reason: 'Username cannot contain consecutive periods.' };
    }

    if (!/^[a-z][a-z0-9_.]{1,22}[a-z0-9_]$/.test(clean)) {
      return { valid: false, reason: 'Username can only contain letters, numbers, underscores, and single periods.' };
    }

    return { valid: true };
  }

  /**
   * Server-side debounced username availability check
   */
  static async checkAvailability(username: string): Promise<UsernameCheckResult> {
    const localValidation = this.validateFormat(username);
    if (!localValidation.valid) {
      return { available: false, reason: localValidation.reason };
    }

    if (!isSupabaseConfigured) {
      // In local demo / offline mode, mock uniqueness
      const clean = username.trim().toLowerCase();
      if (['alex', 'samira'].includes(clean)) {
        return { available: false, reason: 'This username is already taken.' };
      }
      return { available: true, normalized: clean };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const { data, error } = await supabase.rpc('check_username_availability', {
        p_username: username.trim()
      }).abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        // Fallback to table query if RPC not applied yet
        const subController = new AbortController();
        const subTimeout = setTimeout(() => subController.abort(), 2000);

        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .ilike('username', username.trim())
          .abortSignal(subController.signal);

        clearTimeout(subTimeout);

        return {
          available: count === 0,
          reason: count === 0 ? undefined : 'This username is already taken.',
          normalized: username.trim().toLowerCase()
        };
      }

      return data as UsernameCheckResult;
    } catch {
      return { available: false, reason: 'Network error checking username' };
    }
  }

  /**
   * Atomic claim RPC
   */
  static async claimUsername(
    username: string, 
    displayName?: string, 
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string; username?: string }> {
    const localCheck = this.validateFormat(username);
    if (!localCheck.valid) {
      return { success: false, error: localCheck.reason };
    }

    if (!isSupabaseConfigured) {
      return { success: true, username: username.trim() };
    }

    try {
      const { data, error } = await supabase.rpc('claim_username', {
        p_username: username.trim(),
        p_display_name: displayName?.trim() || null,
        p_avatar_url: avatarUrl?.trim() || null
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data as { success: boolean; error?: string; username?: string };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to claim username' };
    }
  }
}

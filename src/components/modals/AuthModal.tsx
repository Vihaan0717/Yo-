import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Shield, Sparkles, User, Mail, Lock } from 'lucide-react';
import { UsernameInput } from '../auth/UsernameInput';

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (isForgot) {
        const res = await resetPassword(email);
        if (res.error) setError(res.error);
        else setNotice('Password reset link sent! Check your inbox.');
      } else if (isLogin) {
        const res = await signIn(email, password);
        if (res.error) setError(res.error);
        else onClose();
      } else {
        if (!username || !displayName) {
          setError('Please fill in your name and username handle.');
          setLoading(false);
          return;
        }
        if (!isUsernameValid) {
          setError('Please select a valid and available username.');
          setLoading(false);
          return;
        }
        const res = await signUp(email, password, username, displayName);
        if (res.error) {
          setError(res.error);
        } else if (res.requiresEmailConfirmation) {
          setNotice('Account created! Please check your email inbox to verify your account before logging in.');
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-3xl p-7 relative overflow-hidden border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Ambient neon gradient orb */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white mb-2 shadow-lg shadow-indigo-500/30">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {isForgot ? 'Reset Password' : isLogin ? 'Welcome Back to Yo!!!' : 'Create Yo!!! Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isForgot 
              ? 'Enter your registered email to receive a recovery link'
              : isLogin 
              ? 'Log in to continue chatting across any network' 
              : 'Pick a unique username & join the network'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && !isForgot && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Hunter"
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username (@handle)
                </label>
                <UsernameInput
                  value={username}
                  onChange={setUsername}
                  onValidityChange={setIsUsernameValid}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          {!isForgot && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setError(null); }}
                    className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isLogin && !isForgot && !isUsernameValid)}
            className="glass-button-primary w-full py-3 rounded-xl font-medium text-white text-sm mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : isForgot ? (
              <span>Send Reset Link</span>
            ) : isLogin ? (
              <>
                <span>Sign In</span>
                <Sparkles className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Register Account</span>
                <Shield className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {!isForgot && (
          <>
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#161c28] px-3 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Or continue with
              </span>
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full glass py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 hover:bg-white/10 transition cursor-pointer border border-white/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}

        <div className="mt-4 text-center text-xs text-slate-400">
          {isForgot ? (
            <button
              type="button"
              onClick={() => { setIsForgot(false); setError(null); }}
              className="text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              Back to Sign In
            </button>
          ) : isLogin ? (
            <>
              Don't have an account yet?
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(null); }}
                className="ml-1 text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already registered?
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(null); }}
                className="ml-1 text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                Log in
              </button>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

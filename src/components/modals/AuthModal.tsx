import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Shield, Sparkles, User, Mail, Lock, AtSign } from 'lucide-react';

export const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await signIn(email, password);
        if (res.error) setError(res.error);
        else onClose();
      } else {
        if (!username || !displayName) {
          setError('Please fill all profile fields');
          setLoading(false);
          return;
        }
        const res = await signUp(email, password, username, displayName);
        if (res.error) setError(res.error);
        else onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 relative overflow-hidden border border-white/10 shadow-2xl">
        {/* Ambient neon gradient orb */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white mb-3 shadow-lg shadow-indigo-500/30">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? 'Welcome Back to Yo!!!' : 'Create Yo!!! Account'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isLogin ? 'Log in to continue chatting across any network' : 'Pick a unique username & join the network'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Username (Unique handle)</label>
                <div className="relative">
                  <AtSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="alex_yo"
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
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

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
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

          <button
            type="submit"
            disabled={loading}
            className="glass-button-primary w-full py-3 rounded-xl font-medium text-white text-sm mt-4 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
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

        <div className="mt-5 text-center text-xs text-slate-400">
          {isLogin ? "Don't have an account yet?" : 'Already registered?'}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="ml-2 text-indigo-400 font-semibold hover:underline cursor-pointer"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

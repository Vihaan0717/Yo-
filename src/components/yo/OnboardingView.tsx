import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  Globe2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UsernameInput } from '../auth/UsernameInput';

const spring = { type: 'spring', stiffness: 450, damping: 35 } as const;

export const OnboardingView: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { 
    signIn, 
    signUp, 
    signInWithGoogle, 
    resendVerificationEmail, 
    isEmailUnconfirmed, 
    unconfirmedEmail 
  } = useAuth();

  const [slide, setSlide] = useState<0 | 1 | 2>(0);
  const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'verify'>('welcome');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const introSlides = [
    {
      icon: MessageSquare,
      tag: "INDEPENDENT MESSAGING",
      title: "Real-time communication, anywhere.",
      desc: "Connect and talk across the internet with zero lag, without needing to be on the same Wi-Fi.",
      gradient: "from-teal-400 to-emerald-400"
    },
    {
      icon: Globe2,
      tag: "WEBRTC CALLING",
      title: "Encrypted HD Audio & Video Calls",
      desc: "Direct peer-to-peer calling powered by STUN NAT traversal with crystal clear low-latency audio.",
      gradient: "from-sky-400 to-teal-400"
    },
    {
      icon: ShieldCheck,
      tag: "PRIVACY FIRST",
      title: "Secure discovery by unique @handle",
      desc: "Find friends with unique identifiers and private authenticated PostgreSQL conversations.",
      gradient: "from-emerald-400 to-teal-500"
    }
  ];

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await signIn(email, password);
        if (res.error) setError(res.error);
        else onComplete();
      } else {
        if (!username || !displayName) {
          setError('Please fill in your name and unique @handle');
          setLoading(false);
          return;
        }

        if (!isUsernameValid) {
          setError('Please choose a valid and available username');
          setLoading(false);
          return;
        }

        const res = await signUp(email, password, username, displayName);
        if (res.error) {
          setError(res.error);
        } else if (res.requiresEmailConfirmation) {
          setMode('verify');
        } else {
          onComplete();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus('Sending confirmation email...');
    const res = await resendVerificationEmail();
    if (res.error) {
      setResendStatus(`Failed: ${res.error}`);
    } else {
      setResendStatus('New confirmation link sent! Check your inbox.');
    }
  };

  // If user state detects unconfirmed email
  const showVerificationScreen = mode === 'verify' || isEmailUnconfirmed;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0d131f] flex flex-col justify-between p-6 max-w-md mx-auto border-x border-white/5">
      {/* Dynamic ambient background orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-20 top-10 h-80 w-80 rounded-full bg-[#0ea5e9]/25 blur-[90px]" />
        <div className="animate-blob absolute right-[-60px] top-1/4 h-96 w-96 rounded-full bg-[#2dd4bf]/20 blur-[100px]" style={{ animationDelay: "-5s" }} />
      </div>

      {showVerificationScreen ? (
        /* Email Verification Pending Screen */
        <div className="flex-1 flex flex-col justify-between py-8 z-10">
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow">
              <Mail className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                ACTION REQUIRED
              </span>
              <h2 className="text-3xl font-black text-white tracking-tight mt-3">
                Verify your email
              </h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                We sent a secure activation link to <br />
                <span className="font-semibold text-white underline">{unconfirmedEmail || email}</span>.
              </p>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Click the confirmation link in the email to activate your account and securely lock your unique @handle.
              </p>
            </div>

            {resendStatus && (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-emerald-300">
                {resendStatus}
              </div>
            )}
          </div>

          <div className="space-y-3 pb-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleResend}
              className="w-full bg-white/10 hover:bg-white/15 py-3.5 rounded-2xl font-semibold text-white border border-white/20 flex items-center justify-center gap-2 cursor-pointer transition text-sm"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Resend Verification Email</span>
            </motion.button>

            <button
              onClick={() => { setMode('login'); setError(null); }}
              className="w-full py-3 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      ) : mode === 'welcome' ? (
        <>
          {/* Top Logo Badge */}
          <div className="flex items-center justify-between pt-4 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shadow-glow text-[#042f2e] font-black text-xl">
                Yo!
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">Yo!!!</span>
            </div>
            <button 
              onClick={() => setMode('login')}
              className="glass px-4 py-1.5 rounded-full text-xs font-semibold text-primary hover:bg-white/10 transition cursor-pointer"
            >
              Sign In
            </button>
          </div>

          {/* Slide Carousel */}
          <div className="flex-1 flex flex-col justify-center z-10 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={{ opacity: 0, x: 40, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -40, filter: "blur(4px)" }}
                transition={spring}
                className="space-y-6"
              >
                <div className="w-20 h-20 rounded-3xl glass-strong grid place-items-center shadow-glow border border-white/20">
                  {React.createElement(introSlides[slide].icon, { className: "w-10 h-10 text-primary" })}
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
                    {introSlides[slide].tag}
                  </span>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight pt-2">
                    {introSlides[slide].title}
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {introSlides[slide].desc}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slide Dots Indicator */}
            <div className="flex items-center gap-2 pt-8">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setSlide(idx as any)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    slide === idx ? 'w-8 bg-brand shadow-glow' : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="space-y-3 pb-6 z-10">
            {slide < 2 ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSlide((s) => (s + 1) as any)}
                className="w-full bg-brand py-4 rounded-3xl font-bold text-primary-foreground shadow-glow flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode('register')}
                className="w-full bg-brand py-4 rounded-3xl font-bold text-primary-foreground shadow-glow flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Get Started with Yo!!!</span>
                <Sparkles className="w-4 h-4" />
              </motion.button>
            )}

            <button
              onClick={() => setMode('login')}
              className="w-full py-3 text-xs font-semibold text-muted-foreground hover:text-white transition cursor-pointer"
            >
              Already have an account? <span className="text-primary underline">Log In</span>
            </button>
          </div>
        </>
      ) : (
        /* Login / Register Glass Form View */
        <div className="flex-1 flex flex-col justify-between py-6 z-10 overflow-y-auto">
          <div>
            <button
              onClick={() => { setMode('welcome'); setError(null); setSuccessNotice(null); }}
              className="glass px-3.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-white mb-6 inline-flex items-center gap-1 cursor-pointer"
            >
              ← Back
            </button>

            <h2 className="text-2xl font-black text-white tracking-tight">
              {mode === 'login' ? 'Welcome back to Yo!!!' : 'Create your account'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'login' ? 'Enter your credentials to access chats' : 'Choose a unique username & join the network'}
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            )}

            {successNotice && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{successNotice}</div>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5 mt-6">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Alex Hunter"
                        className="glass w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-white placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Unique Handle (@username)
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
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="glass w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-white placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-white placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading || (mode === 'register' && !isUsernameValid)}
                className="w-full bg-brand py-4 rounded-3xl font-bold text-primary-foreground shadow-glow flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                ) : mode === 'login' ? (
                  <>
                    <span>Log In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Register Account</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Google OAuth Option */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#0d131f] px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Or continue with
              </span>
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full glass py-3 rounded-2xl text-xs font-semibold text-white flex items-center justify-center gap-2.5 hover:bg-white/10 transition cursor-pointer border border-white/10"
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
          </div>

          <div className="text-center pt-6 pb-2">
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setSuccessNotice(null); }}
              className="text-xs text-muted-foreground hover:text-white cursor-pointer"
            >
              {mode === 'login' ? "Don't have an account yet? " : "Already have an account? "}
              <span className="text-primary font-bold">{mode === 'login' ? 'Sign up' : 'Log in'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

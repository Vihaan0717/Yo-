import { useAuth } from './contexts/AuthContext';
import { YoApp } from './components/yo/YoApp';
import { OnboardingView } from './components/yo/OnboardingView';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0d131f] flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-3xl bg-brand flex items-center justify-center shadow-glow text-[#042f2e] font-black text-2xl animate-pulse">
          Yo!
        </div>
        <p className="text-xs text-muted-foreground mt-4 font-medium tracking-wider uppercase">Loading Yo!!!</p>
      </div>
    );
  }

  // If not logged in, present Intro & Auth slides
  if (!user) {
    return <OnboardingView onComplete={() => {}} />;
  }

  return <YoApp />;
}

export default App;

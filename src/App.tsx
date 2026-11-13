import React, { useState, useEffect, useRef } from 'react';
import { useAuth, DEMO_USER_1, DEMO_USER_2 } from './contexts/AuthContext';
import { AuthModal } from './components/modals/AuthModal';
import { CallOverlay } from './features/calls/components/CallOverlay';
import { WebRTCService } from './features/calls/webrtc/WebRTCService';
import type { Conversation, Message, CallSession } from './types';
import { 
  MessageSquare, 
  Phone, 
  Video, 
  Users, 
  Settings, 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  CheckCheck, 
  ShieldCheck, 
  MoreVertical,
  UserCheck,
  Zap
} from 'lucide-react';

export function App() {
  const { user, isDemoMode, switchDemoUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'people' | 'settings'>('chats');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Direct conversations state
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv-1',
      type: 'direct',
      title: 'Samira Chen',
      avatar_url: DEMO_USER_2.avatar_url,
      last_message_preview: 'Hey! Did you check out the WebRTC call latency test?',
      last_message_at: '10:42 AM',
      unread_count: 2,
      other_user: DEMO_USER_2
    },
    {
      id: 'conv-2',
      type: 'direct',
      title: 'Dev Core Team',
      avatar_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120&auto=format&fit=crop&q=80',
      last_message_preview: 'Sprint 1 Glassmorphism architecture is approved!',
      last_message_at: 'Yesterday',
      unread_count: 0
    }
  ]);

  const [activeConversationId, setActiveConversationId] = useState<string>('conv-1');
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    'conv-1': [
      {
        id: 'm1',
        conversation_id: 'conv-1',
        sender_id: DEMO_USER_2.id,
        message_type: 'text',
        content: 'Hey Alex! Welcome to Yo!!! The internet communication platform.',
        created_at: '10:30 AM',
        is_own: false
      },
      {
        id: 'm2',
        conversation_id: 'conv-1',
        sender_id: DEMO_USER_1.id,
        message_type: 'text',
        content: 'Yo! The glassmorphism UI looks incredibly sleek and futuristic! ✨',
        created_at: '10:35 AM',
        is_own: true,
        status: 'read'
      },
      {
        id: 'm3',
        conversation_id: 'conv-1',
        sender_id: DEMO_USER_2.id,
        message_type: 'text',
        content: 'Ready to try an encrypted audio or video call across different networks?',
        created_at: '10:42 AM',
        is_own: false
      }
    ]
  });

  const [messageInput, setMessageInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Calling state
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const webrtcServiceRef = useRef<WebRTCService | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  const activeConv = conversations.find(c => c.id === activeConversationId);
  const currentMessages = messages[activeConversationId] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: activeConversationId,
      sender_id: user.id,
      message_type: 'text',
      content: messageInput.trim(),
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_own: true,
      status: 'sent'
    };

    setMessages(prev => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMessage]
    }));

    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        return {
          ...c,
          last_message_preview: newMessage.content,
          last_message_at: newMessage.created_at
        };
      }
      return c;
    }));

    setMessageInput('');
  };

  const startCall = async (type: 'audio' | 'video') => {
    const session: CallSession = {
      id: `call-${Date.now()}`,
      conversation_id: activeConversationId,
      initiator_id: user?.id || 'demo-user',
      call_type: type,
      status: 'accepted',
      started_at: new Date().toISOString()
    };

    const webrtc = new WebRTCService();
    webrtcServiceRef.current = webrtc;

    try {
      const stream = await webrtc.startLocalMedia(type);
      setLocalStream(stream);

      webrtc.createPeerConnection(
        (candidate) => {
          console.log('[WebRTC Candidate]', candidate);
        },
        (rStream) => {
          setRemoteStream(rStream);
        }
      );
    } catch (err) {
      console.warn('WebRTC startup issue:', err);
    }

    setActiveCall(session);
  };

  const endCall = () => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.stopAll();
      webrtcServiceRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0e17] text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Background ambient lighting for Glassmorphism */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Main Left Activity Rail */}
      <aside className="w-20 md:w-24 glass-panel border-r border-white/10 flex flex-col items-center py-6 justify-between z-20">
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Logo */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 cursor-pointer">
              <span className="text-xl font-extrabold tracking-tighter text-white">Yo!</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 mt-1">Platform</span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col items-center gap-4 w-full px-3">
            <button
              onClick={() => setActiveTab('chats')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer relative ${
                activeTab === 'chats'
                  ? 'glass-button-primary text-white shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Chats"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-[#0a0e17]" />
            </button>

            <button
              onClick={() => setActiveTab('calls')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                activeTab === 'calls'
                  ? 'glass-button-primary text-white shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Calls"
            >
              <Phone className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('people')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                activeTab === 'people'
                  ? 'glass-button-primary text-white shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="People / User Discovery"
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'glass-button-primary text-white shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Settings & Privacy"
            >
              <Settings className="w-5 h-5" />
            </button>
          </nav>
        </div>

        {/* User Profile avatar & Demo switcher */}
        <div className="flex flex-col items-center gap-4">
          {isDemoMode && (
            <button
              onClick={() => switchDemoUser(user?.id === DEMO_USER_1.id ? 2 : 1)}
              className="p-2 rounded-xl glass-panel-subtle text-[11px] text-indigo-300 font-medium hover:bg-indigo-500/20 transition cursor-pointer flex flex-col items-center gap-1"
              title="Switch between User 1 & User 2 for testing"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>Switch</span>
            </button>
          )}

          <div
            onClick={() => setAuthModalOpen(true)}
            className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-indigo-500/40 p-0.5 cursor-pointer relative group"
            title={user ? `${user.display_name} (@${user.username})` : 'Sign in'}
          >
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt="Avatar"
              className="w-full h-full object-cover rounded-xl"
            />
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0a0e17]" />
          </div>
        </div>
      </aside>

      {/* Conversations / People Column */}
      <section className="w-80 sm:w-96 glass-panel border-r border-white/10 flex flex-col z-10">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Yo!!! {activeTab.toUpperCase()}</span>
                {isDemoMode && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Live Demo
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400">Zero-cost internet communication</p>
            </div>
            
            <button
              onClick={() => setAuthModalOpen(true)}
              className="p-2 rounded-xl glass-panel-subtle text-slate-400 hover:text-white transition"
              title="Account"
            >
              <UserCheck className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar for User Discovery */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username or chats..."
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {conversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition ${
                  isSelected
                    ? 'glass-panel border-indigo-500/30 bg-indigo-500/10'
                    : 'glass-panel-subtle hover:bg-white/5 border-transparent'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10">
                    <img src={conv.avatar_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0a0e17]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white truncate">{conv.title}</h4>
                    <span className="text-[11px] text-slate-400">{conv.last_message_at}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{conv.last_message_preview}</p>
                </div>

                {conv.unread_count && conv.unread_count > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-indigo-600/40">
                    {conv.unread_count}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Status footer banner */}
        <div className="p-3.5 border-t border-white/10 glass-panel-subtle flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>WebRTC + Supabase Ready</span>
          </div>
          <span className="text-[11px] text-indigo-400 font-mono">v1.0.0</span>
        </div>
      </section>

      {/* Main Chat & Communication Window */}
      <main className="flex-1 flex flex-col h-full relative z-10">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <header className="h-20 px-6 glass-panel border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden border border-white/10">
                    <img src={activeConv.avatar_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0a0e17]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base leading-tight">{activeConv.title}</h3>
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online & Discoverable
                  </p>
                </div>
              </div>

              {/* Action Buttons: Audio Call, Video Call, More */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startCall('audio')}
                  className="p-3 rounded-xl glass-panel-subtle text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Start Audio Call (WebRTC)"
                >
                  <Phone className="w-5 h-5 text-indigo-400" />
                </button>
                <button
                  onClick={() => startCall('video')}
                  className="p-3 rounded-xl glass-panel-subtle text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Start Video Call (WebRTC)"
                >
                  <Video className="w-5 h-5 text-purple-400" />
                </button>
                <button
                  className="p-3 rounded-xl glass-panel-subtle text-slate-400 hover:text-white transition"
                  title="Conversation info"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex justify-center my-2">
                <div className="px-3.5 py-1 rounded-full glass-panel-subtle text-[11px] text-slate-400 border border-white/5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Authenticated Session • WebRTC Direct Signaling Active</span>
                </div>
              </div>

              {currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                >
                  {!msg.is_own && (
                    <div className="w-7 h-7 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 mb-1">
                      <img src={activeConv.avatar_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] sm:max-w-md p-4 rounded-3xl ${
                      msg.is_own
                        ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white rounded-br-sm shadow-lg shadow-indigo-600/20'
                        : 'glass-panel text-slate-100 rounded-bl-sm border border-white/10'
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-white/60">
                      <span>{msg.created_at}</span>
                      {msg.is_own && <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Message Input Box */}
            <footer className="p-4 glass-panel border-t border-white/10">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button
                  type="button"
                  className="p-3 rounded-2xl glass-panel-subtle text-slate-400 hover:text-white transition"
                  title="Attach media (Photo, Video, File)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message to send across the internet..."
                    className="glass-input w-full px-5 py-3.5 rounded-2xl text-sm placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-white"
                    title="Insert emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="glass-button-primary p-3.5 rounded-2xl text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageSquare className="w-16 h-16 text-indigo-400/40 mb-4 animate-pulse" />
            <h3 className="text-xl font-bold text-white mb-1">Select a conversation</h3>
            <p className="text-sm max-w-sm">Choose a chat from the sidebar or discover someone new by username.</p>
          </div>
        )}
      </main>

      {/* WebRTC Video / Audio Call Overlay */}
      {activeCall && (
        <CallOverlay
          session={activeCall}
          otherUser={activeConv?.other_user}
          onEndCall={endCall}
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          onToggleAudio={() => setIsAudioMuted(!isAudioMuted)}
          onToggleVideo={() => setIsVideoMuted(!isVideoMuted)}
          localStream={localStream}
          remoteStream={remoteStream}
        />
      )}

      {/* Auth & Registration Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default App;

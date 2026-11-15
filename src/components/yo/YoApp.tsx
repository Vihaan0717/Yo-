import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { 
  MessageCircle, 
  Phone, 
  Users, 
  Settings, 
  Search, 
  PenSquare, 
  ChevronLeft, 
  Video, 
  Send, 
  Plus, 
  Mic, 
  PhoneIncoming, 
  PhoneOutgoing, 
  Bell, 
  Lock, 
  Moon, 
  User, 
  ChevronRight, 
  CheckCheck,
  LogOut
} from "lucide-react";
import { Avatar } from "./Avatar";
import { CallOverlay } from "../../features/calls/components/CallOverlay";
import { WebRTCService } from "../../features/calls/webrtc/WebRTCService";
import { AuthModal } from "../modals/AuthModal";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../services/supabase/client";
import type { CallSession, Profile } from "../../types";

export type Chat = { 
  id: string; 
  name: string; 
  handle: string; 
  hue: number; 
  last: string; 
  time: string; 
  unread: number; 
  online: boolean; 
  typing?: boolean;
  target_user_id?: string;
};

const spring = { type: "spring", stiffness: 500, damping: 38, mass: 0.8 } as const;
type Tab = "chats" | "calls" | "people" | "settings";
const tabs: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "people", label: "People", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label: string }) {
  return (
    <motion.button 
      aria-label={label} 
      onClick={onClick} 
      whileTap={{ scale: 0.85 }} 
      whileHover={{ scale: 1.08 }} 
      transition={spring}
      className="glass grid h-10 w-10 place-items-center rounded-full text-foreground cursor-pointer"
    >
      {children}
    </motion.button>
  );
}

const listV = { show: { transition: { staggerChildren: 0.035 } } };
const itemV = { hidden: { opacity: 0, y: 14, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: spring } };

function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between px-5 pb-3 pt-6">
      <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={spring} className="text-[34px] font-extrabold tracking-tight">{title}</motion.h1>
      <div className="flex gap-2">{right}</div>
    </div>
  );
}

function SearchBar({ placeholder = "Search", value = "", onChange }: { placeholder?: string; value?: string; onChange?: (val: string) => void }) {
  return (
    <div className="px-5 pb-3">
      <label className="glass flex items-center gap-2 rounded-2xl px-4 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input 
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder} 
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" 
        />
      </label>
    </div>
  );
}

function Typing() {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-[#2dd4bf]">
      <span>typing</span>
      <span className="flex items-center gap-1 ml-0.5">
        <span className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" style={{ animationDelay: '0s' }} />
        <span className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" style={{ animationDelay: '0.2s' }} />
        <span className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" style={{ animationDelay: '0.4s' }} />
      </span>
    </span>
  );
}

function ChatsTab({ 
  chatsList, 
  onOpen, 
  onNewChat 
}: { 
  chatsList: Chat[]; 
  onOpen: (c: Chat) => void;
  onNewChat: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = chatsList.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.handle.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Header title="Chats" right={<IconBtn label="New chat" onClick={onNewChat}><PenSquare className="h-4 w-4" /></IconBtn>} />
      <SearchBar value={search} onChange={setSearch} />
      <motion.ul variants={listV} initial="hidden" animate="show" className="space-y-1 px-3 pb-32">
        {filtered.map((c) => (
          <motion.li key={c.id} variants={itemV}>
            <motion.button 
              whileTap={{ scale: 0.97 }} 
              onClick={() => onOpen(c)}
              className="flex w-full items-center gap-3 rounded-3xl px-3 py-3 text-left transition-colors hover:bg-glass cursor-pointer"
            >
              <div className="relative">
                <Avatar chat={c} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{c.name}</span>
                  <span className={`text-xs ${c.unread ? "text-primary font-medium" : "text-muted-foreground"}`}>{c.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {c.typing ? <Typing /> : <span className="truncate text-sm text-muted-foreground">{c.last || "No messages yet"}</span>}
                  {c.unread > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.2 }}
                      className="bg-brand grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold text-primary-foreground shadow-glow">
                      {c.unread}
                    </motion.span>
                  )}
                </div>
              </div>
            </motion.button>
          </motion.li>
        ))}
      </motion.ul>
    </>
  );
}

function CallsTab({ onStartCall }: { onStartCall: (type: "audio" | "video", chat: Chat) => void }) {
  const sampleCalls = [
    { id: "c1", name: "Alex Hunter", handle: "@alex", type: "video", dir: "in", missed: false, time: "Today, 21:10", hue: 200 },
    { id: "c2", name: "Samira Chen", handle: "@samira", type: "voice", dir: "out", missed: false, time: "Today, 18:42", hue: 330 },
  ];

  return (
    <>
      <Header title="Calls" />
      <motion.ul variants={listV} initial="hidden" animate="show" className="space-y-1 px-3 pb-32">
        {sampleCalls.map((c) => {
          const Dir = c.dir === "in" ? PhoneIncoming : PhoneOutgoing;
          const fakeChat: Chat = { id: c.id, name: c.name, handle: c.handle, hue: c.hue, last: "", time: c.time, unread: 0, online: true };
          return (
            <motion.li key={c.id} variants={itemV} className="flex items-center gap-3 rounded-3xl px-3 py-3 hover:bg-glass">
              <Avatar chat={fakeChat} size={46} />
              <div className="flex-1">
                <div className={`font-semibold ${c.missed ? "text-destructive" : ""}`}>{c.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Dir className="h-3 w-3" />{c.type === "video" ? "Video" : "Voice"} · {c.time}
                </div>
              </div>
              <IconBtn 
                label="Call back" 
                onClick={() => onStartCall(c.type as "audio" | "video", fakeChat)}
              >
                {c.type === "video" ? <Video className="h-4 w-4 text-primary" /> : <Phone className="h-4 w-4 text-primary" />}
              </IconBtn>
            </motion.li>
          );
        })}
      </motion.ul>
    </>
  );
}

function PeopleTab({ 
  onStartDirectChat 
}: { 
  onStartDirectChat: (targetUser: Profile) => void;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        let query = supabase.from('profiles').select('*').limit(20);
        if (search.trim()) {
          query = query.or(`username.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`);
        }
        const { data } = await query;
        if (data) {
          setProfiles(data.filter((p: Profile) => p.id !== user?.id));
        }
      } catch (err) {
        console.warn("Could not load users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [search, user?.id]);

  return (
    <>
      <Header title="People" />
      <SearchBar 
        placeholder="Find by @username or name" 
        value={search} 
        onChange={setSearch} 
      />
      <motion.ul variants={listV} initial="hidden" animate="show" className="space-y-1 px-3 pb-32">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Searching network...</div>
        ) : profiles.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {search ? "No users matching that handle found." : "Invite friends or search by unique @handle!"}
          </div>
        ) : (
          profiles.map((p) => {
            const hue = (p.username.charCodeAt(0) * 37) % 360;
            const chatObj: Chat = {
              id: p.id,
              name: p.display_name,
              handle: `@${p.username}`,
              hue,
              last: "",
              time: "",
              unread: 0,
              online: true,
              target_user_id: p.id
            };

            return (
              <motion.li key={p.id} variants={itemV} className="flex items-center gap-3 rounded-3xl px-3 py-3 hover:bg-glass">
                <Avatar chat={chatObj} size={46} />
                <div className="flex-1">
                  <div className="font-semibold">{p.display_name}</div>
                  <div className="text-xs text-muted-foreground">@{p.username}</div>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.88 }} 
                  onClick={() => onStartDirectChat(p)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold bg-brand text-primary-foreground shadow-glow cursor-pointer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Chat</span>
                </motion.button>
              </motion.li>
            );
          })
        )}
      </motion.ul>
    </>
  );
}

function Toggle({ initial = true }: { initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button aria-label="Toggle" onClick={() => setOn(!on)} className={`flex h-7 w-12 rounded-full p-0.5 transition-colors cursor-pointer ${on ? "bg-accent justify-end" : "bg-secondary justify-start"}`}>
      <motion.span layout transition={spring} className="h-6 w-6 rounded-full bg-foreground shadow-glow" />
    </button>
  );
}

function SettingsTab({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, signOut } = useAuth();
  const hue = user?.username ? (user.username.charCodeAt(0) * 37) % 360 : 190;
  
  const me: Chat = { 
    id: user?.id || "me", 
    name: user?.display_name || "Guest User", 
    handle: user?.username ? `@${user.username}` : "@guest", 
    hue, 
    last: "", 
    time: "", 
    unread: 0, 
    online: true 
  };

  const rows = [
    { icon: User, label: "Account", hue: 210, action: onOpenAuth }, 
    { icon: Lock, label: "Privacy & Encryption", hue: 150 },
    { icon: Bell, label: "Notifications", hue: 20, toggle: true }, 
    { icon: Moon, label: "Dark glass", hue: 270, toggle: true },
  ];

  return (
    <>
      <Header title="Settings" />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring} className="glass mx-5 flex items-center justify-between gap-4 rounded-3xl p-4">
        <div className="flex items-center gap-3.5">
          <Avatar chat={me} size={64} />
          <div>
            <div className="text-lg font-bold">{me.name}</div>
            <div className="text-sm text-muted-foreground">{me.handle} · ID {me.id.slice(0, 8)}</div>
          </div>
        </div>
        {user ? (
          <button 
            onClick={() => signOut()} 
            className="p-2.5 rounded-2xl glass text-red-400 hover:bg-red-500/20 transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <button 
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 rounded-xl bg-brand text-primary-foreground font-semibold text-xs shadow-glow cursor-pointer"
          >
            Log In
          </button>
        )}
      </motion.div>
      <motion.ul variants={listV} initial="hidden" animate="show" className="glass mx-5 mt-5 divide-y divide-border overflow-hidden rounded-3xl">
        {rows.map((r) => (
          <motion.li 
            key={r.label} 
            variants={itemV} 
            onClick={r.action}
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <motion.span whileHover={{ rotate: 12, scale: 1.1 }} className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: `oklch(0.65 0.17 ${r.hue})` }}>
              <r.icon className="h-4 w-4 text-foreground" />
            </motion.span>
            <span className="flex-1 font-medium">{r.label}</span>
            {r.toggle ? <Toggle /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </motion.li>
        ))}
      </motion.ul>
    </>
  );
}

function ChatView({ 
  chat, 
  onBack, 
  onStartCall 
}: { 
  chat: Chat; 
  onBack: () => void; 
  onStartCall: (type: "audio" | "video", chat: Chat) => void;
}) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Array<{ id: string | number; me: boolean; text: string; time: string }>>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // Fetch real messages & listen to live broadcast and database changes
  useEffect(() => {
    let channel: any = null;

    const loadMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', chat.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMsgs(data.map((m: any) => ({
          id: m.id,
          me: m.sender_id === user?.id,
          text: m.content,
          time: new Date(m.created_at).toTimeString().slice(0, 5)
        })));
      }
      setLoading(false);

      // Single shared channel instance
      channel = supabase.channel(`room_${chat.id}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'new_msg' }, (payload: any) => {
          const msg = payload.payload;
          // Ignore own broadcast to prevent duplicate messages
          if (msg.sender_id === user?.id) return;

          setMsgs((prev) => {
            if (prev.some((m) => m.id === msg.id || (m.text === msg.content && Math.abs(Number(m.id) - Number(msg.id)) < 2000))) return prev;
            return [
              ...prev,
              {
                id: msg.id,
                me: false,
                text: msg.content,
                time: msg.time || new Date().toTimeString().slice(0, 5)
              }
            ];
          });
        })
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          if (payload.payload?.sender_id !== user?.id) {
            setIsPeerTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setIsPeerTyping(false), 2000);
          }
        })
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${chat.id}` },
          (payload: any) => {
            const newMsg = payload.new;
            setMsgs((prev) => {
              // Deduplicate if already present from local optimistic send or broadcast
              if (prev.some((m) => m.id === newMsg.id || (m.me && m.text === newMsg.content))) return prev;
              return [
                ...prev,
                {
                  id: newMsg.id,
                  me: newMsg.sender_id === user?.id,
                  text: newMsg.content,
                  time: new Date(newMsg.created_at).toTimeString().slice(0, 5)
                }
              ];
            });
          }
        )
        .subscribe();
    };

    loadMessages();

    return () => {
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chat.id, user?.id]);

  const handleInputChange = (val: string) => {
    setText(val);
    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: user.id }
      });
    }
  };

  const send = async () => {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText("");

    const nowTime = new Date().toTimeString().slice(0, 5);
    const tempId = `msg-${Date.now()}`;
    const newEntry = {
      id: tempId,
      me: true,
      text: content,
      time: nowTime
    };

    // 1. Instant local display (Single message)
    setMsgs((m) => [...m, newEntry]);

    // 2. Broadcast to other peer (Only they will render it)
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'new_msg',
        payload: {
          id: tempId,
          sender_id: user.id,
          content,
          time: nowTime
        }
      });
    }

    // 3. Persistent PostgreSQL database insert
    const { error } = await supabase.from('messages').insert({
      conversation_id: chat.id,
      sender_id: user.id,
      content,
      message_type: 'text'
    });

    if (error) {
      console.warn("Database insert notice:", error);
    }
  };

  return (
    <motion.div 
      initial={{ x: "100%" }} 
      animate={{ x: 0 }} 
      exit={{ x: "100%" }} 
      transition={{ type: "tween", duration: 0.18, ease: "easeInOut" }}
      className="absolute inset-0 z-30 flex flex-col bg-background/60 backdrop-blur-2xl"
    >
      <div className="glass-strong flex items-center gap-3 rounded-none border-x-0 border-t-0 px-3 py-3">
        <button 
          onClick={onBack} 
          aria-label="Back" 
          className="flex items-center text-primary cursor-pointer active:scale-90 transition-transform p-1"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <Avatar chat={chat} size={40} />
        <div className="flex-1">
          <div className="font-semibold leading-tight">{chat.name}</div>
          <div className="text-xs text-accent flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span>{isPeerTyping ? "typing..." : (chat.online ? "online" : chat.handle)}</span>
          </div>
        </div>
        <IconBtn label="Voice call" onClick={() => onStartCall("audio", chat)}><Phone className="h-4 w-4" /></IconBtn>
        <IconBtn label="Video call" onClick={() => onStartCall("video", chat)}><Video className="h-4 w-4" /></IconBtn>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        <div className="glass mx-auto rounded-full px-3 py-1 text-[11px] text-muted-foreground">Today</div>
        {loading && msgs.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground animate-pulse">Loading live conversation...</div>
        ) : null}
        
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div key={m.id} layout initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...spring, delay: typeof m.id === 'number' && m.id < 100 ? i * 0.04 : 0 }}
              style={{ originX: m.me ? 1 : 0, originY: 1 }}
              className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] ${m.me ? "bg-bubble self-end rounded-br-lg text-primary-foreground shadow-glow" : "glass self-start rounded-bl-lg"}`}>
              {m.text}
              <span className={`ml-2 inline-flex items-center gap-0.5 align-bottom text-[10px] ${m.me ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {m.time}{m.me && <CheckCheck className="h-3 w-3" />}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {isPeerTyping && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass self-start rounded-3xl rounded-bl-lg px-4 py-2 mt-1">
            <Typing />
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-2 p-3 pb-6">
        <IconBtn label="Attach"><Plus className="h-5 w-5" /></IconBtn>
        <div className="glass flex flex-1 items-center rounded-full px-4 py-2.5">
          <input 
            value={text} 
            onChange={(e) => handleInputChange(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && send()} 
            placeholder="Message" 
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" 
          />
        </div>
        <motion.button 
          whileTap={{ scale: 0.8 }} 
          onClick={send} 
          aria-label="Send" 
          className="bg-brand grid h-11 w-11 place-items-center rounded-full text-primary-foreground shadow-glow cursor-pointer"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={text ? "s" : "m"} initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 45 }} transition={spring}>
              {text ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}

export function YoApp() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("chats");
  const [open, setOpen] = useState<Chat | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [chatsList, setChatsList] = useState<Chat[]>([]);

  // WebRTC Calling state
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [callingChat, setCallingChat] = useState<Profile | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);

  // Load real conversations from Supabase
  const refreshConversations = async () => {
    if (!user) {
      setChatsList([]);
      return;
    }

    try {
      const { data: convMembers, error } = await supabase
        .from('conversation_members')
        .select('conversation_id, conversations(*)')
        .eq('user_id', user.id);

      if (!error && convMembers && convMembers.length > 0) {
        const formatted: Chat[] = [];
        for (const item of convMembers) {
          const conv = item.conversations as any;
          if (!conv) continue;

          // Fetch other participant profile
          const { data: otherMember } = await supabase
            .from('conversation_members')
            .select('user_id, profiles(*)')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id)
            .maybeSingle();

          const profile = (otherMember as any)?.profiles;
          const name = profile?.display_name || conv.title || "Yo Direct Chat";
          const handle = profile?.username ? `@${profile.username}` : "direct";
          const hue = handle ? (handle.charCodeAt(1) * 33) % 360 : 180;

          // Check if unread (strictly from Supabase receipt data, default 0 for sender)
          const isCurrentActive = open?.id === conv.id;
          const unreadCount = isCurrentActive ? 0 : 0;

          formatted.push({
            id: conv.id,
            name,
            handle,
            hue,
            last: conv.last_message_preview || "Conversation started",
            time: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
            unread: unreadCount,
            online: true,
            target_user_id: profile?.id
          });
        }
        setChatsList(formatted);
      } else {
        const isCurrentActive = open?.id === "shared-direct-room";
        const defaultChat: Chat = {
          id: "shared-direct-room",
          name: "Yo Direct Chat",
          handle: "@chat",
          hue: 200,
          last: "Tap here to chat across devices!",
          time: "Now",
          unread: isCurrentActive ? 0 : 0,
          online: true
        };
        setChatsList([defaultChat]);
      }
    } catch (e) {
      console.warn("Failed to refresh conversations:", e);
    }
  };

  useEffect(() => {
    refreshConversations();

    // Global listener for new messages when user is on the chat list to update badge count
    const globalChannel = supabase
      .channel('global_messages_listener')
      .on('broadcast', { event: 'new_msg' }, (payload: any) => {
        const msg = payload.payload;
        if (msg.sender_id !== user?.id) {
          setChatsList((prev) => 
            prev.map((c) => {
              if (open?.id === c.id) return { ...c, last: msg.content, time: msg.time };
              return { ...c, last: msg.content, time: msg.time, unread: (c.unread || 0) + 1 };
            })
          );
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        refreshConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user?.id, open?.id]);

  const startDirectChat = async (targetUser: Profile) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    const { data: convId, error } = await supabase.rpc('get_or_create_direct_conversation', {
      target_user_id: targetUser.id
    });

    if (error) {
      console.error("Failed to start direct conversation:", error);
      return;
    }

    const hue = (targetUser.username.charCodeAt(0) * 37) % 360;
    const directChat: Chat = {
      id: convId,
      name: targetUser.display_name,
      handle: `@${targetUser.username}`,
      hue,
      last: "",
      time: "Now",
      unread: 0,
      online: true,
      target_user_id: targetUser.id
    };

    setOpen(directChat);
    setTab("chats");
    refreshConversations();
  };

  const startCall = async (type: "audio" | "video", chat: Chat) => {
    const session: CallSession = {
      id: `call-${Date.now()}`,
      conversation_id: chat.id,
      initiator_id: user?.id || "me",
      call_type: type,
      status: "accepted",
      started_at: new Date().toISOString()
    };

    const peerProfile: Profile = {
      id: chat.target_user_id || chat.id,
      username: chat.handle.replace("@", ""),
      display_name: chat.name,
      avatar_url: "",
      is_discoverable: true,
      created_at: new Date().toISOString()
    };
    setCallingChat(peerProfile);

    const webrtc = new WebRTCService();
    setWebrtcService(webrtc);

    try {
      const stream = await webrtc.startLocalMedia(type);
      setLocalStream(stream);

      webrtc.createPeerConnection(
        (cand) => console.log("ICE candidate:", cand),
        (rStream) => setRemoteStream(rStream)
      );
    } catch (e) {
      console.warn("Media stream init fallback:", e);
    }

    setActiveCall(session);
  };

  const endCall = () => {
    if (webrtcService) {
      webrtcService.stopAll();
      setWebrtcService(null);
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setCallingChat(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d131f]">
      {/* Dynamic ambient iOS light orbs for Glassmorphism backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-20 top-10 h-80 w-80 rounded-full bg-[#0ea5e9]/25 blur-[90px]" />
        <div className="animate-blob absolute right-[-60px] top-1/4 h-96 w-96 rounded-full bg-[#2dd4bf]/20 blur-[100px]" style={{ animationDelay: "-5s" }} />
        <div className="animate-blob absolute bottom-10 left-1/4 h-80 w-80 rounded-full bg-[#8b5cf6]/20 blur-[110px]" style={{ animationDelay: "-9s" }} />
      </div>

      <main className="relative mx-auto h-screen max-w-md overflow-hidden shadow-2xl border-x border-white/5 flex flex-col justify-between">
        <div className="h-full overflow-y-auto">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }} transition={{ duration: 0.18, ease: "easeOut" }}>
              {tab === "chats" && (
                <ChatsTab 
                  chatsList={chatsList} 
                  onOpen={(c) => {
                    // Reset unread on opening
                    setChatsList(prev => prev.map(item => item.id === c.id ? { ...item, unread: 0 } : item));
                    setOpen(c);
                  }} 
                  onNewChat={() => setTab("people")} 
                />
              )}
              {tab === "calls" && <CallsTab onStartCall={startCall} />}
              {tab === "people" && <PeopleTab onStartDirectChat={startDirectChat} />}
              {tab === "settings" && <SettingsTab onOpenAuth={() => setAuthOpen(true)} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating iOS Glass Bottom Navigation */}
        <nav className="glass-strong absolute inset-x-4 bottom-5 z-20 flex justify-between rounded-[28px] p-1.5">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <motion.button key={t.id} whileTap={{ scale: 0.88 }} onClick={() => setTab(t.id)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-3xl py-2 text-[11px] font-semibold cursor-pointer ${active ? "text-primary-foreground" : "text-muted-foreground"}`}>
                {active && <motion.span layoutId="tab-pill" transition={spring} className="bg-brand absolute inset-0 rounded-3xl shadow-glow" />}
                <motion.span className="relative" animate={active ? { y: [0, -5, 0], rotate: [0, -10, 0] } : { y: 0 }} transition={{ duration: 0.4 }}>
                  <t.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </motion.span>
                <span className="relative">{t.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Instant back-transition Chat view */}
        <AnimatePresence>
          {open && (
            <ChatView 
              key={open.id} 
              chat={open} 
              onBack={() => setOpen(null)} 
              onStartCall={startCall}
            />
          )}
        </AnimatePresence>
      </main>

      {/* WebRTC Video / Audio HUD overlay */}
      {activeCall && (
        <CallOverlay
          session={activeCall}
          otherUser={callingChat || undefined}
          onEndCall={endCall}
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          onToggleAudio={() => setIsAudioMuted(!isAudioMuted)}
          onToggleVideo={() => setIsVideoMuted(!isVideoMuted)}
          localStream={localStream}
          remoteStream={remoteStream}
        />
      )}

      {/* Auth Modal for Supabase user signup & signin */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

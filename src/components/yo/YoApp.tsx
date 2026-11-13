import { useState } from "react";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import { MessageCircle, Phone, Users, Settings, Search, PenSquare, ChevronLeft, Video, Send, Plus, Mic, PhoneIncoming, PhoneOutgoing, Bell, Lock, Moon, User, ChevronRight, UserPlus, Check, CheckCheck } from "lucide-react";
import { chats, calls, seedMessages, type Chat } from "./data";
import { Avatar } from "./Avatar";
import { CallOverlay } from "../../features/calls/components/CallOverlay";
import { WebRTCService } from "../../features/calls/webrtc/WebRTCService";
import type { CallSession, Profile } from "../../types";

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
    <motion.button aria-label={label} onClick={onClick} whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }} transition={spring}
      className="glass grid h-10 w-10 place-items-center rounded-full text-foreground">
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

function SearchBar({ placeholder = "Search" }: { placeholder?: string }) {
  return (
    <div className="px-5 pb-3">
      <label className="glass flex items-center gap-2 rounded-2xl px-4 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input placeholder={placeholder} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </label>
    </div>
  );
}

function ChatsTab({ onOpen }: { onOpen: (c: Chat) => void }) {
  return (
    <>
      <Header title="Chats" right={<IconBtn label="New chat"><PenSquare className="h-4 w-4" /></IconBtn>} />
      <SearchBar />
      <motion.ul variants={listV} initial="hidden" animate="show" className="space-y-1 px-3 pb-32">
        {chats.map((c) => (
          <motion.li key={c.id} variants={itemV}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onOpen(c)}
              className="flex w-full items-center gap-3 rounded-3xl px-3 py-3 text-left transition-colors hover:bg-glass">
              <motion.div layoutId={`av-${c.id}`}><Avatar chat={c} /></motion.div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{c.name}</span>
                  <span className={`text-xs ${c.unread ? "text-primary" : "text-muted-foreground"}`}>{c.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {c.typing ? <Typing /> : <span className="truncate text-sm text-muted-foreground">{c.last}</span>}
                  {c.unread > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.3 }}
                      className="bg-brand grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold text-primary-foreground">{c.unread}</motion.span>
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

function Typing() {
  return (
    <span className="flex items-center gap-1 text-sm text-primary">typing
      {[0, 1, 2].map((i) => <span key={i} className="animate-typing h-1 w-1 rounded-full bg-primary" style={{ animationDelay: `${i * 0.15}s` }} />)}
    </span>
  );
}

function CallsTab() {
  return (
    <>
      <Header title="Calls" right={<IconBtn label="New call"><Phone className="h-4 w-4" /></IconBtn>} />
      <motion.ul variants={listV} initial="hidden" animate="show" className="space-y-1 px-3 pb-32">
        {calls.map((c) => {
          const Dir = c.dir === "in" ? PhoneIncoming : PhoneOutgoing;
          return (
            <motion.li key={c.id} variants={itemV} className="flex items-center gap-3 rounded-3xl px-3 py-3 hover:bg-glass">
              <Avatar chat={c.chat} size={46} />
              <div className="flex-1">
                <div className={`font-semibold ${c.missed ? "text-destructive" : ""}`}>{c.chat.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Dir className="h-3 w-3" />{c.type === "video" ? "Video" : "Voice"} · {c.time}</div>
              </div>
              <IconBtn label="Call back">{c.type === "video" ? <Video className="h-4 w-4 text-primary" /> : <Phone className="h-4 w-4 text-primary" />}</IconBtn>
            </motion.li>
          );
        })}
      </motion.ul>
    </>
  );
}

function PeopleTab() {
  const [added, setAdded] = useState<string[]>([]);
  return (
    <>
      <Header title="People" />
      <SearchBar placeholder="Find by @username or ID" />
      <motion.ul variants={listV} initial="hidden" animate="show" className="space-y-1 px-3 pb-32">
        {chats.filter((c) => c.handle.startsWith("@")).map((c) => {
          const on = added.includes(c.id);
          return (
            <motion.li key={c.id} variants={itemV} className="flex items-center gap-3 rounded-3xl px-3 py-3 hover:bg-glass">
              <Avatar chat={c} size={46} />
              <div className="flex-1"><div className="font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">{c.handle}</div></div>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => setAdded((a) => on ? a.filter((x) => x !== c.id) : [...a, c.id])}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold ${on ? "glass" : "bg-brand text-primary-foreground shadow-glow"}`}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={on ? "y" : "n"} initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 90, scale: 0 }} transition={spring}>
                    {on ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  </motion.span>
                </AnimatePresence>
                {on ? "Added" : "Add"}
              </motion.button>
            </motion.li>
          );
        })}
      </motion.ul>
    </>
  );
}

function Toggle({ initial = true }: { initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button aria-label="Toggle" onClick={() => setOn(!on)} className={`flex h-7 w-12 rounded-full p-0.5 transition-colors ${on ? "bg-accent justify-end" : "bg-secondary justify-start"}`}>
      <motion.span layout transition={spring} className="h-6 w-6 rounded-full bg-foreground shadow-glow" />
    </button>
  );
}

function SettingsTab() {
  const me: Chat = { id: "me", name: "Mugasala Rohit", handle: "@rohit", hue: 190, last: "", time: "", unread: 0, online: true };
  const rows = [
    { icon: User, label: "Account", hue: 210 }, { icon: Lock, label: "Privacy", hue: 150 },
    { icon: Bell, label: "Notifications", hue: 20, toggle: true }, { icon: Moon, label: "Dark glass", hue: 270, toggle: true },
  ];
  return (
    <>
      <Header title="Settings" />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring} className="glass mx-5 flex items-center gap-4 rounded-3xl p-4">
        <Avatar chat={me} size={64} />
        <div><div className="text-lg font-bold">{me.name}</div><div className="text-sm text-muted-foreground">{me.handle} · ID 482 915</div></div>
      </motion.div>
      <motion.ul variants={listV} initial="hidden" animate="show" className="glass mx-5 mt-5 divide-y divide-border overflow-hidden rounded-3xl">
        {rows.map((r) => (
          <motion.li key={r.label} variants={itemV} className="flex items-center gap-3 px-4 py-3.5">
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
  const [msgs, setMsgs] = useState(seedMessages);
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { id: Date.now(), me: true, text: text.trim(), time: new Date().toTimeString().slice(0, 5) }]);
    setText("");
  };
  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 420, damping: 40 }}
      className="absolute inset-0 z-30 flex flex-col bg-background/60 backdrop-blur-2xl">
      <div className="glass-strong flex items-center gap-3 rounded-none border-x-0 border-t-0 px-3 py-3">
        <motion.button whileTap={{ scale: 0.8, x: -4 }} onClick={onBack} aria-label="Back" className="flex items-center text-primary"><ChevronLeft className="h-7 w-7" /></motion.button>
        <motion.div layoutId={`av-${chat.id}`}><Avatar chat={chat} size={40} /></motion.div>
        <div className="flex-1"><div className="font-semibold leading-tight">{chat.name}</div><div className="text-xs text-accent">{chat.online ? "online" : chat.handle}</div></div>
        <IconBtn label="Voice call" onClick={() => onStartCall("audio", chat)}><Phone className="h-4 w-4" /></IconBtn>
        <IconBtn label="Video call" onClick={() => onStartCall("video", chat)}><Video className="h-4 w-4" /></IconBtn>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        <div className="glass mx-auto rounded-full px-3 py-1 text-[11px] text-muted-foreground">Today</div>
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div key={m.id} layout initial={{ opacity: 0, y: 20, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...spring, delay: m.id < 100 ? i * 0.04 : 0 }}
              style={{ originX: m.me ? 1 : 0, originY: 1 }}
              className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] ${m.me ? "bg-bubble self-end rounded-br-lg text-primary-foreground shadow-glow" : "glass self-start rounded-bl-lg"}`}>
              {m.text}
              <span className={`ml-2 inline-flex items-center gap-0.5 align-bottom text-[10px] ${m.me ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {m.time}{m.me && <CheckCheck className="h-3 w-3" />}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-2 p-3 pb-6">
        <IconBtn label="Attach"><Plus className="h-5 w-5" /></IconBtn>
        <div className="glass flex flex-1 items-center rounded-full px-4 py-2.5">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <motion.button whileTap={{ scale: 0.8 }} onClick={send} aria-label="Send" className="bg-brand grid h-11 w-11 place-items-center rounded-full text-primary-foreground shadow-glow">
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
  const [tab, setTab] = useState<Tab>("chats");
  const [open, setOpen] = useState<Chat | null>(null);

  // Calling state
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [callingChat, setCallingChat] = useState<Profile | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);

  const startCall = async (type: "audio" | "video", chat: Chat) => {
    const session: CallSession = {
      id: `call-${Date.now()}`,
      conversation_id: chat.id,
      initiator_id: "me",
      call_type: type,
      status: "accepted",
      started_at: new Date().toISOString()
    };

    const peerProfile: Profile = {
      id: chat.id,
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="animate-blob absolute -left-20 top-10 h-80 w-80 rounded-full bg-primary/40 blur-3xl" />
        <div className="animate-blob absolute right-[-60px] top-1/3 h-96 w-96 rounded-full bg-accent/30 blur-3xl" style={{ animationDelay: "-5s" }} />
        <div className="animate-blob absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-chart-4/30 blur-3xl" style={{ animationDelay: "-9s" }} />
      </div>
      <LayoutGroup>
        <main className="relative mx-auto h-screen max-w-md overflow-hidden">
          <div className="h-full overflow-y-auto">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(6px)" }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                {tab === "chats" && <ChatsTab onOpen={setOpen} />}
                {tab === "calls" && <CallsTab />}
                {tab === "people" && <PeopleTab />}
                {tab === "settings" && <SettingsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
          <nav className="glass-strong absolute inset-x-4 bottom-5 z-20 flex justify-between rounded-[28px] p-1.5">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <motion.button key={t.id} whileTap={{ scale: 0.88 }} onClick={() => setTab(t.id)}
                  className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-3xl py-2 text-[11px] font-semibold ${active ? "text-primary-foreground" : "text-muted-foreground"}`}>
                  {active && <motion.span layoutId="tab-pill" transition={spring} className="bg-brand absolute inset-0 rounded-3xl shadow-glow" />}
                  <motion.span className="relative" animate={active ? { y: [0, -5, 0], rotate: [0, -10, 0] } : { y: 0 }} transition={{ duration: 0.4 }}>
                    <t.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  </motion.span>
                  <span className="relative">{t.label}</span>
                </motion.button>
              );
            })}
          </nav>
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
      </LayoutGroup>

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
    </div>
  );
}

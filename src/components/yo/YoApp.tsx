import React, { useState, useEffect, useRef } from "react";
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
  LogOut,
  Trash2,
  Ban,
  ChevronUp,
  ChevronDown,
  X,
  Pin,
  PinOff,
  FileText,
  Film,
  Image as ImageIcon,
  CircleDashed,
  Archive,
  Wand2,
  Loader2,
  Check,
  Sun
} from "lucide-react";
import { Avatar } from "./Avatar";
import { VoiceNoteBubble } from "./VoiceNoteBubble";
import { ImageBubble } from "./ImageBubble";
import { VideoBubble } from "./VideoBubble";
import { DocumentBubble } from "./DocumentBubble";
import { LightboxModal } from "./LightboxModal";
import { MessageStatusIndicator } from "../../features/messaging/components/MessageStatusIndicator";
import { DateSeparator, formatDateLabel } from "../../features/messaging/components/DateSeparator";
import { UnreadSeparator } from "../../features/messaging/components/UnreadSeparator";
import { MessageOutboxService } from "../../features/messaging/services/MessageOutboxService";
import { ReceiptService } from "../../features/messaging/services/ReceiptService";
import type { MessageStatus } from "../../features/messaging/types";
import { ImageService } from "../../services/media/ImageService";
import { VoiceRecorderService } from "../../services/voice/VoiceRecorderService";
import { CallOverlay } from "../../features/calls/components/CallOverlay";
import { WebRTCService } from "../../features/calls/webrtc/WebRTCService";
import { AuthModal } from "../modals/AuthModal";
import { CreateGroupModal } from "../modals/CreateGroupModal";
import { GroupInfoDrawer } from "../modals/GroupInfoDrawer";
import { NotificationSettingsModal } from "../modals/NotificationSettingsModal";
import { ChatContactInfoDrawer } from "../modals/ChatContactInfoDrawer";
import { ProfileViewerModal } from "../modals/ProfileViewerModal";
import { UpdatesHomeScreen } from "../../features/status/components/UpdatesHomeScreen";
import { AddStatusModal } from "../../features/status/components/AddStatusModal";
import { StatusViewerModal } from "../../features/status/components/StatusViewerModal";
import { StatusPrivacyModal } from "../../features/status/components/StatusPrivacyModal";
import { StatusService } from "../../features/status/services/StatusService";
import type { UserStatusGroup, StatusContentType } from "../../features/status/types/status";
import { NotificationService } from "../../services/notifications/NotificationService";
import { VoiceAssistantService } from "../../services/voice/VoiceAssistantService";
import { HapticsService } from "../../services/feedback/HapticsService";
import { SoundEffectsService } from "../../services/feedback/SoundEffectsService";
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
  avatar_url?: string;
  target_user_id?: string;
  type?: 'direct' | 'group';
};

const spring = { type: "spring", stiffness: 500, damping: 38, mass: 0.8 } as const;
type Tab = "chats" | "updates" | "calls" | "people" | "settings";
const tabs: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "updates", label: "Updates", icon: CircleDashed },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "people", label: "People", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label: string }) {
  return (
    <motion.button 
      aria-label={label} 
      onClick={() => {
        HapticsService.light();
        SoundEffectsService.playTap();
        onClick?.();
      }} 
      whileTap={{ scale: 0.85 }} 
      whileHover={{ scale: 1.08 }} 
      transition={spring}
      className="glass-clear grid h-10 w-10 place-items-center rounded-full text-foreground cursor-pointer shadow-sm hover:bg-white/15 transition-colors"
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

const getLocalLastRead = (userId?: string, convId?: string): string | null => {
  if (!userId || !convId) return null;
  try {
    return localStorage.getItem(`yo_read_${userId}_${convId}`);
  } catch {
    return null;
  }
};

const setLocalLastRead = (userId?: string, convId?: string, timestamp?: string) => {
  if (!userId || !convId) return;
  try {
    const val = timestamp || new Date().toISOString();
    localStorage.setItem(`yo_read_${userId}_${convId}`, val);
  } catch {
    // ignore
  }
};

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

type CustomList = { id: string; name: string; ids: string[] };

function ChatsTab({ 
  chatsList, 
  archivedIds,
  lockedIds,
  favoritesIds,
  isDarkGlass,
  onToggleDarkGlass,
  onOpen, 
  onNewChat,
  onNewGroup,
  onOpenProfile
}: { 
  chatsList: Chat[]; 
  archivedIds: string[];
  lockedIds: string[];
  favoritesIds: string[];
  isDarkGlass: boolean;
  onToggleDarkGlass: (val: boolean) => void;
  onOpen: (c: Chat) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onOpenProfile?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [pickedChatIds, setPickedChatIds] = useState<string[]>([]);

  // Persistent Custom Lists ("Family", "Friends", etc.)
  const [customLists, setCustomLists] = useState<CustomList[]>(() => {
    try {
      const stored = localStorage.getItem('yo_custom_lists');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [
      { id: "family", name: "Family", ids: [] },
      { id: "friends", name: "Friends", ids: [] }
    ];
  });

  const saveNewList = () => {
    if (!newListName.trim()) return;
    const trimmed = newListName.trim().slice(0, 20);
    const existingIndex = customLists.findIndex(l => l.name.toLowerCase() === trimmed.toLowerCase());
    let next: CustomList[];
    let targetId: string;

    if (existingIndex >= 0) {
      next = [...customLists];
      next[existingIndex] = { ...next[existingIndex], ids: pickedChatIds };
      targetId = next[existingIndex].id;
    } else {
      targetId = `list_${Date.now()}`;
      next = [...customLists, { id: targetId, name: trimmed, ids: pickedChatIds }];
    }

    setCustomLists(next);
    try {
      localStorage.setItem('yo_custom_lists', JSON.stringify(next));
    } catch {
      // ignore
    }
    setActiveFilter(targetId);
    setCreating(false);
    setNewListName("");
    setPickedChatIds([]);
    HapticsService.medium();
    SoundEffectsService.playTap();
  };

  const standardChips = [
    { id: "all", name: "All" },
    { id: "unread", name: "Unread" },
    { id: "favorites", name: "Favorites" },
    { id: "groups", name: "Groups" }
  ];

  const chips = [...standardChips, ...customLists];

  // Base list separated by archive
  const activeChats = chatsList.filter((c) => !archivedIds.includes(c.id));
  const archivedChats = chatsList.filter((c) => archivedIds.includes(c.id));

  const listToFilter = archivedOpen ? archivedChats : activeChats;
  const currentCustom = customLists.find((l) => l.id === activeFilter);

  const filtered = listToFilter.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.handle.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (currentCustom) {
      return currentCustom.ids.includes(c.id);
    }
    if (activeFilter === 'unread') return c.unread > 0;
    if (activeFilter === 'groups') return c.type === 'group';
    if (activeFilter === 'favorites') return favoritesIds.includes(c.id) || c.unread > 0;
    return true;
  });

  return (
    <>
      <Header 
        title={archivedOpen ? "Archived" : "Chats"} 
        right={
          <div className="flex items-center gap-1.5">
            {archivedOpen ? (
              <button
                onClick={() => {
                  HapticsService.light();
                  setArchivedOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-full glass text-xs font-semibold text-foreground hover:bg-white/10 cursor-pointer transition-colors"
              >
                Back
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    HapticsService.light();
                    SoundEffectsService.playDrawerOpen();
                    onOpenProfile?.();
                  }}
                  className="px-3 py-1.5 rounded-full glass hover:bg-white/10 text-xs font-semibold text-primary border border-primary/30 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="My Profile Photo & Info"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>
                <IconBtn 
                  label={isDarkGlass ? "Switch to Light Glass" : "Switch to Dark Glass"} 
                  onClick={() => onToggleDarkGlass(!isDarkGlass)}
                >
                  {isDarkGlass ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
                </IconBtn>
                <IconBtn label="New group" onClick={onNewGroup}>
                  <Users className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="New chat" onClick={onNewChat}>
                  <PenSquare className="h-4 w-4" />
                </IconBtn>
              </>
            )}
          </div>
        } 
      />

      <SearchBar value={search} onChange={setSearch} />

      {/* WhatsApp & Glasswave Filter Chips (All, Unread, Favorites, Groups, Family, Friends, + Custom) */}
      {!archivedOpen && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-3">
          {chips.map((x) => {
            const isActive = activeFilter === x.id;
            return (
              <motion.button 
                key={x.id} 
                whileTap={{ scale: 0.92 }} 
                onClick={() => {
                  HapticsService.selection();
                  SoundEffectsService.playChipSelect();
                  setActiveFilter(x.id);
                }}
                className={`relative shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer select-none ${
                  isActive ? "text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.span layoutId="chip" transition={spring} className="bg-brand absolute inset-0 rounded-full shadow-glow" />
                )}
                <span className="relative">{x.name}</span>
              </motion.button>
            );
          })}
          <motion.button 
            whileTap={{ scale: 0.85, rotate: 90 }} 
            onClick={() => {
              HapticsService.light();
              setCreating(true);
            }} 
            aria-label="Create custom list"
            title="Create list (e.g. Family, Friends)"
            className="glass grid h-7 w-7 shrink-0 place-items-center rounded-full text-primary cursor-pointer hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
          </motion.button>
        </div>
      )}

      {/* Inline Custom List Creator (Glasswave-Pattern) */}
      <AnimatePresence>
        {creating && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            exit={{ opacity: 0, height: 0 }} 
            transition={spring} 
            className="overflow-hidden px-5 pb-3"
          >
            <div className="glass-strong rounded-3xl p-4 border border-border">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">New list (e.g. Family, Friends)</span>
                <button 
                  aria-label="Cancel" 
                  onClick={() => setCreating(false)} 
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input 
                autoFocus 
                value={newListName} 
                onChange={(e) => setNewListName(e.target.value)} 
                placeholder="List name, e.g. Family" 
                maxLength={20}
                className="mb-3 w-full rounded-2xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary text-foreground" 
              />
              <div className="text-xs font-medium text-muted-foreground mb-2">Select contacts to include:</div>
              <div className="no-scrollbar flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {chatsList.map((c) => {
                  const on = pickedChatIds.includes(c.id);
                  return (
                    <button 
                      key={c.id} 
                      onClick={() => {
                        HapticsService.light();
                        setPickedChatIds((p) => on ? p.filter((x) => x !== c.id) : [...p, c.id]);
                      }}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-white/5"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={saveNewList} 
                disabled={!newListName.trim()} 
                className="bg-brand mt-4 w-full rounded-2xl py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50 cursor-pointer"
              >
                Create List
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp-Style Archived Row Banner */}
      {!archivedOpen && archivedChats.length > 0 && (
        <div className="px-4 pb-2">
          <button
            onClick={() => {
              HapticsService.light();
              setArchivedOpen(true);
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl glass hover:bg-white/10 transition cursor-pointer text-left border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Archive className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-foreground">Archived Chats</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{archivedChats.length}</span>
          </button>
        </div>
      )}

      {/* Chat List Items */}
      <motion.ul variants={listV} initial="hidden" animate="show" className="space-y-1 px-3 pb-32">
        {filtered.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <p className="text-xs text-muted-foreground mb-3">
              {archivedOpen 
                ? 'No archived conversations.' 
                : (currentCustom 
                  ? `No contacts in "${currentCustom.name}" yet.` 
                  : 'No conversations found.')
              }
            </p>
            {currentCustom && (
              <button
                onClick={() => {
                  setNewListName(currentCustom.name);
                  setPickedChatIds(currentCustom.ids);
                  setCreating(true);
                }}
                className="px-4 py-2 rounded-2xl bg-brand text-xs font-bold text-primary-foreground shadow-glow cursor-pointer"
              >
                Manage contacts for {currentCustom.name}
              </button>
            )}
          </div>
        ) : (
          filtered.map((c) => {
            const isLocked = lockedIds.includes(c.id);
            return (
              <motion.li key={c.id} variants={itemV}>
                <motion.button 
                  whileTap={{ scale: 0.97 }} 
                  onClick={() => {
                    HapticsService.light();
                    SoundEffectsService.playDrawerOpen();
                    onOpen(c);
                  }}
                  className="flex w-full items-center gap-3 rounded-3xl px-3 py-3 text-left transition-colors hover:bg-glass cursor-pointer"
                >
                  <div className="relative">
                    <Avatar chat={c} />
                    {isLocked && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md">
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
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
                          {c.unread > 99 ? '99+' : c.unread}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </motion.button>
              </motion.li>
            );
          })
        )}
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button 
      aria-label="Toggle" 
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }} 
      className={`flex h-7 w-12 rounded-full p-0.5 transition-colors cursor-pointer ${
        checked ? "bg-accent justify-end" : "bg-secondary justify-start"
      }`}
    >
      <motion.span layout transition={spring} className="h-6 w-6 rounded-full bg-foreground shadow-glow" />
    </button>
  );
}

function SettingsTab({ 
  onOpenAuth, 
  onOpenNotifications,
  onOpenProfile,
  isDarkGlass,
  onToggleDarkGlass
}: { 
  onOpenAuth: () => void; 
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  isDarkGlass: boolean;
  onToggleDarkGlass: (val: boolean) => void;
}) {
  const { user, signOut } = useAuth();
  const hue = user?.username ? (user.username.charCodeAt(0) * 37) % 360 : 190;
  
  const me: Chat = { 
    id: user?.id || "me", 
    name: user?.display_name || "Guest User", 
    handle: user?.username ? `@${user.username}` : "@guest", 
    avatar_url: user?.avatar_url,
    hue, 
    last: "", 
    time: "", 
    unread: 0, 
    online: true 
  };

  const rows = [
    { icon: User, label: "Profile & Avatar", hue: 210, action: onOpenProfile || onOpenAuth }, 
    { 
      icon: Bell, 
      label: "AI Voice Assistant & Sounds", 
      hue: 20, 
      action: onOpenNotifications 
    },
    { icon: Lock, label: "Privacy & Encryption", hue: 150 }, 
    { 
      icon: isDarkGlass ? Moon : Sun, 
      label: isDarkGlass ? "Dark glass theme" : "Light glass theme", 
      hue: 270, 
      toggle: true,
      checked: isDarkGlass,
      onToggle: onToggleDarkGlass,
      action: () => onToggleDarkGlass(!isDarkGlass)
    },
  ];

  return (
    <>
      <Header 
        title="Settings" 
        right={
          <IconBtn 
            label="Toggle Dark Glass" 
            onClick={() => onToggleDarkGlass(!isDarkGlass)}
          >
            {isDarkGlass ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
          </IconBtn>
        }
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={spring} 
        onClick={onOpenProfile}
        className="glass mx-5 flex items-center justify-between gap-4 rounded-3xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <Avatar chat={me} size={64} />
          <div>
            <div className="text-lg font-bold">{me.name}</div>
            <div className="text-sm text-muted-foreground">{me.handle} · ID {me.id.slice(0, 8)}</div>
            <div className="text-[11px] text-teal-400 font-semibold mt-0.5">Tap to view & edit profile photo</div>
          </div>
        </div>
        {user ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              signOut();
            }} 
            className="p-2.5 rounded-2xl glass text-red-400 hover:bg-red-500/20 transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenAuth();
            }}
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
            {r.toggle ? (
              <Toggle checked={r.checked!} onChange={r.onToggle!} />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </motion.li>
        ))}
      </motion.ul>
    </>
  );
}

function ChatView({ 
  chat, 
  onBack, 
  onStartCall,
  isLocked = false,
  isArchived = false,
  isFavorite = false,
  onToggleLock,
  onToggleArchive,
  onToggleFavorite
}: { 
  chat: Chat; 
  onBack: () => void; 
  onStartCall: (type: "audio" | "video", chat: Chat) => void;
  isLocked?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  onToggleLock?: () => void;
  onToggleArchive?: () => void;
  onToggleFavorite?: () => void;
}) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Array<{ 
    id: string | number; 
    me: boolean; 
    text: string; 
    time: string;
    message_type?: string;
    audio_url?: string;
    image_url?: string;
    video_url?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    reactions?: Record<string, string[]>;
    reply_quote?: { id: string; sender_name: string; content: string };
    status?: MessageStatus;
    sequence_number?: number;
    client_message_id?: string;
    created_at?: string;
    deleted_for_everyone?: boolean;
  }>>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | number | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; sender_name: string; content: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; sender: string; time: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const [firstUnreadSequence, setFirstUnreadSequence] = useState<number | null>(null);
  const [unreadCountAtOpen, setUnreadCountAtOpen] = useState<number>(0);
  const [pinnedMessage, setPinnedMessage] = useState<{ id: string; sender_name: string; content: string } | null>(null);
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [contactInfoDrawerOpen, setContactInfoDrawerOpen] = useState(false);
  const [chatNotifModalOpen, setChatNotifModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const recorderRef = useRef<VoiceRecorderService | null>(null);
  const recordTimerRef = useRef<any>(null);
  const reactionOptions = ["❤️", "🔥", "😂", "👍", "😮", "🙏"];

  // AI Tone Rewriter (Glasswave-Pattern)
  const TONES = ["Friendly", "Professional", "Funny", "Romantic", "Short", "Polite"] as const;
  type Tone = (typeof TONES)[number];
  const [toneOpen, setToneOpen] = useState(false);
  const [busyTone, setBusyTone] = useState<Tone | null>(null);

  const rewriteDraftTone = (original: string, tone: Tone): string => {
    const clean = original.trim();
    if (!clean) return original;
    switch (tone) {
      case "Friendly":
        return `Hey! Just wanted to share: ${clean} 😊✨`;
      case "Professional":
        return `Hello, I hope this finds you well. Regarding our conversation: ${clean}. Please let me know your thoughts.`;
      case "Funny":
        return `Yo! Not to make a whole scene, but: ${clean} 😂🚀`;
      case "Romantic":
        return `Hey sweetheart, just thinking of you... ${clean} ❤️`;
      case "Short":
        return clean.length > 30 ? clean.split(/[.,!?;]/)[0].trim() : clean;
      case "Polite":
        return `Hello, could you kindly note: ${clean}? Thank you so much! 🙏`;
      default:
        return clean;
    }
  };

  const handleApplyTone = (tone: Tone) => {
    if (!text.trim() || busyTone) return;
    setBusyTone(tone);
    HapticsService.medium();
    setTimeout(() => {
      const transformed = rewriteDraftTone(text, tone);
      setText(transformed);
      setBusyTone(null);
      setToneOpen(false);
      SoundEffectsService.playTap();
      HapticsService.light();
    }, 250);
  };

  // Matching messages for In-Chat search
  const matchedMsgIds = searchQuery.trim()
    ? msgs
        .filter((m) => !m.deleted_for_everyone && m.text.toLowerCase().includes(searchQuery.toLowerCase().trim()))
        .map((m) => String(m.id))
    : [];

  const handleNextSearchMatch = () => {
    if (matchedMsgIds.length === 0) return;
    const nextIdx = (searchMatchIndex + 1) % matchedMsgIds.length;
    setSearchMatchIndex(nextIdx);
    const targetId = matchedMsgIds[nextIdx];
    messageRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handlePrevSearchMatch = () => {
    if (matchedMsgIds.length === 0) return;
    const prevIdx = (searchMatchIndex - 1 + matchedMsgIds.length) % matchedMsgIds.length;
    setSearchMatchIndex(prevIdx);
    const targetId = matchedMsgIds[prevIdx];
    messageRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const renderHighlightedText = (content: string, isCurrentMatch: boolean) => {
    if (!searchQuery.trim() || !content.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      return <span>{content}</span>;
    }
    const query = searchQuery.trim();
    const parts = content.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, idx) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={idx}
              className={`rounded px-0.5 text-black font-bold ${
                isCurrentMatch ? 'bg-amber-300 ring-2 ring-amber-400' : 'bg-yellow-200/90'
              }`}
            >
              {part}
            </mark>
          ) : (
            <span key={idx}>{part}</span>
          )
        )}
      </span>
    );
  };

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
        // Fetch receipts for this conversation's messages
        const msgIds = data.map((m: any) => m.id);
        let receiptsMap: Record<string, { delivered_at?: string; read_at?: string }> = {};

        if (msgIds.length > 0) {
          const { data: receipts } = await supabase
            .from('message_receipts')
            .select('*')
            .in('message_id', msgIds);

          if (receipts) {
            receipts.forEach((r: any) => {
              if (r.user_id !== user?.id) {
                // Receipt from recipient
                receiptsMap[r.message_id] = {
                  delivered_at: r.delivered_at,
                  read_at: r.read_at
                };
              }
            });
          }
        }

        // Determine read cursor / unread separator position
        const localRead = getLocalLastRead(user?.id, chat.id);
        let firstUnreadSeq: number | null = null;
        let incomingUnreadCount = 0;

        const formatted = data.map((m: any, idx: number) => {
          const isMe = m.sender_id === user?.id;
          const seq = m.sequence_number || (idx + 1);
          const isDeleted = Boolean(m.deleted_for_everyone);

          const isAudio = m.message_type === 'audio' || (typeof m.content === 'string' && m.content.startsWith('data:audio'));
          const isImage = m.message_type === 'image' || (typeof m.content === 'string' && m.content.startsWith('data:image'));
          const isVideo = m.message_type === 'video' || (typeof m.content === 'string' && m.content.startsWith('data:video'));
          const isFile = m.message_type === 'file' || (typeof m.content === 'string' && m.content.startsWith('data:application'));

          // Calculate status for own messages
          let status: MessageStatus = 'sent';
          if (isMe) {
            const r = receiptsMap[m.id];
            if (r?.read_at) status = 'read';
            else if (r?.delivered_at) status = 'delivered';
            else status = 'sent';
          }

          // Unread marker logic for incoming messages
          if (!isMe && !isDeleted) {
            const isUnread = localRead ? new Date(m.created_at) > new Date(localRead) : true;
            if (isUnread) {
              incomingUnreadCount++;
              if (firstUnreadSeq === null) {
                firstUnreadSeq = seq;
              }
            }
          }

          const defaultText = isDeleted
            ? '🚫 This message was deleted'
            : isImage
            ? 'Photo'
            : isVideo
            ? 'Video'
            : isAudio
            ? 'Voice message'
            : isFile
            ? (m.file_name || 'Document')
            : m.content;

          const deducedType = isDeleted
            ? 'system'
            : isImage
            ? 'image'
            : isVideo
            ? 'video'
            : isAudio
            ? 'audio'
            : isFile
            ? 'file'
            : (m.message_type || 'text');

          return {
            id: m.id,
            me: isMe,
            text: defaultText,
            message_type: deducedType,
            audio_url: isDeleted ? undefined : (isAudio ? m.content : undefined),
            image_url: isDeleted ? undefined : (isImage ? m.content : undefined),
            video_url: isDeleted ? undefined : (isVideo ? m.content : undefined),
            file_url: isDeleted ? undefined : (isFile ? m.content : undefined),
            file_name: isDeleted ? undefined : (m.file_name || (isFile ? 'Document' : undefined)),
            file_size: isDeleted ? undefined : m.file_size,
            reply_quote: isDeleted ? undefined : m.reply_quote,
            time: new Date(m.created_at).toTimeString().slice(0, 5),
            status,
            sequence_number: seq,
            client_message_id: m.client_message_id,
            created_at: m.created_at,
            deleted_for_everyone: isDeleted
          };
        });

        setMsgs(formatted);
        if (incomingUnreadCount > 0 && firstUnreadSeq !== null) {
          setFirstUnreadSequence(firstUnreadSeq);
          setUnreadCountAtOpen(incomingUnreadCount);
        }

        // WhatsApp read watermark: mark all existing messages read
        const latestTime = data.length > 0 ? data[data.length - 1].created_at : new Date().toISOString();
        const maxSeq = data.length > 0 ? (data[data.length - 1].sequence_number || data.length) : 0;
        setLocalLastRead(user?.id, chat.id, latestTime);

        // Acknowledge delivery & read via ReceiptService
        const incomingIds = data.filter((m: any) => m.sender_id !== user?.id).map((m: any) => m.id);
        if (incomingIds.length > 0) {
          ReceiptService.acknowledgeDelivery(chat.id, incomingIds).then();
          ReceiptService.acknowledgeConversationRead(chat.id, maxSeq).then();
        }

        if (user && chat.id && chat.id !== 'shared-direct-room') {
          supabase.rpc('mark_conversation_read', { target_conversation: chat.id }).then();
        }
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
            if (prev.some((m) => m.id === msg.id || (!m.me && (m.image_url === msg.content || m.video_url === msg.content || m.file_url === msg.content || m.audio_url === msg.content || m.text === msg.content)))) return prev;
            
            // Audio-haptic feedback for incoming message
            SoundEffectsService.playMessageReceived();
            HapticsService.light();

            const isAudio = msg.message_type === 'audio' || (typeof msg.content === 'string' && msg.content.startsWith('data:audio'));
            const isImage = msg.message_type === 'image' || (typeof msg.content === 'string' && msg.content.startsWith('data:image'));
            const isVideo = msg.message_type === 'video' || (typeof msg.content === 'string' && msg.content.startsWith('data:video'));
            const isFile = msg.message_type === 'file' || (typeof msg.content === 'string' && msg.content.startsWith('data:application'));

            const displayText = isImage 
              ? 'Photo' 
              : isVideo 
              ? 'Video' 
              : isAudio 
              ? 'Voice message' 
              : isFile 
              ? (msg.file_name || 'Document') 
              : msg.content;

            const deducedType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : isFile ? 'file' : (msg.message_type || 'text');

            return [
              ...prev,
              {
                id: msg.id,
                me: false,
                text: displayText,
                message_type: deducedType,
                audio_url: isAudio ? (msg.audio_url || msg.content) : undefined,
                image_url: isImage ? (msg.image_url || msg.content) : undefined,
                video_url: isVideo ? (msg.video_url || msg.content) : undefined,
                file_url: isFile ? (msg.file_url || msg.content) : undefined,
                file_name: msg.file_name,
                file_size: msg.file_size,
                reply_quote: msg.reply_quote,
                time: msg.time || new Date().toTimeString().slice(0, 5),
                created_at: new Date().toISOString(),
                sequence_number: msg.sequence_number || (prev.length + 1)
              }
            ];
          });

          // Acknowledge delivery and read immediately since user is actively viewing this room
          if (msg.id && typeof msg.id === 'string' && !msg.id.startsWith('msg-')) {
            ReceiptService.acknowledgeDelivery(chat.id, [msg.id], channelRef.current).then();
            ReceiptService.acknowledgeConversationRead(chat.id, msg.sequence_number || 999999, channelRef.current).then();
          }

          if (user && chat.id) {
            setLocalLastRead(user.id, chat.id);
            supabase
              .from('conversation_members')
              .update({ last_read_at: new Date().toISOString() })
              .match({ conversation_id: chat.id, user_id: user.id })
              .then();
          }
        })
        .on('broadcast', { event: 'delivery_receipt' }, (payload: any) => {
          const { message_ids } = payload.payload;
          if (Array.isArray(message_ids)) {
            setMsgs((prev) =>
              prev.map((m) => {
                if (m.me && message_ids.includes(String(m.id)) && m.status !== 'read') {
                  return { ...m, status: 'delivered' };
                }
                return m;
              })
            );
          }
        })
        .on('broadcast', { event: 'read_receipt' }, (payload: any) => {
          const { read_sequence, reader_id } = payload.payload;
          if (reader_id !== user?.id) {
            setMsgs((prev) =>
              prev.map((m) => {
                if (m.me && (!read_sequence || (m.sequence_number && m.sequence_number <= read_sequence))) {
                  return { ...m, status: 'read' };
                }
                return m;
              })
            );
          }
        })
        .on('broadcast', { event: 'reaction_update' }, (payload: any) => {
          const { msgId, emoji, userId } = payload.payload;
          setMsgs((prev) =>
            prev.map((m) => {
              if (m.id !== msgId) return m;
              const currentReactions = { ...(m.reactions || {}) };
              const currentUsers = currentReactions[emoji] || [];
              const exists = currentUsers.includes(userId);
              const updatedUsers = exists ? currentUsers.filter((u) => u !== userId) : [...currentUsers, userId];
              if (updatedUsers.length === 0) {
                delete currentReactions[emoji];
              } else {
                currentReactions[emoji] = updatedUsers;
              }
              return { ...m, reactions: currentReactions };
            })
          );
        })
        .on('broadcast', { event: 'message_deleted' }, (payload: any) => {
          const { message_id } = payload.payload;
          setMsgs((prev) =>
            prev.map((m) => {
              if (String(m.id) === String(message_id)) {
                return {
                  ...m,
                  text: '🚫 This message was deleted',
                  message_type: 'system',
                  audio_url: undefined,
                  image_url: undefined,
                  reply_quote: undefined,
                  deleted_for_everyone: true
                };
              }
              return m;
            })
          );
        })
        .on('broadcast', { event: 'pin_update' }, (payload: any) => {
          const { pinned } = payload.payload;
          setPinnedMessage(pinned || null);
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
          { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${chat.id}` },
          (payload: any) => {
            // Handle realtime UPDATE event (e.g., deleted_for_everyone)
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new;
              if (updated.deleted_for_everyone) {
                setMsgs((prev) =>
                  prev.map((m) => {
                    if (String(m.id) === String(updated.id)) {
                      return {
                        ...m,
                        text: '🚫 This message was deleted',
                        message_type: 'system',
                        audio_url: undefined,
                        image_url: undefined,
                        reply_quote: undefined,
                        deleted_for_everyone: true
                      };
                    }
                    return m;
                  })
                );
              }
              return;
            }

            if (payload.eventType !== 'INSERT') return;
            const newMsg = payload.new;

            // 1. If sent by current user, swap optimistic tempId with real DB id & mark sent
            if (newMsg.sender_id === user?.id) {
              setMsgs((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                let replaced = false;
                const updated = prev.map((m) => {
                  if (
                    !replaced &&
                    m.me &&
                    typeof m.id === 'string' &&
                    (m.id.startsWith('msg-') || m.id.startsWith('img-') || m.id.startsWith('voice-') || m.id.startsWith('cmsg_'))
                  ) {
                    const matches =
                      (m.client_message_id && m.client_message_id === newMsg.client_message_id) ||
                      (m.image_url && m.image_url === newMsg.content) ||
                      (m.video_url && m.video_url === newMsg.content) ||
                      (m.file_url && m.file_url === newMsg.content) ||
                      (m.audio_url && m.audio_url === newMsg.content) ||
                      (m.text === newMsg.content) ||
                      (newMsg.message_type === 'image' && m.message_type === 'image') ||
                      (newMsg.message_type === 'video' && m.message_type === 'video') ||
                      (newMsg.message_type === 'file' && m.message_type === 'file') ||
                      (newMsg.message_type === 'audio' && m.message_type === 'audio');
                    if (matches) {
                      replaced = true;
                      const nextStatus: MessageStatus = m.status === 'read' ? 'read' : (m.status === 'delivered' ? 'delivered' : 'sent');
                      return { 
                        ...m, 
                        id: newMsg.id, 
                        sequence_number: newMsg.sequence_number,
                        status: nextStatus 
                      };
                    }
                  }
                  return m;
                });
                return replaced ? updated : prev;
              });
              return;
            }

            // 2. If sent by peer, acknowledge delivery and read immediately
            ReceiptService.acknowledgeDelivery(chat.id, [newMsg.id], channelRef.current).then();
            ReceiptService.acknowledgeConversationRead(chat.id, newMsg.sequence_number || 999999, channelRef.current).then();

            if (user && chat.id) {
              setLocalLastRead(user.id, chat.id);
              supabase
                .from('conversation_members')
                .update({ last_read_at: new Date().toISOString() })
                .match({ conversation_id: chat.id, user_id: user.id })
                .then();
            }

            setMsgs((prev) => {
              // Deduplicate if already present from broadcast
              if (prev.some((m) => m.id === newMsg.id || (!m.me && (m.image_url === newMsg.content || m.video_url === newMsg.content || m.file_url === newMsg.content || m.audio_url === newMsg.content || m.text === newMsg.content)))) {
                return prev;
              }
              const isAudio = newMsg.message_type === 'audio' || (typeof newMsg.content === 'string' && newMsg.content.startsWith('data:audio'));
              const isImage = newMsg.message_type === 'image' || (typeof newMsg.content === 'string' && newMsg.content.startsWith('data:image'));
              const isVideo = newMsg.message_type === 'video' || (typeof newMsg.content === 'string' && newMsg.content.startsWith('data:video'));
              const isFile = newMsg.message_type === 'file' || (typeof newMsg.content === 'string' && newMsg.content.startsWith('data:application'));

              const displayText = isImage
                ? 'Photo'
                : isVideo
                ? 'Video'
                : isAudio
                ? 'Voice message'
                : isFile
                ? (newMsg.file_name || 'Document')
                : newMsg.content;

              const deducedType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : isFile ? 'file' : (newMsg.message_type || 'text');

              return [
                ...prev,
                {
                  id: newMsg.id,
                  me: false,
                  text: displayText,
                  message_type: deducedType,
                  audio_url: isAudio ? newMsg.content : undefined,
                  image_url: isImage ? newMsg.content : undefined,
                  video_url: isVideo ? newMsg.content : undefined,
                  file_url: isFile ? newMsg.content : undefined,
                  file_name: newMsg.file_name,
                  file_size: newMsg.file_size,
                  time: new Date(newMsg.created_at).toTimeString().slice(0, 5),
                  sequence_number: newMsg.sequence_number,
                  created_at: newMsg.created_at
                }
              ];
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'message_receipts' },
          (payload: any) => {
            const receipt = payload.new;
            if (!receipt || receipt.user_id === user?.id) return;

            setMsgs((prev) =>
              prev.map((m) => {
                if (m.me && String(m.id) === String(receipt.message_id)) {
                  let newStatus: MessageStatus = m.status || 'sent';
                  if (receipt.read_at) newStatus = 'read';
                  else if (receipt.delivered_at && newStatus !== 'read') newStatus = 'delivered';
                  return { ...m, status: newStatus };
                }
                return m;
              })
            );
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

  const startVoiceRecording = async () => {
    const rec = new VoiceRecorderService();
    recorderRef.current = rec;
    const ok = await rec.start();
    if (ok) {
      setIsRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopAndSendVoiceRecording = async () => {
    if (!recorderRef.current || !isRecording || !user) return;
    clearInterval(recordTimerRef.current);
    const audioBase64 = await recorderRef.current.stop();
    setIsRecording(false);
    recorderRef.current = null;

    if (!audioBase64) return;

    const nowTime = new Date().toTimeString().slice(0, 5);
    const clientMessageId = MessageOutboxService.generateClientId();
    const newEntry = {
      id: clientMessageId,
      client_message_id: clientMessageId,
      me: true,
      text: "Voice message",
      message_type: 'audio',
      audio_url: audioBase64,
      time: nowTime,
      status: 'sending' as MessageStatus,
      reactions: {},
      created_at: new Date().toISOString()
    };

    setMsgs((m) => [...m, newEntry]);
    SoundEffectsService.playMessageSent();
    HapticsService.medium();

    // Broadcast audio payload to conversation channel
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'new_msg',
        payload: {
          id: clientMessageId,
          conversation_id: chat.id,
          sender_id: user.id,
          content: audioBase64,
          message_type: 'audio',
          audio_url: audioBase64,
          time: nowTime
        }
      });
    }

    supabase.channel('global_messages_listener').send({
      type: 'broadcast',
      event: 'new_msg',
      payload: {
        id: clientMessageId,
        conversation_id: chat.id,
        sender_id: user.id,
        sender_name: user.display_name || user.username || 'Friend',
        content: "🎤 Voice message",
        message_type: 'audio',
        time: nowTime
      }
    });

    // Send through persistent MessageOutboxService
    const result = await MessageOutboxService.send({
      conversationId: chat.id,
      senderId: user.id,
      content: audioBase64,
      messageType: 'audio'
    });

    if (result.message) {
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === clientMessageId
            ? { ...m, id: result.message!.id, status: 'sent', sequence_number: result.message!.sequence_number }
            : m
        )
      );
    } else {
      setMsgs((prev) =>
        prev.map((m) => (m.id === clientMessageId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  const cancelVoiceRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordDuration(0);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = ''; // reset so same file can be reselected

    setIsUploadingImage(true);
    try {
      const processed = await ImageService.processImageFile(file, 1280, 0.78);
      const nowTime = new Date().toTimeString().slice(0, 5);
      const clientMessageId = MessageOutboxService.generateClientId();
      const currentReply = replyingTo;
      setReplyingTo(null);

      const newEntry = {
        id: clientMessageId,
        client_message_id: clientMessageId,
        me: true,
        text: "Photo",
        message_type: 'image',
        image_url: processed.dataUrl,
        time: nowTime,
        status: 'sending' as MessageStatus,
        reply_quote: currentReply || undefined,
        reactions: {},
        created_at: new Date().toISOString()
      };

      // 1. Instant local optimistic display
      setMsgs((m) => [...m, newEntry]);
    SoundEffectsService.playMessageSent();
    HapticsService.medium();

      // 2. Broadcast to peer room channel
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'new_msg',
          payload: {
            id: clientMessageId,
            conversation_id: chat.id,
            sender_id: user.id,
            content: processed.dataUrl,
            message_type: 'image',
            image_url: processed.dataUrl,
            time: nowTime,
            reply_quote: currentReply
          }
        });
      }

      // 3. Global notification badge
      supabase.channel('global_messages_listener').send({
        type: 'broadcast',
        event: 'new_msg',
        payload: {
          id: clientMessageId,
          conversation_id: chat.id,
          sender_id: user.id,
          sender_name: user.display_name || user.username || 'Friend',
          content: "📷 Photo",
          message_type: 'image',
          time: nowTime
        }
      });

      // 4. Send through persistent MessageOutboxService
      const result = await MessageOutboxService.send({
        conversationId: chat.id,
        senderId: user.id,
        content: processed.dataUrl,
        messageType: 'image',
        replyTo: currentReply?.id
      });

      if (result.message) {
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === clientMessageId
              ? { ...m, id: result.message!.id, status: 'sent', sequence_number: result.message!.sequence_number }
              : m
          )
        );
      } else {
        setMsgs((prev) =>
          prev.map((m) => (m.id === clientMessageId ? { ...m, status: 'failed' } : m))
        );
      }
    } catch (err) {
      console.error("Failed to process image:", err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';

    // Max 25MB check
    if (file.size > 25 * 1024 * 1024) {
      alert("Please select a video under 25MB.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const videoDataUrl = event.target?.result as string;
        if (!videoDataUrl) return;

        const nowTime = new Date().toTimeString().slice(0, 5);
        const clientMessageId = MessageOutboxService.generateClientId();
        const currentReply = replyingTo;
        setReplyingTo(null);

        const newEntry = {
          id: clientMessageId,
          client_message_id: clientMessageId,
          me: true,
          text: "Video",
          message_type: 'video',
          video_url: videoDataUrl,
          file_name: file.name,
          file_size: file.size,
          time: nowTime,
          status: 'sending' as MessageStatus,
          reply_quote: currentReply || undefined,
          reactions: {},
          created_at: new Date().toISOString()
        };

        setMsgs((m) => [...m, newEntry]);
    SoundEffectsService.playMessageSent();
    HapticsService.medium();

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'new_msg',
            payload: {
              id: clientMessageId,
              conversation_id: chat.id,
              sender_id: user.id,
              content: videoDataUrl,
              message_type: 'video',
              video_url: videoDataUrl,
              file_name: file.name,
              file_size: file.size,
              time: nowTime,
              reply_quote: currentReply
            }
          });
        }

        supabase.channel('global_messages_listener').send({
          type: 'broadcast',
          event: 'new_msg',
          payload: {
            id: clientMessageId,
            conversation_id: chat.id,
            sender_id: user.id,
            sender_name: user.display_name || user.username || 'Friend',
            content: "🎥 Video",
            message_type: 'video',
            time: nowTime
          }
        });

        const result = await MessageOutboxService.send({
          conversationId: chat.id,
          senderId: user.id,
          content: videoDataUrl,
          messageType: 'video',
          replyTo: currentReply?.id
        });

        if (result.message) {
          setMsgs((prev) =>
            prev.map((m) =>
              m.id === clientMessageId
                ? { ...m, id: result.message!.id, status: 'sent', sequence_number: result.message!.sequence_number }
                : m
            )
          );
        } else {
          setMsgs((prev) =>
            prev.map((m) => (m.id === clientMessageId ? { ...m, status: 'failed' } : m))
          );
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to read video file:", err);
    }
  };

  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';

    // Max 15MB check
    if (file.size > 15 * 1024 * 1024) {
      alert("Please select a document under 15MB.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileDataUrl = event.target?.result as string;
        if (!fileDataUrl) return;

        const nowTime = new Date().toTimeString().slice(0, 5);
        const clientMessageId = MessageOutboxService.generateClientId();
        const currentReply = replyingTo;
        setReplyingTo(null);

        const newEntry = {
          id: clientMessageId,
          client_message_id: clientMessageId,
          me: true,
          text: file.name,
          message_type: 'file',
          file_url: fileDataUrl,
          file_name: file.name,
          file_size: file.size,
          time: nowTime,
          status: 'sending' as MessageStatus,
          reply_quote: currentReply || undefined,
          reactions: {},
          created_at: new Date().toISOString()
        };

        setMsgs((m) => [...m, newEntry]);
    SoundEffectsService.playMessageSent();
    HapticsService.medium();

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'new_msg',
            payload: {
              id: clientMessageId,
              conversation_id: chat.id,
              sender_id: user.id,
              content: fileDataUrl,
              message_type: 'file',
              file_url: fileDataUrl,
              file_name: file.name,
              file_size: file.size,
              time: nowTime,
              reply_quote: currentReply
            }
          });
        }

        supabase.channel('global_messages_listener').send({
          type: 'broadcast',
          event: 'new_msg',
          payload: {
            id: clientMessageId,
            conversation_id: chat.id,
            sender_id: user.id,
            sender_name: user.display_name || user.username || 'Friend',
            content: `📎 ${file.name}`,
            message_type: 'file',
            time: nowTime
          }
        });

        const result = await MessageOutboxService.send({
          conversationId: chat.id,
          senderId: user.id,
          content: fileDataUrl,
          messageType: 'file',
          replyTo: currentReply?.id
        });

        if (result.message) {
          setMsgs((prev) =>
            prev.map((m) =>
              m.id === clientMessageId
                ? { ...m, id: result.message!.id, status: 'sent', sequence_number: result.message!.sequence_number }
                : m
            )
          );
        } else {
          setMsgs((prev) =>
            prev.map((m) => (m.id === clientMessageId ? { ...m, status: 'failed' } : m))
          );
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to read document file:", err);
    }
  };

  const toggleReaction = (msgId: string | number, emoji: string) => {
    if (!user) return;
    setActiveReactionMsgId(null);

    setMsgs((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const currentUsers = currentReactions[emoji] || [];
        const exists = currentUsers.includes(user.id);
        const updatedUsers = exists ? currentUsers.filter((u) => u !== user.id) : [...currentUsers, user.id];
        if (updatedUsers.length === 0) {
          delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = updatedUsers;
        }
        return { ...m, reactions: currentReactions };
      })
    );

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction_update',
        payload: { msgId, emoji, userId: user.id }
      });
    }
  };

  const handleInputChange = (val: string) => {
    setText(val);
    // Broadcast typing to room channel AND global channel
    if (user) {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { sender_id: user.id, conversation_id: chat.id }
        });
      }
      supabase.channel('global_messages_listener').send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: user.id, conversation_id: chat.id }
      });
    }
  };

  const send = async () => {
    if (!text.trim() || !user) return;
    const content = text.trim();
    const currentReply = replyingTo;
    setText("");
    setReplyingTo(null);

    const nowTime = new Date().toTimeString().slice(0, 5);
    const clientMessageId = MessageOutboxService.generateClientId();
    const newEntry = {
      id: clientMessageId,
      client_message_id: clientMessageId,
      me: true,
      text: content,
      time: nowTime,
      status: 'sending' as MessageStatus,
      reply_quote: currentReply || undefined,
      reactions: {},
      created_at: new Date().toISOString()
    };

    // 1. Instant local display with 'sending' status
    setMsgs((m) => [...m, newEntry]);
    SoundEffectsService.playMessageSent();
    HapticsService.medium();

    // 2. Broadcast to other peer (Send to both specific room AND global listener)
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'new_msg',
        payload: {
          id: clientMessageId,
          conversation_id: chat.id,
          sender_id: user.id,
          content,
          time: nowTime,
          reply_quote: currentReply
        }
      });
    }

    // Also notify global channel so recipient outside the chat room gets badge
    supabase.channel('global_messages_listener').send({
      type: 'broadcast',
      event: 'new_msg',
      payload: {
        id: clientMessageId,
        conversation_id: chat.id,
        sender_id: user.id,
        sender_name: user.display_name || user.username || 'Friend',
        content,
        time: nowTime
      }
    });

    // 3. Dispatch through persistent MessageOutboxService (idempotent, offline retry)
    const result = await MessageOutboxService.send({
      conversationId: chat.id,
      senderId: user.id,
      content,
      messageType: 'text',
      replyTo: currentReply?.id
    });

    if (result.message) {
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === clientMessageId
            ? { ...m, id: result.message!.id, status: 'sent', sequence_number: result.message!.sequence_number }
            : m
        )
      );
    } else {
      setMsgs((prev) =>
        prev.map((m) => (m.id === clientMessageId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  const handleRetryMessage = async (clientMessageId?: string) => {
    if (!clientMessageId) return;
    setMsgs((prev) =>
      prev.map((m) => (m.client_message_id === clientMessageId ? { ...m, status: 'sending' } : m))
    );
    const result = await MessageOutboxService.retry(clientMessageId);
    if (result.message) {
      setMsgs((prev) =>
        prev.map((m) =>
          m.client_message_id === clientMessageId
            ? { ...m, id: result.message!.id, status: 'sent', sequence_number: result.message!.sequence_number }
            : m
        )
      );
    } else {
      setMsgs((prev) =>
        prev.map((m) => (m.client_message_id === clientMessageId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  const deleteMessageForMe = (msgId: string | number) => {
    setActiveReactionMsgId(null);
    setMsgs((prev) => prev.filter((m) => m.id !== msgId));
  };

  const deleteMessageForEveryone = async (msgId: string | number) => {
    setActiveReactionMsgId(null);

    // 1. Optimistic UI update
    setMsgs((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          return {
            ...m,
            text: '🚫 This message was deleted',
            message_type: 'system',
            audio_url: undefined,
            image_url: undefined,
            reply_quote: undefined,
            deleted_for_everyone: true
          };
        }
        return m;
      })
    );

    // 2. Broadcast to room channel so peer instantly retracts bubble
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message_deleted',
        payload: { conversation_id: chat.id, message_id: msgId }
      });
    }

    // 3. Update database record
    if (typeof msgId === 'string' && !msgId.startsWith('cmsg_') && !msgId.startsWith('msg-')) {
      await supabase
        .from('messages')
        .update({
          deleted_for_everyone: true,
          content: 'This message was deleted'
        })
        .eq('id', msgId);
    }
  };

  const togglePinMessage = (msgId: string, senderName: string, snippet: string) => {
    setActiveReactionMsgId(null);
    const isCurrentlyPinned = pinnedMessage?.id === msgId;
    const nextPin = isCurrentlyPinned ? null : { id: msgId, sender_name: senderName, content: snippet };
    setPinnedMessage(nextPin);

    // Broadcast pin state to peer room channel in real-time
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'pin_update',
        payload: { conversation_id: chat.id, pinned: nextPin }
      });
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
        <Avatar 
          chat={chat} 
          size={40} 
          onClick={() => {
            HapticsService.light();
            if (chat.type === 'group') setGroupDrawerOpen(true);
            else setContactInfoDrawerOpen(true);
          }}
        />
        <div 
          onClick={() => {
            HapticsService.light();
            if (chat.type === 'group') {
              setGroupDrawerOpen(true);
            } else {
              setContactInfoDrawerOpen(true);
            }
          }}
          className="flex-1 min-w-0 cursor-pointer hover:opacity-85 transition"
        >
          <div className="font-semibold leading-tight truncate">{chat.name}</div>
          <div className="text-xs text-accent flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span>{isPeerTyping ? "typing..." : (chat.type === 'group' ? 'Tap for group info' : (chat.online ? "online" : 'Tap for contact info & media'))}</span>
          </div>
        </div>
        <IconBtn label="Search in chat" onClick={() => {
          setIsSearching(!isSearching);
          setSearchQuery("");
          setSearchMatchIndex(0);
        }}>
          <Search className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="Contact & media info" onClick={() => {
          if (chat.type === 'group') setGroupDrawerOpen(true);
          else setContactInfoDrawerOpen(true);
        }}>
          <ImageIcon className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="Voice call" onClick={() => onStartCall("audio", chat)}><Phone className="h-4 w-4" /></IconBtn>
        <IconBtn label="Video call" onClick={() => onStartCall("video", chat)}><Video className="h-4 w-4" /></IconBtn>
      </div>

      {/* Floating In-Chat Search Bar Header */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            className="glass-strong border-b border-white/10 px-3 py-2 flex items-center gap-2 overflow-hidden"
          >
            <div className="flex-1 flex items-center gap-2 glass rounded-2xl px-3 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchMatchIndex(0);
                }}
                placeholder="Search messages..."
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 text-muted-foreground hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Match Counter & Up/Down Navigation Controls */}
            {searchQuery.trim() && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <span>
                  {matchedMsgIds.length > 0 ? `${searchMatchIndex + 1}/${matchedMsgIds.length}` : '0/0'}
                </span>
                <button
                  onClick={handlePrevSearchMatch}
                  disabled={matchedMsgIds.length === 0}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                  title="Previous match"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextSearchMatch}
                  disabled={matchedMsgIds.length === 0}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                  title="Next match"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setIsSearching(false);
                setSearchQuery("");
              }}
              className="p-1.5 text-muted-foreground hover:text-white rounded-xl hover:bg-white/5 cursor-pointer text-xs"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Message Glassmorphic Banner (WhatsApp/Telegram style) */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              messageRefs.current[pinnedMessage.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="glass-strong border-b border-primary/20 px-3.5 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0">
                <Pin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <div className="text-[10px] font-bold text-primary tracking-wide uppercase">
                  Pinned message · {pinnedMessage.sender_name}
                </div>
                <div className="truncate text-slate-300 text-[11px] font-medium">
                  {pinnedMessage.content}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePinMessage(pinnedMessage.id, pinnedMessage.sender_name, pinnedMessage.content);
              }}
              title="Unpin message"
              className="p-1 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 cursor-pointer ml-2"
            >
              <PinOff className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {loading && msgs.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground animate-pulse">Loading live conversation...</div>
        ) : null}
        
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => {
            const prevMsg = i > 0 ? msgs[i - 1] : null;
            const showDate = !prevMsg || (m.created_at && prevMsg.created_at && formatDateLabel(m.created_at) !== formatDateLabel(prevMsg.created_at));
            const showUnreadMarker = firstUnreadSequence !== null && m.sequence_number === firstUnreadSequence && !m.me;

            return (
              <React.Fragment key={m.id}>
                {showDate && m.created_at && (
                  <DateSeparator timestamp={m.created_at} />
                )}
                {showUnreadMarker && (
                  <UnreadSeparator count={unreadCountAtOpen} />
                )}

                {m.message_type === 'system' ? (
                  <div className="flex items-center justify-center my-2 select-none">
                    <div className="glass px-3.5 py-1 rounded-full text-[11px] text-muted-foreground text-center border border-white/5">
                      {m.text}
                    </div>
                  </div>
                ) : (
                <div className="relative flex flex-col group">
                  {/* Floating Reaction Pill Picker on Tap/Long-Press */}
                  <AnimatePresence>
                    {activeReactionMsgId === m.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        transition={spring}
                        className={`absolute -top-12 z-40 glass-strong flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-2xl border border-white/20 ${
                          m.me ? 'right-2' : 'left-2'
                        }`}
                      >
                        {reactionOptions.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m.id, emoji)}
                            className="text-base hover:scale-130 active:scale-95 transition-transform cursor-pointer p-0.5"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setReplyingTo({ 
                            id: String(m.id), 
                            sender_name: m.me ? 'You' : chat.name, 
                            content: (m.message_type === 'image' || m.text?.startsWith('data:image')) ? '📷 Photo' : (m.message_type === 'audio' ? '🎤 Voice note' : m.text) 
                          })}
                          className="text-xs text-primary font-bold ml-1 pl-1.5 border-l border-white/20 hover:underline cursor-pointer"
                        >
                          Reply
                        </button>
                        {/* Pin / Unpin button */}
                        <button
                          onClick={() => {
                            const snippet = (m.message_type === 'image' || m.text?.startsWith('data:image'))
                              ? '📷 Photo'
                              : (m.message_type === 'audio' ? '🎤 Voice note' : m.text);
                            togglePinMessage(String(m.id), m.me ? 'You' : chat.name, snippet);
                          }}
                          title={pinnedMessage?.id === String(m.id) ? "Unpin message" : "Pin message"}
                          className={`text-xs p-1 rounded cursor-pointer ${
                            pinnedMessage?.id === String(m.id)
                              ? 'text-primary bg-primary/20'
                              : 'text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete for Me button */}
                        <button
                          onClick={() => deleteMessageForMe(m.id)}
                          title="Delete for me"
                          className="text-xs text-slate-300 hover:text-white p-1 hover:bg-white/10 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete for Everyone button (own messages only) */}
                        {m.me && !m.deleted_for_everyone && (
                          <button
                            onClick={() => deleteMessageForEveryone(m.id)}
                            title="Delete for everyone"
                            className="text-xs text-red-400 hover:text-red-300 p-1 hover:bg-red-500/20 rounded cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Swipe-to-Reply Container */}
                  <div 
                    ref={(el) => { messageRefs.current[String(m.id)] = el; }}
                    className={`relative flex items-center w-full ${m.me ? 'justify-end' : 'justify-start'}`}
                  >
                    <motion.div 
                      layout 
                      drag="x"
                      dragConstraints={{ left: 0, right: 65 }}
                      dragElastic={0.25}
                      onDragEnd={(_e, info) => {
                        if (info.offset.x > 45) {
                          setReplyingTo({
                            id: String(m.id),
                            sender_name: m.me ? 'You' : chat.name,
                            content: (m.message_type === 'image' || m.text?.startsWith('data:image'))
                              ? '📷 Photo'
                              : (m.message_type === 'audio' ? '🎤 Voice note' : m.text)
                          });
                        }
                      }}
                      initial={{ opacity: 0, y: 12, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...spring, delay: typeof m.id === 'number' && m.id < 100 ? i * 0.04 : 0 }}
                      style={{ originX: m.me ? 1 : 0, originY: 1 }}
                      onClick={() => setActiveReactionMsgId(activeReactionMsgId === m.id ? null : m.id)}
                      className={`relative max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] cursor-pointer select-none transition-transform active:scale-[0.98] ${
                        m.deleted_for_everyone
                          ? 'glass-strong italic opacity-60 text-muted-foreground self-start'
                          : (m.me ? "bg-bubble self-end rounded-br-lg text-primary-foreground shadow-glow" : "glass self-start rounded-bl-lg")
                      }`}
                    >
                      {/* Quoted Message Header if it was a reply */}
                      {m.reply_quote && (
                        <div className={`mb-1.5 p-2 rounded-2xl text-xs border-l-2 ${
                          m.me ? 'bg-black/20 border-white/60 text-white/90' : 'bg-white/5 border-primary text-slate-300'
                        }`}>
                          <span className="font-bold block text-[10px] text-accent">{m.reply_quote.sender_name}</span>
                          <span className="truncate block opacity-80">{m.reply_quote.content}</span>
                        </div>
                      )}

                      {/* Media Bubble: Audio, Photo, Video, Document, or Text */}
                      {m.message_type === 'audio' && m.audio_url ? (
                        <VoiceNoteBubble audioUrl={m.audio_url} isOwn={m.me} />
                      ) : (m.message_type === 'image' || m.image_url || (typeof m.text === 'string' && m.text.startsWith('data:image'))) ? (
                        <ImageBubble 
                          imageUrl={m.image_url || m.text} 
                          isOwn={m.me} 
                          onOpenLightbox={() => setLightboxImage({ 
                            url: m.image_url || m.text, 
                            sender: m.me ? 'You' : chat.name, 
                            time: m.time 
                          })} 
                        />
                      ) : (m.message_type === 'video' || m.video_url || (typeof m.text === 'string' && m.text.startsWith('data:video'))) ? (
                        <VideoBubble
                          videoUrl={m.video_url || m.text}
                          isOwn={m.me}
                        />
                      ) : (m.message_type === 'file' || m.file_url || (typeof m.text === 'string' && m.text.startsWith('data:application'))) ? (
                        <DocumentBubble
                          fileUrl={m.file_url || m.text}
                          fileName={m.file_name || m.text}
                          fileSize={m.file_size}
                          isOwn={m.me}
                        />
                      ) : (
                        <span>{renderHighlightedText(m.text, matchedMsgIds[searchMatchIndex] === String(m.id))}</span>
                      )}

                      <span className={`ml-2 inline-flex items-center gap-1 align-bottom text-[10px] ${m.me ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {m.time}
                        {m.me && (
                          <MessageStatusIndicator 
                            status={m.status || 'sent'} 
                            onRetry={() => handleRetryMessage(m.client_message_id)} 
                          />
                        )}
                      </span>

                      {/* Attached Emoji Reaction Badges */}
                      {m.reactions && Object.keys(m.reactions).length > 0 && (
                        <div className={`absolute -bottom-3 flex items-center gap-1 ${m.me ? 'right-2' : 'left-2'}`}>
                          {Object.entries(m.reactions).map(([emoji, users]) => (
                            <span 
                              key={emoji}
                              onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }}
                              className="glass-strong text-[11px] px-2 py-0.5 rounded-full border border-white/20 shadow-md flex items-center gap-1 cursor-pointer hover:scale-110 transition-transform"
                            >
                              <span>{emoji}</span>
                              {users.length > 1 && <span className="text-[9px] font-bold text-white">{users.length}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
                )}
              </React.Fragment>
            );
          })}
        </AnimatePresence>

        {isPeerTyping && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass self-start rounded-3xl rounded-bl-lg px-4 py-2 mt-1">
            <Typing />
          </motion.div>
        )}
      </div>

      {/* Quoted Reply Banner */}
      {replyingTo && (
        <div className="glass mx-3 p-2.5 rounded-2xl flex items-center justify-between border-l-4 border-primary text-xs">
          <div className="min-w-0 flex-1">
            <span className="font-bold text-primary block text-[10px]">Replying to {replyingTo.sender_name}</span>
            <span className="truncate block text-slate-300">{replyingTo.content}</span>
          </div>
          <button 
            onClick={() => setReplyingTo(null)}
            className="p-1 text-muted-foreground hover:text-white cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Image Uploading / Compressing Pill HUD */}
      {isUploadingImage && (
        <div className="glass mx-3 mb-1 p-2 rounded-2xl flex items-center gap-2 text-xs text-primary animate-pulse">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span>Optimizing & sending photo...</span>
        </div>
      )}

      <div className="flex items-center gap-2 p-3 pb-6">
        {isRecording ? (
          /* Live Recording Bar HUD */
          <div className="flex-1 glass-strong rounded-full px-4 py-2.5 flex items-center justify-between border border-red-500/30 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>Recording {recordDuration}s...</span>
            </div>
            <button
              onClick={cancelVoiceRecording}
              className="text-xs text-muted-foreground hover:text-white px-2 py-0.5 rounded-md hover:bg-white/10 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />
            <input 
              type="file" 
              ref={videoInputRef} 
              onChange={handleVideoSelect} 
              accept="video/*" 
              className="hidden" 
            />
            <input 
              type="file" 
              ref={docInputRef} 
              onChange={handleDocumentSelect} 
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.zip,.rar" 
              className="hidden" 
            />

            {/* iOS Action Sheet / Glass Attachment Menu */}
            <div className="relative">
              <AnimatePresence>
                {showAttachMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowAttachMenu(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-14 left-0 z-50 flex flex-col gap-1 p-2 rounded-2xl glass-strong border border-white/20 shadow-2xl backdrop-blur-2xl min-w-[170px]"
                    >
                      <button
                        onClick={() => {
                          setShowAttachMenu(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-xs font-medium transition cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <span>Photo</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAttachMenu(false);
                          videoInputRef.current?.click();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-xs font-medium transition cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                          <Film className="w-4 h-4" />
                        </div>
                        <span>Video</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAttachMenu(false);
                          docInputRef.current?.click();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-xs font-medium transition cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span>Document</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <IconBtn 
                label="Attach media" 
                onClick={() => setShowAttachMenu(!showAttachMenu)}
              >
                <Plus className={`h-5 w-5 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`} />
              </IconBtn>
            </div>

            <div className="glass flex flex-1 items-center rounded-full px-4 py-2.5">
              <input 
                value={text} 
                onChange={(e) => handleInputChange(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && send()} 
                placeholder="Message" 
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" 
              />
              <motion.button 
                whileTap={{ scale: 0.8, rotate: -20 }} 
                onClick={() => {
                  HapticsService.light();
                  setToneOpen(!toneOpen);
                }} 
                aria-label="Rewrite with AI"
                title="Rewrite message in a tone"
                className={`ml-2 cursor-pointer p-0.5 transition-colors ${toneOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Wand2 className="h-4 w-4" />
              </motion.button>
            </div>
          </>
        )}

        <motion.button 
          whileTap={{ scale: 0.8 }} 
          onClick={text ? send : (isRecording ? stopAndSendVoiceRecording : startVoiceRecording)} 
          aria-label={text ? "Send" : (isRecording ? "Stop and Send" : "Record Voice Note")} 
          className={`grid h-11 w-11 place-items-center rounded-full text-primary-foreground shadow-glow cursor-pointer transition-colors ${
            isRecording ? 'bg-red-500 shadow-red-500/40 text-white' : 'bg-brand'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span 
              key={text ? "send" : (isRecording ? "stop" : "mic")} 
              initial={{ scale: 0, rotate: -45 }} 
              animate={{ scale: 1, rotate: 0 }} 
              exit={{ scale: 0, rotate: 45 }} 
              transition={spring}
            >
              {text ? <Send className="h-5 w-5" /> : (isRecording ? <CheckCheck className="h-5 w-5" /> : <Mic className="h-5 w-5" />)}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* AI Tone Rewriter Drawer (Glasswave-Pattern) */}
      <AnimatePresence>
        {toneOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 16, scale: 0.97 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 16, scale: 0.97 }} 
            transition={spring}
            className="glass-strong mx-3 mb-2 rounded-3xl p-3.5 border border-border"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Wand2 className="h-4 w-4 text-primary" />
                Rewrite message tone
              </span>
              <button 
                aria-label="Close" 
                onClick={() => setToneOpen(false)} 
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!text.trim() && (
              <p className="px-1 pb-2 text-[11px] text-muted-foreground">
                Type your draft message first, then tap a tone below to rewrite.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {TONES.map((t) => (
                <motion.button 
                  key={t} 
                  whileTap={{ scale: 0.92 }} 
                  disabled={!text.trim() || !!busyTone} 
                  onClick={() => handleApplyTone(t)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-50 cursor-pointer"
                >
                  {busyTone === t && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  <span>{t}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Glass Lightbox Viewer */}
      <LightboxModal
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage?.url || null}
        senderName={lightboxImage?.sender}
        timestamp={lightboxImage?.time}
        onClose={() => setLightboxImage(null)}
      />

      {/* Custom Chat Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={chatNotifModalOpen}
        onClose={() => setChatNotifModalOpen(false)}
        chat={chat}
      />

      {/* WhatsApp-Style Contact Info & Media Drawer */}
      <ChatContactInfoDrawer
        isOpen={contactInfoDrawerOpen}
        chat={chat}
        messages={msgs}
        isLocked={isLocked}
        isArchived={isArchived}
        isFavorite={isFavorite}
        onClose={() => setContactInfoDrawerOpen(false)}
        onToggleLock={onToggleLock}
        onToggleArchive={onToggleArchive}
        onToggleFavorite={onToggleFavorite}
        onStartAudioCall={() => onStartCall("audio", chat)}
        onStartVideoCall={() => onStartCall("video", chat)}
        onSearchInChat={() => {
          setIsSearching(true);
          setContactInfoDrawerOpen(false);
        }}
        onOpenNotifications={() => {
          setContactInfoDrawerOpen(false);
          setChatNotifModalOpen(true);
        }}
        onOpenMedia={(mediaItem) => {
          if (mediaItem.type === 'image') {
            setLightboxImage({
              url: mediaItem.url,
              sender: chat.name,
              time: mediaItem.time || 'Shared Media'
            });
          } else {
            window.open(mediaItem.url, '_blank');
          }
        }}
        onClearChat={() => {
          setMsgs([]);
          setContactInfoDrawerOpen(false);
          HapticsService.medium();
        }}
      />

      {/* Group Info / Members Drawer */}
      {chat.type === 'group' && (
        <GroupInfoDrawer
          isOpen={groupDrawerOpen}
          chat={chat}
          onClose={() => setGroupDrawerOpen(false)}
          onLeaveGroup={() => {
            setGroupDrawerOpen(false);
            onBack();
          }}
          onMemberCountUpdated={(count) => {
            chat.handle = `${count} members`;
          }}
        />
      )}
    </motion.div>
  );
}

export function YoApp() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("chats");
  const [open, setOpen] = useState<Chat | null>(null);
  const openRef = useRef<Chat | null>(null);
  const seenMsgIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const [authOpen, setAuthOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [globalNotifModalOpen, setGlobalNotifModalOpen] = useState(false);
  const [createStoryModalOpen, setCreateStoryModalOpen] = useState(false);
  const [createStoryInitialMode, setCreateStoryInitialMode] = useState<StatusContentType>('text');
  const [viewerStoryModalOpen, setViewerStoryModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [selectedStoryGroupIndex, setSelectedStoryGroupIndex] = useState(0);
  const [statusGroups, setStatusGroups] = useState<UserStatusGroup[]>([]);
  const [chatsList, setChatsList] = useState<Chat[]>([]);
  const chatsListRef = useRef<Chat[]>([]);
  useEffect(() => {
    chatsListRef.current = chatsList;
  }, [chatsList]);

  // Archived, Locked & Favorited Chats State & Persistence
  const [archivedIds, setArchivedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('yo_archived_chats') || '[]'); } catch { return []; }
  });
  const [lockedIds, setLockedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('yo_locked_chats') || '[]'); } catch { return []; }
  });
  const [favoritesIds, setFavoritesIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('yo_favorites') || '[]'); } catch { return []; }
  });

  const toggleArchive = (chatId: string) => {
    setArchivedIds((prev) => {
      const next = prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId];
      try { localStorage.setItem('yo_archived_chats', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleLock = (chatId: string) => {
    setLockedIds((prev) => {
      const next = prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId];
      try { localStorage.setItem('yo_locked_chats', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleFavorite = (chatId: string) => {
    setFavoritesIds((prev) => {
      const next = prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId];
      try { localStorage.setItem('yo_favorites', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Dark Glass Theme State & Global Sync
  const [darkGlass, setDarkGlass] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yo_dark_glass') === 'true';
    } catch {
      return false;
    }
  });

  const toggleDarkGlass = (val: boolean) => {
    setDarkGlass(val);
    try {
      localStorage.setItem('yo_dark_glass', String(val));
    } catch {}
    if (val) {
      document.documentElement.classList.add('dark');
      SoundEffectsService.playToggleOn();
    } else {
      document.documentElement.classList.remove('dark');
      SoundEffectsService.playToggleOff();
    }
    HapticsService.medium();
  };

  useEffect(() => {
    if (darkGlass) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkGlass]);

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
        .select('conversation_id, last_read_at, conversations(*)')
        .eq('user_id', user.id);

      if (!error && convMembers && convMembers.length > 0) {
        const formatted: Chat[] = [];
        for (const item of convMembers) {
          const conv = item.conversations as any;
          if (!conv) continue;

          // For groups, handle displays member count and name is group title
          let name = conv.title || "Yo Direct Chat";
          let handle = "direct";
          let hue = 180;
          let targetUserId = undefined;

          if (conv.type === 'group') {
            name = conv.title || "Group Chat";
            handle = "group";
            hue = (name.charCodeAt(0) * 41) % 360;
          } else {
            // Fetch other participant profile for direct chat
            const { data: otherMember } = await supabase
              .from('conversation_members')
              .select('user_id, profiles(*)')
              .eq('conversation_id', conv.id)
              .neq('user_id', user.id)
              .maybeSingle();

            const profile = (otherMember as any)?.profiles;
            name = profile?.display_name || conv.title || "Yo Direct Chat";
            handle = profile?.username ? `@${profile.username}` : "direct";
            hue = handle ? (handle.charCodeAt(1) * 33) % 360 : 180;
            targetUserId = profile?.id;
          }

          // WhatsApp read watermark logic:
          const isCurrentActive = openRef.current?.id === conv.id;
          let unreadCount = 0;
          if (isCurrentActive) {
            unreadCount = 0;
            setLocalLastRead(user.id, conv.id);
          } else {
            const localRead = getLocalLastRead(user.id, conv.id);
            const dbRead = item.last_read_at;
            let effectiveRead = localRead;
            if (dbRead && (!localRead || new Date(dbRead) > new Date(localRead))) {
              effectiveRead = dbRead;
            }

            if (effectiveRead) {
              const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender_id', user.id)
                .gt('created_at', effectiveRead);
              unreadCount = count || 0;
            } else {
              // Never read this chat: count all incoming messages
              const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender_id', user.id);
              unreadCount = count || 0;
            }
          }

          formatted.push({
            id: conv.id,
            name,
            handle,
            hue,
            last: conv.last_message_preview || "Conversation started",
            time: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
            unread: unreadCount,
            online: true,
            target_user_id: targetUserId,
            type: conv.type
          });
        }

        setChatsList(() => {
          return formatted.map((newChat) => {
            const isActive = openRef.current?.id === newChat.id;
            if (isActive) return { ...newChat, unread: 0 };
            return newChat;
          });
        });
      } else {
        const isActive = openRef.current?.id === "shared-direct-room";
        const localRead = getLocalLastRead(user.id, "shared-direct-room");
        let fallbackUnread = 0;
        if (!isActive && localRead) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', 'shared-direct-room')
            .neq('sender_id', user.id)
            .gt('created_at', localRead);
          fallbackUnread = count || 0;
        }

        setChatsList(() => {
          const defaultChat: Chat = {
            id: "shared-direct-room",
            name: "Yo Direct Chat",
            handle: "@chat",
            hue: 200,
            last: "Tap here to chat across devices!",
            time: "Now",
            unread: isActive ? 0 : fallbackUnread,
            online: true
          };
          return [defaultChat];
        });
      }
    } catch (e) {
      console.warn("Failed to refresh conversations:", e);
    }
  };

  const refreshStatuses = async () => {
    try {
      const res = await StatusService.getActiveStatusGroups(user?.id);
      setStatusGroups(res.allGroups);
    } catch (err) {
      console.warn("Failed to load statuses:", err);
    }
  };

  useEffect(() => {
    refreshConversations();
    refreshStatuses();

    // Global listener for new messages & typing when user is on the chat list
    const globalChannel = supabase
      .channel('global_messages_listener')
      .on('broadcast', { event: 'new_msg' }, (payload: any) => {
        const msg = payload.payload;
        if (msg.sender_id !== user?.id) {
          const msgIdStr = msg.id ? String(msg.id) : null;
          if (msgIdStr && seenMsgIdsRef.current.has(msgIdStr)) return;
          if (msgIdStr) {
            seenMsgIdsRef.current.add(msgIdStr);
            if (seenMsgIdsRef.current.size > 200) {
              const first = seenMsgIdsRef.current.values().next().value;
              if (first) seenMsgIdsRef.current.delete(first);
            }
          }

          const targetConvId = msg.conversation_id || 'shared-direct-room';
          const isCurrentlyReading = openRef.current?.id === targetConvId;

          // If message is real persisted ID, acknowledge delivery immediately on receiver device!
          if (msg.id && typeof msg.id === 'string' && !msg.id.startsWith('cmsg_') && !msg.id.startsWith('msg-')) {
            ReceiptService.acknowledgeDelivery(targetConvId, [msg.id]).then();
          }

          const preview = msg.message_type === 'image' 
            ? '📷 Photo' 
            : (msg.message_type === 'audio' ? '🎤 Voice note' : (msg.content || 'New message'));
          const timeStr = msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          // Fire local notification if user is outside this chat or app is in background
          if (!isCurrentlyReading) {
            const senderName = msg.sender_name || chatsListRef.current.find((c) => c.id === targetConvId)?.name || 'Someone';
            NotificationService.showIncomingMessage({
              title: `Yo!!! ${senderName}`,
              body: preview,
              conversationId: targetConvId
            }).then();

            // Trigger AI Voice Assistant announcement or custom tone!
            VoiceAssistantService.handleIncomingAlert({
              chatId: targetConvId,
              senderName,
              content: preview,
              time: timeStr,
              messageId: msg.id ? String(msg.id) : undefined
            });
          }

          setChatsList((prev) => 
            prev.map((c) => {
              if (c.id === targetConvId || (!msg.conversation_id && c.id === 'shared-direct-room')) {
                return {
                  ...c,
                  last: preview,
                  time: timeStr,
                  unread: isCurrentlyReading ? 0 : (c.unread || 0) + 1,
                  typing: false
                };
              }
              return c;
            })
          );
        }
      })
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const { sender_id, conversation_id } = payload.payload;
        if (sender_id !== user?.id) {
          setChatsList((prev) =>
            prev.map((c) => {
              if (c.id === conversation_id || (conversation_id === 'shared-direct-room')) {
                return { ...c, typing: true };
              }
              return c;
            })
          );
          setTimeout(() => {
            setChatsList((prev) =>
              prev.map((c) => (c.id === conversation_id ? { ...c, typing: false } : c))
            );
          }, 2500);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const newMsg = payload.new;
        if (newMsg.sender_id !== user?.id) {
          const msgIdStr = newMsg.id ? String(newMsg.id) : null;
          if (msgIdStr && seenMsgIdsRef.current.has(msgIdStr)) return;
          if (msgIdStr) {
            seenMsgIdsRef.current.add(msgIdStr);
            if (seenMsgIdsRef.current.size > 200) {
              const first = seenMsgIdsRef.current.values().next().value;
              if (first) seenMsgIdsRef.current.delete(first);
            }
          }

          const targetConvId = newMsg.conversation_id;
          const isCurrentlyReading = openRef.current?.id === targetConvId;

          // Acknowledge delivery to sender when receiver device detects incoming message!
          ReceiptService.acknowledgeDelivery(targetConvId, [newMsg.id]).then();

          const preview = newMsg.message_type === 'image' 
            ? '📷 Photo' 
            : (newMsg.message_type === 'audio' ? '🎤 Voice message' : (newMsg.content || 'New message'));
          const timeStr = new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          // Fire local notification if user is outside this chat or app is in background
          if (!isCurrentlyReading) {
            const senderName = newMsg.sender_name || chatsListRef.current.find((c) => c.id === targetConvId)?.name || 'Someone';
            NotificationService.showIncomingMessage({
              title: `Yo!!! ${senderName}`,
              body: preview,
              conversationId: targetConvId
            }).then();

            // Trigger AI Voice Assistant announcement or custom tone!
            VoiceAssistantService.handleIncomingAlert({
              chatId: targetConvId,
              senderName,
              content: preview,
              time: timeStr,
              messageId: newMsg.id ? String(newMsg.id) : undefined
            });
          }

          setChatsList((prev) =>
            prev.map((c) => {
              if (c.id === targetConvId) {
                return {
                  ...c,
                  last: preview,
                  time: timeStr,
                  unread: isCurrentlyReading ? 0 : (c.unread || 0) + 1,
                  typing: false
                };
              }
              return c;
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
  }, [user?.id]);

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

    openRef.current = directChat;
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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Dynamic ambient iOS light orbs for Glassmorphism backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-20 top-10 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="animate-blob absolute right-[-60px] top-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" style={{ animationDelay: "-5s" }} />
        <div className="animate-blob absolute bottom-10 left-1/4 h-80 w-80 rounded-full bg-chart-4/20 blur-3xl" style={{ animationDelay: "-9s" }} />
      </div>

      <main className="relative mx-auto h-screen max-w-md overflow-hidden shadow-2xl border-x border-border flex flex-col justify-between">
        <div className="h-full overflow-y-auto">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }} transition={{ duration: 0.18, ease: "easeOut" }}>
              {tab === "chats" && (
                <ChatsTab 
                  chatsList={chatsList} 
                  archivedIds={archivedIds}
                  lockedIds={lockedIds}
                  favoritesIds={favoritesIds}
                  isDarkGlass={darkGlass}
                  onToggleDarkGlass={toggleDarkGlass}
                  onOpen={(c) => {
                    openRef.current = c;
                    setLocalLastRead(user?.id, c.id);
                    // Reset unread on opening
                    setChatsList(prev => prev.map(item => item.id === c.id ? { ...item, unread: 0 } : item));
                    setOpen(c);
                    if (user && c.id && c.id !== 'shared-direct-room') {
                      supabase.rpc('mark_conversation_read', { target_conversation: c.id }).then();
                      supabase
                        .from('conversation_members')
                        .update({ last_read_at: new Date().toISOString() })
                        .match({ conversation_id: c.id, user_id: user.id })
                        .then();
                    }
                  }} 
                  onNewChat={() => setTab("people")} 
                  onNewGroup={() => setGroupModalOpen(true)}
                  onOpenProfile={() => setProfileModalOpen(true)}
                />
              )}
              {tab === "updates" && (
                <UpdatesHomeScreen
                  currentUserId={user?.id}
                  onOpenStatusViewer={(groupIndex) => {
                    setSelectedStoryGroupIndex(groupIndex);
                    setViewerStoryModalOpen(true);
                  }}
                  onAddStatusText={() => {
                    if (!user) {
                      setAuthOpen(true);
                      return;
                    }
                    setCreateStoryInitialMode('text');
                    setCreateStoryModalOpen(true);
                  }}
                  onAddStatusMedia={() => {
                    if (!user) {
                      setAuthOpen(true);
                      return;
                    }
                    setCreateStoryInitialMode('image');
                    setCreateStoryModalOpen(true);
                  }}
                  onOpenPrivacySettings={() => setPrivacyModalOpen(true)}
                />
              )}
              {tab === "calls" && <CallsTab onStartCall={startCall} />}
              {tab === "people" && <PeopleTab onStartDirectChat={startDirectChat} />}
              {tab === "settings" && (
                <SettingsTab 
                  onOpenAuth={() => setAuthOpen(true)} 
                  onOpenNotifications={() => setGlobalNotifModalOpen(true)} 
                  onOpenProfile={() => setProfileModalOpen(true)}
                  isDarkGlass={darkGlass}
                  onToggleDarkGlass={toggleDarkGlass}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating iOS Glass Bottom Navigation */}
        <nav className="glass-strong absolute inset-x-4 bottom-5 z-20 flex justify-between rounded-[28px] p-1.5 border border-border shadow-2xl backdrop-blur-2xl">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <motion.button 
                key={t.id} 
                whileTap={{ scale: 0.88 }} 
                onClick={() => {
                  HapticsService.light();
                  SoundEffectsService.playTabSwitch();
                  setTab(t.id);
                }}
                className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-3xl py-2 text-[11px] font-semibold cursor-pointer ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
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
              isLocked={lockedIds.includes(open.id)}
              isArchived={archivedIds.includes(open.id)}
              isFavorite={favoritesIds.includes(open.id)}
              onToggleLock={() => toggleLock(open.id)}
              onToggleArchive={() => toggleArchive(open.id)}
              onToggleFavorite={() => toggleFavorite(open.id)}
              onBack={() => {
                if (open) {
                  setLocalLastRead(user?.id, open.id);
                  setChatsList(prev => prev.map(item => item.id === open.id ? { ...item, unread: 0 } : item));
                  if (user && open.id && open.id !== 'shared-direct-room') {
                    supabase.rpc('mark_conversation_read', { target_conversation: open.id }).then();
                  }
                }
                openRef.current = null;
                setOpen(null);
                refreshConversations();
              }} 
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

      {/* Add / Create Status Modal (WhatsApp Toolbar: Text, Photo, Video, Voice) */}
      {user && (
        <AddStatusModal
          isOpen={createStoryModalOpen}
          initialMode={createStoryInitialMode}
          onClose={() => setCreateStoryModalOpen(false)}
          userId={user.id}
          userProfile={{
            display_name: user.display_name || user.username || 'You',
            username: user.username || 'me',
            avatar_url: ''
          }}
          onStatusCreated={() => refreshStatuses()}
        />
      )}

      {/* Full-Screen Status Viewer with Likes & Replies */}
      {viewerStoryModalOpen && statusGroups.length > 0 && (
        <StatusViewerModal
          groups={statusGroups}
          initialGroupIndex={selectedStoryGroupIndex}
          currentUserId={user?.id}
          onClose={() => {
            setViewerStoryModalOpen(false);
            refreshStatuses();
          }}
          onReplyToStatus={(storyAuthorId, _storySnippet, _replyText) => {
            const existing = chatsList.find((c) => c.target_user_id === storyAuthorId || c.id === storyAuthorId);
            if (existing) {
              setOpen(existing);
            }
          }}
        />
      )}

      {/* Global Status Privacy Audience Settings */}
      {user && (
        <StatusPrivacyModal
          isOpen={privacyModalOpen}
          onClose={() => setPrivacyModalOpen(false)}
          userId={user.id}
        />
      )}

      {/* Auth Modal for Supabase user signup & signin */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* User Profile Viewer & Avatar Editor */}
      <ProfileViewerModal
        isOpen={profileModalOpen}
        user={user}
        onClose={() => setProfileModalOpen(false)}
        onUpdateAvatar={async (url) => {
          if (user) {
            await supabase
              .from('profiles')
              .update({ avatar_url: url, updated_at: new Date().toISOString() })
              .eq('id', user.id);
            user.avatar_url = url;
            refreshConversations();
          }
        }}
      />

      {/* Global AI Voice Assistant & Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={globalNotifModalOpen}
        onClose={() => setGlobalNotifModalOpen(false)}
      />

      {/* New Group Creation Modal */}
      <CreateGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onGroupCreated={(newGroupChat) => {
          openRef.current = newGroupChat;
          setOpen(newGroupChat);
          refreshConversations();
        }}
      />
    </div>
  );
}

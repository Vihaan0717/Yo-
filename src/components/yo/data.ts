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
export const chats: Chat[] = [
  { id: "1", name: "Aarav Mehta", handle: "@aarav", hue: 200, last: "Yo!!! are we still on for tonight?", time: "22:14", unread: 3, online: true, typing: true },
  { id: "2", name: "Design Squad", handle: "group · 8", hue: 150, last: "Priya: shipped the new icons 🔥", time: "21:52", unread: 12, online: false },
  { id: "3", name: "Sana Kapoor", handle: "@sana", hue: 330, last: "Voice message · 0:42", time: "20:30", unread: 0, online: true },
  { id: "4", name: "Rahul Verma", handle: "@rahulv", hue: 40, last: "Haha that's wild 😂", time: "Yesterday", unread: 0, online: false },
  { id: "5", name: "Meera Iyer", handle: "@meera", hue: 270, last: "Sent a photo", time: "Yesterday", unread: 1, online: true },
  { id: "6", name: "Weekend Trip", handle: "group · 5", hue: 100, last: "Kabir: tickets booked ✈️", time: "Tue", unread: 0, online: false },
  { id: "7", name: "Dev Patel", handle: "@devp", hue: 15, last: "Pushed to GitHub, check it", time: "Mon", unread: 0, online: false },
];
export const seedMessages = [
  { id: 1, me: false, text: "Yo!!! 👋", time: "22:01" },
  { id: 2, me: true, text: "Heyy! What's up?", time: "22:02" },
  { id: 3, me: false, text: "Just finished the new app design. It's all glass now ✨", time: "22:05" },
  { id: 4, me: true, text: "No way, send it over!", time: "22:06" },
  { id: 5, me: false, text: "Are we still on for tonight?", time: "22:14" },
];
export const calls = [
  { id: "c1", chat: chats[0]!, type: "video", dir: "in", missed: false, time: "Today, 21:10" },
  { id: "c2", chat: chats[2]!, type: "voice", dir: "out", missed: false, time: "Today, 18:42" },
  { id: "c3", chat: chats[3]!, type: "voice", dir: "in", missed: true, time: "Yesterday" },
  { id: "c4", chat: chats[4]!, type: "video", dir: "out", missed: false, time: "Tue" },
  { id: "c5", chat: chats[6]!, type: "voice", dir: "in", missed: true, time: "Mon" },
] as const;

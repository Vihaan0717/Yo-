import type { Chat } from "./data";

export function Avatar({ chat, size = 52 }: { chat: Chat; size?: number }) {
  const initials = chat.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="grid h-full w-full place-items-center rounded-full font-bold text-white shadow-md"
        style={{
          background: `linear-gradient(135deg, oklch(0.68 0.18 ${chat.hue}), oklch(0.48 0.18 ${chat.hue + 35}))`,
          fontSize: size * 0.36
        }}
      >
        {initials}
      </div>
      {chat.online && (
        <span 
          className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#121926] bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.7)]" 
          title="Online"
        />
      )}
    </div>
  );
}

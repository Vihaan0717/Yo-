import { useState } from 'react';
import type { Chat } from "./data";

export function Avatar({ 
  chat, 
  size = 52, 
  avatarUrl,
  onClick
}: { 
  chat?: Partial<Chat>; 
  size?: number; 
  avatarUrl?: string | null;
  onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = avatarUrl || chat?.avatar_url;

  const displayName = chat?.name || "Yo User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "Y";

  const hue = chat?.hue || 210;

  return (
    <div 
      onClick={onClick}
      className={`relative shrink-0 ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform' : ''}`} 
      style={{ width: size, height: size }}
    >
      {resolvedUrl && !imgError ? (
        <img
          src={resolvedUrl}
          alt={displayName}
          onError={() => setImgError(true)}
          className="h-full w-full rounded-full object-cover shadow-md border border-white/10"
        />
      ) : (
        <div
          className="grid h-full w-full place-items-center rounded-full font-bold text-white shadow-md border border-white/10 select-none"
          style={{
            background: `linear-gradient(135deg, oklch(0.68 0.18 ${hue}), oklch(0.48 0.18 ${hue + 35}))`,
            fontSize: size * 0.36
          }}
        >
          {initials}
        </div>
      )}

      {chat?.online && (
        <span 
          className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0b0f19] bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.7)]" 
          title="Online"
        />
      )}
    </div>
  );
}

import React from 'react';

interface DateSeparatorProps {
  timestamp: string;
}

export function formatDateLabel(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Today';

    const now = new Date();
    const isSameYear = date.getFullYear() === now.getFullYear();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffMs = startOfToday.getTime() - startOfTarget.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      ...(isSameYear ? {} : { year: 'numeric' })
    };

    return date.toLocaleDateString(undefined, options);
  } catch {
    return 'Today';
  }
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ timestamp }) => {
  const label = formatDateLabel(timestamp);

  return (
    <div className="flex items-center justify-center my-3 select-none">
      <div className="glass-strong px-3 py-1 rounded-full text-[11px] font-medium text-white/60 border border-white/10 shadow-sm backdrop-blur-md">
        {label}
      </div>
    </div>
  );
};

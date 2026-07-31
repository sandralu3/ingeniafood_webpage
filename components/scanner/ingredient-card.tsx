"use client";

import { cn } from "@/lib/utils";

type IngredientCardProps = {
  name: string;
  label?: string;
  imageUrl?: string | null;
  emoji: string;
  selected?: boolean;
  disabled?: boolean;
  preferEmoji?: boolean;
  onClick?: () => void;
  className?: string;
};

export function IngredientCard({
  name,
  label,
  imageUrl,
  emoji,
  selected = false,
  disabled = false,
  preferEmoji = true,
  onClick,
  className
}: IngredientCardProps) {
  const displayLabel = label ?? name;
  const showImage = !preferEmoji && Boolean(imageUrl);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={displayLabel}
      className={cn(
        "flex h-[78px] w-[68px] flex-shrink-0 cursor-pointer flex-col items-center justify-between rounded-2xl border border-stone-200/80 bg-stone-50/50 p-1.5 shadow-sm shadow-stone-200/30 transition-all hover:border-[#3E5A3A]/40 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60",
        selected && "border-[#3E5A3A]/45 bg-[#3E5A3A]/5 ring-1 ring-[#3E5A3A]/20",
        className
      )}
    >
      <span className="flex flex-1 items-center justify-center">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl!}
            alt=""
            className="h-9 w-9 rounded-full border border-stone-200/50 bg-stone-100 object-cover p-0.5"
            loading="lazy"
          />
        ) : (
          <span className="flex items-center justify-center text-2xl leading-none" aria-hidden>
            {emoji}
          </span>
        )}
      </span>
      <span className="mt-1 w-full truncate text-center text-[10px] font-bold text-stone-700">
        {displayLabel}
      </span>
    </button>
  );
}

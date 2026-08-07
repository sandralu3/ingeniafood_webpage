const ORBIT_EMOJIS = [
  { emoji: "🥚", className: "left-1/2 top-2 -translate-x-1/2", delay: "0s" },
  { emoji: "🍅", className: "right-2 top-1/2 -translate-y-1/2", delay: "0.12s" },
  { emoji: "🥑", className: "bottom-2 left-1/2 -translate-x-1/2", delay: "0.24s" },
  { emoji: "🧀", className: "left-2 top-1/2 -translate-y-1/2", delay: "0.36s" }
] as const;

export function AIAnalyzer() {
  return (
    <div className="flex min-h-[180px] items-center justify-center">
      <div className="oliva-process-analyzer relative flex h-36 w-36 items-center justify-center rounded-full border border-[#d9d2c4] bg-[#f7f5f0]">
        {ORBIT_EMOJIS.map((item) => (
          <span
            key={item.emoji}
            className={`oliva-process-orbit-emoji absolute text-base ${item.className}`}
            style={{ animationDelay: item.delay }}
            aria-hidden
          >
            {item.emoji}
          </span>
        ))}

        <div className="relative z-10 flex flex-col items-center gap-2.5">
          <span
            className="oliva-process-spinner h-7 w-7 rounded-full border-2 border-[#556B2F]/20 border-t-[#556B2F]"
            aria-hidden
          />
          <p className="text-[11px] font-medium tracking-wide text-[#556B2F]">
            Analizando...
          </p>
        </div>
      </div>
    </div>
  );
}

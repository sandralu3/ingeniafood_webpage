import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  "2xs": { root: "gap-0.5 text-[9px]", icon: "h-2 w-2" },
  xs: { root: "gap-0.5 text-[10px]", icon: "h-2.5 w-2.5" },
  sm: { root: "gap-1 text-[11px]", icon: "h-3 w-3" },
  md: { root: "gap-1 text-xs", icon: "h-3.5 w-3.5" }
} as const;

type PremiumLabelSize = keyof typeof SIZE_CLASSES;

type PremiumLabelProps = {
  size?: PremiumLabelSize;
  variant?: "inline" | "badge";
  className?: string;
  showIcon?: boolean;
};

export function PremiumLabel({
  size = "xs",
  variant = "inline",
  className,
  showIcon = true
}: PremiumLabelProps) {
  const sizeClass = SIZE_CLASSES[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium text-amber-700/90",
        sizeClass.root,
        variant === "badge" &&
          "rounded-full border border-amber-200/70 bg-amber-50/40 px-1.5 py-px",
        className
      )}
    >
      {showIcon ? (
        <Crown
          className={cn(sizeClass.icon, "shrink-0 text-amber-600/85")}
          strokeWidth={1.75}
          aria-hidden
        />
      ) : null}
      <span>Premium</span>
    </span>
  );
}

type PremiumRichTextProps = {
  text: string;
  size?: PremiumLabelSize;
  className?: string;
};

export function PremiumRichText({ text, size = "xs", className }: PremiumRichTextProps) {
  const parts = text.split(/(Premium|premium)/g);

  if (parts.length === 1) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, index) =>
        /^premium$/i.test(part) ? (
          <PremiumLabel key={`${part}-${index}`} size={size} />
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </span>
  );
}

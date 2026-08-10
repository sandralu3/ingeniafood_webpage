import { Instagram } from "lucide-react";
import { cn } from "@/lib/utils";

type RecipeInstagramLinkProps = {
  url: string;
  variant?: "pill" | "icon" | "floating";
  className?: string;
};

export function RecipeInstagramLink({
  url,
  variant = "pill",
  className
}: RecipeInstagramLinkProps) {
  if (variant === "icon") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ver en Instagram"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#C13584] shadow-sm transition hover:bg-white",
          className
        )}
      >
        <Instagram className="h-4 w-4" strokeWidth={1.75} />
      </a>
    );
  }

  if (variant === "floating") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ver en Instagram"
        className={cn(
          "absolute bottom-3 left-3 z-[35] inline-flex items-center gap-1 rounded-full border border-white/35 bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-black/65",
          className
        )}
      >
        <Instagram className="h-3 w-3" />
        Ver en Instagram
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[#C13584]/20 bg-[#fdf2f8] px-3 py-1.5 text-xs font-semibold text-[#9d174d] transition hover:border-[#C13584]/35",
        className
      )}
    >
      <Instagram className="h-3.5 w-3.5" />
      Ver en Instagram
    </a>
  );
}

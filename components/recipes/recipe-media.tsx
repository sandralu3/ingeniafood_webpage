import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

export type RecipeMediaVariant = "thumbnail" | "card" | "vertical" | "fill";

type RecipeMediaProps = {
  imageUrl?: string | null;
  /** Cuando es true y no hay imagen, muestra placeholder estilo Short/Reel */
  isSocialVideo?: boolean;
  variant?: RecipeMediaVariant;
  title?: string;
  className?: string;
};

const variantHeights: Record<Exclude<RecipeMediaVariant, "fill">, string> = {
  thumbnail: "h-24",
  card: "h-28",
  vertical: "aspect-[9/16] h-full min-h-[10rem] w-full"
};

export function RecipeMedia({
  imageUrl,
  isSocialVideo = false,
  variant = "card",
  title,
  className
}: RecipeMediaProps) {
  const heightClass =
    variant === "fill" ? "h-full min-h-full w-full" : variantHeights[variant];

  if (imageUrl) {
    return (
      <div className={cn("relative w-full overflow-hidden bg-stone-100", heightClass, className)}>
        <img
          src={imageUrl}
          alt={title ? `Imagen de ${title}` : ""}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (isSocialVideo) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden bg-gradient-to-b from-stone-900 via-stone-800 to-[#2a3618]",
          heightClass,
          className
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.35),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.65)_100%)]" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2.5">
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
            Reel
          </span>
          <span className="text-[10px] font-medium text-white/70">IngeniaFood</span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
            <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
          </div>
        </div>

        {title ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 pt-10">
            <p className="line-clamp-2 text-sm font-bold leading-snug text-white">{title}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-gradient-to-tr from-orange-400 via-amber-400 to-amber-300",
        heightClass,
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.55), transparent 45%), repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 10px)"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/25 via-transparent to-white/10" />

      {title ? (
        <div className="absolute inset-0 flex items-end p-3">
          <p className="line-clamp-3 text-sm font-bold leading-snug tracking-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
            {title}
          </p>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-white/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
            Receta
          </span>
        </div>
      )}
    </div>
  );
}

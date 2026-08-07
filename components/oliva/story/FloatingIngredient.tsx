import { cn } from "@/lib/utils";

type FloatingIngredientProps = {
  emoji: string;
  className?: string;
  /** 0–3 maps to a dedicated CSS travel path */
  pathIndex: 0 | 1 | 2 | 3;
};

export function FloatingIngredient({
  emoji,
  className,
  pathIndex
}: FloatingIngredientProps) {
  return (
    <span
      className={cn(
        "oliva-story-ingredient",
        `oliva-story-ing-${pathIndex}`,
        className
      )}
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}

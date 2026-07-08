import { Coffee, Soup, Utensils } from "lucide-react";
import type { MealType } from "@/lib/plan/constants";
import { cn } from "@/lib/utils";

function inferMealType(title: string, isAirfryer: boolean, isFlourless: boolean): MealType {
  const normalized = title.toLowerCase();
  if (normalized.includes("desayuno") || normalized.includes("overnight") || normalized.includes("bowl matutin")) {
    return "Desayuno";
  }
  if (normalized.includes("cena") || normalized.includes("sopa") || normalized.includes("crema")) {
    return "Cena";
  }
  if (isAirfryer || isFlourless) {
    return "Almuerzo";
  }
  return "Almuerzo";
}

function getPlaceholderStyle(mealType: MealType): { className: string; Icon: typeof Coffee } {
  switch (mealType) {
    case "Desayuno":
      return { className: "bg-amber-50 text-amber-700", Icon: Coffee };
    case "Cena":
      return { className: "bg-indigo-50/70 text-indigo-700", Icon: Soup };
    default:
      return { className: "bg-emerald-50 text-emerald-700", Icon: Utensils };
  }
}

type RecipeCatalogThumbnailProps = {
  title: string;
  imageUrl?: string | null;
  isAirfryer?: boolean;
  isFlourless?: boolean;
  className?: string;
};

export function RecipeCatalogThumbnail({
  title,
  imageUrl,
  isAirfryer = false,
  isFlourless = false,
  className
}: RecipeCatalogThumbnailProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title ? `Imagen de ${title}` : "Imagen de la receta"}
        className={cn("h-full w-full object-cover", className)}
        loading="lazy"
      />
    );
  }

  const mealType = inferMealType(title, isAirfryer, isFlourless);
  const { className: placeholderClassName, Icon } = getPlaceholderStyle(mealType);

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        placeholderClassName,
        className
      )}
      aria-hidden
    >
      <Icon className="h-8 w-8 stroke-[1.75]" />
    </div>
  );
}

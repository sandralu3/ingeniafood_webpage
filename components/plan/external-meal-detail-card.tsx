"use client";

import { Camera, MapPin, Utensils } from "lucide-react";
import {
  inferAdvisoryTone,
  joinAdvisoryMessages,
  RecipeAdvisoryPulseButton
} from "@/components/recipes/recipe-advisory-alert";
import {
  externalMealBadgeLabel,
  type ExternalMealBadge
} from "@/lib/plan/external-meal";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  badge: ExternalMealBadge;
  imageUrl?: string | null;
  calories?: number | null;
  proteinGrams?: number | null;
  mealTypeLabel?: string | null;
  foodLines?: string[];
  recommendations?: string[];
};

/**
 * Vista compacta para comidas fuera: sin pestañas de ingredientes/preparación.
 * Foto solo si el usuario escaneó el plato; registro por texto = sin imagen.
 * Las advertencias se muestran como icono parpadeante sobre la imagen.
 */
export function ExternalMealDetailCard({
  title,
  badge,
  imageUrl,
  calories,
  proteinGrams,
  mealTypeLabel,
  foodLines = [],
  recommendations = []
}: Props) {
  const hasPhoto = Boolean(imageUrl?.trim());
  const BadgeIcon = badge === "escaneado" ? Camera : MapPin;
  const advisoryMessage = joinAdvisoryMessages(recommendations);
  const advisoryTone = inferAdvisoryTone(advisoryMessage);

  return (
    <article className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm">
      {hasPhoto ? (
        <div className="relative h-52 w-full overflow-hidden bg-stone-100">
          <img
            src={imageUrl!}
            alt={title}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          {advisoryMessage ? (
            <RecipeAdvisoryPulseButton message={advisoryMessage} tone={advisoryTone} />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white",
                "bg-black/35 backdrop-blur-sm ring-1 ring-white/20"
              )}
            >
              <BadgeIcon className="h-3 w-3" strokeWidth={2} />
              {externalMealBadgeLabel(badge)}
            </span>
            <h1 className="font-serif text-xl font-semibold leading-snug text-white drop-shadow-sm">
              {title}
            </h1>
          </div>
        </div>
      ) : (
        <div className="relative space-y-3 border-b border-stone-100 bg-gradient-to-br from-stone-50 to-emerald-50/40 px-5 py-6">
          {advisoryMessage ? (
            <RecipeAdvisoryPulseButton message={advisoryMessage} tone={advisoryTone} />
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              "bg-[#4D6638]/10 text-[#4D6638] ring-1 ring-[#4D6638]/15"
            )}
          >
            <BadgeIcon className="h-3 w-3" strokeWidth={2} />
            {externalMealBadgeLabel(badge)}
          </span>
          <h1 className="font-serif text-2xl font-semibold leading-snug text-stone-900">{title}</h1>
          <p className="flex items-center gap-1.5 text-xs text-stone-500">
            <Utensils className="h-3.5 w-3.5" strokeWidth={1.5} />
            Registro por texto · sin foto del plato
          </p>
        </div>
      )}

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {mealTypeLabel ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
              {mealTypeLabel}
            </span>
          ) : null}
          {typeof calories === "number" && calories > 0 ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-100">
              ~{calories} kcal
            </span>
          ) : null}
          {typeof proteinGrams === "number" && proteinGrams > 0 ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-100">
              {proteinGrams}g proteínas
            </span>
          ) : null}
        </div>

        {foodLines.length > 0 ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
              Alimentos
            </p>
            <ul className="mt-2 space-y-1.5">
              {foodLines.map((line) => (
                <li key={line} className="text-sm leading-snug text-stone-700">
                  <span className="mr-1 text-[#4D6638]" aria-hidden>
                    ·
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!advisoryMessage ? (
          <p className="text-sm leading-relaxed text-stone-600">
            Comida registrada (casa o fuera). Las calorías y proteínas se estiman según las porciones
            que confirmaste, para mantener el balance del día.
          </p>
        ) : null}
      </div>
    </article>
  );
}

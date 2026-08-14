"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const DEFAULT_TIPS = [
  "Separa cada alimento con comas (no solo con «y»).",
  "Pon cantidad y unidad: g, ml, taza, cda, unidad.",
  "Di cómo es: casera, sin azúcar, a la plancha, con leche.",
  "Si es una marca o receta especial, nómbrala."
];

const DEFAULT_EXAMPLES = [
  "200 g pechuga a la plancha, 150 g arroz, ensalada",
  "2 galletas caseras sin azúcar",
  "media taza de café negro sin azúcar",
  "1 taza de café con leche",
  "1 arepa de maíz con queso, 1 huevo",
  "1 plátano maduro, 1 cda mantequilla de maní",
  "125 ml avena cocida, 100 ml leche, 1 cda miel",
  "1 yogurt griego natural, 80 g frutos rojos",
  "1 empanada de pollo al horno",
  "150 g yuca cocida, 100 g carne asada",
  "1 rebanada de pan integral, 1 huevo, tomate",
  "1 vaso de jugo de naranja natural sin azúcar"
];

type Props = {
  className?: string;
};

export function OpenTextFoodTipsLink({ className }: Props) {
  const t = useTranslations("Plan");
  const tCommon = useTranslations("Common");
  const [open, setOpen] = useState(false);

  const tips = DEFAULT_TIPS;
  const examples = DEFAULT_EXAMPLES;
  const linkLabel = t.has("openTextTipsLink")
    ? t("openTextTipsLink")
    : "Cómo escribir lo que comí";
  const title = t.has("openTextTipsTitle")
    ? t("openTextTipsTitle")
    : "Cómo escribir los alimentos";
  const intro = t.has("openTextTipsIntro")
    ? t("openTextTipsIntro")
    : "Cuanto más concreto sea el texto, mejor estima la IA las calorías.";
  const examplesLabel = t.has("openTextTipsExamplesLabel")
    ? t("openTextTipsExamplesLabel")
    : "Ejemplos";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "text-left text-[11px] font-semibold text-[#4D6638] underline-offset-2 hover:underline",
          className
        )}
      >
        {linkLabel}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-h-[min(82dvh,40rem)] gap-3 overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{intro}</AlertDialogDescription>
          </AlertDialogHeader>

          <ul className="space-y-1.5 text-[12px] leading-snug text-stone-600">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="mt-0.5 text-[#4D6638]" aria-hidden>
                  ·
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
              {examplesLabel}
            </p>
            <ol className="mt-2 space-y-1.5">
              {examples.map((example, index) => (
                <li
                  key={example}
                  className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-[12px] leading-snug text-stone-800"
                >
                  <span className="mr-1.5 font-bold tabular-nums text-stone-400">
                    {index + 1}.
                  </span>
                  {example}
                </li>
              ))}
            </ol>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>
              {t.has("openTextTipsClose") ? t("openTextTipsClose") : tCommon("cancel")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

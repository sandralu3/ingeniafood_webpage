"use client";

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
import { MEAL_TYPES, type MealType } from "@/lib/plan/constants";
import { getMealTypeIcon } from "@/lib/plan/meal-type-accent";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMealType: MealType;
  dishTitle: string;
  disabled?: boolean;
  onSelect: (mealType: MealType) => void;
};

export function MoveMealSlotDialog({
  open,
  onOpenChange,
  currentMealType,
  dishTitle,
  disabled = false,
  onSelect
}: Props) {
  const t = useTranslations("Plan");
  const tCommon = useTranslations("Common");
  const destinations = MEAL_TYPES.filter((type) => type !== currentMealType);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t.has("moveMealTitle") ? t("moveMealTitle") : "Mover a otro momento"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t.has("moveMealDescription")
              ? t("moveMealDescription", { title: dishTitle })
              : `Elige dónde poner «${dishTitle}».`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-2">
          {destinations.map((mealType) => {
            const Icon = getMealTypeIcon(mealType);
            const label = t(`meals.${mealType}`);
            return (
              <button
                key={mealType}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelect(mealType);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-stone-800 shadow-sm transition",
                  "hover:border-[#4D6638]/40 hover:bg-[#F4F7F0]",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                {t.has("moveMealTo") ? t("moveMealTo", { meal: label }) : label}
              </button>
            );
          })}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>{tCommon("cancel")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

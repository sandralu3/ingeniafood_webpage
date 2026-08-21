"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  Trash2
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  RECIPE_MEAL_TYPES,
  parseRecipeMealType,
  type RecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import { cn } from "@/lib/utils";

/** Tipos editables para el catálogo de Sandra (incluye snack por compatibilidad de filtros). */
const SANDRA_MEAL_TYPE_OPTIONS = RECIPE_MEAL_TYPES.filter((item) =>
  ["desayuno", "almuerzo", "cena", "postre", "snack"].includes(item.id)
);

type Props = {
  recipeId: string;
  initialIngredients: string[];
  initialSteps: string[];
  initialMealType?: string | null;
  disabled?: boolean;
  className?: string;
  onSaved?: (payload: {
    ingredients: string[];
    steps: string[];
    mealType: RecipeMealType;
  }) => void;
};

type StepRow = { id: string; text: string };

function normalizeList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
}

function createStepId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toStepRows(items: string[]): StepRow[] {
  const source = items.length > 0 ? items : [""];
  return source.map((text) => ({ id: createStepId(), text }));
}

function SortableStepRow({
  step,
  index,
  total,
  disabled,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  stepPlaceholder,
  removeAria,
  moveUpAria,
  moveDownAria,
  dragAria
}: {
  step: StepRow;
  index: number;
  total: number;
  disabled: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  stepPlaceholder: string;
  removeAria: string;
  moveUpAria: string;
  moveDownAria: string;
  dragAria: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-1.5 rounded-lg",
        isDragging && "z-10 opacity-90 shadow-md ring-1 ring-[#556B2F]/25"
      )}
    >
      <button
        type="button"
        disabled={disabled}
        className="mt-1.5 touch-none rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 disabled:opacity-40"
        aria-label={dragAria}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" strokeWidth={2} />
      </button>
      <span className="mt-1.5 w-5 shrink-0 text-center text-[10px] font-bold text-[#556B2F]">
        {index + 1}
      </span>
      <textarea
        value={step.text}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={stepPlaceholder}
        rows={2}
        className="min-w-0 flex-1 resize-y rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] leading-snug text-stone-800 outline-none focus:border-[#556B2F] focus:ring-1 focus:ring-[#556B2F]/30 disabled:opacity-60"
      />
      <div className="mt-0.5 flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          disabled={disabled || index === 0}
          onClick={onMoveUp}
          aria-label={moveUpAria}
          className="rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
        >
          <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          disabled={disabled || index >= total - 1}
          onClick={onMoveDown}
          aria-label={moveDownAria}
          className="rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={removeAria}
          className="rounded-md p-1 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export function SandraRecipeContentEditor({
  recipeId,
  initialIngredients,
  initialSteps,
  initialMealType = null,
  disabled = false,
  className,
  onSaved
}: Props) {
  const t = useTranslations("RecipeDetail");
  const dndId = useId();
  const [ingredients, setIngredients] = useState<string[]>(
    initialIngredients.length > 0 ? initialIngredients : [""]
  );
  const [steps, setSteps] = useState<StepRow[]>(() => toStepRows(initialSteps));
  const [mealType, setMealType] = useState<RecipeMealType>(
    () => parseRecipeMealType(initialMealType) ?? "almuerzo"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setIngredients(initialIngredients.length > 0 ? initialIngredients : [""]);
    setSteps(toStepRows(initialSteps));
    setMealType(parseRecipeMealType(initialMealType) ?? "almuerzo");
  }, [initialIngredients, initialSteps, initialMealType, recipeId]);

  const stepIds = useMemo(() => steps.map((step) => step.id), [steps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateIngredient = (index: number, value: string) => {
    setIngredients((current) => current.map((item, i) => (i === index ? value : item)));
  };

  const updateStepText = (id: string, value: string) => {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, text: value } : step))
    );
  };

  const removeIngredient = (index: number) => {
    setIngredients((current) =>
      current.length <= 1 ? [""] : current.filter((_, i) => i !== index)
    );
  };

  const removeStep = (id: string) => {
    setSteps((current) =>
      current.length <= 1
        ? [{ id: createStepId(), text: "" }]
        : current.filter((step) => step.id !== id)
    );
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      return arrayMove(current, index, nextIndex);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps((current) => {
      const oldIndex = current.findIndex((step) => step.id === active.id);
      const newIndex = current.findIndex((step) => step.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    if (isSaving || disabled) return;
    const nextIngredients = normalizeList(ingredients);
    const nextSteps = normalizeList(steps.map((step) => step.text));

    if (nextIngredients.length === 0) {
      setError(t("adminEditNeedIngredients"));
      return;
    }
    if (nextSteps.length === 0) {
      setError(t("adminEditNeedSteps"));
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/update-sandra-recipe-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          ingredients: nextIngredients,
          steps: nextSteps,
          mealType
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        mealType?: string;
      };

      if (!response.ok) {
        setError(payload.error || t("adminEditError"));
        return;
      }

      const savedMealType = parseRecipeMealType(payload.mealType) ?? mealType;
      setIngredients(nextIngredients);
      setSteps(toStepRows(nextSteps));
      setMealType(savedMealType);
      setSuccess(payload.message || t("adminEditSuccess"));
      onSaved?.({
        ingredients: nextIngredients,
        steps: nextSteps,
        mealType: savedMealType
      });
      window.setTimeout(() => setSuccess(null), 2500);
    } catch {
      setError(t("adminEditError"));
    } finally {
      setIsSaving(false);
    }
  };

  const busy = disabled || isSaving;

  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border border-[#556B2F]/20 bg-[#F0F4ED]/50 p-4",
        className
      )}
    >
      <div>
        <h2 className="text-sm font-semibold text-[#3e5219]">{t("adminEditTitle")}</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
          {t("adminEditHint")}
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
          {t("adminEditMealType")}
        </span>
        <select
          value={mealType}
          disabled={busy}
          onChange={(event) => {
            const next = parseRecipeMealType(event.target.value);
            if (next) setMealType(next);
          }}
          className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[12px] font-medium text-stone-800 outline-none focus:border-[#556B2F] focus:ring-1 focus:ring-[#556B2F]/30 disabled:opacity-60"
        >
          {SANDRA_MEAL_TYPE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
            {t("ingredients")}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setIngredients((current) => [...current, ""])}
            className="inline-flex items-center gap-1 rounded-full border border-[#556B2F]/25 bg-white px-2 py-1 text-[10px] font-semibold text-[#3e5219] transition hover:bg-[#eef4e6] disabled:opacity-50"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            {t("adminEditAddIngredient")}
          </button>
        </div>
        <ul className="space-y-1.5">
          {ingredients.map((item, index) => (
            <li key={`ing-${index}`} className="flex items-start gap-1.5">
              <input
                type="text"
                value={item}
                disabled={busy}
                onChange={(event) => updateIngredient(index, event.target.value)}
                placeholder={t("adminEditIngredientPlaceholder")}
                className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] text-stone-800 outline-none focus:border-[#556B2F] focus:ring-1 focus:ring-[#556B2F]/30 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => removeIngredient(index)}
                aria-label={t("adminEditRemoveIngredient")}
                className="mt-0.5 rounded-md p-1.5 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#556B2F]">
              {t("preparation")}
            </p>
            <p className="text-[10px] text-stone-400">
              {t.has("adminEditReorderHint")
                ? t("adminEditReorderHint")
                : "Arrastra el asa o usa ↑ ↓ para cambiar el orden"}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setSteps((current) => [...current, { id: createStepId(), text: "" }])
            }
            className="inline-flex items-center gap-1 rounded-full border border-[#556B2F]/25 bg-white px-2 py-1 text-[10px] font-semibold text-[#3e5219] transition hover:bg-[#eef4e6] disabled:opacity-50"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            {t("adminEditAddStep")}
          </button>
        </div>
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
            <ol className="space-y-1.5">
              {steps.map((step, index) => (
                <SortableStepRow
                  key={step.id}
                  step={step}
                  index={index}
                  total={steps.length}
                  disabled={busy}
                  onChange={(value) => updateStepText(step.id, value)}
                  onRemove={() => removeStep(step.id)}
                  onMoveUp={() => moveStep(index, -1)}
                  onMoveDown={() => moveStep(index, 1)}
                  stepPlaceholder={t("adminEditStepPlaceholder")}
                  removeAria={t("adminEditRemoveStep")}
                  moveUpAria={
                    t.has("adminEditMoveStepUp")
                      ? t("adminEditMoveStepUp")
                      : "Subir paso"
                  }
                  moveDownAria={
                    t.has("adminEditMoveStepDown")
                      ? t("adminEditMoveStepDown")
                      : "Bajar paso"
                  }
                  dragAria={
                    t.has("adminEditDragStep")
                      ? t("adminEditDragStep")
                      : "Arrastrar para reordenar"
                  }
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {success ? <p className="text-xs text-[#3e5219]">{success}</p> : null}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={busy}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSaving ? t("adminEditSaving") : t("adminEditSave")}
      </button>
    </section>
  );
}

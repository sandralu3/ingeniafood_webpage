"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { type CSSProperties, type ReactNode, useCallback, useMemo, useState } from "react";
import type { MealType, WeekDay } from "@/lib/plan/constants";
import { cn } from "@/lib/utils";

export type PlanSlotDragData = {
  dayLabel: WeekDay;
  mealType: MealType;
  planEntryId: string;
  title: string;
  imageUrl?: string | null;
};

export function planSlotDroppableId(dayLabel: WeekDay, mealType: MealType): string {
  return `slot:${dayLabel}:${mealType}`;
}

export function parsePlanSlotDroppableId(
  id: string | number
): { dayLabel: WeekDay; mealType: MealType } | null {
  const raw = String(id);
  if (!raw.startsWith("slot:")) return null;
  const parts = raw.split(":");
  if (parts.length !== 3) return null;
  return {
    dayLabel: parts[1] as WeekDay,
    mealType: parts[2] as MealType
  };
}

/** Evita que Cambiar / Quitar inicien el drag. Los enlaces sí permiten arrastrar (como en Hoy). */
function isActionControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, input, textarea, select, [data-no-dnd="true"]'));
}

class PlanPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) => {
        if (!nativeEvent.isPrimary || nativeEvent.button !== 0) return false;
        if (isActionControlTarget(nativeEvent.target)) return false;
        return true;
      }
    }
  ];
}

class PlanTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent }: { nativeEvent: TouchEvent }) => {
        if (isActionControlTarget(nativeEvent.target)) return false;
        return true;
      }
    }
  ];
}

const planCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return closestCorners(args);
};

export function PlanMealDroppable({
  dayLabel,
  mealType,
  disabled = false,
  className,
  children
}: {
  dayLabel: WeekDay;
  mealType: MealType;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = planSlotDroppableId(dayLabel, mealType);
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled,
    data: { dayLabel, mealType }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl transition-[box-shadow,background-color,ring] duration-150",
        isOver && !disabled
          ? "bg-[#3E5A3A]/10 ring-2 ring-[#3E5A3A]/50 ring-offset-1 ring-offset-[#FFF8F1]"
          : null,
        className
      )}
    >
      {children}
    </div>
  );
}

export function PlanMealDraggable({
  data,
  disabled = false,
  className,
  children
}: {
  data: PlanSlotDragData;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `meal:${data.planEntryId}`,
    disabled,
    data
  });

  // Solo opacidad: el DragOverlay mueve la pieza visual.
  const style: CSSProperties | undefined = isDragging ? { opacity: 0.35 } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-manipulation",
        !disabled ? "cursor-grab active:cursor-grabbing" : null,
        className
      )}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

type PlanSlotsDndProviderProps = {
  disabled?: boolean;
  onMove: (from: PlanSlotDragData, to: { dayLabel: WeekDay; mealType: MealType }) => void;
  overlay?: (active: PlanSlotDragData | null) => ReactNode;
  children: ReactNode;
};

export function PlanSlotsDndProvider({
  disabled = false,
  onMove,
  overlay,
  children
}: PlanSlotsDndProviderProps) {
  const [activeDrag, setActiveDrag] = useState<PlanSlotDragData | null>(null);

  const sensors = useSensors(
    useSensor(PlanPointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(PlanTouchSensor, {
      activationConstraint: { delay: 160, tolerance: 10 }
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as PlanSlotDragData | undefined;
    if (data?.planEntryId) {
      setActiveDrag(data);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      if (disabled) return;

      const from = event.active.data.current as PlanSlotDragData | undefined;
      if (!from?.planEntryId || !event.over) return;

      const overData = event.over.data.current as
        | Partial<PlanSlotDragData>
        | { dayLabel?: WeekDay; mealType?: MealType }
        | undefined;

      const toFromData =
        overData?.dayLabel && overData?.mealType
          ? { dayLabel: overData.dayLabel, mealType: overData.mealType }
          : null;
      const to = toFromData ?? parsePlanSlotDroppableId(event.over.id);

      if (!to) return;
      if (from.dayLabel === to.dayLabel && from.mealType === to.mealType) return;

      onMove(from, to);
    },
    [disabled, onMove]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
  }, []);

  const overlayNode = useMemo(
    () => (overlay ? overlay(activeDrag) : null),
    [activeDrag, overlay]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={planCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null} zIndex={80}>
        {activeDrag && overlayNode ? (
          <div className="cursor-grabbing rounded-xl shadow-xl shadow-stone-900/25 ring-2 ring-[#3E5A3A]/35">
            {overlayNode}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

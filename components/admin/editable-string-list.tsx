"use client";

import { Plus, Trash2 } from "lucide-react";

type EditableStringListProps = {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
};

export function EditableStringList({
  label,
  items,
  onChange,
  placeholder
}: EditableStringListProps) {
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const addItem = () => {
    onChange([...items, ""]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-stone-700">{label}</label>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-[#4C6B3F]/35 focus:ring-2 focus:ring-[#4C6B3F]/10"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              aria-label={`Eliminar ${label.toLowerCase()}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

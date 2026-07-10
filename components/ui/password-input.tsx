"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className, disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn(
          "h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 pr-11 text-sm text-[#1F2937] outline-none transition placeholder:text-stone-400 focus:border-[#556B2F]/55 focus:ring-2 focus:ring-[#556B2F]/15 disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-stone-400 transition hover:text-stone-600 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
      </button>
    </div>
  );
}

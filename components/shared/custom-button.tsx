import * as React from "react";
import { cn } from "@/lib/utils";

type CustomButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function CustomButton({ className, ...props }: CustomButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-brand-green-dark px-4 py-2 text-sm font-medium text-brand-cream transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

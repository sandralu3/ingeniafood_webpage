import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-brand-green-light/40 bg-white px-3 py-2 text-sm text-sv-on-surface placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-dark/30 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };

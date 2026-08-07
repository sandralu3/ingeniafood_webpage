import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CTAButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md";
  className?: string;
};

export function CTAButton({
  children,
  href = "#",
  variant = "primary",
  size = "md",
  className
}: CTAButtonProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors duration-200",
        size === "sm" && "rounded-lg px-4 py-2 text-sm",
        size === "md" && "rounded-xl px-7 py-3.5 text-base",
        variant === "primary" &&
          "bg-[#8f4c35] text-white hover:bg-[#7a402d]",
        variant === "secondary" &&
          "bg-[#e9967a] text-[#682e19] hover:bg-[#ffb59c]",
        variant === "outline" &&
          "border border-[#d9d2c4] bg-transparent text-[#1b1c19] hover:border-[#86736d] hover:bg-[#f5f3ee]",
        className
      )}
    >
      {children}
    </a>
  );
}

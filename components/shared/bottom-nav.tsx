"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Home, ScanLine, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app-recetas", label: "Home", icon: Home },
  { href: "/app-recetas/scanner", label: "AI Scan", icon: ScanLine, highlight: true },
  { href: "/app-recetas/recipes", label: "Saved", icon: Bookmark },
  { href: "/app-recetas/profile", label: "Profile", icon: UserRound }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around rounded-t-[1.2rem] border-t border-sv-outline-variant/20 bg-sv-surface/90 px-2.5 pb-2 pt-1 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur-2xl supports-[backdrop-filter]:bg-sv-surface/85">
      {navItems.map(({ href, label, icon: Icon, highlight }) => {
        const isActive =
          href === "/app-recetas"
            ? pathname === "/app-recetas"
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center px-2.5 py-0.5 transition-all duration-200",
              "scale-95 active:scale-90",
              isActive && highlight
                ? "rounded-full bg-sv-secondary-container px-3 py-1 text-sv-primary"
                : isActive
                  ? "text-sv-primary"
                  : "text-stone-400 hover:text-sv-primary-container"
            )}
          >
            <Icon
              className={cn(
                "mb-0.5 h-4 w-4",
                highlight && "h-5 w-5",
                isActive && highlight && "text-sv-primary"
              )}
              strokeWidth={isActive && highlight ? 2.25 : 1.75}
            />
            <span className="font-medium text-[8px] uppercase tracking-[0.12em] leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

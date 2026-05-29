"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Home, ScanLine, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app-recetas", label: "Home", icon: Home },
  { href: "/app-recetas/scanner", label: "Escáner Sandra", icon: ScanLine, highlight: true },
  { href: "/app-recetas/recipes", label: "Saved", icon: Bookmark },
  { href: "/app-recetas/profile", label: "Profile", icon: UserRound }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around rounded-t-[1.2rem] border-t border-sv-outline-variant/15 bg-sv-surface/92 px-2 pb-2.5 pt-1.5 shadow-[0_-6px_20px_rgba(0,0,0,0.03)] backdrop-blur-2xl supports-[backdrop-filter]:bg-sv-surface/88">
      {navItems.map(({ href, label, icon: Icon, highlight }) => {
        const isActive =
          href === "/app-recetas"
            ? pathname === "/app-recetas"
            : pathname === href || pathname.startsWith(`${href}/`);

        const iconStroke = isActive && highlight ? 1.75 : 1.35;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center px-2 py-0.5 transition-all duration-200",
              isActive && highlight
                ? "rounded-full bg-sv-secondary-container/80 px-3 py-1 text-sv-primary"
                : isActive
                  ? "text-sv-primary"
                  : "text-stone-400/90 hover:text-stone-500"
            )}
          >
            <Icon
              className={cn("mb-0.5 h-[18px] w-[18px]", highlight && "h-5 w-5")}
              strokeWidth={iconStroke}
            />
            <span className="text-[10px] font-normal uppercase tracking-[0.1em] leading-none text-inherit opacity-90">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

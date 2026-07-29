"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Bookmark,
  CalendarDays,
  ScanLine,
  Sparkles,
  UserRound,
  type LucideIcon
} from "lucide-react";
import { prefetchHoyPageData } from "@/lib/gamification/prefetch-hoy-page-data";
import { prefetchInstagramCatalog } from "@/lib/recipes/prefetch-instagram-catalog";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { useScannerReset } from "@/lib/scanner/scanner-reset-context";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  labelKey: "hoy" | "plan" | "scanner" | "saved" | "profile";
  icon: LucideIcon;
  highlight?: boolean;
};

const navItems: NavItem[] = [
  { href: APP_ROUTES.hoy, labelKey: "hoy", icon: Sparkles },
  { href: APP_ROUTES.plan, labelKey: "plan", icon: CalendarDays },
  { href: APP_ROUTES.scanner, labelKey: "scanner", icon: ScanLine, highlight: true },
  { href: APP_ROUTES.guardadas, labelKey: "saved", icon: Bookmark },
  { href: APP_ROUTES.perfil, labelKey: "profile", icon: UserRound }
];

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === APP_ROUTES.hoy) {
    return pathname === APP_ROUTES.hoy || pathname === APP_ROUTES.root;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function prefetchNavTarget(href: string) {
  if (href === APP_ROUTES.hoy) {
    void prefetchHoyPageData();
    return;
  }

  if (href === APP_ROUTES.scanner) {
    void prefetchInstagramCatalog();
  }
}

export function BottomNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const scannerReset = useScannerReset();

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string, isActive: boolean) => {
    if (href !== APP_ROUTES.scanner || !isActive) {
      return;
    }

    event.preventDefault();
    scannerReset?.requestScannerReset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around rounded-t-[1.25rem] border-t border-sv-outline-variant/15 bg-sv-surface/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur-2xl supports-[backdrop-filter]:bg-sv-surface/90">
      {navItems.map(({ href, labelKey, icon: Icon, highlight }) => {
        const isActive = isNavItemActive(pathname, href);
        const iconStroke = isActive && highlight ? 1.85 : 1.4;

        return (
          <Link
            key={href}
            href={href}
            onClick={(event) => handleNavClick(event, href, isActive)}
            onMouseEnter={() => prefetchNavTarget(href)}
            onTouchStart={() => prefetchNavTarget(href)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 py-0.5 transition-all duration-200",
              isActive && highlight
                ? "-mt-2 rounded-2xl bg-gradient-to-b from-[#dce7c3] to-[#c5d4a8]/90 px-1.5 py-1.5 text-sv-primary shadow-sm"
                : isActive
                  ? "text-sv-primary"
                  : "text-stone-400/90 hover:text-stone-500"
            )}
          >
            <Icon
              className={cn("mb-0.5 h-[17px] w-[17px]", highlight && isActive && "h-[19px] w-[19px]")}
              strokeWidth={iconStroke}
            />
            <span className="w-full truncate text-center text-[9px] font-medium uppercase tracking-[0.08em] leading-none text-inherit">
              {t(labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

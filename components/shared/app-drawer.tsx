"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  LogOut,
  ScanLine,
  Sparkles,
  Target,
  UserRound,
  X,
  type LucideIcon
} from "lucide-react";
import { signOutUser } from "@/lib/auth/sign-out";
import { IngeniaFoodLogo } from "@/components/shared/ingenia-food-logo";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { useScannerReset } from "@/lib/scanner/scanner-reset-context";
import { cn } from "@/lib/utils";

type AppDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type DrawerItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const DRAWER_TRANSITION_MS = 300;
const DRAWER_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

const drawerItems: DrawerItem[] = [
  { href: APP_ROUTES.hoy, label: "Hoy", icon: Sparkles },
  { href: APP_ROUTES.plan, label: "Plan semanal", icon: CalendarDays },
  { href: APP_ROUTES.retos, label: "Retos", icon: Target },
  { href: APP_ROUTES.scanner, label: "Escáner", icon: ScanLine },
  { href: APP_ROUTES.guardadas, label: "Guardadas", icon: Bookmark },
  { href: APP_ROUTES.perfil, label: "Perfil", icon: UserRound }
];

function isDrawerItemActive(pathname: string, href: string): boolean {
  if (href === APP_ROUTES.hoy) {
    return pathname === APP_ROUTES.hoy || pathname === APP_ROUTES.root;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppDrawer({ open, onClose }: AppDrawerProps) {
  const pathname = usePathname();
  const scannerReset = useScannerReset();
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    onClose();

    try {
      await signOutUser("/login");
    } catch (error) {
      console.error("[drawer] Error cerrando sesión:", error);
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setIsVisible(false);

      let frame2 = 0;
      const frame1 = window.requestAnimationFrame(() => {
        frame2 = window.requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(frame1);
        if (frame2) window.cancelAnimationFrame(frame2);
      };
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => setIsMounted(false), DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!isMounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[170]",
        isVisible ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <button
        type="button"
        aria-label="Cerrar menú"
        className={cn(
          "absolute inset-0 bg-black/25 backdrop-blur-[1px]",
          "transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionTimingFunction: DRAWER_EASING }}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className={cn(
          "absolute left-0 top-0 flex h-full w-[min(18rem,85vw)] flex-col border-r border-stone-200/80 bg-white shadow-2xl",
          "transition-transform duration-300 will-change-transform",
          isVisible ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ transitionTimingFunction: DRAWER_EASING }}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <IngeniaFoodLogo variant="drawer" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {drawerItems.map(({ href, label, icon: Icon }) => {
            const isActive = isDrawerItemActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                onClick={(event) => {
                  onClose();
                  if (href === APP_ROUTES.scanner && isActive) {
                    event.preventDefault();
                    scannerReset?.requestScannerReset();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-[background-color,color] duration-200",
                  isActive
                    ? "bg-gradient-to-r from-[#dce7c3] to-amber-50 text-[#3e5219] shadow-sm"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-stone-100 px-3 py-4">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, ScanLine } from "lucide-react";
import { useSandraAdminGate } from "@/hooks/use-sandra-admin-gate";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import type {
  AdminUserRecipeStats,
  AdminUserRecipeStatsSummary
} from "@/lib/admin/user-recipe-stats";
import { cn } from "@/lib/utils";

function getInitials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function AdminUsoRecetasPage() {
  const authState = useSandraAdminGate("/admin/uso-recetas");
  const [users, setUsers] = useState<AdminUserRecipeStats[]>([]);
  const [summary, setSummary] = useState<AdminUserRecipeStatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyScanner, setOnlyScanner] = useState(false);
  const [onlyWithRecipes, setOnlyWithRecipes] = useState(false);
  const [onlyUsed24h, setOnlyUsed24h] = useState(false);
  const [onlyTesters, setOnlyTesters] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/user-recipe-stats");
      const payload = (await response.json()) as {
        users?: AdminUserRecipeStats[];
        summary?: AdminUserRecipeStatsSummary;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar el uso de recetas.");
      }
      setUsers(payload.users ?? []);
      setSummary(payload.summary ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al cargar.");
      setUsers([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState !== "allowed") return;
    void loadStats();
  }, [authState, loadStats]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (onlyScanner && !user.hasUsedScanner) return false;
      if (onlyWithRecipes && user.totalLibraryRecipes === 0) return false;
      if (onlyUsed24h && !user.hasUsed24hPass) return false;
      if (onlyTesters && !user.isTester) return false;
      if (!q) return true;
      return (
        user.email.toLowerCase().includes(q) ||
        (user.fullName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [users, search, onlyScanner, onlyWithRecipes, onlyUsed24h, onlyTesters]);

  if (authState === "loading") {
    return (
      <section className="flex min-h-[40vh] items-center justify-center px-4 py-10">
        <p className="inline-flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Comprobando acceso…
        </p>
      </section>
    );
  }

  if (authState === "denied") {
    return (
      <section className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-lg font-semibold text-stone-900">Acceso restringido</h1>
        <p className="mt-2 text-sm text-stone-500">
          Esta sección solo está disponible para la administradora de IngeniaFood.
        </p>
        <Link
          href={APP_ROUTES.hoy}
          className="mt-5 inline-flex rounded-full bg-[#4C6B3F] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Volver a Hoy
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-24">
      <div className="flex items-center gap-3">
        <Link
          href={APP_ROUTES.admin}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600"
          aria-label="Volver a Administración"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4C6B3F]/80">
            Admin · Uso
          </p>
          <h1 className="text-xl font-semibold text-stone-900">Recetas por usuario</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Cuántas tienen, si son propias o del escáner, y si lo han usado.
          </p>
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <SummaryCard label="Con recetas" value={String(summary.usersWithRecipes)} />
          <SummaryCard label="Usaron escáner" value={String(summary.usersWhoUsedScanner)} />
          <SummaryCard label="Usaron pase 24h" value={String(summary.usersWhoUsed24hPass)} />
          <SummaryCard label="Propias" value={String(summary.totalOwn)} />
          <SummaryCard
            label="Escáner"
            value={String(summary.totalPantryScanner + summary.totalPlateScanner)}
          />
        </div>
      ) : null}

      <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm text-stone-800 outline-none focus:border-[#4C6B3F]/40"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={onlyWithRecipes}
            onClick={() => setOnlyWithRecipes((value) => !value)}
            label="Solo con recetas"
          />
          <FilterChip
            active={onlyScanner}
            onClick={() => setOnlyScanner((value) => !value)}
            label="Solo usaron escáner"
          />
          <FilterChip
            active={onlyTesters}
            onClick={() => setOnlyTesters((value) => !value)}
            label="Solo testers"
          />
          <FilterChip
            active={onlyUsed24h}
            onClick={() => setOnlyUsed24h((value) => !value)}
            label="Solo usaron pase 24h"
          />
        </div>
        <p className="text-[11px] leading-relaxed text-stone-500">
          <strong className="font-semibold text-stone-600">Propias</strong> = para cocinar
          (Mías). <strong className="font-semibold text-stone-600">Escáner despensa</strong> =
          generadas desde el Escáner.{" "}
          <strong className="font-semibold text-stone-600">Escáner plato</strong> = comida fuera
          por foto. <strong className="font-semibold text-stone-600">Fuera texto</strong> =
          registro rápido.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando estadísticas…
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500">
          No hay usuarios con estos filtros.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((user) => (
            <li
              key={user.userId}
              className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0F4ED] text-xs font-bold text-[#4C6B3F]">
                  {getInitials(user.fullName, user.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {user.fullName?.trim() || "Sin nombre"}
                    </p>
                    {user.isTester ? (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        Tester
                      </span>
                    ) : null}
                    {user.isPremium ? (
                      <span className="rounded-full bg-[#F0F4ED] px-1.5 py-0.5 text-[10px] font-semibold text-[#4C6B3F]">
                        Premium
                      </span>
                    ) : null}
                    {user.hasUsed24hPass ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          user.pass24hStatus === "active"
                            ? "bg-[#F0F4ED] text-[#3e5219]"
                            : "bg-amber-50 text-amber-900"
                        )}
                      >
                        {user.pass24hStatus === "active" ? "Pase 24h activo" : "Pase 24h usado"}
                        {user.redeemedCode ? ` · ${user.redeemedCode}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-stone-500">{user.email}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatPill
                      label="Total"
                      value={user.totalLibraryRecipes}
                      tone="strong"
                    />
                    <StatPill label="Propias" value={user.ownRecipes} />
                    <StatPill
                      label="Escáner despensa"
                      value={user.pantryScannerRecipes}
                    />
                    <StatPill label="Escáner plato" value={user.plateScannerRecipes} />
                    <StatPill label="Fuera texto" value={user.outsideTextRecipes} />
                    {user.scannerDrafts > 0 ? (
                      <StatPill label="Borradores" value={user.scannerDrafts} />
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                        user.hasUsedScanner
                          ? "bg-[#F0F4ED] text-[#3e5219]"
                          : "bg-stone-100 text-stone-500"
                      )}
                    >
                      <ScanLine className="h-3 w-3" />
                      {user.hasUsedScanner ? "Sí usó escáner" : "No usó escáner"}
                    </span>
                    <span className="text-stone-500">
                      Escaneos hoy: {user.scansUsedToday}
                    </span>
                    {user.otherOwnRecipes > 0 ? (
                      <span className="text-stone-500">
                        Otras propias: {user.otherOwnRecipes}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#4C6B3F]/15 bg-[#F7F9F4] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#4C6B3F]/70">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
        active
          ? "border-[#4C6B3F] bg-[#4C6B3F] text-white"
          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
      )}
    >
      {label}
    </button>
  );
}

function StatPill({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: number;
  tone?: "default" | "strong";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        tone === "strong"
          ? "bg-stone-800 text-white"
          : value > 0
            ? "bg-stone-100 text-stone-700"
            : "bg-stone-50 text-stone-400"
      )}
    >
      {label} <span className="tabular-nums">{value}</span>
    </span>
  );
}

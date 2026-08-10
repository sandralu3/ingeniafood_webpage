"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Trash2, Users } from "lucide-react";
import type { AdminPass24hStatus, AdminUserListItem } from "@/lib/admin/users-admin";
import { MAX_DAILY_SCAN_LIMIT } from "@/lib/admin/users-admin";
import { PremiumLabel, PremiumRichText } from "@/components/premium/premium-label";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { useSandraAdminGate } from "@/hooks/use-sandra-admin-gate";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

function getInitials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function pass24hLabel(status: AdminPass24hStatus): string {
  switch (status) {
    case "active":
      return "Activo";
    case "expired":
      return "Usado (caducado)";
    case "available":
      return "Disponible (sin activar)";
    default:
      return "No usado";
  }
}

function formatPassExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function AdminUsuariosPage() {
  const authState = useSandraAdminGate("/admin/usuarios");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [draftLimits, setDraftLimits] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingPremiumUserId, setSavingPremiumUserId] = useState<string | null>(null);
  const [savingTesterUserId, setSavingTesterUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userPendingDelete, setUserPendingDelete] = useState<AdminUserListItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [onlyTesters, setOnlyTesters] = useState(false);
  const [onlyUsed24h, setOnlyUsed24h] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/users");
      const payload = (await response.json()) as {
        users?: AdminUserListItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar los usuarios.");
      }

      const nextUsers = payload.users ?? [];
      setUsers(nextUsers);
      setDraftLimits(
        Object.fromEntries(
          nextUsers.map((user) => [
            user.id,
            user.unlimitedScans ? "∞" : String(user.dailyScanLimit)
          ])
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al cargar usuarios.");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState !== "allowed") return;
    void loadUsers();
  }, [authState, loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (onlyTesters && !user.isTester && !user.unlimitedScans) return false;
      if (onlyUsed24h && !user.hasUsed24hPass) return false;
      return true;
    });
  }, [users, onlyTesters, onlyUsed24h]);

  const used24hCount = useMemo(
    () => users.filter((user) => user.hasUsed24hPass).length,
    [users]
  );
  const testerCount = useMemo(
    () => users.filter((user) => user.isTester).length,
    [users]
  );

  const handleTogglePremium = async (userId: string, nextValue: boolean) => {
    const user = users.find((item) => item.id === userId);
    if (!user || user.unlimitedScans) return;

    setSavingPremiumUserId(userId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPremium: nextValue })
      });

      const payload = (await response.json()) as {
        user?: AdminUserListItem;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo actualizar Premium.");
      }

      if (payload.user) {
        setUsers((current) =>
          current.map((item) => (item.id === userId ? payload.user! : item))
        );
      }

      setSuccessMessage(
        nextValue ? "Usuario marcado como Premium." : "Premium desactivado para el usuario."
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al guardar Premium.");
    } finally {
      setSavingPremiumUserId(null);
    }
  };

  const handleToggleTester = async (userId: string, nextValue: boolean) => {
    const user = users.find((item) => item.id === userId);
    if (!user) return;

    setSavingTesterUserId(userId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTester: nextValue })
      });

      const payload = (await response.json()) as {
        user?: AdminUserListItem;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo actualizar el estado de tester.");
      }

      if (payload.user) {
        setUsers((current) =>
          current.map((item) => (item.id === userId ? payload.user! : item))
        );
      }

      setSuccessMessage(
        nextValue
          ? "Usuario marcado como tester (Premium / Paddle visibles)."
          : "Usuario ya no es tester (sin acceso a Premium / Paddle)."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al guardar el estado de tester."
      );
    } finally {
      setSavingTesterUserId(null);
    }
  };

  const handleSaveLimit = async (userId: string) => {
    const user = users.find((item) => item.id === userId);
    if (!user || user.unlimitedScans) return;

    const parsed = Number(draftLimits[userId]);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_DAILY_SCAN_LIMIT) {
      setErrorMessage(`El límite debe ser un número entero entre 0 y ${MAX_DAILY_SCAN_LIMIT}.`);
      return;
    }

    setSavingUserId(userId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyScanLimit: parsed })
      });

      const payload = (await response.json()) as {
        user?: AdminUserListItem;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo guardar el límite.");
      }

      if (payload.user) {
        setUsers((current) =>
          current.map((item) => (item.id === userId ? payload.user! : item))
        );
        setDraftLimits((current) => ({
          ...current,
          [userId]: String(payload.user!.dailyScanLimit)
        }));
      }

      setSuccessMessage("Límite diario actualizado.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userPendingDelete) return;

    const userId = userPendingDelete.id;
    setDeletingUserId(userId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as {
        deletedUser?: { id: string; email: string };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar el usuario.");
      }

      setUsers((current) => current.filter((item) => item.id !== userId));
      setDraftLimits((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
      setSuccessMessage(
        `Cuenta eliminada: ${payload.deletedUser?.email ?? userPendingDelete.email}.`
      );
      setUserPendingDelete(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al eliminar.");
    } finally {
      setDeletingUserId(null);
    }
  };

  if (authState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-4">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando acceso de administración...
        </div>
      </main>
    );
  }

  if (authState === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-4">
        <section className="max-w-md rounded-3xl border border-stone-100 bg-white p-6 text-center shadow-sm">
          <h1 className="font-serif text-xl font-semibold text-stone-900">Acceso restringido</h1>
          <p className="mt-2 text-sm text-stone-500">
            Este panel solo está disponible para la administradora de IngeniaFood.
          </p>
          <Link
            href={APP_ROUTES.hoy}
            className="mt-5 inline-flex rounded-full bg-[#4c6633] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Volver a la app
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF9F6] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={APP_ROUTES.admin}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-[#4c6633]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Administración
            </Link>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800/75">
              Admin · IngeniaFood
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-stone-900 sm:text-3xl">
              Usuarios
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Consulta cuentas, testers, quién usó el pase 24h, escaneos diarios y{" "}
              <PremiumLabel size="xs" />.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex items-center gap-2 rounded-2xl border border-[#4c6633]/15 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
              <Users className="h-4 w-4 text-[#4c6633]" />
              {users.length} usuario{users.length === 1 ? "" : "s"}
            </div>
            <p className="text-xs text-stone-500">
              {testerCount} tester{testerCount === 1 ? "" : "s"} · {used24hCount} usaron pase 24h
            </p>
          </div>
        </header>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <PremiumRichText text={errorMessage} size="xs" />
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-[#dce7c3] bg-[#f4f7ed] px-4 py-3 text-sm text-[#3e5219]">
            <PremiumRichText text={successMessage} size="xs" />
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOnlyTesters((value) => !value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
              onlyTesters
                ? "border-amber-700 bg-amber-800 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            )}
          >
            Solo testers
          </button>
          <button
            type="button"
            onClick={() => setOnlyUsed24h((value) => !value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
              onlyUsed24h
                ? "border-[#4c6633] bg-[#4c6633] text-white"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            )}
          >
            Solo usaron pase 24h
          </button>
        </div>

        <section className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando usuarios...
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-stone-500">
              No hay usuarios con estos filtros.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/70 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    <th className="px-5 py-3.5">Usuario</th>
                    <th className="px-5 py-3.5">Correo</th>
                    <th className="px-5 py-3.5">Hoy</th>
                    <th className="px-5 py-3.5">Tester</th>
                    <th className="px-5 py-3.5">Pase 24h</th>
                    <th className="px-5 py-3.5">
                      <PremiumLabel size="xs" />
                    </th>
                    <th className="px-5 py-3.5">Escaneos / día</th>
                    <th className="px-5 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isSaving = savingUserId === user.id;
                    const isSavingPremium = savingPremiumUserId === user.id;
                    const isSavingTester = savingTesterUserId === user.id;
                    const premiumStatusLabel = user.isPremium
                      ? "Suscriptor"
                      : user.premiumTrialRemaining > 0
                        ? "Prueba activa"
                        : user.premiumTrialClaimed
                          ? "Prueba usada"
                          : "Free";

                    return (
                      <tr key={user.id} className="border-b border-stone-50 last:border-none">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dce7c3]/50 text-xs font-semibold text-[#3e5219]">
                              {getInitials(user.fullName, user.email)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-stone-900">
                                {user.fullName?.trim() || "Sin nombre"}
                              </p>
                              <p className="text-xs text-stone-400">
                                Alta{" "}
                                {new Date(user.createdAt).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-stone-600">{user.email}</td>
                        <td className="px-5 py-4">
                          {user.unlimitedScans ? (
                            <span className="rounded-full bg-[#f4f7ed] px-2.5 py-1 text-xs font-semibold text-[#3e5219]">
                              Ilimitado
                            </span>
                          ) : (
                            <span className="text-stone-600">
                              {user.scansUsedToday} usados · {user.scansRemainingToday} restantes
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {user.unlimitedScans ? (
                            <span className="rounded-full bg-[#eef4e6] px-2.5 py-1 text-[10px] font-semibold text-[#3e5219]">
                              Admin
                            </span>
                          ) : (
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={user.isTester}
                                disabled={isSavingTester}
                                onChange={(event) =>
                                  void handleToggleTester(user.id, event.target.checked)
                                }
                                className="h-4 w-4 rounded border-stone-300 text-[#556B2F] focus:ring-[#556B2F]/30"
                              />
                              <span className="text-xs font-medium text-stone-700">
                                {isSavingTester
                                  ? "Guardando…"
                                  : user.isTester
                                    ? "Sí"
                                    : "No"}
                              </span>
                            </label>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                "w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                user.pass24hStatus === "active"
                                  ? "bg-[#eef4e6] text-[#3e5219]"
                                  : user.pass24hStatus === "expired"
                                    ? "bg-amber-50 text-amber-900"
                                    : user.pass24hStatus === "available"
                                      ? "bg-sky-50 text-sky-900"
                                      : "bg-stone-100 text-stone-500"
                              )}
                            >
                              {pass24hLabel(user.pass24hStatus)}
                            </span>
                            {user.redeemedCode ? (
                              <span className="text-[10px] text-stone-500">
                                Código: {user.redeemedCode}
                              </span>
                            ) : null}
                            {user.pass24hStatus === "active" && user.premiumExpiresAt ? (
                              <span className="text-[10px] text-stone-500">
                                Hasta {formatPassExpiry(user.premiumExpiresAt)}
                              </span>
                            ) : null}
                            {user.pass24hStatus === "expired" && user.premiumExpiresAt ? (
                              <span className="text-[10px] text-stone-400">
                                Caducó {formatPassExpiry(user.premiumExpiresAt)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {user.unlimitedScans ? (
                            <div className="flex flex-col gap-1.5">
                              <PremiumLabel size="xs" />
                              <span className="w-fit rounded-full bg-[#eef4e6] px-2 py-0.5 text-[10px] font-semibold text-[#3e5219]">
                                Admin · ilimitado
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <label className="inline-flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={user.isPremium}
                                  disabled={isSavingPremium}
                                  onChange={(event) =>
                                    void handleTogglePremium(user.id, event.target.checked)
                                  }
                                  className="h-4 w-4 rounded border-stone-300 text-[#556B2F] focus:ring-[#556B2F]/30"
                                />
                                <span className="text-xs font-medium text-stone-700">
                                  {isSavingPremium ? (
                                    "Guardando…"
                                  ) : user.isPremium ? (
                                    <PremiumLabel size="xs" />
                                  ) : (
                                    "Free"
                                  )}
                                </span>
                              </label>
                              <span
                                className={cn(
                                  "w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  user.isPremium
                                    ? "bg-[#eef4e6] text-[#3e5219]"
                                    : user.premiumTrialRemaining > 0
                                      ? "bg-amber-50 text-amber-900"
                                      : "bg-stone-100 text-stone-500"
                                )}
                              >
                                {premiumStatusLabel}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {user.unlimitedScans ? (
                            <span className="text-xs font-medium text-stone-400">
                              Cuenta administradora
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={MAX_DAILY_SCAN_LIMIT}
                              value={draftLimits[user.id] ?? String(user.dailyScanLimit)}
                              onChange={(event) =>
                                setDraftLimits((current) => ({
                                  ...current,
                                  [user.id]: event.target.value
                                }))
                              }
                              className="h-10 w-24 rounded-xl border border-stone-200 bg-[#FDFCFB] px-3 text-sm text-stone-800 outline-none transition focus:border-[#4c6633]/40 focus:ring-2 focus:ring-[#4c6633]/10"
                              aria-label={`Escaneos diarios para ${user.email}`}
                            />
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void handleSaveLimit(user.id)}
                              disabled={user.unlimitedScans || isSaving}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition",
                                user.unlimitedScans
                                  ? "cursor-not-allowed text-stone-300"
                                  : "bg-[#4c6633] text-white hover:bg-[#556B2F] disabled:opacity-60"
                              )}
                            >
                              {isSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserPendingDelete(user)}
                              disabled={user.unlimitedScans || deletingUserId === user.id}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
                                user.unlimitedScans
                                  ? "cursor-not-allowed border-stone-100 text-stone-300"
                                  : "border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
                              )}
                              aria-label={`Eliminar cuenta de ${user.email}`}
                            >
                              {deletingUserId === user.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ConfirmDialog
          open={userPendingDelete !== null}
          onOpenChange={(open) => {
            if (!open && !deletingUserId) {
              setUserPendingDelete(null);
            }
          }}
          title="Eliminar cuenta"
          description={
            userPendingDelete
              ? `Se eliminará permanentemente la cuenta ${userPendingDelete.email} de Supabase Auth y todos sus datos asociados (perfil, recetas, favoritos, etc.). Esta acción no se puede deshacer.`
              : undefined
          }
          confirmLabel="Eliminar cuenta"
          cancelLabel="Cancelar"
          destructive
          isLoading={deletingUserId !== null}
          onConfirm={() => void handleConfirmDelete()}
        />
      </div>
    </main>
  );
}

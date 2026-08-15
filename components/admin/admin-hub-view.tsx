"use client";

import Link from "next/link";
import { BookOpen, Pencil, ScanLine, Sparkles, Users, Wand2 } from "lucide-react";
import { AdminHubSkeleton } from "@/components/skeletons/admin-skeleton";
import { useSandraAdminGate } from "@/hooks/use-sandra-admin-gate";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

const toolLinkClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#4C6B3F]/20 bg-white px-4 py-3 text-sm font-semibold text-[#4C6B3F] transition hover:bg-[#F0F4ED]";

const primaryToolLinkClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4C6B3F] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105";

export function AdminHubView() {
  const authState = useSandraAdminGate(APP_ROUTES.admin);

  if (authState === "loading") {
    return <AdminHubSkeleton />;
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
    <section className="mx-auto max-w-lg space-y-5 px-4 py-6 pb-24">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4C6B3F]/80">
          Admin · IngeniaFood
        </p>
        <h1 className="mt-1 text-xl font-semibold text-stone-900">Administración</h1>
        <p className="mt-1 text-sm leading-relaxed text-stone-500">
          Gestiona usuarios, herramientas del catálogo y las recetas de Sandra.
        </p>
      </header>

      <section className="rounded-2xl border border-[#4C6B3F]/15 bg-gradient-to-br from-[#F0F4ED] to-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Herramientas</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          Usuarios, uso de IA/costes, recetas/escáner, importación, banco de imágenes y
          catálogo de Instagram.
        </p>
        <div className="mt-4 space-y-2">
          <Link href="/admin/usuarios" className={toolLinkClassName}>
            <Users className="h-4 w-4" />
            Administrar usuarios
          </Link>
          <Link href="/admin/uso-ia" className={primaryToolLinkClassName}>
            <Sparkles className="h-4 w-4" />
            Uso de IA (costes)
          </Link>
          <Link href="/admin/uso-recetas" className={toolLinkClassName}>
            <ScanLine className="h-4 w-4" />
            Recetas por usuario
          </Link>
          <Link href="/admin/importar-receta" className={toolLinkClassName}>
            <Wand2 className="h-4 w-4" />
            Importar receta
          </Link>
          <Link href="/admin/banco-imagenes" className={toolLinkClassName}>
            <Pencil className="h-4 w-4" />
            Banco de imágenes
          </Link>
          <Link href="/admin/catalogo-instagram" className={toolLinkClassName}>
            <Pencil className="h-4 w-4" />
            Editar catálogo
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-[#4C6B3F]/15 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Recetas de Sandra</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          Lista el catálogo oficial, edita cada ficha y asigna tipos de dieta.
        </p>
        <Link
          href={APP_ROUTES.adminRecetasSandra}
          className={`${toolLinkClassName} mt-4`}
        >
          <BookOpen className="h-4 w-4" />
          Administrar recetas de Sandra
        </Link>
      </section>
    </section>
  );
}

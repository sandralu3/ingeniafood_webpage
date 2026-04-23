import Image from "next/image";
import { Leaf, Menu } from "lucide-react";

const AVATAR_SRC =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD0OMdLFLIA9WLkdX8a5-Cc189OMf0GrEFjTEPm6enmhQoSWPd5oSAut1DUNqvILPLXwSQbpX0kcgnCzyZXkEJ3QHDB6CwM8lDd8iyzFs7OKxr3w8fEnLTqQD-RvBK1EVMPT8ql1hN-vUFGReKzueCHgQVx0n90t9TsxM29YLx4a0y4uQrOj40xXB1twL8aogV_3D8rB-l80N0XcE_rdL7ZevxfUVyVVOR9t06RwfSz1DiIQ_gR3KQSwTKv7PVkcWHx8bsCLBoeoqrg";

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-sv-outline-variant/30 bg-sv-surface/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className="text-sv-primary-container transition hover:opacity-80"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 font-sans leading-tight">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-sv-on-surface-variant">
            Sandra Vergara
          </p>
          <div className="flex items-center gap-1">
            <Leaf className="h-3.5 w-3.5 shrink-0 text-[#556B2F]" strokeWidth={2} />
            <p className="truncate text-sm tracking-tight text-sv-on-surface">
              <span className="font-semibold">Ingenia</span>
              <span className="font-semibold text-[#556B2F]">Food</span>
            </p>
          </div>
        </div>
      </div>
      <div className="relative ml-3 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-sv-surface-low ring-1 ring-sv-outline-variant/40">
        <Image
          src={AVATAR_SRC}
          alt="Perfil"
          fill
          className="object-cover"
          sizes="32px"
        />
      </div>
    </header>
  );
}

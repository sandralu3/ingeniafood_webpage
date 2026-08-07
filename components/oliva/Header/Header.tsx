import { CTAButton } from "@/components/oliva/CTAButton";

const NAV_ITEMS = [
  { href: "#", label: "Nav item" },
  { href: "#", label: "Nav item" },
  { href: "#", label: "Nav item" }
] as const;

export function Header() {
  return (
    <header className="relative z-10 w-full bg-transparent">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10 lg:py-8">
        <a
          href="#inicio"
          className="text-base tracking-[0.04em] text-[#1b1c19] lg:text-lg"
        >
          <span className="font-light text-[#444444]">Ingenia</span>
          <span className="font-bold text-[#556B2F]">Food</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item, index) => (
            <a
              key={`${item.label}-${index}`}
              href={item.href}
              className="text-sm font-medium text-[#57534e] transition-colors hover:text-[#8f4c35]"
            >
              {item.label}
            </a>
          ))}
          <CTAButton href="#" variant="secondary" size="sm">
            CTA
          </CTAButton>
        </nav>

        <div className="md:hidden">
          <CTAButton href="#" variant="secondary" size="sm">
            CTA
          </CTAButton>
        </div>
      </div>
    </header>
  );
}

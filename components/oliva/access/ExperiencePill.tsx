type ExperiencePillProps = {
  label: string;
  description: string;
};

export function ExperiencePill({ label, description }: ExperiencePillProps) {
  return (
    <div className="rounded-2xl border border-[#e8e2d6] bg-[#fffcf7]/70 px-6 py-6 sm:px-7 sm:py-7">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#556B2F]">
        {label}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#53433e] sm:text-[0.9375rem]">
        {description}
      </p>
    </div>
  );
}

import type { ReactNode } from "react";

type ChangeCardProps = {
  title: string;
  description: string;
  illustration: ReactNode;
};

export function ChangeCard({
  title,
  description,
  illustration
}: ChangeCardProps) {
  return (
    <article className="oliva-change-card flex h-full flex-col rounded-2xl border border-[#e8e2d6] bg-[#fffcf7] p-8 sm:p-9">
      <div className="oliva-change-illust mb-8 flex h-16 items-center justify-start">
        {illustration}
      </div>
      <h3 className="font-sans text-lg font-semibold leading-snug tracking-tight text-[#1b1c19] sm:text-xl">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-[#53433e] sm:text-[0.9375rem]">
        {description}
      </p>
    </article>
  );
}

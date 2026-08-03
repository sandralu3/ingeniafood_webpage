type Props = {
  message: string;
};

const UNHEALTHY_ADVISORY_RE =
  /poco\s+saludable|no\s+es\s+un\s+alimento\s+saludable|no\s+son\s+alimentos\s+saludables|unhealthy|not\s+a\s+healthy|not\s+healthy|peu\s+sain|aliment\s+sain|pouco\s+saud[aá]vel|ungesund|gesundes|ultraproces|ultra[\s-]?process|ten\s+en\s+cuenta|note:|attention\s*:|aten[cç][aã]o|hinweis/i;

export function RecipeMealTypeAdvisory({ message }: Props) {
  const isUnhealthy = UNHEALTHY_ADVISORY_RE.test(message);

  return (
    <p
      role="status"
      data-share-exclude
      className={
        isUnhealthy
          ? "border-l-2 border-amber-400/80 pl-2.5 text-[11px] leading-relaxed text-amber-900/80"
          : "border-l-2 border-stone-200/90 pl-2.5 text-[11px] leading-relaxed text-stone-500"
      }
    >
      {message}
    </p>
  );
}

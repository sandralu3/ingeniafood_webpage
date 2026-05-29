type Props = {
  tip: string;
  /** Oculta en captura de imagen (se muestra en el bloque de branding) */
  hideOnShareCapture?: boolean;
};

export function SandraTipCard({ tip, hideOnShareCapture = false }: Props) {
  if (!tip.trim()) return null;

  return (
    <aside
      {...(hideOnShareCapture ? { "data-share-exclude": true } : {})}
      className="rounded-2xl border border-brand-green-light/30 bg-brand-green-light/10 px-5 py-6 shadow-sm"
    >
      <h3 className="font-serif text-base font-semibold text-brand-green-dark">
        💡 El Tip de Sandra
      </h3>
      <p className="mt-4 text-sm leading-7 text-stone-700">{tip}</p>
    </aside>
  );
}

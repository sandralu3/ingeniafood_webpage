type Props = {
  message: string;
};

export function RecipeMealTypeAdvisory({ message }: Props) {
  return (
    <p
      role="status"
      data-share-exclude
      className="border-l-2 border-stone-200/90 pl-2.5 text-[11px] leading-relaxed text-stone-500"
    >
      {message}
    </p>
  );
}

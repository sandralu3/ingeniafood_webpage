export default function RecipeDetailLoading() {
  return (
    <section className="space-y-4">
      <div className="h-5 w-40 animate-pulse rounded bg-brand-green-light/30" />
      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <div className="h-8 w-2/3 animate-pulse rounded bg-brand-green-light/25" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-brand-green-light/20" />
        <div className="h-4 w-full animate-pulse rounded bg-brand-green-light/20" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-brand-green-light/20" />
        <div className="h-4 w-10/12 animate-pulse rounded bg-brand-green-light/20" />
      </div>
    </section>
  );
}

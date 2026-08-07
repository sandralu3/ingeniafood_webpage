import { Suspense } from "react";
import RecipeDetailPage from "../../../recipes/[id]/page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function AppRecetasRecipeDetailPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse pb-8">
          <div className="aspect-video w-full bg-stone-100" />
          <div className="h-10 w-3/4 rounded-lg bg-stone-100" />
          <div className="h-48 rounded-2xl bg-stone-100" />
        </div>
      }
    >
      <RecipeDetailPage {...props} />
    </Suspense>
  );
}

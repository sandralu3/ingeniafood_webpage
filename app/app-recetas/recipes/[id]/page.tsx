import { Suspense } from "react";
import { RecipeDetailSkeleton } from "@/components/skeletons/recipe-detail-skeleton";
import RecipeDetailPage from "../../../recipes/[id]/page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function AppRecetasRecipeDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<RecipeDetailSkeleton />}>
      <RecipeDetailPage {...props} />
    </Suspense>
  );
}

import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

export default function AppRecetasIndexPage() {
  redirect(APP_ROUTES.hoy);
}

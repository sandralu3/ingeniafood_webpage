import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";

export function Toast({
  message,
  variant = "success",
  visible
}: {
  message: string;
  variant?: ToastVariant;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[200] -translate-x-1/2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur-sm",
          variant === "success"
            ? "border-brand-green-light/40 bg-brand-cream text-brand-green-dark"
            : "border-red-200 bg-red-50 text-red-700"
        )}
        role="status"
        aria-live="polite"
      >
        {variant === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        <span>{message}</span>
      </div>
    </div>
  );
}

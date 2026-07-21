"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Si se define, se llama al pulsar cancelar (además de cerrar). */
  onCancel?: () => void;
  isLoading?: boolean;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isLoading = false,
  destructive = false
}: ConfirmDialogProps) {
  const t = useTranslations("Common");
  const resolvedConfirm = confirmLabel ?? t("confirm");
  const resolvedCancel = cancelLabel ?? t("cancel");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            onClick={() => {
              onCancel?.();
            }}
          >
            {resolvedCancel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            className={cn(
              destructive && "bg-red-600 hover:opacity-90 focus-visible:ring-red-600/40"
            )}
          >
            {isLoading ? t("processing") : resolvedConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

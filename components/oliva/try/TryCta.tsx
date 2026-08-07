"use client";

import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  TRY_PATH,
  buildAbsoluteUrl,
  buildQrImageUrl,
  shouldEnforceMobileQr
} from "./device";
import { TryQrModal } from "./TryQrModal";

type TryCtaVariant = "primary" | "secondary" | "outline";
type TryCtaSize = "sm" | "md";

type TryCtaProps = {
  children: ReactNode;
  className?: string;
  variant?: TryCtaVariant;
  size?: TryCtaSize;
  /** Called before navigating or opening the QR modal (e.g. close nav). */
  onBeforeAction?: () => void;
};

export function TryCta({
  children,
  className,
  variant = "primary",
  size = "md",
  onBeforeAction
}: TryCtaProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState(TRY_PATH);
  const [qrUrl, setQrUrl] = useState("");

  const handleClick = useCallback(() => {
    onBeforeAction?.();

    if (shouldEnforceMobileQr()) {
      const absolute = buildAbsoluteUrl(TRY_PATH);
      setTargetUrl(absolute);
      setQrUrl(buildQrImageUrl(absolute));
      setModalOpen(true);
      return;
    }

    window.location.assign(TRY_PATH);
  }, [onBeforeAction]);

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors duration-200",
          size === "sm" && "rounded-lg px-4 py-2 text-sm",
          size === "md" && "rounded-xl px-7 py-3.5 text-base",
          variant === "primary" &&
            "bg-[#8f4c35] text-white hover:bg-[#7a402d]",
          variant === "secondary" &&
            "bg-[#e9967a] text-[#682e19] hover:bg-[#ffb59c]",
          variant === "outline" &&
            "border border-[#d9d2c4] bg-transparent text-[#1b1c19] hover:border-[#86736d] hover:bg-[#f5f3ee]",
          className
        )}
        onClick={handleClick}
      >
        {children}
      </button>

      <TryQrModal
        open={modalOpen}
        qrUrl={qrUrl}
        targetUrl={targetUrl}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "ingeniafood_chunk_reload_v1";

function isChunkLoadFailure(message: string): boolean {
  return /ChunkLoadError|Loading chunk .* failed/i.test(message);
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    const reloadOnce = () => {
      if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
        return;
      }

      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      window.location.reload();
    };

    const handleError = (event: ErrorEvent) => {
      if (isChunkLoadFailure(event.message ?? "")) {
        reloadOnce();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";

      if (isChunkLoadFailure(message)) {
        reloadOnce();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

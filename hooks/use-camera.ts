"use client";

import { useCallback, useState } from "react";

export function useCamera() {
  const [isCameraReady, setIsCameraReady] = useState(false);

  const initializeCamera = useCallback(async () => {
    setIsCameraReady(true);
  }, []);

  return {
    isCameraReady,
    initializeCamera
  };
}

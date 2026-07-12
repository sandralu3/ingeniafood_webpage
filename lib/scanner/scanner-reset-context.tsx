"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode
} from "react";

type ScannerResetHandler = () => void;

type ScannerResetContextValue = {
  registerScannerReset: (handler: ScannerResetHandler | null) => void;
  requestScannerReset: () => void;
};

const ScannerResetContext = createContext<ScannerResetContextValue | null>(null);

export function ScannerResetProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<ScannerResetHandler | null>(null);

  const registerScannerReset = useCallback((handler: ScannerResetHandler | null) => {
    handlerRef.current = handler;
  }, []);

  const requestScannerReset = useCallback(() => {
    handlerRef.current?.();
  }, []);

  return (
    <ScannerResetContext.Provider value={{ registerScannerReset, requestScannerReset }}>
      {children}
    </ScannerResetContext.Provider>
  );
}

export function useScannerReset() {
  return useContext(ScannerResetContext);
}

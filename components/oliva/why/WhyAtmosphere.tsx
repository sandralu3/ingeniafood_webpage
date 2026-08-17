"use client";

import { useRef } from "react";
import { useScrollParallax } from "@/components/oliva/motion";

export function WhyAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  useScrollParallax(ref, { varName: "why-parallax" });

  return (
    <div ref={ref} className="oliva-why-atmosphere" aria-hidden="true">
      <div className="oliva-why-drift oliva-why-drift--a" />
      <div className="oliva-why-drift oliva-why-drift--b" />
      <div className="oliva-why-drift oliva-why-drift--c" />
      <p className="oliva-why-watermark">Por qué</p>
    </div>
  );
}

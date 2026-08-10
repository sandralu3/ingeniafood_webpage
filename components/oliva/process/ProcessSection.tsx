import { SectionShell } from "@/components/oliva/motion";
import { ProcessFlow } from "./ProcessFlow";
import "./process-section.css";

export function ProcessSection() {
  return (
    <SectionShell
      id="proceso"
      variant="sand"
      glow="left"
      align="start"
      className="oliva-process-section"
      contentClassName="oliva-process-section-inner"
    >
      <ProcessFlow />
    </SectionShell>
  );
}

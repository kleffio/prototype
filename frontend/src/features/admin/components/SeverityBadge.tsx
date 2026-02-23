import type { InsightSeverity } from "../types/insights";
import { SEVERITY_CLASSES } from "../types/insights";

interface SeverityBadgeProps {
  severity: InsightSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium uppercase ${SEVERITY_CLASSES[severity]}`}
    >
      {severity}
    </span>
  );
}

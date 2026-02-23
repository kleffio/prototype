import type { PlatformRole } from "../types/admin";
import { PLATFORM_ROLE_LABELS, PLATFORM_ROLE_COLORS } from "../types/admin";

interface RoleBadgeProps {
  role: PlatformRole;
  size?: "sm" | "md";
}

export function RoleBadge({ role, size = "sm" }: RoleBadgeProps) {
  const label = PLATFORM_ROLE_LABELS[role] || role;
  const colorClass =
    PLATFORM_ROLE_COLORS[role] || "bg-neutral-500/20 text-neutral-300 border-neutral-500/30";

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${sizeClass} ${colorClass}`}
    >
      {label}
    </span>
  );
}

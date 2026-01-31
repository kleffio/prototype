import { useParams } from 'react-router-dom';
import { usePermissions } from '@features/projects/hooks/usePermissions';
import { useAuthorization } from '../context/AuthorizationContext';
import type { ReactNode } from 'react';
import type { ProjectPermission } from '@features/projects/types/permissions';

interface PermissionGateProps {
  children: ReactNode;
  permission?: ProjectPermission;
  permissions?: ProjectPermission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showLoading?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions.
 * In shadow mode: always renders children (backend logs decisions).
 * In enforce mode: only renders children if user has required permissions.
 *
 * @example
 * // Single permission check
 * <PermissionGate permission="DEPLOY">
 *   <button onClick={handleDeploy}>Deploy</button>
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (OR logic)
 * <PermissionGate permissions={["DEPLOY", "WRITE_PROJECT"]}>
 *   <ActionPanel />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (AND logic)
 * <PermissionGate permissions={["MANAGE_BILLING", "DELETE_PROJECT"]} requireAll>
 *   <DangerZone />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission="VIEW_SECRETS" fallback={<div>Access denied</div>}>
 *   <SecretsPanel />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  showLoading = false,
}: PermissionGateProps) {
  const { projectId } = useParams<{ projectId?: string }>();
  const { hasPermission, isLoading } = usePermissions(projectId);
  const { shadowMode, enforceMode } = useAuthorization();

  // Show loading state if requested
  if (isLoading && showLoading) {
    return (
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 rounded" />
    );
  }

  // In shadow mode (not enforcing), always show children
  // Backend will log authorization decisions
  if (shadowMode && !enforceMode) {
    return <>{children}</>;
  }

  // Check permissions
  let hasRequiredPermissions = true;

  if (permission) {
    // Single permission check
    hasRequiredPermissions = hasPermission(permission);
  } else if (permissions.length > 0) {
    // Multiple permissions check
    if (requireAll) {
      // AND logic - user must have ALL permissions
      hasRequiredPermissions = permissions.every((p) => hasPermission(p));
    } else {
      // OR logic - user must have AT LEAST ONE permission
      hasRequiredPermissions = permissions.some((p) => hasPermission(p));
    }
  }

  // Render children if user has permissions, otherwise render fallback
  return hasRequiredPermissions ? <>{children}</> : <>{fallback}</>;
}

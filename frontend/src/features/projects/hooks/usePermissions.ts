import { useState, useEffect } from "react";
import type { CollaboratorRole, ProjectPermission, Collaborator } from "../types/permissions";
import { getProjectCollaborators } from "../api/collaborators";
import { useAuth } from "react-oidc-context";
import { useAuthorization } from "@features/authorization/context/AuthorizationContext";

// Default permissions for each role
const ROLE_PERMISSIONS: Record<CollaboratorRole, ProjectPermission[]> = {
  OWNER: [
    "READ_PROJECT",
    "WRITE_PROJECT",
    "DEPLOY",
    "MANAGE_ENV_VARS",
    "VIEW_LOGS",
    "VIEW_METRICS",
    "MANAGE_COLLABORATORS",
    "DELETE_PROJECT",
    "MANAGE_BILLING"
  ],
  ADMIN: [
    "READ_PROJECT",
    "WRITE_PROJECT",
    "DEPLOY",
    "MANAGE_ENV_VARS",
    "VIEW_LOGS",
    "VIEW_METRICS",
    "MANAGE_COLLABORATORS"
  ],
  DEVELOPER: ["READ_PROJECT", "WRITE_PROJECT", "DEPLOY", "VIEW_LOGS", "VIEW_METRICS"],
  VIEWER: ["READ_PROJECT", "VIEW_LOGS", "VIEW_METRICS"]
};

export function usePermissions(projectId: string | undefined) {
  const auth = useAuth();
  const { shadowMode, enforceMode } = useAuthorization();
  const [role, setRole] = useState<CollaboratorRole | string | null>(null);
  const [permissions, setPermissions] = useState<ProjectPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (!auth.user?.profile.sub || !projectId) {
        setIsLoading(false);
        return;
      }

      try {
        const collaborators: Collaborator[] = await getProjectCollaborators(projectId);
        const currentUserCollab = collaborators.find((c) => c.userId === auth.user?.profile.sub);

        if (currentUserCollab) {
          // Use custom role name if available, otherwise use built-in role
          setRole(currentUserCollab.customRoleName || currentUserCollab.role);
          // Use explicit permissions if set, otherwise fall back to role defaults
          setPermissions(
            currentUserCollab.permissions && currentUserCollab.permissions.length > 0
              ? currentUserCollab.permissions
              : ROLE_PERMISSIONS[currentUserCollab.role as CollaboratorRole] || []
          );
        } else {
          setRole(null);
          setPermissions([]);
        }
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
        setRole(null);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPermissions();
  }, [projectId, auth.user?.profile.sub]);

  const hasPermission = (permission: ProjectPermission): boolean => {
    // In shadow mode (not enforcing), always return true
    // Backend will log authorization decisions
    if (shadowMode && !enforceMode) {
      console.log(`[SHADOW MODE] Checking permission: ${permission}`);
      return true;
    }

    // In enforce mode, check actual permissions
    return permissions.includes(permission);
  };

  const hasRole = (requiredRole: CollaboratorRole): boolean => {
    return role === requiredRole;
  };

  const hasAnyRole = (roles: CollaboratorRole[]): boolean => {
    return role !== null && roles.includes(role as CollaboratorRole);
  };

  return {
    role,
    permissions,
    isLoading,
    hasPermission,
    hasRole,
    hasAnyRole,
    canDeploy: hasPermission("DEPLOY"),
    canManageEnvVars: hasPermission("MANAGE_ENV_VARS"),
    canManageCollaborators: hasPermission("MANAGE_COLLABORATORS"),
    canDeleteProject: hasPermission("DELETE_PROJECT"),
    canManageBilling: hasPermission("MANAGE_BILLING"),
    shadowMode, // Expose shadow mode status
    enforceMode // Expose enforce mode status
  };
}

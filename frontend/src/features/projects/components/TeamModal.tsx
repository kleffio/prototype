import { useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Label } from "@shared/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/ui/Table";
import { Badge } from "@shared/ui/Badge";
import { SoftPanel } from "@shared/ui/SoftPanel";
import {
  UserPlus,
  Trash2,
  X,
  Mail,
  Edit2,
  Users,
  CheckSquare,
  Square,
  Lock,
  Plus
} from "lucide-react";
import {
  getProjectCollaborators,
  deleteCollaborator,
  updateCollaboratorRole
} from "../api/collaborators";
import {
  createInvitation,
  getProjectInvitations,
  deleteInvitation,
  type Invitation
} from "../api/invitations";
import { getProjectCustomRoles, createCustomRole, type CustomRole } from "../api/customRoles";
import { getUsernameById } from "@features/users/api/getUsernameById";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";

const translations = {
  en: enTranslations,
  fr: frTranslations
};

interface Collaborator {
  id: number;
  userId: string;
  projectId: string;
  role: "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";
  customRoleId?: number;
  customRoleName?: string;
  collaboratorStatus: string;
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
}

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  userRole: "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";
}

export function TeamModal({ isOpen, onClose, projectId, userRole }: TeamModalProps) {
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].teamModal;

  const ROLE_DESCRIPTIONS = {
    OWNER: t.role_descriptions.OWNER,
    ADMIN: t.role_descriptions.ADMIN,
    DEVELOPER: t.role_descriptions.DEVELOPER,
    VIEWER: t.role_descriptions.VIEWER
  };

  const AVAILABLE_PERMISSIONS = [
    {
      value: "READ_PROJECT",
      label: t.permissions.READ_PROJECT,
      description: t.permissions.READ_PROJECT_DESC
    },
    {
      value: "WRITE_PROJECT",
      label: t.permissions.WRITE_PROJECT,
      description: t.permissions.WRITE_PROJECT_DESC
    },
    { value: "DEPLOY", label: t.permissions.DEPLOY, description: t.permissions.DEPLOY_DESC },
    {
      value: "MANAGE_ENV_VARS",
      label: t.permissions.MANAGE_ENV_VARS,
      description: t.permissions.MANAGE_ENV_VARS_DESC
    },
    {
      value: "VIEW_LOGS",
      label: t.permissions.VIEW_LOGS,
      description: t.permissions.VIEW_LOGS_DESC
    },
    {
      value: "VIEW_METRICS",
      label: t.permissions.VIEW_METRICS,
      description: t.permissions.VIEW_METRICS_DESC
    },
    {
      value: "MANAGE_COLLABORATORS",
      label: t.permissions.MANAGE_COLLABORATORS,
      description: t.permissions.MANAGE_COLLABORATORS_DESC
    },
    {
      value: "DELETE_PROJECT",
      label: t.permissions.DELETE_PROJECT,
      description: t.permissions.DELETE_PROJECT_DESC
    },
    {
      value: "MANAGE_BILLING",
      label: t.permissions.MANAGE_BILLING,
      description: t.permissions.MANAGE_BILLING_DESC
    }
  ];

  // Role-based default permissions (like AWS IAM roles)
  const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
    VIEWER: ["READ_PROJECT", "VIEW_LOGS", "VIEW_METRICS"],
    DEVELOPER: ["READ_PROJECT", "VIEW_LOGS", "VIEW_METRICS", "DEPLOY", "MANAGE_ENV_VARS"],
    ADMIN: [
      "READ_PROJECT",
      "WRITE_PROJECT",
      "DEPLOY",
      "MANAGE_ENV_VARS",
      "VIEW_LOGS",
      "VIEW_METRICS",
      "MANAGE_COLLABORATORS",
      "MANAGE_BILLING"
    ],
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
    ]
  };

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRoleType, setSelectedRoleType] = useState<"builtin" | "custom">("builtin");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "DEVELOPER" | "VIEWER">("DEVELOPER");
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<number | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<"ADMIN" | "DEVELOPER" | "VIEWER">("DEVELOPER");
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  const canManageTeam = userRole === "OWNER" || userRole === "ADMIN";
  const canViewInvitations = userRole === "OWNER" || userRole === "ADMIN";

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const data = await getProjectCollaborators(projectId);
      setCollaborators(data);
      setError(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.messages.error_loading);
    } finally {
      setLoading(false);
    }
  };

  const loadCollaboratorUsernames = async () => {
    try {
      const usernameMap: Record<string, string> = {};

      // Use Promise.all for parallel requests (faster)
      await Promise.all(
        collaborators.map(async (collaborator) => {
          try {
            const username = await getUsernameById(collaborator.userId);
            usernameMap[collaborator.userId] = username;
          } catch (err) {
            console.error(`Failed to load username for ${collaborator.userId}:`, err);
            // Fallback to truncated userId if username fetch fails
            usernameMap[collaborator.userId] = collaborator.userId.substring(0, 8) + "...";
          }
        })
      );

      setUsernames(usernameMap);
    } catch (error) {
      console.error("Failed to load usernames:", error);
    }
  };

  const loadInvitations = async () => {
    if (!canViewInvitations) return;
    try {
      const data = await getProjectInvitations(projectId);
      setInvitations(data);
    } catch (err: unknown) {
      console.error("Failed to load invitations:", err);
    }
  };

  const loadCustomRoles = async () => {
    try {
      const data = await getProjectCustomRoles(projectId);
      setCustomRoles(data);
    } catch (err: unknown) {
      console.error("Failed to load custom roles:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
      loadInvitations();
      loadCustomRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  // Load usernames when collaborators change
  useEffect(() => {
    if (collaborators.length > 0) {
      loadCollaboratorUsernames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collaborators]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();

    if (!inviteEmail) {
      setError(t.inviteModal.email_placeholder);
      return;
    }

    try {
      setInviting(true);
      setError(null);

      await createInvitation({
        projectId,
        inviteeEmail: inviteEmail,
        role: selectedRoleType === "builtin" ? inviteRole : "VIEWER",
        customRoleId: selectedRoleType === "custom" ? selectedCustomRoleId! : undefined
      });

      setSuccess(t.messages.invitation_sent);
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setSelectedRoleType("builtin");
      setInviteRole("DEVELOPER");
      setSelectedCustomRoleId(null);
      await loadCollaborators();
      await loadInvitations();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.messages.error_inviting);
    } finally {
      setInviting(false);
    }
  };

  const handleCreateRole = async (e: FormEvent) => {
    e.preventDefault();

    if (!newRoleName || newRolePermissions.length === 0) {
      setError(t.createRoleModal.select_permissions);
      return;
    }

    try {
      setCreatingRole(true);
      setError(null);

      await createCustomRole({
        projectId,
        name: newRoleName,
        description: newRoleDescription,
        permissions: newRolePermissions
      });

      setSuccess(t.messages.role_created);
      setIsCreateRoleModalOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setNewRolePermissions([]);
      await loadCustomRoles();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.messages.error_creating_role);
    } finally {
      setCreatingRole(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await deleteCollaborator(projectId, userId);
      setSuccess(t.messages.member_removed);
      await loadCollaborators();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.messages.error_removing);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteInvitation = async (invitationId: number) => {
    try {
      await deleteInvitation(invitationId);
      setSuccess(t.messages.invitation_cancelled);
      await loadInvitations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.messages.error_inviting);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    try {
      await updateCollaboratorRole(projectId, userId, editingRole);
      setSuccess(t.messages.role_updated);
      setEditingUserId(null);
      await loadCollaborators();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.messages.error_updating);
      setTimeout(() => setError(null), 3000);
    }
  };

  const startEditing = (collaborator: Collaborator) => {
    setEditingUserId(collaborator.userId);
    setEditingRole(collaborator.role as "ADMIN" | "DEVELOPER" | "VIEWER");
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex max-h-[85vh] flex-col rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-2">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-50">{t.title}</h2>
                <p className="text-sm text-neutral-400">
                  {collaborators.length} member{collaborators.length !== 1 ? "s" : ""}
                  {canViewInvitations &&
                    invitations.length > 0 &&
                    ` • ${invitations.length} pending invitation${invitations.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManageTeam && (
                <Button
                  size="sm"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="bg-gradient-kleff rounded-full px-4 py-2 text-sm font-semibold text-black"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t.invite_member}
                </Button>
              )}
              <button
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-white/10"
              >
                <X className="h-6 w-6 text-neutral-400 hover:text-neutral-200" />
              </button>
            </div>
          </div>

          <div className="space-y-6 overflow-y-auto p-6">
            {success && (
              <div className="rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
                {success}
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <h3 className="text-md mb-3 font-semibold text-neutral-50">{t.team_members}</h3>
              <div className="overflow-hidden rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10 bg-white/5 hover:bg-white/5">
                      <TableHead>{t.table.user}</TableHead>
                      <TableHead>{t.table.role}</TableHead>
                      <TableHead>{t.table.status}</TableHead>
                      <TableHead>{t.table.invited_at}</TableHead>
                      {canManageTeam && (
                        <TableHead className="w-[120px]">{t.table.actions}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={canManageTeam ? 5 : 4}
                          className="py-8 text-center text-neutral-400"
                        >
                          {t.loading}
                        </TableCell>
                      </TableRow>
                    ) : collaborators.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={canManageTeam ? 5 : 4}
                          className="py-8 text-center text-neutral-400"
                        >
                          {t.no_members}
                        </TableCell>
                      </TableRow>
                    ) : (
                      collaborators.map((collaborator) => (
                        <TableRow key={collaborator.id} className="hover:bg-white/5">
                          <TableCell className="font-mono text-sm text-neutral-300">
                            {usernames[collaborator.userId] ||
                              collaborator.userId.substring(0, 8) + "..."}
                          </TableCell>
                          <TableCell>
                            {editingUserId === collaborator.userId && canManageTeam ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={editingRole}
                                  onValueChange={(value) =>
                                    setEditingRole(value as "ADMIN" | "DEVELOPER" | "VIEWER")
                                  }
                                >
                                  <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ADMIN">{t.roles.ADMIN}</SelectItem>
                                    <SelectItem value="DEVELOPER">{t.roles.DEVELOPER}</SelectItem>
                                    <SelectItem value="VIEWER">{t.roles.VIEWER}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateRole(collaborator.userId)}
                                  className="h-8 bg-green-500/10 px-2 text-xs text-green-400 hover:bg-green-500/20"
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingUserId(null)}
                                  className="h-8 px-2 text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Badge
                                variant={
                                  collaborator.role === "OWNER"
                                    ? "info"
                                    : collaborator.role === "ADMIN"
                                      ? "info"
                                      : collaborator.role === "DEVELOPER"
                                        ? "success"
                                        : "secondary"
                                }
                                className="text-xs"
                              >
                                {collaborator.customRoleName || collaborator.role}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={collaborator.acceptedAt ? "success" : "warning"}
                              className="text-xs"
                            >
                              {collaborator.collaboratorStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-neutral-400">
                            {collaborator.acceptedAt
                              ? new Date(collaborator.acceptedAt).toLocaleDateString()
                              : "Pending"}
                          </TableCell>
                          {canManageTeam && (
                            <TableCell>
                              {collaborator.role !== "OWNER" && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditing(collaborator)}
                                    className="p-2"
                                    title="Edit role"
                                  >
                                    <Edit2 className="h-4 w-4 text-blue-400" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemove(collaborator.userId)}
                                    className="p-2"
                                    title="Remove collaborator"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {canViewInvitations && (
              <div>
                <h3 className="text-md mb-3 flex items-center gap-2 font-semibold text-neutral-50">
                  <Mail className="h-4 w-4" />
                  {t.pending_invitations}
                </h3>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/10 bg-white/5 hover:bg-white/5">
                        <TableHead>{t.table.email}</TableHead>
                        <TableHead>{t.table.role}</TableHead>
                        <TableHead>{t.table.invited_at}</TableHead>
                        {canManageTeam && (
                          <TableHead className="w-[100px]">{t.table.actions}</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={canManageTeam ? 4 : 3}
                            className="py-8 text-center text-neutral-400"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Mail className="mb-2 h-8 w-8 text-neutral-600" />
                              <p className="text-sm">{t.no_invitations}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        invitations.map((invitation) => (
                          <TableRow key={invitation.id} className="hover:bg-white/5">
                            <TableCell className="font-mono text-sm text-neutral-300">
                              {invitation.inviteeEmail}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  invitation.role === "ADMIN"
                                    ? "info"
                                    : invitation.role === "DEVELOPER"
                                      ? "success"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {invitation.customRoleName || invitation.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-neutral-400">
                              {new Date(invitation.createdAt).toLocaleDateString()}
                            </TableCell>
                            {canManageTeam && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteInvitation(invitation.id)}
                                  className="p-2"
                                  title="Delete invitation"
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isInviteModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setIsInviteModalOpen(false)}
          >
            <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <SoftPanel>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-50">{t.inviteModal.title}</h3>
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="text-neutral-400 transition-colors hover:text-neutral-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mb-6 text-sm text-neutral-400">
                  Send an invitation to collaborate on this project
                </p>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-neutral-200">
                      {t.inviteModal.email}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t.inviteModal.email_placeholder}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-neutral-200">
                      {t.inviteModal.select_role}
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select
                          value={
                            selectedRoleType === "builtin"
                              ? inviteRole
                              : `custom-${selectedCustomRoleId}`
                          }
                          onValueChange={(value) => {
                            if (value.startsWith("custom-")) {
                              setSelectedRoleType("custom");
                              setSelectedCustomRoleId(Number(value.replace("custom-", "")));
                            } else {
                              setSelectedRoleType("builtin");
                              setInviteRole(value as "ADMIN" | "DEVELOPER" | "VIEWER");
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1.5 text-xs font-semibold text-neutral-400">
                              {t.inviteModal.builtin}
                            </div>
                            <SelectItem value="ADMIN">
                              {t.roles.ADMIN} - {ROLE_DESCRIPTIONS.ADMIN}
                            </SelectItem>
                            <SelectItem value="DEVELOPER">
                              {t.roles.DEVELOPER} - {ROLE_DESCRIPTIONS.DEVELOPER}
                            </SelectItem>
                            <SelectItem value="VIEWER">
                              {t.roles.VIEWER} - {ROLE_DESCRIPTIONS.VIEWER}
                            </SelectItem>
                            {customRoles.length > 0 && (
                              <>
                                <div className="mt-2 border-t border-white/10 px-2 py-1.5 text-xs font-semibold text-neutral-400">
                                  {t.custom_roles}
                                </div>
                                {customRoles.map((role) => (
                                  <SelectItem key={role.id} value={`custom-${role.id}`}>
                                    {role.name}
                                    {role.description && ` - ${role.description}`}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreateRoleModalOpen(true)}
                        className="px-3"
                        title="Create custom role"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-neutral-200">
                      <Lock className="h-3 w-3" />
                      {selectedRoleType === "builtin"
                        ? `${inviteRole} Permissions`
                        : `${customRoles.find((r) => r.id === selectedCustomRoleId)?.name || "Custom Role"} Permissions`}
                    </Label>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex flex-wrap gap-2">
                        {(selectedRoleType === "builtin"
                          ? ROLE_DEFAULT_PERMISSIONS[inviteRole]
                          : customRoles.find((r) => r.id === selectedCustomRoleId)?.permissions ||
                            []
                        ).map((permission) => {
                          const perm = AVAILABLE_PERMISSIONS.find((p) => p.value === permission);
                          return perm ? (
                            <Badge key={permission} variant="info" className="text-xs">
                              {perm.label}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="flex-1 rounded-full"
                    >
                      {t.inviteModal.cancel}
                    </Button>
                    <Button
                      type="submit"
                      disabled={inviting}
                      className="bg-gradient-kleff flex-1 rounded-full font-semibold text-black"
                    >
                      {inviting ? t.inviteModal.inviting : t.inviteModal.invite_button}
                    </Button>
                  </div>
                </form>
              </SoftPanel>
            </div>
          </div>,
          document.body
        )}

      {isCreateRoleModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setIsCreateRoleModalOpen(false)}
          >
            <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <SoftPanel>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-50">
                    {t.createRoleModal.title}
                  </h3>
                  <button
                    onClick={() => setIsCreateRoleModalOpen(false)}
                    className="text-neutral-400 transition-colors hover:text-neutral-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mb-6 text-sm text-neutral-400">{t.createRoleModal.subtitle}</p>

                <form onSubmit={handleCreateRole} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roleName" className="text-sm font-medium text-neutral-200">
                      {t.createRoleModal.role_name}
                    </Label>
                    <Input
                      id="roleName"
                      type="text"
                      placeholder={t.createRoleModal.role_name_placeholder}
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="roleDescription"
                      className="text-sm font-medium text-neutral-200"
                    >
                      {t.createRoleModal.description}
                    </Label>
                    <textarea
                      id="roleDescription"
                      placeholder={t.createRoleModal.description_placeholder}
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-neutral-200">
                      {t.createRoleModal.permissions}
                    </Label>
                    <p className="mb-3 text-xs text-neutral-500">
                      {t.createRoleModal.select_permissions}
                    </p>
                    <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-3">
                      {AVAILABLE_PERMISSIONS.map((permission) => (
                        <button
                          key={permission.value}
                          type="button"
                          onClick={() => {
                            setNewRolePermissions((prev) =>
                              prev.includes(permission.value)
                                ? prev.filter((p) => p !== permission.value)
                                : [...prev, permission.value]
                            );
                          }}
                          className="flex items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-white/10"
                        >
                          {newRolePermissions.includes(permission.value) ? (
                            <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                          ) : (
                            <Square className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-neutral-200">
                              {permission.label}
                            </div>
                            <div className="text-[10px] text-neutral-500">
                              {permission.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsCreateRoleModalOpen(false)}
                      className="flex-1 rounded-full"
                    >
                      {t.createRoleModal.cancel}
                    </Button>
                    <Button
                      type="submit"
                      disabled={creatingRole || !newRoleName || newRolePermissions.length === 0}
                      className="bg-gradient-kleff flex-1 rounded-full font-semibold text-black"
                    >
                      {creatingRole ? t.createRoleModal.creating : t.createRoleModal.create_button}
                    </Button>
                  </div>
                </form>
              </SoftPanel>
            </div>
          </div>,
          document.body
        )}
    </div>,
    document.body
  );
}

import { useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Label } from "@shared/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/ui/Table";
import { Badge } from "@shared/ui/Badge";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { UserPlus, Trash2, X, Mail, Edit2 } from "lucide-react";
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
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

interface Collaborator {
  id: number;
  userId: string;
  projectId: string;
  role: "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";
  collaboratorStatus: string;
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
}

interface TeamManagementProps {
  projectId: string;
  canManageCollaborators: boolean;
}

export function TeamManagement({ projectId, canManageCollaborators }: TeamManagementProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "DEVELOPER" | "VIEWER">("DEVELOPER");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<"ADMIN" | "DEVELOPER" | "VIEWER">("DEVELOPER");
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].teamManagement;

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const data = await getProjectCollaborators(projectId);
      setCollaborators(data);
      setError(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.failed_load);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      const data = await getProjectInvitations(projectId);
      setInvitations(data);
    } catch (err: unknown) {
      console.error("Failed to load invitations:", err);
    }
  };

  useEffect(() => {
    loadCollaborators();
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();

    if (!inviteEmail) {
      setError(t.please_enter_email);
      return;
    }

    try {
      setInviting(true);
      setError(null);
      await createInvitation({
        projectId,
        inviteeEmail: inviteEmail,
        role: inviteRole
      });

      setSuccess(`${t.invitation_sent} ${inviteEmail}`);
      setIsModalOpen(false);
      setInviteEmail("");
      setInviteRole("DEVELOPER");
      await loadCollaborators();
      await loadInvitations();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.failed_invite);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await deleteCollaborator(projectId, userId);
      setSuccess(t.collaborator_removed);
      await loadCollaborators();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.failed_remove);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteInvitation = async (invitationId: number) => {
    try {
      await deleteInvitation(invitationId);
      setSuccess(t.invitation_deleted);
      await loadInvitations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.failed_delete_invitation);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    try {
      await updateCollaboratorRole(projectId, userId, editingRole);
      setSuccess(t.role_updated);
      setEditingUserId(null);
      await loadCollaborators();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || t.failed_update_role);
      setTimeout(() => setError(null), 3000);
    }
  };

  const startEditing = (collaborator: Collaborator) => {
    setEditingUserId(collaborator.userId);
    setEditingRole(collaborator.role as "ADMIN" | "DEVELOPER" | "VIEWER");
  };

  if (loading) {
    return <div className="text-sm text-neutral-400">{t.loading}</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-50">{t.title}</h3>
            <p className="text-sm text-neutral-400">
              {collaborators.length} {collaborators.length !== 1 ? t.members : t.member}
              {invitations.length > 0 &&
                ` • ${invitations.length} ${invitations.length !== 1 ? t.pending_invitations : t.pending_invitation}`}
            </p>
          </div>

          {canManageCollaborators && (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="rounded-full px-4 py-2 text-sm"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t.invite_member}
            </Button>
          )}
        </div>

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

        <div className="overflow-hidden rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 bg-white/5 hover:bg-white/5">
                <TableHead>{t.table.user_id}</TableHead>
                <TableHead>{t.table.role}</TableHead>
                <TableHead>{t.table.status}</TableHead>
                <TableHead>{t.table.joined}</TableHead>
                {canManageCollaborators && (
                  <TableHead className="w-[100px]">{t.table.actions}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManageCollaborators ? 5 : 4}
                    className="py-8 text-center text-neutral-400"
                  >
                    {t.no_members}
                  </TableCell>
                </TableRow>
              ) : (
                collaborators.map((collaborator) => (
                  <TableRow key={collaborator.id} className="hover:bg-white/5">
                    <TableCell className="font-mono text-sm text-neutral-300">
                      {collaborator.userId.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {editingUserId === collaborator.userId ? (
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
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="DEVELOPER">Developer</SelectItem>
                              <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateRole(collaborator.userId)}
                            className="h-8 bg-green-500/10 px-2 text-xs text-green-400 hover:bg-green-500/20"
                          >
                            {t.save}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUserId(null)}
                            className="h-8 px-2 text-xs"
                          >
                            {t.cancel}
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
                          {collaborator.role}
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
                        ? new Date(collaborator.acceptedAt).toLocaleDateString(
                            locale === "fr" ? "fr-CA" : "en-US"
                          )
                        : t.table.status}
                    </TableCell>
                    {canManageCollaborators && (
                      <TableCell>
                        {collaborator.role !== "OWNER" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(collaborator)}
                              className="p-2"
                              title={t.edit_role}
                            >
                              <Edit2 className="h-4 w-4 text-blue-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(collaborator.userId)}
                              className="p-2"
                              title={t.remove_collaborator}
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

        {/* Pending Invitations Section */}
        <div className="mt-6">
          <h4 className="text-md mb-3 flex items-center gap-2 font-semibold text-neutral-50">
            <Mail className="h-4 w-4" />
            {t.pending_title}
          </h4>
          <div className="overflow-hidden rounded-lg border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 bg-white/5 hover:bg-white/5">
                  <TableHead>{t.table.email}</TableHead>
                  <TableHead>{t.table.role}</TableHead>
                  <TableHead>{t.table.sent}</TableHead>
                  {canManageCollaborators && (
                    <TableHead className="w-[100px]">{t.table.actions}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManageCollaborators ? 4 : 3}
                      className="py-8 text-center text-neutral-400"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Mail className="mb-2 h-8 w-8 text-neutral-600" />
                        <p className="text-sm">{t.no_invitations}</p>
                        <p className="text-xs text-neutral-500">{t.invited_appear}</p>
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
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-400">
                        {new Date(invitation.createdAt).toLocaleDateString(
                          locale === "fr" ? "fr-CA" : "en-US"
                        )}
                      </TableCell>
                      {canManageCollaborators && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            className="p-2"
                            title={t.delete_invitation}
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
      </div>

      {/* Invite Modal */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <SoftPanel>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-50">{t.invite_modal.title}</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-neutral-400 transition-colors hover:text-neutral-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mb-6 text-sm text-neutral-400">{t.invite_modal.description}</p>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-neutral-200">
                      {t.invite_modal.email_label}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t.invite_modal.email_placeholder}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium text-neutral-200">
                      {t.invite_modal.role_label}
                    </Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value) =>
                        setInviteRole(value as "ADMIN" | "DEVELOPER" | "VIEWER")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin - {t.roles.ADMIN}</SelectItem>
                        <SelectItem value="DEVELOPER">Developer - {t.roles.DEVELOPER}</SelectItem>
                        <SelectItem value="VIEWER">Viewer - {t.roles.VIEWER}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 rounded-full"
                    >
                      {t.invite_modal.cancel}
                    </Button>
                    <Button
                      type="submit"
                      disabled={inviting}
                      className="bg-gradient-kleff flex-1 rounded-full font-semibold text-black"
                    >
                      {inviting ? t.invite_modal.sending : t.invite_modal.send_invitation}
                    </Button>
                  </div>
                </form>
              </SoftPanel>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

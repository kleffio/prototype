import { useState } from "react";
import { Input } from "@shared/ui/Input";
import { Label } from "@shared/ui/Label";
import { Badge } from "@shared/ui/Badge";
import { AlertTriangle, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@shared/ui/ConfirmationDialog";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
  isLoading?: boolean;
}

export function DeleteProjectModal({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  isLoading = false
}: DeleteProjectModalProps) {
  const [projectNameInput, setProjectNameInput] = useState("");

  const isProjectNameCorrect = projectNameInput === projectName;
  const isConfirmDisabled = !isProjectNameCorrect || isLoading;

  const handleConfirm = () => {
    if (isProjectNameCorrect) {
      onConfirm();
    }
  };

  const modalTitle = `Delete Project: ${projectName}`;
  const modalDescription =
    "Are you sure you want to delete this project? This will permanently remove all collaborators, cancel pending invites, and stop all running containers. A final invoice will be generated for your current usage period. This action cannot be undone.";

  return (
    <ConfirmationDialog
      open={isOpen}
      onOpenChange={onClose}
      title={modalTitle}
      description={modalDescription}
      confirmText={isLoading ? "Deleting..." : "Confirm Delete"}
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={onClose}
      variant="destructive"
      isLoading={isLoading}
      confirmDisabled={isConfirmDisabled}
      size="md"
    >
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div>
              <h3 className="font-semibold text-red-300">Irreversible Action</h3>
              <p className="text-sm text-red-400">
                This action cannot be undone. Please make sure this is what you want to do.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-name-input" className="text-sm font-medium text-neutral-300">
            To confirm, type the project name
          </Label>
          <Input
            id="project-name-input"
            value={projectNameInput}
            onChange={(e) => setProjectNameInput(e.target.value)}
            placeholder={projectName}
            className="border-white/20 bg-white/5 text-neutral-200 placeholder:text-neutral-500"
            disabled={isLoading}
          />
          {!isProjectNameCorrect && projectNameInput.length > 0 && (
            <p className="text-sm text-red-400">Project name does not match</p>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <Badge variant="destructive" className="text-xs font-semibold">
            <Trash2 className="mr-1 h-3 w-3" />
            Final Invoice
          </Badge>
          <span className="text-sm text-neutral-400">
            A final invoice will be generated for your current usage period.
          </span>
        </div>
      </div>
    </ConfirmationDialog>
  );
}

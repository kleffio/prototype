import { useState } from "react";
import { Input } from "@shared/ui/Input";
import { Label } from "@shared/ui/Label";
import { Badge } from "@shared/ui/Badge";
import { AlertTriangle, Trash2, Calendar, CheckCircle } from "lucide-react";
import { ConfirmationDialog } from "@shared/ui/ConfirmationDialog";
import type { Invoice } from "@features/billing/types/Invoice";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<{ invoice: Invoice }> | void;
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
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const isProjectNameCorrect = projectNameInput === projectName;
  const isConfirmDisabled = !isProjectNameCorrect || isLoading;

  const handleConfirm = async () => {
    if (isProjectNameCorrect) {
      try {
        const result = await onConfirm();
        if (result && result.invoice) {
          setGeneratedInvoice(result.invoice);
          setShowInvoice(true);
        }
      } catch (error) {
        console.error("Failed to delete project:", error);
        // Re-throw to let the parent handle the error
        throw error;
      }
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

        {/* Invoice Details Section */}
        {showInvoice && generatedInvoice && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="font-semibold text-emerald-300">Final Invoice Generated</h3>
                <p className="text-sm text-emerald-400">
                  Invoice #{generatedInvoice.invoiceId} - ${generatedInvoice.total.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium text-neutral-200">
                  ${generatedInvoice.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Taxes:</span>
                <span className="font-medium text-neutral-200">
                  ${generatedInvoice.taxes.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>CPU Usage:</span>
                <span className="font-medium text-neutral-200">
                  {generatedInvoice.totalCPU.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>RAM Usage:</span>
                <span className="font-medium text-neutral-200">
                  {generatedInvoice.totalRAM.toFixed(2)} GB
                </span>
              </div>
              <div className="flex justify-between">
                <span>Storage:</span>
                <span className="font-medium text-neutral-200">
                  {generatedInvoice.totalSTORAGE.toFixed(2)} GB
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant="destructive" className="text-xs font-semibold">
                  {generatedInvoice.status}
                </Badge>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Period: {new Date(generatedInvoice.startDate).toLocaleDateString()} -{" "}
                {new Date(generatedInvoice.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </ConfirmationDialog>
  );
}

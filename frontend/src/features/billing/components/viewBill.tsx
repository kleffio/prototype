import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@shared/ui/Button";
import { Spinner } from "@shared/ui/Spinner";
import { client } from "@shared/lib/client";

interface ViewBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  status: string;
}

interface PaymentResponse {
  url: string;
  sessionId: string;
}

export function ViewBillModal({ isOpen, onClose, invoiceId, status }: ViewBillModalProps) {
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handlePay = async () => {
    setPayLoading(true);
    setPayError(null);
    try {
      const { data } = await client.post<PaymentResponse>(`/api/v1/billing/pay/${invoiceId}`);
      window.location.href = data.url;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setPayError(error.response?.data?.error || "Payment failed");
      setPayLoading(false);
    }
  };

  if (!isOpen) return null;

  const isPaid = status.toLowerCase() === "paid";

  return (
    // Backdrop — scrollable wrapper so modal never clips on small screens
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal */}
      <div className="relative my-auto flex w-full max-w-md flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between rounded-t-2xl border-b border-white/10 bg-white/5 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-50">Bill Details</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <div className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
            <p className="mb-0.5 text-xs text-neutral-500">Invoice ID</p>
            <p className="font-mono text-sm break-all text-neutral-200">{invoiceId}</p>
          </div>

          <div className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
            <p className="mb-0.5 text-xs text-neutral-500">Status</p>
            <p
              className={`text-sm font-semibold ${isPaid ? "text-emerald-400" : "text-amber-400"}`}
            >
              {status.toUpperCase()}
            </p>
          </div>

          {payError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{payError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 rounded-b-2xl border-t border-white/10 bg-white/5 px-5 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="rounded-full px-4 py-2 text-sm">
              Close
            </Button>

            {!isPaid && (
              <Button
                onClick={handlePay}
                disabled={payLoading}
                className="bg-gradient-kleff flex min-w-[96px] items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-black"
              >
                {payLoading ? <Spinner className="h-4 w-4" /> : "Pay Now"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

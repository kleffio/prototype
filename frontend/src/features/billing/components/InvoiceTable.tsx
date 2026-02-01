import { useState, useEffect } from "react";
import { DollarSign, Calendar, X, Eye, Receipt, TrendingUp, CreditCard } from "lucide-react";
import { Button } from "@shared/ui/Button";
import { Spinner } from "@shared/ui/Spinner";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Badge } from "@shared/ui/Badge";
import type { Invoice } from "@features/billing/types/Invoice";
import { fetchInvoice } from "../api/viewInvoicesForProject";
import { handlePayNow } from "../api/handlePayNow";
import { usePermissions } from "@features/projects/hooks/usePermissions";

interface InvoiceTableProps {
  projectId: string;
  onInvoiceGenerated?: () => void; // Optional callback when an invoice is generated
}

export default function InvoiceTable({ projectId }: InvoiceTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const { canManageBilling, isLoading: permissionsLoading } = usePermissions(projectId);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!canManageBilling) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchInvoice(projectId);
        setInvoices(data);
      } catch (err: unknown) {
        const error = err as { message?: string };
        setError(error.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    if (!permissionsLoading) {
      loadInvoices();
    }
  }, [projectId, canManageBilling, permissionsLoading]);

  const getStatusBadge = (status: string) => {
    const config = {
      paid: { variant: "success" as const, label: "Paid" },
      pending: { variant: "warning" as const, label: "Pending" },
      overdue: { variant: "destructive" as const, label: "Overdue" }
    };

    const statusLower = status.toLowerCase();
    const { variant, label } = config[statusLower as keyof typeof config] || config.pending;

    return (
      <Badge variant={variant} className="text-[10px] font-semibold">
        {label}
      </Badge>
    );
  };

  const handlePay = () => {
    if (selectedInvoice) {
      handlePayNow(selectedInvoice.invoiceId, setPayError, setPayLoading);
    }
  };

  if (loading || permissionsLoading) {
    return (
      <SoftPanel className="p-12">
        <div className="flex justify-center">
          <Spinner />
        </div>
      </SoftPanel>
    );
  }

  if (!canManageBilling) {
    return null;
  }

  if (error) {
    return (
      <SoftPanel className="border-red-500/20 bg-red-500/5 p-8">
        <p className="text-center text-sm text-red-400">{error}</p>
      </SoftPanel>
    );
  }

  return (
    <SoftPanel className="p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2 ring-1 ring-emerald-500/20">
            <Receipt className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-50">Invoices</h2>
            <p className="text-xs text-neutral-500">
              {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {invoices.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-6 w-fit rounded-2xl bg-neutral-800/50 p-6">
            <DollarSign className="h-12 w-12 text-neutral-600" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-neutral-300">No invoices yet</h3>
          <p className="text-sm text-neutral-500">Invoices will appear here once generated.</p>
        </div>
      ) : (
        /* Invoices Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {invoices.map((invoice) => (
            <button
              key={invoice.invoiceId}
              onClick={() => setSelectedInvoice(invoice)}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-neutral-900/80 to-neutral-900/40 p-4 text-left transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="relative space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-500/10 p-1.5">
                      <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-neutral-400">
                      #{invoice.invoiceId.slice(0, 8)}
                    </span>
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>

                {/* Amount */}
                <div>
                  <p className="text-xs text-neutral-500">Total Amount</p>
                  <p className="text-2xl font-bold text-neutral-50">${invoice.total.toFixed(2)}</p>
                </div>

                {/* Period */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(invoice.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}{" "}
                    -{" "}
                    {new Date(invoice.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}
                  </span>
                </div>

                {/* View button */}
                <div className="flex items-center gap-1.5 pt-2 text-xs font-medium text-emerald-400 transition-colors group-hover:text-emerald-300">
                  <Eye className="h-3.5 w-3.5" />
                  View Details
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2 ring-1 ring-emerald-500/20">
                  <Receipt className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-50">
                    Invoice #{selectedInvoice.invoiceId.slice(0, 12)}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {new Date(selectedInvoice.startDate).toLocaleDateString()} -{" "}
                    {new Date(selectedInvoice.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg p-2 transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5 text-neutral-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 p-5">
              {/* Key Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/5">
                  <p className="mb-1 text-xs text-neutral-500">Status</p>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/5">
                  <p className="mb-1 text-xs text-neutral-500">Project ID</p>
                  <p className="truncate text-sm font-medium text-neutral-200">
                    {selectedInvoice.projectId}
                  </p>
                </div>
              </div>

              {/* Usage Breakdown */}
              <div className="space-y-3 rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/5">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                  <TrendingUp className="text-kleff-primary h-4 w-4" />
                  Usage Breakdown
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">CPU</span>
                    <span className="font-medium text-neutral-200">
                      {selectedInvoice.totalCPU.toFixed(2)} cores
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">RAM</span>
                    <span className="font-medium text-neutral-200">
                      {selectedInvoice.totalRAM.toFixed(2)} GB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Storage</span>
                    <span className="font-medium text-neutral-200">
                      {selectedInvoice.totalSTORAGE.toFixed(2)} GB
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="space-y-2 rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/5">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                  Payment Summary
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Subtotal</span>
                    <span className="font-medium text-neutral-200">
                      ${selectedInvoice.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Taxes</span>
                    <span className="font-medium text-neutral-200">
                      ${selectedInvoice.taxes.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2">
                    <span className="font-semibold text-neutral-50">Total</span>
                    <span className="text-lg font-bold text-emerald-400">
                      ${selectedInvoice.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {payError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-sm text-red-400">{payError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 border-t border-white/10 p-5">
              {selectedInvoice.status.toLowerCase() !== "paid" && (
                <Button
                  onClick={handlePay}
                  disabled={payLoading}
                  className="bg-gradient-kleff shadow-kleff-primary/20 flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-black shadow-lg"
                >
                  {payLoading ? (
                    <>
                      <Spinner size={16} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Now
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setSelectedInvoice(null)}
                className="rounded-xl px-4 py-2.5 text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </SoftPanel>
  );
}

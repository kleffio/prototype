import { useState } from "react";
import { X, DollarSign, FileText, Activity, Calendar } from "lucide-react";
import { Button } from "@shared/ui/Button";
import { Badge } from "@shared/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@shared/ui/Table";
import { Spinner } from "@shared/ui/Spinner";

interface UsageRecord {
  usageId: string;
  containerId: string;
  pricingModel: string;
  metric: string;
  quantity: number;
  recordedAt: string;
}

interface InvoiceItem {
  itemId: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Invoice {
  invoiceId: string;
  projectId: string;
  totalAmount: number;
  taxAmount: number;
  subtotal: number;
  status: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  createdAt: string;
}

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

type TabType = "invoices" | "usage" | "items";

export function BillingModal({ isOpen, onClose, projectId }: BillingModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("invoices");
  const [isLoading] = useState(false);

  const [invoices] = useState<Invoice[]>([
    {
      invoiceId: "inv_001",
      projectId: projectId,
      totalAmount: 156.8,
      taxAmount: 20.4,
      subtotal: 136.4,
      status: "PAID",
      billingPeriodStart: "2024-11-01",
      billingPeriodEnd: "2024-11-30",
      createdAt: "2024-12-01"
    }
  ]);

  const [usageRecords] = useState<UsageRecord[]>([
    {
      usageId: "usage_001",
      containerId: "container_001",
      pricingModel: "PAY_AS_YOU_GO",
      metric: "CPU_HOURS",
      quantity: 24.5,
      recordedAt: "2024-12-14"
    },
    {
      usageId: "usage_002",
      containerId: "container_002",
      pricingModel: "PAY_AS_YOU_GO",
      metric: "RAM_GB_HOURS",
      quantity: 48.0,
      recordedAt: "2024-12-14"
    }
  ]);

  const [invoiceItems] = useState<InvoiceItem[]>([
    {
      itemId: "item_001",
      invoiceId: "inv_001",
      description: "CPU Usage - 24.5 hours",
      quantity: 24.5,
      unitPrice: 2.0,
      totalPrice: 49.0
    },
    {
      itemId: "item_002",
      invoiceId: "inv_001",
      description: "RAM Usage - 48 GB-hours",
      quantity: 48.0,
      unitPrice: 1.5,
      totalPrice: 72.0
    }
  ]);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };

  return (
    // Backdrop: covers full screen, scrollable to handle very tall content on small screens
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal container: flex column so header/tabs/footer stay fixed, only content scrolls */}
      <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 to-neutral-800 shadow-2xl flex flex-col my-auto">

        {/* Header — fixed, never scrolls */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-50">Billing & Usage</h2>
              <p className="text-xs text-neutral-400">Project ID: {projectId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs — fixed, never scrolls */}
        <div className="flex-shrink-0 flex border-b border-white/10 bg-white/5 px-6">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "invoices"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            Invoices
          </button>
          <button
            onClick={() => setActiveTab("usage")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "usage"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Activity className="h-4 w-4" />
            Usage Records
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "items"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Invoice Items
          </button>
        </div>

        {/* Scrollable content — this is the ONLY part that scrolls */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              {/* Invoices Tab */}
              {activeTab === "invoices" && (
                <div className="space-y-4">
                  {invoices.length === 0 ? (
                    <div className="py-10 text-center">
                      <FileText className="mx-auto h-12 w-12 text-neutral-500" />
                      <p className="mt-3 text-sm text-neutral-400">No invoices found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-white/10 bg-white/5 hover:bg-white/5">
                          <TableHead>Invoice ID</TableHead>
                          <TableHead>Billing Period</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>Tax</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.invoiceId} className="hover:bg-white/5">
                            <TableCell className="font-mono text-xs text-neutral-300">
                              {invoice.invoiceId}
                            </TableCell>
                            <TableCell className="text-xs text-neutral-300">
                              {invoice.billingPeriodStart} to {invoice.billingPeriodEnd}
                            </TableCell>
                            <TableCell className="font-semibold text-neutral-200">
                              {formatCurrency(invoice.subtotal)}
                            </TableCell>
                            <TableCell className="text-neutral-300">
                              {formatCurrency(invoice.taxAmount)}
                            </TableCell>
                            <TableCell className="font-semibold text-emerald-400">
                              {formatCurrency(invoice.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge>{invoice.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-neutral-300">
                              {invoice.createdAt}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Usage Records Tab */}
              {activeTab === "usage" && (
                <div className="space-y-4">
                  {usageRecords.length === 0 ? (
                    <div className="py-10 text-center">
                      <Activity className="mx-auto h-12 w-12 text-neutral-500" />
                      <p className="mt-3 text-sm text-neutral-400">No usage records found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-white/10 bg-white/5 hover:bg-white/5">
                          <TableHead>Usage ID</TableHead>
                          <TableHead>Container</TableHead>
                          <TableHead>Metric</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Pricing Model</TableHead>
                          <TableHead>Recorded At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageRecords.map((record) => (
                          <TableRow key={record.usageId} className="hover:bg-white/5">
                            <TableCell className="font-mono text-xs text-neutral-300">
                              {record.usageId}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-neutral-300">
                              {record.containerId}
                            </TableCell>
                            <TableCell>
                              <Badge variant="info" className="text-xs">
                                {record.metric}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-neutral-200">
                              {record.quantity}
                            </TableCell>
                            <TableCell className="text-xs text-neutral-300">
                              {record.pricingModel}
                            </TableCell>
                            <TableCell className="text-xs text-neutral-300">
                              {record.recordedAt}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Invoice Items Tab */}
              {activeTab === "items" && (
                <div className="space-y-4">
                  {invoiceItems.length === 0 ? (
                    <div className="py-10 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-neutral-500" />
                      <p className="mt-3 text-sm text-neutral-400">No invoice items found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-white/10 bg-white/5 hover:bg-white/5">
                          <TableHead>Item ID</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item) => (
                          <TableRow key={item.itemId} className="hover:bg-white/5">
                            <TableCell className="font-mono text-xs text-neutral-300">
                              {item.itemId}
                            </TableCell>
                            <TableCell className="text-neutral-200">{item.description}</TableCell>
                            <TableCell className="text-neutral-300">{item.quantity}</TableCell>
                            <TableCell className="font-semibold text-neutral-200">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="font-semibold text-emerald-400">
                              {formatCurrency(item.totalPrice)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — fixed, never scrolls */}
        <div className="flex-shrink-0 border-t border-white/10 bg-white/5 px-6 py-4 rounded-b-2xl">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="ghost" className="rounded-full px-6 py-2 text-sm">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
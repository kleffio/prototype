import { useState, useEffect } from "react";
import { Button } from "@shared/ui/Button";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Badge } from "@shared/ui/Badge";
import { Mail, Check, X, FileText, DollarSign, AlertCircle } from "lucide-react";
import { getMyInvitations, acceptInvitation, rejectInvitation } from "../api/invitations";
import fetchProject from "../api/getProject";
import type { Invoice } from "@features/billing/types/Invoice";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";
import { fetchNotifications } from "@features/billing/api/getNotifications";
import { fetchAllNotifications } from "@features/billing/api/getAllNotifications";

const translations = {
  en: enTranslations,
  fr: frTranslations
};

interface Invitation {
  id: number;
  projectId: string;
  inviterId: string;
  inviteeEmail: string;
  role: "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";
  customRoleId?: number;
  customRoleName?: string;
  status: "PENDING" | "ACCEPTED" | "REFUSED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

interface InvitationWithProject extends Invitation {
  projectName?: string;
  projectDescription?: string | null;
}

interface PendingInvitationsProps {
  onUpdate?: () => void;
  projectId?: string; // Optional project ID for bills
}

type TabType = "invitations" | "bills";

export function PendingInvitations({ onUpdate, projectId }: PendingInvitationsProps) {
  const [locale, setLocaleState] = useState(getLocale());
  const [activeTab, setActiveTab] = useState<TabType>("invitations");
  const [invitations, setInvitations] = useState<InvitationWithProject[]>([]);
  const [bills, setBills] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].notifications;

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await getMyInvitations();
      const pending = (data || []).filter((inv) => inv.status === "PENDING");

      const enriched = await Promise.all(
        pending.map(async (inv) => {
          try {
            const project = await fetchProject(inv.projectId);
            return {
              ...inv,
              projectName: project.name,
              projectDescription: project.description
            };
          } catch (error) {
            console.error(`Failed to fetch project ${inv.projectId}:`, error);
            return inv;
          }
        })
      );

      setInvitations(enriched);
    } catch (error) {
      console.error("Failed to load invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBills = async () => {
    try {
      setLoading(true);
      
      // If projectId is provided, load bills for that specific project
      if (projectId) {
        const data = await fetchNotifications(projectId);
        setBills(data || []);
      } else {
        // If no projectId, load all notifications for the user across all projects
        const data = await fetchAllNotifications();
        setBills(data || []);
      }
    } catch (error) {
      console.error("Failed to load bills:", error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "invitations") {
      loadInvitations();
    } else if (activeTab === "bills") {
      loadBills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, projectId]);

  const handleAccept = async (invitationId: number) => {
    try {
      setProcessing(invitationId);
      await acceptInvitation(invitationId);
      await loadInvitations();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      alert(t.error_accept);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (invitationId: number) => {
    try {
      setProcessing(invitationId);
      await rejectInvitation(invitationId);
      await loadInvitations();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to reject invitation:", error);
      alert(t.error_reject);
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  // Check if we're a week before the 1st of next month (excluding the 1st itself)
  const isUpcomingBillWeek = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get the last day of current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Check if we're in the last 7 days of the month (excluding the 1st)
    // Days 24-31 depending on month length, but never on the 1st
    const daysUntilEndOfMonth = lastDayOfMonth - currentDay;

    return daysUntilEndOfMonth <= 6 && currentDay !== 1;
  };

  const showUpcomingBillNotification = isUpcomingBillWeek() && activeTab === "bills";

  if (loading) {
    return (
      <SoftPanel>
        <p className="text-sm text-neutral-400">{t.loading}</p>
      </SoftPanel>
    );
  }

  return (
    <SoftPanel>
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab("invitations")}
          className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "invitations"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Mail className="h-4 w-4" />
          Invitations
          {invitations.length > 0 && (
            <Badge variant="info" className="text-xs">
              {invitations.length}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("bills")}
          className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "bills"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Pending Bills
          {(bills.length > 0 || isUpcomingBillWeek()) && (
            <Badge variant="warning" className="text-xs">
              {bills.length + (isUpcomingBillWeek() ? 1 : 0)}
            </Badge>
          )}
        </button>
      </div>

      {/* Invitations Tab Content */}
      {activeTab === "invitations" && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-neutral-50">{t.title}</h3>
          </div>

          {invitations.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center py-8 text-center">
              <div>
                <Mail className="mx-auto mb-3 h-12 w-12 text-neutral-600" />
                <p className="text-sm text-neutral-400">{t.no_notifications}</p>
                <p className="mt-1 text-xs text-neutral-500">{t.all_caught_up}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium text-neutral-200">
                        {invitation.projectName || t.project_invitation}
                      </span>
                      <Badge variant="info" className="text-xs">
                        {invitation.customRoleName || invitation.role}
                      </Badge>
                    </div>
                    {invitation.projectDescription && (
                      <p className="mb-2 text-sm text-neutral-400">
                        {invitation.projectDescription}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500">
                      {t.expires}: {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invitation.id)}
                      disabled={processing === invitation.id}
                      className="rounded-full bg-green-500 px-4 text-white hover:bg-green-600"
                    >
                      <Check className="mr-1 h-4 w-4" />
                      {t.accept}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReject(invitation.id)}
                      disabled={processing === invitation.id}
                      className="rounded-full px-4"
                    >
                      <X className="mr-1 h-4 w-4" />
                      {t.decline}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bills Tab Content */}
      {activeTab === "bills" && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-neutral-50">Pending Bills</h3>
          </div>

          {/* Upcoming Bill Notification - Shows 7 days before end of month */}
          {showUpcomingBillNotification && (
            <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <p className="text-sm text-neutral-300">Your monthly bill is coming soon.</p>
              </div>
            </div>
          )}

          {bills.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center py-8 text-center">
              <div>
                <FileText className="mx-auto mb-3 h-12 w-12 text-neutral-600" />
                <p className="text-sm text-neutral-400">
                  {!projectId ? "No pending bills across your projects" : "No pending bills"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {!projectId ? "All invoices are paid across your projects" : "All invoices are paid"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((invoice) => (
                <div
                  key={invoice.invoiceId}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20"
                >
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-medium text-neutral-200">
                          Invoice #{invoice.invoiceId}
                        </span>
                        <Badge
                          variant={
                            invoice.status === "OVERDUE"
                              ? "destructive"
                              : invoice.status === "OPEN"
                                ? "warning"
                                : invoice.status === "PAID"
                                  ? "success"
                                  : "info"
                          }
                          className="text-xs"
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Period: {formatDate(invoice.startDate)} - {formatDate(invoice.endDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-neutral-100">
                        {formatCurrency(invoice.total)}
                      </p>
                      {invoice.totalPaid > 0 && (
                        <p className="text-xs text-green-400">
                          Paid: {formatCurrency(invoice.totalPaid)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Resource Usage */}
                  <div className="mb-3 grid grid-cols-3 gap-3 rounded-md bg-white/5 p-3">
                    <div>
                      <p className="text-xs text-neutral-500">CPU</p>
                      <p className="font-medium text-neutral-200">
                        {invoice.totalCPU.toFixed(2)} hrs
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">RAM</p>
                      <p className="font-medium text-neutral-200">
                        {invoice.totalRAM.toFixed(2)} GB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Storage</p>
                      <p className="font-medium text-neutral-200">
                        {invoice.totalSTORAGE.toFixed(2)} GB
                      </p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="mb-3 space-y-1 text-sm">
                    <div className="flex justify-between text-neutral-400">
                      <span>Subtotal</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Taxes</span>
                      <span>{formatCurrency(invoice.taxes)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-1 font-semibold text-neutral-200">
                      <span>Total</span>
                      <span>{formatCurrency(invoice.total)}</span>
                    </div>
                    {invoice.totalPaid > 0 && (
                      <div className="flex justify-between font-semibold text-yellow-400">
                        <span>Amount Due</span>
                        <span>{formatCurrency(invoice.total - invoice.totalPaid)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1 rounded-full">
                      <FileText className="mr-1 h-4 w-4" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded-full bg-green-500 text-white hover:bg-green-600"
                    >
                      <DollarSign className="mr-1 h-4 w-4" />
                      Pay {formatCurrency(invoice.total - invoice.totalPaid)}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </SoftPanel>
  );
}

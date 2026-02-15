import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/ui/Table";
import { Spinner } from "@shared/ui/Spinner";
import { Button } from "@shared/ui/Button";
import { X, Bell, Mail, DollarSign, Check, ArrowUpDown, FileText, AlertCircle } from "lucide-react";
import { getMyInvitations, acceptInvitation, rejectInvitation } from "../api/invitations";
import fetchProject from "../api/getProject";
import { fetchAllNotifications } from "@features/billing/api/getAllNotifications";
import type { Invoice } from "@features/billing/types/Invoice";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";

const translations = { en: enTranslations, fr: frTranslations };

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

interface NotificationItem {
    id: string | number;
    type: "INVITATION" | "BILL";
    date: string;
    title: string;
    description: string;
    status?: string;
    data: any;
}

export function NotificationModal({ isOpen, onClose, onUpdate }: NotificationModalProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | number | null>(null);
    const [locale, setLocaleState] = useState(getLocale());
    const [sortConfig, setSortConfig] = useState<{
        key: keyof NotificationItem;
        direction: "asc" | "desc";
    } | null>({ key: "date", direction: "desc" });

    useEffect(() => {
        const interval = setInterval(() => {
            const currentLocale = getLocale();
            if (currentLocale !== locale) setLocaleState(currentLocale);
        }, 100);
        return () => clearInterval(interval);
    }, [locale]);

    const t = translations[locale].notifications;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(amount);
    };

    const loadData = async () => {
        try {
            setLoading(true);

            const [invitationsData, billsData] = await Promise.all([
                getMyInvitations(),
                fetchAllNotifications()
            ]);

            const items: NotificationItem[] = [];

            // Process Invitations
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pendingInvitations = (invitationsData || []).filter((inv: any) => inv.status === "PENDING");

            // We need to fetch project details for invitations to get names
            const enrichedInvitations = await Promise.all(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pendingInvitations.map(async (inv: any) => {
                    let projectName = t.project_invitation;
                    let projectDesc: string | null = "";
                    try {
                        const project = await fetchProject(inv.projectId);
                        projectName = project.name;
                        projectDesc = project.description;
                    } catch (e) {
                        console.error(`Failed to fetch project ${inv.projectId}`, e);
                    }

                    return {
                        id: inv.id,
                        type: "INVITATION" as const,
                        date: inv.createdAt,
                        title: projectName,
                        description: projectDesc || `Role: ${inv.customRoleName || inv.role}`,
                        status: "PENDING",
                        data: inv
                    };
                })
            );
            items.push(...enrichedInvitations);

            // Process Bills
            const pendingBills = (billsData || []).filter((bill: Invoice) => bill.status === "OPEN" || bill.status === "OVERDUE");
            pendingBills.forEach((bill: Invoice) => {
                items.push({
                    id: `bill-${bill.invoiceId}`,
                    type: "BILL" as const,
                    date: bill.endDate instanceof Date ? bill.endDate.toISOString() : (bill.endDate as string),
                    title: `Invoice #${bill.invoiceId}`,
                    description: `${formatCurrency(bill.total)} - ${bill.status}`,
                    status: bill.status,
                    data: bill
                });
            });

            // Upcoming Bill Notification
            if (isUpcomingBillWeek()) {
                items.push({
                    id: "upcoming-bill",
                    type: "BILL" as const,
                    date: new Date().toISOString(),
                    title: "Upcoming Bill",
                    description: "Your monthly bill is coming soon.",
                    status: "UPCOMING",
                    data: null
                });
            }

            setNotifications(items);
        } catch (err) {
            console.error("Failed to load notifications", err);
        } finally {
            setLoading(false);
        }
    };

    const isUpcomingBillWeek = () => {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysUntilEndOfMonth = lastDayOfMonth - currentDay;
        return daysUntilEndOfMonth <= 6 && currentDay !== 1;
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const handleAccept = async (invitationId: number) => {
        try {
            setProcessing(invitationId);
            await acceptInvitation(invitationId);
            await loadData();
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
            await loadData();
            onUpdate?.();
        } catch (error) {
            console.error("Failed to reject invitation:", error);
            alert(t.error_reject);
        } finally {
            setProcessing(null);
        }
    };

    const handleSort = (key: keyof NotificationItem) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedNotifications = [...notifications].sort((a, b) => {
        if (!sortConfig) return 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let aValue: any = a[sortConfig.key];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let bValue: any = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <SoftPanel className="relative z-10 flex max-h-[85vh] w-full max-w-5xl flex-col border border-white/10 bg-black/80 shadow-2xl ring-1 shadow-black/80 ring-white/5">
                <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 p-6">
                    <div className="flex items-center gap-4">
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2.5 shadow-inner shadow-blue-500/5">
                            <Bell className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-white">{t.header_title}</h2>
                            <p className="mt-0.5 text-sm text-neutral-400">
                                {notifications.length > 0
                                    ? `${notifications.length} ${notifications.length === 1 ? "notification" : "notifications"}`
                                    : t.no_new_notifications}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="group rounded-full border border-transparent p-2 transition-colors hover:border-white/10 hover:bg-white/10"
                    >
                        <X className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden p-0">
                    <div className="custom-scrollbar h-full overflow-auto">
                        {loading ? (
                            <div className="flex h-64 flex-col items-center justify-center gap-3">
                                <Spinner className="h-8 w-8 text-blue-500" />
                                <p className="text-sm text-neutral-500">{t.loading}</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 z-10 border-b border-white/10 bg-black/90 backdrop-blur-sm">
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead
                                            className="w-[180px] cursor-pointer py-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-white"
                                            onClick={() => handleSort("type")}
                                        >
                                            <div className="flex items-center gap-2">
                                                Type
                                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer py-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-white"
                                            onClick={() => handleSort("title")}
                                        >
                                            <div className="flex items-center gap-2">
                                                Details
                                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="w-[150px] cursor-pointer py-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-white"
                                            onClick={() => handleSort("date")}
                                        >
                                            <div className="flex items-center gap-2">
                                                Date
                                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-[220px] py-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedNotifications.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-neutral-500">
                                                {t.no_notifications}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedNotifications.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className="group border-white/5 transition-colors hover:bg-white/[0.02]"
                                            >
                                                {/* TYPE */}
                                                <TableCell className="py-2.5 font-medium text-neutral-200">
                                                    <div className="flex items-center gap-3">
                                                        {item.type === "INVITATION" ? (
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 shadow-inner shadow-blue-500/5">
                                                                <Mail className="h-4 w-4" />
                                                            </div>
                                                        ) : item.status === "UPCOMING" ? (
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-400 shadow-inner shadow-yellow-500/5">
                                                                <AlertCircle className="h-4 w-4" />
                                                            </div>
                                                        ) : (
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-400 shadow-inner shadow-yellow-500/5">
                                                                <DollarSign className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                        <span className="text-sm text-neutral-300">
                                                            {item.type === "INVITATION" ? "Invitation" : "Bill"}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* DETAILS */}
                                                <TableCell className="py-2.5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-medium text-neutral-200">
                                                            {item.title}
                                                        </span>
                                                        <span className="text-xs text-neutral-500">
                                                            {item.description}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* DATE */}
                                                <TableCell className="py-2.5 font-mono text-xs whitespace-nowrap text-neutral-500">
                                                    {new Date(item.date).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric"
                                                    })}
                                                </TableCell>

                                                {/* ACTIONS */}
                                                <TableCell className="py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        {item.type === "INVITATION" ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleAccept(item.id as number)}
                                                                    disabled={processing === item.id}
                                                                    className="h-8 rounded-lg bg-green-500/10 px-3 text-xs font-medium text-green-400 ring-1 ring-green-500/20 hover:bg-green-500/20"
                                                                >
                                                                    {processing === item.id ? <Spinner className="h-3 w-3" /> : (
                                                                        <>
                                                                            <Check className="mr-1.5 h-3.5 w-3.5" />
                                                                            {t.accept}
                                                                        </>
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleReject(item.id as number)}
                                                                    disabled={processing === item.id}
                                                                    className="h-8 rounded-lg px-3 text-xs text-neutral-400 hover:text-red-400"
                                                                >
                                                                    <X className="mr-1.5 h-3.5 w-3.5" />
                                                                    {t.decline}
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    className="h-8 rounded-lg border border-white/5 bg-white/5 px-3 text-xs text-neutral-300 hover:bg-white/10"
                                                                >
                                                                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                                                                    Details
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 rounded-lg bg-green-500/10 px-3 text-xs font-medium text-green-400 ring-1 ring-green-500/20 hover:bg-green-500/20"
                                                                >
                                                                    <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                                                                    Pay
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </SoftPanel>
        </div>,
        document.body
    );
}

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/ui/Table";
import { Spinner } from "@shared/ui/Spinner";
import { X, Activity, ArrowUpDown } from "lucide-react";
import { getProjectActivityLogs } from "../api/getActionLogs";
import { getProjectCollaborators } from "../api/collaborators";
import type { ActionLog } from "../types/ActionLog";
import { getUsernameById } from "@features/users/api/getUsernameById";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/Select";

interface ActionLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    ownerId: string;
}

export function ActionLogModal({ isOpen, onClose, projectId, ownerId }: ActionLogModalProps) {
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usernames, setUsernames] = useState<Record<string, string>>({});
    const [sortConfig, setSortConfig] = useState<{ key: keyof ActionLog | 'collaboratorName'; direction: 'asc' | 'desc' } | null>(null);
    const [selectedCollaborator, setSelectedCollaborator] = useState<string>("all");

    useEffect(() => {
        if (isOpen) {
            loadLogs();
        }
    }, [isOpen, projectId]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const [logsData, collaboratorsData] = await Promise.all([
                getProjectActivityLogs(projectId),
                getProjectCollaborators(projectId)
            ]);

            setLogs(logsData);
            setError(null);

            // Collect all relevant user IDs (both eager actors and current collaborators)
            const logUserIds = logsData.map(log => log.collaborator);
            const collaboratorUserIds = (collaboratorsData as any[]).map(c => c.userId);
            const allUserIds = Array.from(new Set([...logUserIds, ...collaboratorUserIds]));

            // Fetch usernames for all
            const nameMap: Record<string, string> = { ...usernames };

            await Promise.all(
                allUserIds.map(async (userId) => {
                    if (!nameMap[userId]) {
                        try {
                            const name = await getUsernameById(userId);
                            nameMap[userId] = name;
                        } catch (e) {
                            console.warn(`Failed to fetch username for ${userId}`, e);
                            nameMap[userId] = userId; // Fallback to ID
                        }
                    }
                })
            );
            setUsernames(nameMap);

        } catch (err) {
            console.error("Error loading logs or collaborators:", err);
            setError("Failed to load activity logs.");
        } finally {
            setLoading(false);
        }
    };

    const formatAction = (action: string) => {
        return action
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const formatDetails = (details: any): React.ReactNode => {
        if (!details) return "-";

        let parsedDetails: Record<string, any> = {};

        // 1. Try to treat as object if it already is
        if (typeof details === 'object') {
            parsedDetails = details;
        }
        // 2. Try to parse as JSON string
        else if (typeof details === 'string' && (details.startsWith("{") || details.startsWith("["))) {
            try {
                parsedDetails = JSON.parse(details);
            } catch (e) {
                // Not JSON, fall through to Java toString parser
                void e;
            }
        }

        // Check if we successfully parsed something
        if (Object.keys(parsedDetails).length > 0) {
            return (
                <div className="flex flex-col gap-1.5 text-xs">
                    {Object.entries(parsedDetails).map(([key, value]) => {
                        // Skip internal keys or name (already shown in action column)
                        if (key === 'name' || key === 'container_name' || key === 'target_user_id') return null;

                        // Environment Variable specific formatting
                        if (key === 'added_vars' && Array.isArray(value)) {
                            return (
                                <div key={key} className="flex flex-col gap-0.5">
                                    <span className="text-green-400 font-medium">Added Env Vars:</span>
                                    {value.map((v: string) => <span key={v} className="text-neutral-400 pl-2">• {v}</span>)}
                                </div>
                            );
                        }
                        if (key === 'deleted_vars' && Array.isArray(value)) {
                            return (
                                <div key={key} className="flex flex-col gap-0.5">
                                    <span className="text-red-400 font-medium">Deleted Env Vars:</span>
                                    {value.map((v: string) => <span key={v} className="text-neutral-400 pl-2">• {v}</span>)}
                                </div>
                            );
                        }
                        if (key === 'updated_vars' && Array.isArray(value)) {
                            return (
                                <div key={key} className="flex flex-col gap-0.5">
                                    <span className="text-amber-400 font-medium">Updated Env Vars:</span>
                                    {value.map((v: string) => <span key={v} className="text-neutral-400 pl-2">• {v}</span>)}
                                </div>
                            );
                        }
                        if (key === 'old_role' && parsedDetails['new_role']) {
                            return (
                                <div key="role_change" className="flex gap-1">
                                    <span className="text-neutral-500 font-medium">Role:</span>
                                    <span className="text-neutral-300">
                                        {value} <span className="text-neutral-600">→</span> {parsedDetails['new_role']}
                                    </span>
                                </div>
                            );
                        }
                        if (key === 'new_role') return null; // handled above

                        // Fallback for other keys
                        return (
                            <div key={key} className="flex gap-1">
                                <span className="text-neutral-500 font-medium">
                                    {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}:
                                </span>
                                <span className="text-neutral-300">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                            </div>
                        );
                    })}
                    {parsedDetails['target_user_id'] && (
                        <div className="flex gap-1 pt-0.5 border-t border-white/5 mt-1">
                            <span className="text-neutral-500 font-medium">Target User:</span>
                            <span className="text-neutral-300 font-mono">
                                {usernames[parsedDetails['target_user_id']] || parsedDetails['target_user_id']}
                            </span>
                        </div>
                    )}
                </div>
            );
        }

        // Legacy Java toString format: {key=value, key2=value}
        if (typeof details === 'string' && details.startsWith("{") && details.endsWith("}")) {
            const content = details.slice(1, -1);
            if (!content) return "-";

            const pairs = content.split(', ');
            return (
                <div className="flex flex-col gap-1">
                    {pairs.map((pair, i) => {
                        const [key, ...values] = pair.split('=');
                        const value = values.join('='); // Handle values containing =
                        if (!key || !value) return <span key={i}>{pair}</span>;

                        return (
                            <div key={i} className="flex gap-1 text-xs">
                                <span className="text-neutral-500 font-medium">
                                    {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}:
                                </span>
                                <span className="text-neutral-300">{value}</span>
                            </div>
                        );
                    })}
                </div>
            );
        }

        return String(details);
    };

    const getLogDetails = (log: ActionLog) => {
        let parsedDetails: any = {};
        let resourceName = "";
        let isJson = false;

        try {
            if (log.details && typeof log.details === 'string') {
                if (log.details.startsWith('{') || log.details.startsWith('[')) {
                    parsedDetails = JSON.parse(log.details);
                    isJson = true;
                }
            } else if (typeof log.details === 'object') {
                parsedDetails = log.details;
                isJson = true;
            }
        } catch (e) {
            // Failed to parse JSON, stick to string
            void e;
        }

        // Extract Resource Name
        if (isJson) {
            resourceName = parsedDetails.name || parsedDetails.container_name || "";
        }
        // Fallback for Legacy Java toString format: {name=MyContainer}
        else if (log.details && typeof log.details === 'string') {
            const match = log.details.match(/name=([^,|}]+)/);
            if (match && match[1]) {
                resourceName = match[1].trim();
            }
        }

        return { parsedDetails, resourceName, isJson };
    };

    const handleSort = (key: keyof ActionLog | 'collaboratorName') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Use all loaded usernames for the filter dropdown, excluding the project owner
    const allKnownCollaborators = Object.keys(usernames).filter(id => id !== ownerId);

    const sortedLogs = [...logs]
        .filter(log => log.collaborator !== ownerId)
        .filter(log => selectedCollaborator === "all" || log.collaborator === selectedCollaborator)
        .sort((a, b) => {
            if (!sortConfig) return 0;

            let aValue: any = a[sortConfig.key as keyof ActionLog];
            let bValue: any = b[sortConfig.key as keyof ActionLog];

            if (sortConfig.key === 'collaboratorName') {
                aValue = (usernames[a.collaborator] || a.collaborator).toLowerCase();
                bValue = (usernames[b.collaborator] || b.collaborator).toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <SoftPanel className="relative z-10 w-full max-w-6xl max-h-[85vh] flex flex-col border border-white/10 bg-black/80 shadow-2xl shadow-black/80 ring-1 ring-white/5">
                <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 shadow-inner shadow-amber-500/5">
                                <Activity className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Project Activity</h2>
                                <p className="text-sm text-neutral-400 mt-0.5">History of changes and deployments</p>
                            </div>
                        </div>

                        {/* Collaborator Filter */}
                        <div className="w-56">
                            <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                                <SelectTrigger className="h-9 bg-white/5 border-white/10 text-xs text-white">
                                    <SelectValue placeholder="All Collaborators" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Collaborators</SelectItem>
                                    {allKnownCollaborators.map(id => (
                                        <SelectItem key={id} value={id}>
                                            {usernames[id] || id.substring(0, 8)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="group p-2 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                    >
                        <X className="h-5 w-5 text-neutral-500 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden p-0">
                    <div className="h-full overflow-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Spinner className="w-8 h-8 text-amber-500" />
                                <p className="text-sm text-neutral-500">Loading activity logs...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-2">
                                <div className="p-3 bg-red-500/10 rounded-full">
                                    <X className="h-6 w-6 text-red-400" />
                                </div>
                                <p className="text-red-400 font-medium">{error}</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 border-b border-white/10">
                                    <TableRow className="hover:bg-transparent border-white/5">
                                        <TableHead
                                            className="w-[200px] cursor-pointer hover:text-white transition-colors py-4 uppercase tracking-wider text-xs font-semibold text-neutral-500"
                                            onClick={() => handleSort('action')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Action
                                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="w-[180px] cursor-pointer hover:text-white transition-colors py-4 uppercase tracking-wider text-xs font-semibold text-neutral-500"
                                            onClick={() => handleSort('collaboratorName')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Collaborator
                                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="w-[180px] cursor-pointer hover:text-white transition-colors py-4 uppercase tracking-wider text-xs font-semibold text-neutral-500"
                                            onClick={() => handleSort('timestamp')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Date
                                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="py-4 uppercase tracking-wider text-xs font-semibold text-neutral-500">
                                            Details
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-neutral-500">
                                                No activity recorded yet
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedLogs.map((log) => {
                                            const { parsedDetails, resourceName, isJson } = getLogDetails(log);

                                            return (
                                                <TableRow key={log.id} className="hover:bg-white/[0.02] border-white/5 transition-colors group">
                                                    <TableCell className="font-medium text-neutral-200 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{formatAction(log.action)}</span>
                                                            {resourceName && (
                                                                <span className="text-xs text-amber-500/80 font-normal">
                                                                    — {resourceName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-neutral-300 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center text-[9px] text-neutral-400 font-medium group-hover:border-white/20 transition-colors">
                                                                {(usernames[log.collaborator] || log.collaborator).charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-xs text-neutral-400">
                                                                {usernames[log.collaborator] || <span className="font-mono opacity-50">{log.collaborator.substring(0, 8)}...</span>}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-neutral-500 whitespace-nowrap py-2.5 text-xs font-mono">
                                                        {new Date(log.timestamp).toLocaleString(undefined, {
                                                            month: 'numeric',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: 'numeric',
                                                            minute: 'numeric',
                                                            hour12: true
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-neutral-500 max-w-md py-2.5" title={typeof log.details === 'string' ? log.details : ""}>
                                                        {isJson ? formatDetails(parsedDetails) : formatDetails(log.details)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })

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

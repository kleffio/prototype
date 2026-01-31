import { client } from "@shared/lib/client";
import type { ActionLog } from "../types/ActionLog";

export const getProjectActivityLogs = async (projectId: string): Promise<ActionLog[]> => {
    try {
        const response = await client.get<ActionLog[]>(`/api/v1/projects/${projectId}/activity`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch project activity logs:", error);
        throw error;
    }
};

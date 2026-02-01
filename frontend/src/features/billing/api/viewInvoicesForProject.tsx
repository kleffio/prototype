import type { Invoice } from "@features/billing/types/Invoice";
import { client } from "@shared/lib/client";

export async function fetchInvoice(projectId: string): Promise<Invoice[]> {
  const res = await client.get<Invoice[]>(`/api/v1/billing/${projectId}/invoices/`);
  return res.data;
}

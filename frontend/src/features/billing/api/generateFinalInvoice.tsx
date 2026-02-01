import type { Invoice } from "@features/billing/types/Invoice";
import { client } from "@shared/lib/client";

export async function generateFinalInvoice(projectId: string): Promise<Invoice> {
  const res = await client.delete<Invoice>(`/api/v1/billing/${projectId}/final-invoice`);
  return res.data;
}

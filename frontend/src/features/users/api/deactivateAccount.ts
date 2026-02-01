import { client } from "@shared/lib/client";

export interface DeactivateAccountResponse {
  message: string;
}

export async function deactivateAccount(): Promise<DeactivateAccountResponse> {
  const response = await client.delete<DeactivateAccountResponse>("/api/v1/users/me/deactivate");
  return response.data;
}

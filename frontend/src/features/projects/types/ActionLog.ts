export interface ActionLog {
  id: string;
  action: string;
  collaborator: string;
  timestamp: string;
  details?: string;
  resourceType?: string;
}

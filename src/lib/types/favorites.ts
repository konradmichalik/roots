export interface FavoriteEventMatch {
  pattern: string;
  matchType: 'contains' | 'exact' | 'startsWith';
}

export interface Favorite {
  id: string;
  name: string;
  projectId: number;
  taskId: number;
  projectName: string;
  taskName: string;
  customerName: string;
  defaultHours?: number;
  description?: string;
  eventMatch?: FavoriteEventMatch;
  sortOrder: number;
  createdAt: string;
}

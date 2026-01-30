import type { ReconciliationFilter } from '../types';
import { logger } from '../utils/logger';

export const reconciliationState = $state({
  isOpen: false,
  filter: 'all' as ReconciliationFilter
});

export function toggleReconciliation(): void {
  reconciliationState.isOpen = !reconciliationState.isOpen;
  logger.store('reconciliation', reconciliationState.isOpen ? 'Opened' : 'Closed');
}

export function setReconciliationFilter(filter: ReconciliationFilter): void {
  reconciliationState.filter = filter;
}

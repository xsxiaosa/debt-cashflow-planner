export type {
  DebtItem,
  DebtDetail,
  MonthlyPlan,
  InitialDebtSummary,
  DebtPlanResponse,
} from './debt';

// Re-export debt validation functions from debtStorage
export { isValidDebtItem, isValidDebtList } from '../utils/debtStorage';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

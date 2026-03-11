import { defaultDebts } from '../data/defaultDebts';
import { DebtItem } from '../types/debt';

const STORAGE_KEY = 'debt-planner:debts';
const repaymentMonthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function normalizeDebtItem(debt: DebtItem): DebtItem {
  const trimmedMonth = debt.nextRepaymentMonth?.trim() ?? '';

  return {
    category: String(debt.category ?? '').trim(),
    totalAmount: Number(debt.totalAmount),
    remainingPeriods: Number(debt.remainingPeriods),
    monthlyPayment: Number(debt.monthlyPayment),
    nextRepaymentMonth: trimmedMonth || undefined
  };
}

export function isValidDebtItem(debt: unknown): debt is DebtItem {
  if (!debt || typeof debt !== 'object' || Array.isArray(debt)) {
    return false;
  }

  const candidate = debt as DebtItem;

  return (
    typeof candidate.category === 'string' &&
    candidate.category.trim().length > 0 &&
    typeof candidate.totalAmount === 'number' &&
    Number.isFinite(candidate.totalAmount) &&
    candidate.totalAmount >= 0 &&
    typeof candidate.remainingPeriods === 'number' &&
    Number.isInteger(candidate.remainingPeriods) &&
    candidate.remainingPeriods >= 0 &&
    typeof candidate.monthlyPayment === 'number' &&
    Number.isFinite(candidate.monthlyPayment) &&
    candidate.monthlyPayment >= 0 &&
    (
      candidate.nextRepaymentMonth === undefined ||
      candidate.nextRepaymentMonth === null ||
      repaymentMonthPattern.test(candidate.nextRepaymentMonth)
    )
  );
}

export function isValidDebtList(debts: unknown): debts is DebtItem[] {
  return Array.isArray(debts) && debts.every(isValidDebtItem);
}

export function loadDebtsFromStorage(): DebtItem[] {
  if (typeof window === 'undefined') {
    return defaultDebts;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return defaultDebts;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isValidDebtList(parsedValue)) {
      throw new Error('本地债务数据格式无效');
    }

    return parsedValue.map(normalizeDebtItem);
  } catch (error) {
    console.warn('读取本地债务数据失败，已回退到默认示例数据。', error);
    return defaultDebts;
  }
}

export function saveDebtsToStorage(debts: DebtItem[]): DebtItem[] {
  const normalizedDebts = debts.map(normalizeDebtItem);

  if (!isValidDebtList(normalizedDebts)) {
    throw new Error('待保存的债务数据格式不合法');
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedDebts));
  }

  return normalizedDebts;
}

export function resetDebtsToDefault(): DebtItem[] {
  return saveDebtsToStorage(defaultDebts);
}

export function hasStoredDebts(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.localStorage.getItem(STORAGE_KEY));
}

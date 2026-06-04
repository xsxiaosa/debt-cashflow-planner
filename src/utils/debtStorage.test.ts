import { describe, expect, it } from '@jest/globals';
import { isValidDebtItem, isValidDebtList, saveDebtsToStorage } from './debtStorage';
import type { DebtItem } from '../types/debt';

describe('debtStorage validation', () => {
  it('rejects legacy debt items without annual interest rate', () => {
    expect(
      isValidDebtItem({
        category: '旧格式',
        totalAmount: 3000,
        remainingPeriods: 3,
        monthlyPayment: 1000
      })
    ).toBe(false);
  });

  it('rejects legacy debt items that still include fixed monthly payment', () => {
    expect(
      isValidDebtItem({
        category: '旧格式',
        totalAmount: 3000,
        remainingPeriods: 3,
        monthlyPayment: 1000,
        annualInterestRate: 7.2
      })
    ).toBe(false);
  });

  it('accepts the new debt structure and normalizes it before saving', () => {
    const debts: DebtItem[] = [
      {
        category: ' 新分期 ',
        totalAmount: 12000,
        remainingPeriods: 12,
        annualInterestRate: 7.2,
        nextRepaymentMonth: '2026-07'
      }
    ];

    const savedDebts = saveDebtsToStorage(debts);

    expect(isValidDebtList(savedDebts)).toBe(true);
    expect(savedDebts).toEqual([
      {
        category: '新分期',
        totalAmount: 12000,
        remainingPeriods: 12,
        annualInterestRate: 7.2,
        nextRepaymentMonth: '2026-07'
      }
    ]);
  });

  it('rejects invalid interest, period, and repayment month values', () => {
    expect(
      isValidDebtItem({
        category: '负利率',
        totalAmount: 3000,
        remainingPeriods: 3,
        annualInterestRate: -1
      })
    ).toBe(false);

    expect(
      isValidDebtItem({
        category: '零期数',
        totalAmount: 3000,
        remainingPeriods: 0,
        annualInterestRate: 0
      })
    ).toBe(false);

    expect(
      isValidDebtItem({
        category: '错月份',
        totalAmount: 3000,
        remainingPeriods: 3,
        annualInterestRate: 0,
        nextRepaymentMonth: '2026-13'
      })
    ).toBe(false);
  });
});

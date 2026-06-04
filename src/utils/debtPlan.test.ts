import { describe, expect, it } from '@jest/globals';
import { calculateDebtPlan } from './debtPlan';
import type { DebtItem } from '../types/debt';

describe('calculateDebtPlan', () => {
  it('starts the repayment plan from the supplied current month', () => {
    const debts: DebtItem[] = [
      {
        category: '信用卡分期',
        totalAmount: 3000,
        remainingPeriods: 3,
        annualInterestRate: 0
      }
    ];

    const plan = calculateDebtPlan(debts, 10000, 0, 3, new Date(2026, 5, 4));

    expect(plan.startMonth).toBe('2026-06');
    expect(plan.endMonth).toBe('2026-08');
    expect(plan.monthlyPlans.map((monthPlan) => monthPlan.month)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08'
    ]);
  });

  it('keeps future next repayment months inactive until that month is reached', () => {
    const debts: DebtItem[] = [
      {
        category: '延期还款',
        totalAmount: 2000,
        remainingPeriods: 2,
        annualInterestRate: 0,
        nextRepaymentMonth: '2026-07'
      }
    ];

    const plan = calculateDebtPlan(debts, 10000, 0, 2, new Date(2026, 5, 4));

    expect(plan.monthlyPlans[0].debts[0].payment).toBe(0);
    expect(plan.monthlyPlans[0].debts[0].remainingPeriodsAfter).toBe(2);
    expect(plan.monthlyPlans[1].debts[0].payment).toBe(1000);
    expect(plan.monthlyPlans[1].debts[0].remainingPeriodsAfter).toBe(1);
  });

  it('skips installments that occurred before the plan start month', () => {
    const debts: DebtItem[] = [
      {
        category: '浦发1',
        totalAmount: 50000,
        remainingPeriods: 12,
        annualInterestRate: 3.3,
        nextRepaymentMonth: '2026-02'
      }
    ];

    const plan = calculateDebtPlan(debts, 10000, 0, 12, new Date(2026, 5, 4));

    expect(plan.monthlyPlans[0].debts[0]).toMatchObject({
      payment: expect.any(Number),
      remainingPeriodsBefore: 8,
      remainingPeriodsAfter: 7
    });
    expect(plan.monthlyPlans[7].month).toBe('2027-01');
    expect(plan.monthlyPlans[7].debts[0]).toMatchObject({
      remainingPeriodsBefore: 1,
      remainingPeriodsAfter: 0
    });
    expect(plan.monthlyPlans[8].month).toBe('2027-02');
    expect(plan.monthlyPlans[8].debts[0].payment).toBe(0);
  });

  it('reports total outstanding payment across all remaining installments', () => {
    const debts: DebtItem[] = [
      {
        category: '短期免息',
        totalAmount: 3000,
        remainingPeriods: 3,
        annualInterestRate: 0
      },
      {
        category: '历史开始',
        totalAmount: 1200,
        remainingPeriods: 12,
        annualInterestRate: 0,
        nextRepaymentMonth: '2026-02'
      },
      {
        category: '计划外长期',
        totalAmount: 12000,
        remainingPeriods: 12,
        annualInterestRate: 12
      }
    ];

    const plan = calculateDebtPlan(debts, 10000, 0, 2, new Date(2026, 5, 4));

    expect(plan.annualTotalRepayment).toBeCloseTo(4332.38, 2);
    expect(plan.initialDebtSummary.totalOutstandingPayment).toBeCloseTo(16594.23, 2);
  });

  it('splits zero-interest installment payments evenly across principal', () => {
    const debts: DebtItem[] = [
      {
        category: '免息分期',
        totalAmount: 3000,
        remainingPeriods: 3,
        annualInterestRate: 0
      }
    ];

    const plan = calculateDebtPlan(debts, 10000, 0, 3, new Date(2026, 5, 4));

    expect(plan.monthlyPlans.map((month) => month.totalRepayment)).toEqual([1000, 1000, 1000]);
    expect(plan.monthlyPlans[0].debts[0]).toMatchObject({
      payment: 1000,
      principal: 1000,
      interest: 0,
      remainingPrincipalAfter: 2000
    });
    expect(plan.monthlyPlans[2].debts[0]).toMatchObject({
      payment: 1000,
      principal: 1000,
      interest: 0,
      remainingPrincipalAfter: 0
    });
  });

  it('uses annuity payments and exposes principal and interest for interest-bearing debts', () => {
    const debts: DebtItem[] = [
      {
        category: '消费贷',
        totalAmount: 12000,
        remainingPeriods: 12,
        annualInterestRate: 12
      }
    ];

    const plan = calculateDebtPlan(debts, 10000, 0, 2, new Date(2026, 5, 4));
    const firstDebt = plan.monthlyPlans[0].debts[0];

    expect(firstDebt.monthlyPayment).toBeCloseTo(1066.19, 2);
    expect(firstDebt.payment).toBeCloseTo(1066.19, 2);
    expect(firstDebt.interest).toBeCloseTo(120, 2);
    expect(firstDebt.principal).toBeCloseTo(946.19, 2);
    expect(firstDebt.remainingPrincipalAfter).toBeCloseTo(11053.81, 2);
    expect(plan.initialDebtSummary.totalMonthlyPayment).toBeCloseTo(1066.19, 2);
    expect(plan.totalInterest).toBeCloseTo(
      plan.monthlyPlans.reduce((sum, month) => sum + month.totalInterest, 0),
      2
    );
  });

  it('calibrates the final installment so remaining principal reaches zero', () => {
    const debts: DebtItem[] = [
      {
        category: '尾差校准',
        totalAmount: 10000,
        remainingPeriods: 3,
        annualInterestRate: 7.2
      }
    ];

    const plan = calculateDebtPlan(debts, 10000, 0, 3, new Date(2026, 5, 4));
    const finalDebt = plan.monthlyPlans[2].debts[0];

    expect(finalDebt.remainingPrincipalAfter).toBe(0);
    expect(finalDebt.principal).toBeCloseTo(finalDebt.remainingPrincipalBefore, 2);
    expect(finalDebt.payment).toBeCloseTo(finalDebt.principal + finalDebt.interest, 2);
  });

  it('only calculates visible months when the plan is shorter than the installment period', () => {
    const debts: DebtItem[] = [
      {
        category: '长周期',
        totalAmount: 12000,
        remainingPeriods: 12,
        annualInterestRate: 0
      }
    ];

    const plan = calculateDebtPlan(debts, 10000, 0, 2, new Date(2026, 5, 4));

    expect(plan.monthlyPlans).toHaveLength(2);
    expect(plan.monthlyPlans[1].debts[0].remainingPeriodsAfter).toBe(10);
    expect(plan.monthlyPlans[1].debts[0].remainingPrincipalAfter).toBe(10000);
  });
});

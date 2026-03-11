import { DebtItem, DebtPlanResponse } from '../types/debt';

function getMonthLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function isRepaymentMonthReached(currentMonth: string, nextRepaymentMonth?: string): boolean {
  return !nextRepaymentMonth || currentMonth >= nextRepaymentMonth;
}

export function calculateDebtPlan(
  debts: DebtItem[],
  monthlyIncome = 22000,
  currentCash = 30000,
  planMonths = 12
): DebtPlanResponse {
  const monthlyPlans = [];
  let planTotalRepayment = 0;

  // 与原先后端计算保持一致，继续从 2026-03 起算。
  const startDate = new Date(2026, 2, 1);
  const currentDebts = debts.map((debt) => ({ ...debt }));
  let cumulativeCash = currentCash;

  for (let monthIndex = 0; monthIndex < planMonths; monthIndex += 1) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + monthIndex);
    const monthLabel = getMonthLabel(currentDate);

    let monthTotal = 0;
    const monthDebts = [];

    for (const debt of currentDebts) {
      let payment = 0;
      const remainingBefore = debt.remainingPeriods;
      const shouldPayThisMonth = isRepaymentMonthReached(monthLabel, debt.nextRepaymentMonth);

      if (shouldPayThisMonth && debt.remainingPeriods > 0) {
        payment = debt.monthlyPayment;
        debt.remainingPeriods -= 1;
      }

      monthTotal += payment;
      monthDebts.push({
        category: debt.category,
        originalTotal: debt.totalAmount,
        payment,
        remainingPeriodsBefore: remainingBefore,
        remainingPeriodsAfter: debt.remainingPeriods,
        monthlyPayment: debt.monthlyPayment,
        nextRepaymentMonth: debt.nextRepaymentMonth ?? null
      });
    }

    const paidOffDebts = monthDebts.filter(
      (debt) => debt.remainingPeriodsBefore > 0 && debt.remainingPeriodsAfter === 0
    ).length;

    cumulativeCash += monthlyIncome - monthTotal;
    monthlyPlans.push({
      monthIndex: monthIndex + 1,
      month: monthLabel,
      year: currentDate.getFullYear(),
      monthNum: currentDate.getMonth() + 1,
      totalRepayment: monthTotal,
      surplus: monthlyIncome - monthTotal,
      cumulativeCash,
      paidOffCount: paidOffDebts,
      activeDebtCount: monthDebts.filter((debt) => debt.payment > 0).length,
      debts: monthDebts
    });

    planTotalRepayment += monthTotal;
  }

  const endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + planMonths - 1);

  return {
    startMonth: '2026-03',
    endMonth: getMonthLabel(endDate),
    planMonths,
    monthlyPlans,
    annualTotalRepayment: planTotalRepayment,
    monthlyIncome,
    currentCash,
    initialDebtSummary: {
      totalDebtAmount: debts.reduce((sum, debt) => sum + debt.totalAmount, 0),
      totalDebts: debts.length,
      totalMonthlyPayment: debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0)
    }
  };
}

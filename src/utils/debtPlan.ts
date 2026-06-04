import { DebtDetail, DebtItem, DebtPlanResponse, MonthlyPlan } from '../types/debt';

const MONEY_PRECISION = 2;

function getMonthLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function isRepaymentMonthReached(currentMonth: string, nextRepaymentMonth?: string): boolean {
  return !nextRepaymentMonth || currentMonth >= nextRepaymentMonth;
}

function parseMonthLabel(monthLabel: string): { year: number; monthIndex: number } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthLabel);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1
  };
}

function getElapsedRepaymentPeriods(startMonth: string, planStartMonth: string): number {
  const repaymentStart = parseMonthLabel(startMonth);
  const planStart = parseMonthLabel(planStartMonth);

  if (!repaymentStart || !planStart) {
    return 0;
  }

  return Math.max(
    0,
    (planStart.year - repaymentStart.year) * 12 +
      (planStart.monthIndex - repaymentStart.monthIndex)
  );
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(MONEY_PRECISION));
}

function calculateMonthlyPayment(totalAmount: number, periods: number, annualInterestRate: number): number {
  if (periods <= 0) {
    return 0;
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  if (monthlyRate === 0) {
    return roundMoney(totalAmount / periods);
  }

  const factor = Math.pow(1 + monthlyRate, periods);
  return roundMoney((totalAmount * monthlyRate * factor) / (factor - 1));
}

type ActiveDebt = DebtItem & {
  remainingPrincipal: number;
  calculatedMonthlyPayment: number;
};

function calculateDebtStateAtPlanStart(debt: DebtItem, planStartMonth: string): ActiveDebt {
  const monthlyPayment = calculateMonthlyPayment(
    debt.totalAmount,
    debt.remainingPeriods,
    debt.annualInterestRate
  );
  const elapsedPeriods = debt.nextRepaymentMonth
    ? Math.min(
        debt.remainingPeriods,
        getElapsedRepaymentPeriods(debt.nextRepaymentMonth, planStartMonth)
      )
    : 0;

  let remainingPrincipal = roundMoney(debt.totalAmount);
  let remainingPeriods = debt.remainingPeriods;

  for (let period = 0; period < elapsedPeriods; period += 1) {
    const remainingPrincipalBefore = roundMoney(remainingPrincipal);
    const monthlyRate = debt.annualInterestRate / 12 / 100;
    const interest = roundMoney(remainingPrincipalBefore * monthlyRate);
    let principal = roundMoney(monthlyPayment - interest);

    if (remainingPeriods === 1 || principal > remainingPrincipalBefore) {
      principal = remainingPrincipalBefore;
    }

    remainingPrincipal = roundMoney(remainingPrincipalBefore - principal);
    remainingPeriods -= 1;
  }

  return {
    ...debt,
    remainingPeriods,
    remainingPrincipal,
    calculatedMonthlyPayment: monthlyPayment
  };
}

export function calculateDebtPlan(
  debts: DebtItem[],
  monthlyIncome = 22000,
  currentCash = 30000,
  planMonths = 12,
  baseDate = new Date()
): DebtPlanResponse {
  const monthlyPlans: MonthlyPlan[] = [];
  let planTotalRepayment = 0;

  const startDate = getStartOfMonth(baseDate);
  const startMonth = getMonthLabel(startDate);
  const currentDebts: ActiveDebt[] = debts.map((debt) =>
    calculateDebtStateAtPlanStart(debt, startMonth)
  );
  let cumulativeCash = currentCash;

  for (let monthIndex = 0; monthIndex < planMonths; monthIndex += 1) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + monthIndex);
    const monthLabel = getMonthLabel(currentDate);

    let monthTotal = 0;
    let monthPrincipal = 0;
    let monthInterest = 0;
    const monthDebts: DebtDetail[] = [];

    for (const debt of currentDebts) {
      let payment = 0;
      let principal = 0;
      let interest = 0;
      const remainingBefore = debt.remainingPeriods;
      const remainingPrincipalBefore = roundMoney(debt.remainingPrincipal);
      const shouldPayThisMonth = isRepaymentMonthReached(monthLabel, debt.nextRepaymentMonth);

      if (shouldPayThisMonth && debt.remainingPeriods > 0) {
        const monthlyRate = debt.annualInterestRate / 12 / 100;
        interest = roundMoney(remainingPrincipalBefore * monthlyRate);
        principal = roundMoney(debt.calculatedMonthlyPayment - interest);

        if (debt.remainingPeriods === 1 || principal > remainingPrincipalBefore) {
          principal = remainingPrincipalBefore;
          payment = roundMoney(principal + interest);
        } else {
          payment = debt.calculatedMonthlyPayment;
        }

        debt.remainingPrincipal = roundMoney(remainingPrincipalBefore - principal);
        debt.remainingPeriods -= 1;
      }

      monthTotal += payment;
      monthPrincipal += principal;
      monthInterest += interest;
      monthDebts.push({
        category: debt.category,
        originalTotal: debt.totalAmount,
        payment,
        principal,
        interest,
        remainingPrincipalBefore,
        remainingPrincipalAfter: roundMoney(debt.remainingPrincipal),
        remainingPeriodsBefore: remainingBefore,
        remainingPeriodsAfter: debt.remainingPeriods,
        monthlyPayment: debt.calculatedMonthlyPayment,
        annualInterestRate: debt.annualInterestRate,
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
      totalRepayment: roundMoney(monthTotal),
      totalPrincipal: roundMoney(monthPrincipal),
      totalInterest: roundMoney(monthInterest),
      surplus: roundMoney(monthlyIncome - monthTotal),
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
    startMonth,
    endMonth: getMonthLabel(endDate),
    planMonths,
    monthlyPlans,
    annualTotalRepayment: roundMoney(planTotalRepayment),
    totalPrincipal: roundMoney(
      monthlyPlans.reduce((sum, month) => sum + month.totalPrincipal, 0)
    ),
    totalInterest: roundMoney(
      monthlyPlans.reduce((sum, month) => sum + month.totalInterest, 0)
    ),
    monthlyIncome,
    currentCash,
    initialDebtSummary: {
      totalDebtAmount: debts.reduce((sum, debt) => sum + debt.totalAmount, 0),
      totalDebts: debts.length,
      totalMonthlyPayment: roundMoney(
        debts.reduce(
          (sum, debt) =>
            sum + calculateMonthlyPayment(debt.totalAmount, debt.remainingPeriods, debt.annualInterestRate),
          0
        )
      )
    }
  };
}

export interface DebtItem {
  category: string;
  totalAmount: number;
  remainingPeriods: number;
  monthlyPayment: number;
  nextRepaymentMonth?: string;
}

export interface DebtDetail {
  category: string;
  originalTotal: number;
  payment: number;
  remainingPeriodsBefore: number;
  remainingPeriodsAfter: number;
  monthlyPayment: number;
  nextRepaymentMonth?: string | null;
}

export interface MonthlyPlan {
  monthIndex: number;
  month: string;
  year: number;
  monthNum: number;
  totalRepayment: number;
  surplus: number;
  cumulativeCash: number;
  paidOffCount: number;
  activeDebtCount: number;
  debts: DebtDetail[];
}

export interface InitialDebtSummary {
  totalDebtAmount: number;
  totalDebts: number;
  totalMonthlyPayment: number;
}

export interface DebtPlanResponse {
  startMonth: string;
  endMonth: string;
  planMonths: number;
  monthlyPlans: MonthlyPlan[];
  annualTotalRepayment: number;
  monthlyIncome: number;
  currentCash: number;
  initialDebtSummary: InitialDebtSummary;
}

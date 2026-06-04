export interface DebtItem {
  category: string;
  totalAmount: number;
  remainingPeriods: number;
  annualInterestRate: number;
  nextRepaymentMonth?: string;
}

export interface DebtDetail {
  category: string;
  originalTotal: number;
  payment: number;
  principal: number;
  interest: number;
  remainingPrincipalBefore: number;
  remainingPrincipalAfter: number;
  remainingPeriodsBefore: number;
  remainingPeriodsAfter: number;
  monthlyPayment: number;
  annualInterestRate: number;
  nextRepaymentMonth?: string | null;
}

export interface MonthlyPlan {
  monthIndex: number;
  month: string;
  year: number;
  monthNum: number;
  totalRepayment: number;
  totalPrincipal: number;
  totalInterest: number;
  surplus: number;
  cumulativeCash: number;
  paidOffCount: number;
  activeDebtCount: number;
  debts: DebtDetail[];
}

export interface InitialDebtSummary {
  totalDebtAmount: number;
  totalOutstandingPayment: number;
  totalDebts: number;
  totalMonthlyPayment: number;
}

export interface DebtPlanResponse {
  startMonth: string;
  endMonth: string;
  planMonths: number;
  monthlyPlans: MonthlyPlan[];
  annualTotalRepayment: number;
  totalPrincipal: number;
  totalInterest: number;
  monthlyIncome: number;
  currentCash: number;
  initialDebtSummary: InitialDebtSummary;
}

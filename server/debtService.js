/**
 * @summary 债务项数据结构
 * @typedef {Object} DebtItem
 * @property {string} category - 类别名称
 * @property {number} totalAmount - 总金额
 * @property {number} remainingPeriods - 剩余期数
 * @property {number} monthlyPayment - 每期还款额
 * @property {string} [nextRepaymentMonth] - 下次开始还款月份(YYYY-MM)
 */

/**
 * @summary 计算未来还款计划
 * @param {DebtItem[]} debts - 债务列表
 * @param {number} [monthlyIncome=22000] - 月收入
 * @param {number} [currentCash=30000] - 现有现金
 * @param {number} [planMonths=12] - 计划月数
 * @returns {Object} 还款计划
 */
/**
 * @summary 获取月份名称 (YYYY-MM格式)
 * @param {Date} date - 日期
 * @returns {string} 月份字符串
 */
function getMonthLabel(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * @summary 判断当前月份是否达到指定还款月份
 * @param {string} currentMonth - 当前月份(YYYY-MM)
 * @param {string | undefined} nextRepaymentMonth - 下次开始还款月份(YYYY-MM)
 * @returns {boolean} 是否应在当月还款
 */
function isRepaymentMonthReached(currentMonth, nextRepaymentMonth) {
  // YYYY-MM 格式可直接进行字符串比较，未配置则默认当月可还
  return !nextRepaymentMonth || currentMonth >= nextRepaymentMonth;
}

/**
 * @summary 计算未来还款计划 (从2026年3月开始)
 * @param {DebtItem[]} debts - 债务列表
 * @param {number} [monthlyIncome=22000] - 月收入
 * @param {number} [currentCash=30000] - 现有现金
 * @param {number} [planMonths=12] - 计划月数
 * @returns {Object} 还款计划
 */
function calculate12MonthPlan(debts, monthlyIncome = 22000, currentCash = 30000, planMonths = 12) {
  const monthlyPlans = [];
  let planTotalRepayment = 0;
  
  // 起始时间: 2026年3月
  const startDate = new Date(2026, 2, 1); // 月份从0开始, 2表示3月
  
  // 深拷贝债务列表
  let currentDebts = debts.map(d => ({ ...d }));
  let cumulativeCash = currentCash;
  
  for (let monthIndex = 0; monthIndex < planMonths; monthIndex++) {
    // 计算当前月份
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + monthIndex);
    const monthLabel = getMonthLabel(currentDate);
    
    let monthTotal = 0;
    const monthDebts = [];

    for (let debt of currentDebts) {
      let payment = 0;
      const remainingBefore = debt.remainingPeriods;
      const shouldPayThisMonth = isRepaymentMonthReached(monthLabel, debt.nextRepaymentMonth);
      
      // 仅当已到还款月份且剩余期数大于0时才计入还款
      if (shouldPayThisMonth && debt.remainingPeriods > 0) {
        payment = debt.monthlyPayment;
        debt.remainingPeriods -= 1;
      }

      monthTotal += payment;
      monthDebts.push({
        category: debt.category,
        originalTotal: debt.totalAmount,
        payment: payment,
        remainingPeriodsBefore: remainingBefore,
        remainingPeriodsAfter: debt.remainingPeriods,
        monthlyPayment: debt.monthlyPayment,
        nextRepaymentMonth: debt.nextRepaymentMonth || null
      });
    }
    
    // 计算已还清的债务数量
    const paidOffDebts = monthDebts.filter(d => d.remainingPeriodsBefore > 0 && d.remainingPeriodsAfter === 0).length;

    cumulativeCash += (monthlyIncome - monthTotal);

    monthlyPlans.push({
      monthIndex: monthIndex + 1,
      month: monthLabel,
      year: currentDate.getFullYear(),
      monthNum: currentDate.getMonth() + 1,
      totalRepayment: monthTotal,
      surplus: monthlyIncome - monthTotal,
      cumulativeCash,
      paidOffCount: paidOffDebts,
      activeDebtCount: monthDebts.filter(d => d.payment > 0).length,
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
      totalDebtAmount: debts.reduce((sum, d) => sum + d.totalAmount, 0),
      totalDebts: debts.length,
      totalMonthlyPayment: debts.reduce((sum, d) => sum + d.monthlyPayment, 0)
    }
  };
}

module.exports = {
  calculate12MonthPlan
};

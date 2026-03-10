const fs = require('fs');
const path = require('path');

const debtsFilePath = path.join(__dirname, 'data', 'debts.json');
const repaymentMonthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * @summary 校验单条债务数据是否合法
 * @param {unknown} debt - 待校验的债务对象
 * @returns {boolean} 是否合法
 */
function isValidDebtItem(debt) {
  if (!debt || typeof debt !== 'object' || Array.isArray(debt)) {
    return false;
  }

  const {
    category,
    totalAmount,
    remainingPeriods,
    monthlyPayment,
    nextRepaymentMonth
  } = debt;

  return (
    typeof category === 'string' &&
    category.trim().length > 0 &&
    typeof totalAmount === 'number' &&
    Number.isFinite(totalAmount) &&
    totalAmount >= 0 &&
    typeof remainingPeriods === 'number' &&
    Number.isInteger(remainingPeriods) &&
    remainingPeriods >= 0 &&
    typeof monthlyPayment === 'number' &&
    Number.isFinite(monthlyPayment) &&
    monthlyPayment >= 0 &&
    (
      nextRepaymentMonth === undefined ||
      nextRepaymentMonth === null ||
      repaymentMonthPattern.test(nextRepaymentMonth)
    )
  );
}

/**
 * @summary 校验债务数组是否合法
 * @param {unknown} debts - 待校验的债务数组
 * @returns {boolean} 是否合法
 */
function isValidDebtList(debts) {
  return Array.isArray(debts) && debts.every(isValidDebtItem);
}

/**
 * @summary 读取债务列表
 * @returns {Array} 债务数组
 */
function getDebts() {
  const fileContent = fs.readFileSync(debtsFilePath, 'utf8');
  const parsedDebts = JSON.parse(fileContent);

  if (!isValidDebtList(parsedDebts)) {
    throw new Error('债务数据格式不合法，请检查 debts.json');
  }

  return parsedDebts;
}

/**
 * @summary 保存债务列表
 * @param {Array} debts - 需要写回的债务数组
 * @returns {Array} 已保存的债务数组
 */
function saveDebts(debts) {
  if (!isValidDebtList(debts)) {
    throw new Error('待保存的债务数据格式不合法');
  }

  fs.writeFileSync(debtsFilePath, `${JSON.stringify(debts, null, 2)}\n`, 'utf8');
  return debts;
}

module.exports = {
  debtsFilePath,
  getDebts,
  saveDebts,
  isValidDebtItem,
  isValidDebtList
};

/* App主组件 - 债务现金流规划器 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DebtChart from './components/DebtChart';
import DebtManagerModal from './components/DebtManagerModal';
import { DebtItem, DebtPlanResponse } from './types/debt';
import { calculateDebtPlan } from './utils/debtPlan';
import {
  hasStoredDebts,
  loadDebtsFromStorage,
  resetDebtsToDefault,
  saveDebtsToStorage
} from './utils/debtStorage';
import './App.css';

/* 可复制文本版本组件属性 */
interface TextVersionProps {
  planData: DebtPlanResponse;
}

/* 可复制文本版本组件 */
const TextVersion: React.FC<TextVersionProps> = ({ planData }) => {
  const [copied, setCopied] = useState(false);

  /* 生成Markdown格式的债务计划文本 */
  const generateText = (): string => {
    const lines: string[] = [];

    lines.push('# 债务还款计划表');
    lines.push('');
    lines.push(`**时间范围**: ${planData.startMonth} ~ ${planData.endMonth}`);
    lines.push('');

    lines.push('## 汇总信息');
    lines.push('');
    lines.push('| 项目 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 总债务金额 | ¥${planData.initialDebtSummary.totalDebtAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} |`);
    lines.push(`| 债务笔数 | ${planData.initialDebtSummary.totalDebts} 笔 |`);
    lines.push(`| ${planData.planMonths}个月总还款 | ¥${planData.annualTotalRepayment.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} |`);
    lines.push(`| 月收入 | ¥${planData.monthlyIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} |`);
    lines.push(`| 现有现金 | ¥${planData.currentCash.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} |`);
    lines.push('');

    lines.push('## 月度还款明细');
    lines.push('');
    lines.push('| 月份 | 还款总额 | 剩余可支配收入 | 还款笔数 | 本月还清 |');
    lines.push('|------|----------|----------------|----------|----------|');
    planData.monthlyPlans.forEach((plan) => {
      const surplusStr = plan.surplus >= 0
        ? `¥${plan.surplus.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
        : `-¥${Math.abs(plan.surplus).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
      const paidOffStr = plan.paidOffCount > 0 ? `+${plan.paidOffCount}笔` : '-';
      lines.push(`| ${plan.month} | ¥${plan.totalRepayment.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} | ${surplusStr} | ${plan.activeDebtCount} 笔 | ${paidOffStr} |`);
    });
    lines.push('');

    lines.push(`## 各债务还款详情 (${planData.startMonth} ~ ${planData.endMonth})`);
    lines.push('');

    const monthHeaders = planData.monthlyPlans.map((plan) => `${plan.month.slice(5)}月`).join(' | ');
    lines.push(`| 债务类别 | 总额 | ${monthHeaders} |`);
    lines.push(`|----------|------|${'|'.repeat(planData.monthlyPlans.length)}`);

    planData.monthlyPlans[0]?.debts.forEach((debt, index) => {
      const payments = planData.monthlyPlans.map((plan) => {
        const currentDebt = plan.debts[index];
        if (currentDebt.payment === 0) {
          return '✓';
        }
        if (currentDebt.remainingPeriodsAfter === 0) {
          return `${currentDebt.payment.toFixed(0)}(完)`;
        }
        return `${currentDebt.payment.toFixed(0)}(${currentDebt.remainingPeriodsAfter})`;
      }).join(' | ');

      lines.push(`| ${debt.category} | ¥${debt.originalTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} | ${payments} |`);
    });

    lines.push('');
    lines.push('**说明**: ');
    lines.push('- 括号内数字表示还款后剩余期数');
    lines.push('- ✓ 表示已还清');
    lines.push('- (完) 表示本月最后一期');

    return lines.join('\n');
  };

  /* 复制到剪贴板 */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制计划文本失败:', error);
      window.alert('复制失败，请手动复制');
    }
  };

  return (
    <div className="detail-section">
      <div className="text-version-header">
        <h3>债务还款计划表（可复制版本）</h3>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? '已复制' : '复制全部'}
        </button>
      </div>

      <div className="text-version-content">
        <pre>{generateText()}</pre>
      </div>

      <div className="legend">
        <p>提示：点击“复制全部”可复制 Markdown 格式表格，并粘贴到 Excel、Notion 或其他文档中</p>
      </div>
    </div>
  );
};

/* App组件 */
const App: React.FC = () => {
  const [planData, setPlanData] = useState<DebtPlanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [income, setIncome] = useState<number>(22000);
  const [cash, setCash] = useState<number>(30000);
  const [planMonths, setPlanMonths] = useState<number>(12);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState<boolean>(false);
  const [debts, setDebts] = useState<DebtItem[]>(() => loadDebtsFromStorage());
  const [debtsSaving, setDebtsSaving] = useState<boolean>(false);
  const [debtError, setDebtError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isUsingStoredData, setIsUsingStoredData] = useState<boolean>(() => hasStoredDebts());

  const storageNotice = useMemo(
    () => (isUsingStoredData
      ? '当前数据已保存到本机浏览器，支持离线打开，也可通过“编辑负债列表”导出 JSON 进行备份。'
      : '当前展示的是内置示例数据。首次保存后，数据将存储到当前设备浏览器。'),
    [isUsingStoredData]
  );

  /* 在前端本地重新计算还款计划 */
  const recalculatePlan = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const nextPlan = calculateDebtPlan(debts, income, cash, planMonths);
      setPlanData(nextPlan);
    } catch (calculationError) {
      setPlanData(null);
      setError(calculationError instanceof Error ? calculationError.message : '本地计算失败');
      console.error('本地计算债务计划失败:', calculationError);
    } finally {
      setLoading(false);
    }
  }, [debts, income, cash, planMonths]);

  useEffect(() => {
    recalculatePlan();
  }, [recalculatePlan]);

  useEffect(() => {
    if (!saveSuccessMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [saveSuccessMessage]);

  /* 手动触发重新计算 */
  const handleRecalculate = () => {
    recalculatePlan();
  };

  /* 打开债务编辑弹窗 */
  const handleOpenDebtModal = () => {
    setDebtError(null);
    setSaveSuccessMessage(null);
    setIsDebtModalOpen(true);
  };

  /* 恢复默认示例数据 */
  const handleRestoreDefaults = () => {
    if (!window.confirm('确定恢复内置示例数据吗？当前设备已保存的数据将被覆盖。')) {
      return;
    }

    try {
      const restoredDebts = resetDebtsToDefault();
      setDebts(restoredDebts);
      setIsUsingStoredData(true);
      setDebtError(null);
      setSaveSuccessMessage('已恢复为内置示例数据，并重新写入当前设备浏览器。');
    } catch (restoreError) {
      setDebtError(restoreError instanceof Error ? restoreError.message : '恢复示例数据失败');
    }
  };

  /* 保存债务列表到本地浏览器并刷新结果 */
  const handleSaveDebts = async (updatedDebts: DebtItem[]) => {
    setDebtsSaving(true);
    setDebtError(null);

    try {
      const savedDebts = saveDebtsToStorage(updatedDebts);
      setDebts(savedDebts);
      setIsUsingStoredData(true);
      setIsDebtModalOpen(false);
      setSaveSuccessMessage(`负债列表已保存到当前设备，共 ${savedDebts.length} 条债务，主页面数据已刷新。`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '保存债务数据失败';
      setDebtError(message);
      throw saveError;
    } finally {
      setDebtsSaving(false);
    }
  };

  /* 格式化货币 */
  const formatCurrency = (value: number): string => {
    return `¥${value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  /* 格式化月份显示 */
  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    return `${year}年${month}月`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>债务现金流规划器</h1>
        <p>纯前端本地运行，支持未来{planMonths}个月的债务还款与现金流规划</p>
      </header>

      <main className="App-main">
        <div className="params-panel">
          <div className="panel-header">
            <div>
              <h3>参数设置</h3>
              <p className="local-storage-note">{storageNotice}</p>
            </div>
            <div className="panel-actions">
              <button
                className="manage-debts-btn"
                onClick={handleOpenDebtModal}
                disabled={debtsSaving}
              >
                编辑负债列表
              </button>
              <button
                className="ghost-action-btn"
                onClick={handleRestoreDefaults}
                disabled={debtsSaving}
              >
                恢复示例数据
              </button>
            </div>
          </div>
          {saveSuccessMessage && (
            <div className="save-success-banner">
              {saveSuccessMessage}
            </div>
          )}
          <div className="params-form">
            <div className="form-group">
              <label htmlFor="income">月收入（元）：</label>
              <input
                type="number"
                id="income"
                value={income}
                onChange={(event) => setIncome(Number(event.target.value))}
                min="0"
                step="1000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cash">现有现金（元）：</label>
              <input
                type="number"
                id="cash"
                value={cash}
                onChange={(event) => setCash(Number(event.target.value))}
                min="0"
                step="1000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="months">计划月数：</label>
              <select
                id="months"
                value={planMonths}
                onChange={(event) => setPlanMonths(Number(event.target.value))}
              >
                <option value={12}>12个月</option>
                <option value={18}>18个月</option>
                <option value={24}>24个月</option>
              </select>
            </div>

            <button
              className="recalculate-btn"
              onClick={handleRecalculate}
              disabled={loading}
            >
              {loading ? '计算中...' : '重新计算'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>正在分析本地债务数据...</p>
          </div>
        )}

        {error && !loading && (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={recalculatePlan}>重试</button>
          </div>
        )}

        {planData && !loading && !error && (
          <>
            <div className="time-range-banner">
              <p>计算时间范围：<strong>{formatMonth(planData.startMonth)} ~ {formatMonth(planData.endMonth)}</strong></p>
            </div>

            <div className="summary-section">
              <div className="summary-card">
                <h4>总债务金额</h4>
                <p className="amount">{formatCurrency(planData.initialDebtSummary.totalDebtAmount)}</p>
              </div>

              <div className="summary-card">
                <h4>债务笔数</h4>
                <p className="amount">{planData.initialDebtSummary.totalDebts} 笔</p>
              </div>

              <div className="summary-card total">
                <h4>{planData.planMonths}个月总还款</h4>
                <p className="amount">{formatCurrency(planData.annualTotalRepayment)}</p>
              </div>

              <div className="summary-card">
                <h4>月收入</h4>
                <p className="amount">{formatCurrency(planData.monthlyIncome)}</p>
              </div>

              <div className="summary-card">
                <h4>现有现金</h4>
                <p className="amount">{formatCurrency(planData.currentCash)}</p>
              </div>
            </div>

            <DebtChart
              monthlyPlans={planData.monthlyPlans}
              monthlyIncome={planData.monthlyIncome}
              currentCash={planData.currentCash}
              startMonth={planData.startMonth}
              endMonth={planData.endMonth}
              planMonths={planData.planMonths}
            />

            <div className="detail-section">
              <h3>月度还款明细</h3>
              <div className="detail-table-container">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th>还款总额</th>
                      <th>剩余可支配收入</th>
                      <th>还款笔数</th>
                      <th>本月还清</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planData.monthlyPlans.map((plan) => (
                      <tr key={plan.month}>
                        <td className="month-cell">{formatMonth(plan.month)}</td>
                        <td className="amount-cell">{formatCurrency(plan.totalRepayment)}</td>
                        <td className={plan.surplus > 0 ? 'positive' : 'negative'}>
                          {formatCurrency(plan.surplus)}
                        </td>
                        <td>{plan.activeDebtCount} 笔</td>
                        <td>{plan.paidOffCount > 0 ? `+${plan.paidOffCount}笔` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="detail-section">
              <h3>各债务还款计划详情（可视化）</h3>
              <div className="debt-detail-table-container">
                <table className="detail-table debt-detail-table">
                  <thead>
                    <tr>
                      <th>债务类别</th>
                      <th>总额</th>
                      {planData.monthlyPlans.map((plan) => (
                        <th key={plan.month}>{plan.month.slice(5)}月</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {planData.monthlyPlans[0]?.debts.map((debt, index) => {
                      const monthlyPayments = planData.monthlyPlans.map((plan) => {
                        const currentDebt = plan.debts[index];
                        return {
                          month: plan.month,
                          payment: currentDebt.payment,
                          remaining: currentDebt.remainingPeriodsAfter,
                          isPaidOff: currentDebt.remainingPeriodsBefore > 0 && currentDebt.remainingPeriodsAfter === 0
                        };
                      });

                      return (
                        <tr key={debt.category}>
                          <td className="category-cell">{debt.category}</td>
                          <td className="amount-cell">{formatCurrency(debt.originalTotal)}</td>
                          {monthlyPayments.map((monthPlan) => (
                            <td
                              key={monthPlan.month}
                              className={`payment-cell ${monthPlan.isPaidOff ? 'paid-off' : ''} ${monthPlan.payment === 0 ? 'finished' : ''}`}
                            >
                              {monthPlan.payment > 0 ? (
                                <>
                                  <div className="payment-amount">{monthPlan.payment.toFixed(0)}</div>
                                  <div className="remaining-label">剩{monthPlan.remaining}期</div>
                                </>
                              ) : (
                                <span className="done-label">✓</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="legend">
                <p><span className="legend-item paid-off"></span> 本月最后一期</p>
                <p><span className="legend-item finished"></span> 已还清</p>
              </div>
            </div>

            <TextVersion planData={planData} />
          </>
        )}
      </main>

      <DebtManagerModal
        isOpen={isDebtModalOpen}
        debts={debts}
        loading={false}
        saving={debtsSaving}
        errorMessage={debtError}
        onClose={() => {
          setDebtError(null);
          setIsDebtModalOpen(false);
        }}
        onSave={handleSaveDebts}
      />
    </div>
  );
};

export default App;

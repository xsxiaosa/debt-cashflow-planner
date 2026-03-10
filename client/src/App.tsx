/* App主组件 - 债务现金流规划器 */

import React, { useState, useEffect, useCallback } from 'react';
import DebtChart from './components/DebtChart';
import DebtManagerModal, { DebtItem } from './components/DebtManagerModal';
import './App.css';

/* API基础URL */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/* 债务明细类型 */
interface DebtDetail {
  category: string;
  originalTotal: number;
  payment: number;
  remainingPeriodsBefore: number;
  remainingPeriodsAfter: number;
  monthlyPayment: number;
}

/* 月度计划数据类型 */
interface MonthlyPlan {
  monthIndex: number;
  month: string;  // 格式: 2026-03
  year: number;
  monthNum: number;
  totalRepayment: number;
  surplus: number;
  cumulativeCash: number;
  paidOffCount: number;
  activeDebtCount: number;
  debts: DebtDetail[];
}

/* 初始债务摘要 */
interface InitialDebtSummary {
  totalDebtAmount: number;
  totalDebts: number;
  totalMonthlyPayment: number;
}

/* API响应数据类型 */
interface DebtPlanResponse {
  startMonth: string;
  endMonth: string;
  planMonths: number;
  monthlyPlans: MonthlyPlan[];
  annualTotalRepayment: number;
  monthlyIncome: number;
  currentCash: number;
  initialDebtSummary: InitialDebtSummary;
}

/* 通用接口响应 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}


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
    
    // 标题
    lines.push('# 债务还款计划表');
    lines.push('');
    lines.push(`**时间范围**: ${planData.startMonth} ~ ${planData.endMonth}`);
    lines.push('');
    
    // 汇总信息
    lines.push('## 汇总信息');
    lines.push('');
    lines.push(`| 项目 | 数值 |`);
    lines.push(`|------|------|`);
    lines.push(`| 总债务金额 | ¥${planData.initialDebtSummary.totalDebtAmount.toLocaleString('zh-CN', {minimumFractionDigits: 2})} |`);
    lines.push(`| 债务笔数 | ${planData.initialDebtSummary.totalDebts} 笔 |`);
    lines.push(`| ${planData.planMonths}个月总还款 | ¥${planData.annualTotalRepayment.toLocaleString('zh-CN', {minimumFractionDigits: 2})} |`);
    lines.push(`| 月收入 | ¥${planData.monthlyIncome.toLocaleString('zh-CN', {minimumFractionDigits: 2})} |`);
    lines.push(`| 现有现金 | ¥${planData.currentCash.toLocaleString('zh-CN', {minimumFractionDigits: 2})} |`);
    lines.push('');
    
    // 月度还款明细
    lines.push('## 月度还款明细');
    lines.push('');
    lines.push(`| 月份 | 还款总额 | 剩余可支配收入 | 还款笔数 | 本月还清 |`);
    lines.push(`|------|----------|----------------|----------|----------|`);
    planData.monthlyPlans.forEach(plan => {
      const surplusStr = plan.surplus >= 0 
        ? `¥${plan.surplus.toLocaleString('zh-CN', {minimumFractionDigits: 2})}`
        : `-¥${Math.abs(plan.surplus).toLocaleString('zh-CN', {minimumFractionDigits: 2})}`;
      const paidOffStr = plan.paidOffCount > 0 ? `+${plan.paidOffCount}笔` : '-';
      lines.push(`| ${plan.month} | ¥${plan.totalRepayment.toLocaleString('zh-CN', {minimumFractionDigits: 2})} | ${surplusStr} | ${plan.activeDebtCount} 笔 | ${paidOffStr} |`);
    });
    lines.push('');
    
    // 各债务还款详情
    lines.push(`## 各债务还款详情 (${planData.startMonth} ~ ${planData.endMonth})`);
    lines.push('');
    
    // 表头
    const monthHeaders = planData.monthlyPlans.map(p => p.month.slice(5) + '月').join(' | ');
    lines.push(`| 债务类别 | 总额 | ${monthHeaders} |`);
    lines.push(`|----------|------|${'|'.repeat(planData.monthlyPlans.length)}`);
    
    // 数据行
    planData.monthlyPlans[0]?.debts.forEach((debt, idx) => {
      const payments = planData.monthlyPlans.map(plan => {
        const d = plan.debts[idx];
        if (d.payment === 0) return '✓';
        if (d.remainingPeriodsAfter === 0) return `${d.payment.toFixed(0)}(完)`;
        return `${d.payment.toFixed(0)}(${d.remainingPeriodsAfter})`;
      }).join(' | ');
      
      lines.push(`| ${debt.category} | ¥${debt.originalTotal.toLocaleString('zh-CN', {minimumFractionDigits: 2})} | ${payments} |`);
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
    } catch (err) {
      alert('复制失败，请手动复制');
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

/* App组件 */
const App: React.FC = () => {
  const [planData, setPlanData] = useState<DebtPlanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [income, setIncome] = useState<number>(22000);
  const [cash, setCash] = useState<number>(30000);
  const [planMonths, setPlanMonths] = useState<number>(12);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState<boolean>(false);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [debtsLoading, setDebtsLoading] = useState<boolean>(false);
  const [debtsSaving, setDebtsSaving] = useState<boolean>(false);
  const [debtError, setDebtError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  /* 获取债务计划数据 */
  const fetchDebtPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/debt-plan?income=${income}&cash=${cash}&months=${planMonths}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPlanData(result.data);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('获取债务计划失败:', err);
    } finally {
      setLoading(false);
    }
  }, [income, cash, planMonths]);

  /* 获取原始债务列表 */
  const fetchDebts = async (): Promise<DebtItem[]> => {
    setDebtsLoading(true);
    setDebtError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/debts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<DebtItem[]> = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取债务列表失败');
      }

      setDebts(result.data);
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setDebtError(message);
      throw err;
    } finally {
      setDebtsLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchDebtPlan();
  }, [fetchDebtPlan]);

  useEffect(() => {
    if (!saveSuccessMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [saveSuccessMessage]);

  /* 处理重新计算 */
  const handleRecalculate = () => {
    fetchDebtPlan();
  };

  /* 打开债务编辑弹窗 */
  const handleOpenDebtModal = async () => {
    setIsDebtModalOpen(true);
    setSaveSuccessMessage(null);
    try {
      await fetchDebts();
    } catch (err) {
      console.error('获取债务列表失败:', err);
    }
  };

  /* 保存债务列表并刷新计划结果 */
  const handleSaveDebts = async (updatedDebts: DebtItem[]) => {
    setDebtsSaving(true);
    setDebtError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/debts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ debts: updatedDebts })
      });

      const result: ApiResponse<DebtItem[]> = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '保存债务数据失败');
      }

      setDebts(result.data);
      await fetchDebtPlan();
      setIsDebtModalOpen(false);
      setSaveSuccessMessage(`负债列表已保存，共 ${result.data.length} 条债务，主页面数据已刷新。`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setDebtError(message);
      throw err;
    } finally {
      setDebtsSaving(false);
    }
  };

  /* 格式化货币 */
  const formatCurrency = (value: number): string => {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        <p>智能分析您的债务情况，规划未来{planMonths}个月的还款与现金流安排</p>
      </header>

      <main className="App-main">
        {/* 参数设置面板 */}
        <div className="params-panel">
          <div className="panel-header">
            <h3>参数设置</h3>
            <button
              className="manage-debts-btn"
              onClick={handleOpenDebtModal}
              disabled={debtsLoading || debtsSaving}
            >
              {debtsLoading ? '加载负债中...' : '编辑负债列表'}
            </button>
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
                onChange={(e) => setIncome(Number(e.target.value))}
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
                onChange={(e) => setCash(Number(e.target.value))}
                min="0"
                step="1000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="months">计划月数：</label>
              <select
                id="months"
                value={planMonths}
                onChange={(e) => setPlanMonths(Number(e.target.value))}
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

        {/* 加载状态 */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>正在分析债务数据...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={fetchDebtPlan}>重试</button>
          </div>
        )}

        {/* 数据展示 */}
        {planData && !loading && !error && (
          <>
            {/* 时间范围说明 */}
            <div className="time-range-banner">
              <p>计算时间范围：<strong>{formatMonth(planData.startMonth)} ~ {formatMonth(planData.endMonth)}</strong></p>
            </div>

            {/* 汇总信息 */}
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

            {/* 柱状图 */}
            <DebtChart
              monthlyPlans={planData.monthlyPlans}
              monthlyIncome={planData.monthlyIncome}
              currentCash={planData.currentCash}
              startMonth={planData.startMonth}
              endMonth={planData.endMonth}
              planMonths={planData.planMonths}
            />

            {/* 月度明细表 */}
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
                        <td className="amount-cell">
                          {formatCurrency(plan.totalRepayment)}
                        </td>
                        <td className={
                          plan.surplus > 0 ? 'positive' : 'negative'
                        }>
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

            {/* 债务详情表 */}
            {/* 债务详情表 - 可视化版本 */}
            <div className="detail-section">
              <h3>各债务还款计划详情（可视化）</h3>
              <div className="debt-detail-table-container">
                <table className="detail-table debt-detail-table">
                  <thead>
                    <tr>
                      <th>债务类别</th>
                      <th>总额</th>
                      {planData.monthlyPlans.map(plan => (
                        <th key={plan.month}>{plan.month.slice(5)}月</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {planData.monthlyPlans[0]?.debts.map((debt, idx) => {
                      // 获取该债务在所有月份的还款情况
                      const monthlyPayments = planData.monthlyPlans.map(plan => {
                        const d = plan.debts[idx];
                        return {
                          month: plan.month,
                          payment: d.payment,
                          remaining: d.remainingPeriodsAfter,
                          isPaidOff: d.remainingPeriodsBefore > 0 && d.remainingPeriodsAfter === 0
                        };
                      });
                      
                      return (
                        <tr key={debt.category}>
                          <td className="category-cell">{debt.category}</td>
                          <td className="amount-cell">
                            {formatCurrency(debt.originalTotal)}
                          </td>
                          {monthlyPayments.map((mp, mIdx) => (
                            <td 
                              key={mp.month} 
                              className={`payment-cell ${mp.isPaidOff ? 'paid-off' : ''} ${mp.payment === 0 ? 'finished' : ''}`}
                            >
                              {mp.payment > 0 ? (
                                <>
                                  <div className="payment-amount">{mp.payment.toFixed(0)}</div>
                                  <div className="remaining-label">剩{mp.remaining}期</div>
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

            {/* 债务详情表 - 可复制文本版本 */}
            <TextVersion planData={planData} />
          </>
        )}
      </main>

      <DebtManagerModal
        isOpen={isDebtModalOpen}
        debts={debts}
        loading={debtsLoading}
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

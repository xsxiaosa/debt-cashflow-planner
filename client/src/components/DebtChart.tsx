/* 柱状图组件 - 展示未来还款计划 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

/* 债务明细类型 */
interface DebtDetail {
  category: string;
  originalTotal: number;
  payment: number;
  remainingPeriodsBefore: number;
  remainingPeriodsAfter: number;
  monthlyPayment: number;
}

/* DebtChart组件属性 */
interface DebtChartProps {
  monthlyPlans: Array<{
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
  }>;
  monthlyIncome: number;
  currentCash: number;
  startMonth: string;
  endMonth: string;
  planMonths: number;
}

/* 格式化货币 */
const formatCurrency = (value: number): string => {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* 自定义Tooltip组件 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: '#fff',
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: '320px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
          {data.fullMonth}
        </p>
        <p style={{ margin: '0 0 4px 0', color: '#1976d2', fontWeight: 'bold', fontSize: '16px' }}>
          还款总额: {formatCurrency(data.totalRepayment)}
        </p>

        <p style={{ margin: '0 0 4px 0', color: '#ff9800', fontWeight: 'bold', fontSize: '14px' }}>
          累计剩余现金: {formatCurrency(data.cumulativeCash)}
        </p>
        
        <p style={{ margin: '0 0 8px 0', color: data.surplus >= 0 ? '#4caf50' : '#f44336', fontSize: '13px' }}>
          剩余可支配收入: {formatCurrency(data.surplus)}
        </p>
        
        {data.paidOffCount > 0 && (
          <p style={{ margin: '0 0 8px 0', color: '#ff9800', fontSize: '12px' }}>
            本月还清 {data.paidOffCount} 笔债务
          </p>
        )}
        
        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />
        
        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
          还款明细：
        </p>
        
        {data.debts
          .filter((debt: DebtDetail) => debt.payment > 0)
          .map((debt: DebtDetail, index: number) => (
            <p key={index} style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>
              {debt.category}: {debt.payment.toFixed(2)}
              <span style={{ 
                color: debt.remainingPeriodsAfter === 0 ? '#4caf50' : '#999', 
                marginLeft: '8px',
                fontWeight: debt.remainingPeriodsAfter === 0 ? 'bold' : 'normal'
              }}>
                {debt.remainingPeriodsAfter === 0 ? '✓ 已还清' : `剩${debt.remainingPeriodsAfter}期`}
              </span>
            </p>
          ))}
      </div>
    );
  }
  return null;
};

/* 柱状图组件 */
const DebtChart: React.FC<DebtChartProps> = ({
  monthlyPlans,
  monthlyIncome,
  currentCash,
  startMonth,
  endMonth,
  planMonths
}) => {
  // 计算统计数据
  const avgRepayment = monthlyPlans.reduce((sum, p) => sum + p.totalRepayment, 0) / monthlyPlans.length;

  // 准备图表数据
  const chartData = monthlyPlans.map(plan => ({
    month: `${plan.monthNum}月`,
    fullMonth: plan.month,
    totalRepayment: plan.totalRepayment,
    surplus: plan.surplus,
    cumulativeCash: plan.cumulativeCash,
    income: monthlyIncome,
    paidOffCount: plan.paidOffCount,
    activeDebtCount: plan.activeDebtCount,
    debts: plan.debts
  }));

  return (
    <div className="debt-chart-section">
      {/* 统计卡片 */}
      <div className="chart-stats-grid">
        <StatCard
          title="月均还款"
          value={avgRepayment}
          color="#1976d2"
          subtitle={`未来${planMonths}个月平均`}
        />
        
        <StatCard
          title="首月还款"
          value={monthlyPlans[0]?.totalRepayment || 0}
          color="#f44336"
          subtitle={monthlyPlans[0]?.month || startMonth}
        />
        
        <StatCard
          title="末月还款"
          value={monthlyPlans[monthlyPlans.length - 1]?.totalRepayment || 0}
          color="#4caf50"
          subtitle={monthlyPlans[monthlyPlans.length - 1]?.month || endMonth}
        />
        
        <StatCard
          title="现有现金"
          value={currentCash}
          color="#ff9800"
          subtitle={`可覆盖 ${(currentCash / (monthlyPlans[0]?.totalRepayment || 1)).toFixed(1)} 个月`}
        />
      </div>

      {/* 图表 */}
      <div className="chart-panel">
        <h3 className="chart-panel-title">
          {startMonth} ~ {endMonth} 还款计划
        </h3>
        
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            
            <XAxis
              dataKey="month"
              tick={{ fill: '#666', fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            
            <YAxis
              tick={{ fill: '#666', fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
              tickFormatter={(value: number) => `¥${(value / 1000).toFixed(0)}k`}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            {/* 月收入参考线 */}
            <ReferenceLine
              y={monthlyIncome}
              stroke="#4caf50"
              strokeDasharray="5 5"
              label={{
                value: `月收入 ¥${(monthlyIncome / 1000).toFixed(0)}k`,
                position: 'top',
                fill: '#4caf50',
                fontSize: 12
              }}
            />
            
            {/* 还款柱状图 */}
            <Bar
              dataKey="totalRepayment"
              name="月还款额"
              fill="#1976d2"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            />

            <Bar
              dataKey="cumulativeCash"
              name="累计剩余现金"
              fill="#ff9800"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* 图表说明 */}
        <div className="chart-note">
          <p className="chart-note-title">
            <strong>图表说明：</strong>
          </p>
          <ul>
            <li>蓝色柱子表示每月需要偿还的债务总额</li>
            <li>橙色柱子表示到当月为止的累计剩余现金</li>
            <li>绿色虚线表示月收入（{formatCurrency(monthlyIncome)}）</li>
            <li>鼠标悬停可查看每月详细还款明细及剩余期数</li>
            <li>随着债务逐渐还清，月还款额会逐步下降</li>
            <li>✓ 标记表示该债务当月最后一期</li>
          </ul>        
        </div>
      </div>
    </div>
  );
};

/* 统计卡片组件 */
interface StatCardProps {
  title: string;
  value: number;
  color: string;
  subtitle: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color, subtitle }) => (
  <div className="chart-stat-card" style={{ borderLeft: `4px solid ${color}` }}>
    <p className="chart-stat-title">
      {title}
    </p>
    
    <p className="chart-stat-value" style={{ color }}>
      {formatCurrency(value)}
    </p>
    
    <p className="chart-stat-subtitle">
      {subtitle}
    </p>
  </div>
);

export default DebtChart;

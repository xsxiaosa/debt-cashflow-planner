/// <summary>
/// Express服务器入口
/// 提供债务计算API
/// </summary>

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { calculate12MonthPlan } = require('./debtService');
const { getDebts } = require('./debtRepository');

const app = express();
const PORT = process.env.PORT || 3001;

/// <summary>
/// 中间件配置
/// </summary>
app.use(cors());
app.use(express.json());

/**
 * @summary 统一读取当前债务数据
 * @returns {Array} 债务数组
 */
function loadDebtData() {
  return getDebts();
}

/**
 * @summary 后续可在此扩展债务管理接口
 * @description 例如 POST /api/debts、PUT /api/debts/:id、DELETE /api/debts/:id，
 * 统一复用 debtRepository 中的读写能力
 */

/// <summary>
/// 获取债务还款计划 API
/// GET /api/debt-plan
/// </summary>
app.get('/api/debt-plan', (req, res) => {
  try {
    // 使用 Number.isFinite 避免把 0 误判为默认值
    const parsedIncome = Number(req.query.income);
    const parsedCash = Number(req.query.cash);
    const monthlyIncome = Number.isFinite(parsedIncome) ? parsedIncome : 22000;
    const currentCash = Number.isFinite(parsedCash) ? parsedCash : 32000;
    const requestedMonths = parseInt(req.query.months, 10);
    const allowedMonths = [12, 18, 24];
    const planMonths = allowedMonths.includes(requestedMonths) ? requestedMonths : 12;
    const debts = loadDebtData();
    const plan = calculate12MonthPlan(debts, monthlyIncome, currentCash, planMonths);
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/// <summary>
/// 获取原始债务列表 API
/// GET /api/debts
/// </summary>
app.get('/api/debts', (req, res) => {
  try {
    const debts = loadDebtData();

    res.json({
      success: true,
      data: debts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/// <summary>
/// 健康检查
/// </summary>
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/// <summary>
/// 直接由 Express 托管前端静态资源（用于 Docker 生产环境）
/// </summary>
const staticDir = path.join(__dirname, 'public');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));

  /// <summary>
  /// SPA 回退路由：非 API 请求统一返回 index.html
  /// </summary>
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    return res.sendFile(path.join(staticDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`债务现金流规划服务运行在 http://localhost:${PORT}`);
  console.log(`API端点:`);
  console.log(`  - GET /api/debt-plan    获取还款计划(支持months=12|18|24)`);
  console.log(`  - GET /api/debts        获取债务列表`);
  console.log(`  - GET /api/health       健康检查`);
});

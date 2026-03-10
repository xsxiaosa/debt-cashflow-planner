/// <summary>
/// Express服务器入口
/// 提供债务计算API
/// </summary>

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { calculate12MonthPlan } = require('./debtService');
const { getDebts, saveDebts, isValidDebtList } = require('./debtRepository');

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
 * @summary 标准化单条债务数据
 * @param {Object} debt - 原始债务对象
 * @returns {Object} 标准化后的债务对象
 */
function normalizeDebtItem(debt) {
  return {
    category: String(debt.category || '').trim(),
    totalAmount: Number(debt.totalAmount),
    remainingPeriods: Number(debt.remainingPeriods),
    monthlyPayment: Number(debt.monthlyPayment),
    nextRepaymentMonth: debt.nextRepaymentMonth ? String(debt.nextRepaymentMonth).trim() : undefined
  };
}

/**
 * @summary 标准化债务数组
 * @param {Array} debts - 原始债务数组
 * @returns {Array} 标准化后的债务数组
 */
function normalizeDebtList(debts) {
  return debts.map(normalizeDebtItem);
}

/**
 * @summary 检查债务类别是否重复
 * @param {Array} debts - 债务数组
 * @returns {boolean} 是否存在重复类别
 */
function hasDuplicateCategories(debts) {
  const categorySet = new Set();

  for (const debt of debts) {
    if (categorySet.has(debt.category)) {
      return true;
    }
    categorySet.add(debt.category);
  }

  return false;
}

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

/**
 * @summary 覆盖保存债务列表
 * @description 供前端弹窗一次性保存全部债务数据
 */
app.put('/api/debts', (req, res) => {
  try {
    const payloadDebts = req.body?.debts;

    if (!Array.isArray(payloadDebts)) {
      return res.status(400).json({
        success: false,
        error: '请求体必须包含 debts 数组'
      });
    }

    const normalizedDebts = normalizeDebtList(payloadDebts);

    if (!isValidDebtList(normalizedDebts)) {
      return res.status(400).json({
        success: false,
        error: '债务数据格式不合法'
      });
    }

    if (hasDuplicateCategories(normalizedDebts)) {
      return res.status(400).json({
        success: false,
        error: '债务类别不能重复'
      });
    }

    const savedDebts = saveDebts(normalizedDebts);
    return res.json({
      success: true,
      data: savedDebts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @summary 导入债务列表
 * @description 支持覆盖或追加模式，便于后续扩展批量导入能力
 */
app.post('/api/debts/import', (req, res) => {
  try {
    const payloadDebts = req.body?.debts;
    const mode = req.body?.mode === 'append' ? 'append' : 'replace';

    if (!Array.isArray(payloadDebts)) {
      return res.status(400).json({
        success: false,
        error: '请求体必须包含 debts 数组'
      });
    }

    const normalizedDebts = normalizeDebtList(payloadDebts);
    if (!isValidDebtList(normalizedDebts)) {
      return res.status(400).json({
        success: false,
        error: '导入的债务数据格式不合法'
      });
    }

    const mergedDebts = mode === 'append'
      ? [...loadDebtData(), ...normalizedDebts]
      : normalizedDebts;

    if (hasDuplicateCategories(mergedDebts)) {
      return res.status(400).json({
        success: false,
        error: '导入后存在重复的债务类别'
      });
    }

    const savedDebts = saveDebts(mergedDebts);
    return res.json({
      success: true,
      data: savedDebts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @summary 导出债务列表
 * @description 返回 JSON 文件下载
 */
app.get('/api/debts/export', (req, res) => {
  try {
    const debts = loadDebtData();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="debts-export.json"');
    return res.status(200).send(`${JSON.stringify(debts, null, 2)}\n`);
  } catch (error) {
    return res.status(500).json({
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
  console.log(`  - PUT /api/debts        覆盖保存债务列表`);
  console.log(`  - POST /api/debts/import 导入债务列表`);
  console.log(`  - GET /api/debts/export 导出债务列表`);
  console.log(`  - GET /api/health       健康检查`);
});

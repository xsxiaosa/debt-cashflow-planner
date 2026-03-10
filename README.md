# debt-cashflow-planner

一个用于生成个人债务还款计划与现金流预测的全栈可视化工具。

## 项目简介

`debt-cashflow-planner` 可以根据债务列表、月收入和当前现金余额，生成未来 12、18、24 个月的还款计划，并通过图表、表格和可复制文本的方式展示结果，方便用于日常规划、复盘和分享。

## 功能特性

- 支持基于债务明细生成未来多个月份的还款计划
- 支持按月收入和当前现金动态测算现金流变化
- 支持展示每月还款总额、可支配收入和累计现金
- 支持查看每笔债务在各个月份的剩余期数变化
- 支持导出可复制的 Markdown 文本版本，便于粘贴到 Notion、Excel 或文档
- 支持 Docker 构建与部署

## 页面预览

### 首屏总览

![债务现金流规划器首页总览](docs/screenshots/dashboard-overview.png)

### 还款计划图表

![债务现金流规划器图表区域](docs/screenshots/repayment-chart.png)

### 明细与计划表

![债务现金流规划器明细区域](docs/screenshots/plan-details.png)

## 技术栈

- 前端：React、TypeScript、Recharts
- 后端：Node.js、Express
- 数据存储：本地 JSON 文件
- 部署：Docker、Docker Compose

## 目录结构

```text
.
├─ client/                 # React 前端
├─ docs/
│  └─ screenshots/         # README 页面截图
├─ server/                 # Express 后端
│  └─ data/
│     ├─ debts.json        # 示例债务数据
│     └─ debts.schema.json # 债务数据结构约束
├─ Dockerfile
├─ docker-compose.yml
└─ README.md
```

## 本地启动

### 1. 安装依赖

```bash
cd client
npm install

cd ../server
npm install
```

### 2. 启动后端

```bash
cd server
npm run dev
```

默认地址：`http://localhost:3001`

### 3. 启动前端

```bash
cd client
npm start
```

默认地址：`http://localhost:3000`

## Docker 启动

```bash
docker compose up --build
```

启动后可通过 `http://localhost:3001` 访问服务端，生产构建下由 Express 直接托管前端静态资源。

## API 概览

### `GET /api/debt-plan`

根据收入、现金和债务数据生成未来还款计划。

查询参数：

- `income`：月收入
- `cash`：现有现金
- `months`：计划月数，仅支持 `12`、`18`、`24`

示例：

```text
/api/debt-plan?income=22000&cash=32000&months=12
```

### `GET /api/debts`

获取当前债务原始数据。

### `GET /api/health`

健康检查接口。

## 数据说明

项目当前使用 `server/data/debts.json` 作为示例数据源，单条债务字段包括：

- `category`：债务类别
- `totalAmount`：债务总额
- `remainingPeriods`：剩余期数
- `monthlyPayment`：每期还款额
- `nextRepaymentMonth`：下次开始还款月份，格式为 `YYYY-MM`

## 推送到 GitHub

推荐仓库名：`debt-cashflow-planner`

如果你准备新建 GitHub 仓库并推送本地代码，可参考以下命令：

```bash
git init
git add .
git commit -m "初始化 debt-cashflow-planner 项目"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

## 后续可扩展方向

- 增加债务新增、编辑、删除接口
- 支持提前还款、一次性冲抵等策略模拟
- 支持多套还款策略对比
- 接入数据库持久化和用户系统

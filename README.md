# 市场热点参考页（Polymarket 只读版）

这是一个适合放在 GitHub + Cloudflare 上的起步项目，用来做 **Polymarket 只读展示页**。

它的定位不是交易终端，而是：

- 聚合重点市场话题
- 按主题做筛选
- 把市场数据翻译成更容易读懂的页面内容
- 自动同步最新公开市场数据
- 适合做首页展示、材料样稿、对外交流或市场热点参考页

---

## 一、这套项目可以做什么

1. 读取 Polymarket 的公开 REST API  
2. 定时同步最新活跃事件和市场数据  
3. 把最新市场快照写入 Cloudflare D1  
4. 前台通过 `/api/front/*` 读取最新内容  
5. 在接口暂不可用时自动回退到示例数据，避免首页空白  

---

## 二、这套项目不做什么

- 不接钱包
- 不下单
- 不交易
- 不做 copy trading
- 不做账户体系
- 不做持仓管理

这是一套 **只读展示页**，不是交易产品。

---

## 三、项目结构

- `index.html`  
  首页。支持动态读取最新数据，也支持 fallback 示例数据。

- `functions/api/front/markets.js`  
  返回前台市场列表，包含最新 `yesPrice`、`noPrice`、`volume24h`、`lastSyncedAt` 等字段。

- `functions/api/front/status.js`  
  返回同步状态、最近同步时间、活跃市场数量等。

- `functions/api/front/ideas.js`  
  返回页面右侧补充阅读内容。

- `functions/api/front/alerts.js`  
  返回补充提示列表。

- `functions/api/front/detail/[slug].js`  
  返回单个市场的详情信息。

- `db/schema.sql`  
  D1 数据库表结构。

- `db/seed.sql`  
  示例数据。导入后页面不再是空白。

- `shared/product_keywords.json`  
  关键词配置。

- `shared/relevance_rules.json`  
  页面展示门槛和评分权重。

- `workers/discovery`  
  从 Polymarket API 分页拉取最新活跃事件和市场数据。

- `workers/scoring`  
  对最新市场做主题归类、热度判断和页面内容生成。

- `scripts/polymarket-smoke-test.mjs`  
  用来快速验证本机能否访问 Polymarket 公共 API。

---

## 四、最简单的使用方法

### 方法 1：先看页面效果
直接打开根目录的 `index.html`。

### 方法 2：先测试本机能否访问 Polymarket
```bash
npm install
npm run test:polymarket
```

### 方法 3：部署到 Cloudflare Pages
1. 把整个项目推到 GitHub  
2. 在 Cloudflare Pages 里连接 GitHub 仓库  
3. 创建 D1 数据库  
4. 绑定 `DB`  
5. 导入 `db/schema.sql` 和 `db/seed.sql`  
6. 部署后，首页会优先读取最新动态数据  

---

## 五、验证是否真的接上了最新 API

最重要的检查点是：

- `/api/front/status`
- `/api/front/markets`
- 首页右上角“最近同步”

只要最近同步时间会更新，并且 `/api/front/markets` 返回最新字段，就说明项目已经真正接入了最新公开 API。

更详细的测试步骤见：
- `API_CONNECTION_CHECKLIST.md`

---

## 六、最建议的落地顺序

1. 先直接打开 `index.html` 看效果  
2. 再跑 `npm run test:polymarket`  
3. 再执行 `db/schema.sql` 和 `db/seed.sql`  
4. 再部署 Pages  
5. 最后再部署 Workers 做自动更新  

这样最稳，也最适合小白。

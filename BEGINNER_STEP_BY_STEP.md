# 小白步骤说明（确保能拿到最新信息）

## 先理解 4 个东西

### 1. GitHub
放代码的地方。

### 2. Cloudflare Pages
放网页的地方。

### 3. Cloudflare D1
放同步下来的最新市场数据。

### 4. Cloudflare Workers
负责定时去 Polymarket 拉最新数据，并写入 D1。

---

## 第 1 步：先直接打开页面
先双击 `index.html`，确认页面本身没问题。

## 第 2 步：验证本机能访问 Polymarket
在项目目录执行：

```bash
npm install
npm run test:polymarket
```

如果能看到最新事件标题和成交量，说明本机访问 API 没问题。

## 第 3 步：创建 D1 数据库
```bash
npx wrangler d1 create prediction-signal-radar
```

## 第 4 步：执行 SQL
```bash
npx wrangler d1 execute prediction-signal-radar --file=./db/schema.sql
npx wrangler d1 execute prediction-signal-radar --file=./db/seed.sql
```

## 第 5 步：部署 Pages
把项目推到 GitHub，再在 Cloudflare Pages 里连接仓库。

## 第 6 步：绑定 D1
在 Pages 项目里加一个 D1 binding，名字填 `DB`。

## 第 7 步：先检查状态接口
部署后打开：
- `/api/front/status`

如果这里返回 JSON，说明前台接口已经在工作。

## 第 8 步：部署两个 Worker
### discovery
```bash
cd workers/discovery
npx wrangler deploy
```

### scoring
```bash
cd ../scoring
npx wrangler deploy
```

## 第 9 步：手动触发一次
部署后，访问两个 worker 返回的 workers.dev 地址各一次。

## 第 10 步：刷新首页
如果首页右上角“最近同步”已经更新，说明页面已经拿到最新信息了。

详细排查步骤看：
- `API_CONNECTION_CHECKLIST.md`

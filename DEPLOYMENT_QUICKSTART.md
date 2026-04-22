# 快速部署说明（GitHub + Cloudflare + Polymarket 最新数据版）

## 第 1 步：安装依赖
```bash
npm install
```

## 第 2 步：先测 Polymarket API
```bash
npm run test:polymarket
```

## 第 3 步：推到 GitHub
```bash
git init
git add .
git commit -m "init polymarket latest-data display page"
git branch -M main
git remote add origin <你的 GitHub 仓库地址>
git push -u origin main
```

## 第 4 步：创建 D1 数据库
```bash
npx wrangler d1 create prediction-signal-radar
```

## 第 5 步：执行建表和示例数据
```bash
npx wrangler d1 execute prediction-signal-radar --file=./db/schema.sql
npx wrangler d1 execute prediction-signal-radar --file=./db/seed.sql
```

## 第 6 步：部署 Cloudflare Pages
在 Cloudflare Pages 中连接 GitHub 仓库：

- Build command：留空
- Output directory：`/`

然后在 Pages 项目里添加 D1 binding：

- 变量名：`DB`

## 第 7 步：先检查前台接口
部署后先打开：

- `/api/front/status`
- `/api/front/markets`
- `/api/front/ideas`

## 第 8 步：部署 discovery worker
```bash
cd workers/discovery
npx wrangler deploy
```
部署后可以手动访问返回的 workers.dev 地址，立刻触发一次同步。

## 第 9 步：部署 scoring worker
```bash
cd ../scoring
npx wrangler deploy
```
同样可以手动访问 workers.dev 地址，立刻触发一次打分。

## 第 10 步：刷新首页
如果“最近同步”已经更新，说明最新数据链路已经打通。

更多验证步骤见：
- `API_CONNECTION_CHECKLIST.md`

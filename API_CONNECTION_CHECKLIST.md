# API 接通与最新信息检查清单

这份文档的目标很简单：  
帮助你判断项目是不是已经真正接上了 Polymarket API，并且前台拿到的是最新数据。

---

## 一、先验证本机能不能直接访问 Polymarket

在项目根目录执行：

```bash
npm install
npm run test:polymarket
```

如果成功，你会看到类似输出：

- Fetched 5 active events from Polymarket
- 每条事件标题
- 24h volume

这一步通过，说明：
- 你的本机网络可以访问 Polymarket 公共 API
- Node 环境正常
- 项目基础依赖正常

---

## 二、再部署数据库

先创建 D1：

```bash
npx wrangler d1 create prediction-signal-radar
```

然后执行：

```bash
npx wrangler d1 execute prediction-signal-radar --file=./db/schema.sql
npx wrangler d1 execute prediction-signal-radar --file=./db/seed.sql
```

这样即使还没跑 Worker，页面也先不会空白。

---

## 三、部署 Pages 以后先看状态接口

部署完 Pages 并绑定 D1 后，先打开：

- `/api/front/status`
- `/api/front/markets`
- `/api/front/ideas`

### 如果 `/api/front/status` 返回：
- `source: "live"`
- `latestMarketSyncAt`
- `latestScoringAt`

说明前台接口已经能读到数据库里的动态内容。

---

## 四、部署 Workers 后如何手动触发同步

### discovery worker
部署：

```bash
cd workers/discovery
npx wrangler deploy
```

部署后，Wrangler 会返回一个 workers.dev 地址。  
直接在浏览器里打开这个地址，或 curl 一次，就会立刻执行一次 discovery。

### scoring worker
部署：

```bash
cd ../scoring
npx wrangler deploy
```

同样，打开 workers.dev 地址，就会立刻执行一次 scoring。

---

## 五、怎样判断已经拿到最新信息

看这 3 个地方：

### 1. `/api/front/status`
如果这里的：
- `latestMarketSyncAt`
- `workers.discovery.lastSuccessAt`

是刚刚更新的时间，说明最新市场同步已经成功。

### 2. `/api/front/markets`
这里会返回：
- `yesPrice`
- `noPrice`
- `volume24h`
- `liquidity`
- `lastSyncedAt`
- `updatedAt`

这些字段只要时间是刚刚刷新过的，就说明不是旧 seed 数据。

### 3. 首页右上角“最近同步”
首页已经接了状态接口。  
如果这里显示的是最近几分钟的时间，就说明页面已经在读最新同步结果。

---

## 六、如果还是看到旧数据，按这个顺序排查

### 情况 1：`/api/front/status` 还是旧时间
优先检查：
- discovery worker 是否部署成功
- 你有没有手动触发一次 worker
- `wrangler.jsonc` 里的 D1 数据库 ID 是否已经替换

### 情况 2：`/api/front/markets` 有数据，但时间不更新
优先检查：
- discovery worker 是否真正写入了 `markets`
- scoring worker 是否真正写入了 `market_scores`

### 情况 3：首页显示“正在使用内置示例数据”
这说明：
- 页面没有读到 `/api/front/status`
- 或前台接口暂时报错
- 或 Pages 的 D1 binding 没配好

---

## 七、最短验证路径

如果你只想走一遍最短路径，按下面顺序就够了：

1. `npm run test:polymarket`
2. 建 D1
3. 执行 `schema.sql`
4. 执行 `seed.sql`
5. 部署 Pages
6. 打开 `/api/front/status`
7. 部署 discovery worker
8. 手动触发 discovery worker 一次
9. 部署 scoring worker
10. 手动触发 scoring worker 一次
11. 刷新首页，看“最近同步”是否更新

只要这一步通了，就说明这套项目已经能接入 API，并拿到最新信息。

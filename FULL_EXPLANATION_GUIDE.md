# 完整说明文档（最新信息版）

这一版的重点不是只看页面样式，而是确保：

1. 能接入 Polymarket 公共 API  
2. 能把最新市场信息写入 D1  
3. 前台能读到最新结果  
4. 页面能显示最近同步时间  

---

## 一、为什么这一版更接近可上线状态

因为它已经补上了 4 个关键能力：

### 1. discovery worker 分页拉取最新事件
会用公开事件接口持续拉取活跃事件，并把嵌套市场数据写入 D1。

### 2. 首页显示当前概率参考
页面现在可以展示：
- Yes 概率
- No 概率
- 24h 成交
- 流动性
- 最近同步时间

### 3. `/api/front/status` 可用于检查同步状态
你可以直接看：
- 最近一次市场同步时间
- 最近一次评分更新时间
- 活跃市场数量

### 4. 本机可以先用脚本验证 API 是否可访问
通过：
```bash
npm run test:polymarket
```
可以先确认不是网络问题。

---

## 二、这一版最重要的新增文件

- `functions/api/front/status.js`
- `scripts/polymarket-smoke-test.mjs`
- `API_CONNECTION_CHECKLIST.md`

---

## 三、页面如何判断自己是不是最新

页面会优先读 `/api/front/status`：

- 如果状态接口正常，就显示最近同步时间
- 如果状态接口异常，就回退到示例数据提示

所以你不用猜当前页面是不是旧数据，直接看“最近同步”即可。

---

## 四、为什么前台不直接打 Polymarket API

因为这样会有几个问题：

- 无法做统一筛选
- 无法做内容归类
- 无法保留最近同步状态
- 无法复用 D1 里的结果

所以更合适的做法是：

Polymarket API → Workers → D1 → Pages Functions → 首页

---

## 五、最短验证路径

1. `npm run test:polymarket`
2. 建 D1
3. 执行 schema 和 seed
4. 部署 Pages
5. 部署 discovery worker
6. 手动触发 discovery
7. 部署 scoring worker
8. 手动触发 scoring
9. 打开 `/api/front/status`
10. 刷新首页看“最近同步”

这条链路通了，就说明它已经能拿到最新信息。

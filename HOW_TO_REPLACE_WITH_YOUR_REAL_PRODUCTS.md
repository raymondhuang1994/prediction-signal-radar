# 如何改成更接近自己的真实版本

这一版已经支持最新数据同步。  
如果你想进一步改成更接近自己的真实版本，最先改下面 4 个文件就够了：

## 1. `shared/product_keywords.json`
决定页面怎样把市场归类到：
- 黄金主题
- 利率与风险偏好
- 港美科技 / AI
- 数字资产主题

## 2. `db/seed.sql`
决定在正式自动同步前，页面先展示什么示例内容。

## 3. `index.html`
更推荐改：
- 顶部一句话说明
- 首屏 4 张卡片
- 表格“可关注什么”措辞

## 4. `workers/scoring/src/index.ts`
如果你想让页面逻辑更贴近自己的业务偏好，就改这里的：
- 主题词
- 标题模板
- 内容角度
- CTA

## 最推荐的操作顺序
1. 先改 `db/seed.sql`
2. 再改 `shared/product_keywords.json`
3. 再改 `index.html`
4. 最后改 `workers/scoring/src/index.ts`

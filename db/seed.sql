DELETE FROM content_suggestions;
DELETE FROM alerts;
DELETE FROM market_scores;
DELETE FROM markets;
DELETE FROM sync_status;

INSERT INTO markets (
  condition_id, event_id, slug, title, platform, category, description, image_url, end_date_iso, active, closed,
  liquidity, volume_24h, yes_asset_id, no_asset_id, yes_price, no_price, outcomes_json, outcome_prices_json, market_url, last_synced_at
) VALUES
('cond_rates_001', 1, 'how-many-fed-rate-cuts-in-2026', 'How many Fed rate cuts in 2026?', 'Polymarket', 'rates', '利率预期会同时影响成长股、黄金和美元相关资产。', NULL, '2026-12-31T00:00:00Z', 1, 0, 500000, 20000000, 'yes_rates_001', 'no_rates_001', 0.33, 0.67, '["Yes","No"]', '[0.33,0.67]', 'https://polymarket.com/event/how-many-fed-rate-cuts-in-2026', CURRENT_TIMESTAMP),
('cond_ai_001', 2, 'largest-company-end-of-april-738', 'Largest Company end of April?', 'Polymarket', 'ai', '龙头公司话题可读性高，容易和科技主题联系起来。', NULL, '2026-04-30T00:00:00Z', 1, 0, 280000, 13000000, 'yes_ai_001', 'no_ai_001', 0.99, 0.01, '["NVIDIA","Other"]', '[0.99,0.01]', 'https://polymarket.com/event/largest-company-end-of-april-738', CURRENT_TIMESTAMP),
('cond_gold_001', 3, 'gc-over-under-jun-2026', 'Gold (GC) above ___ end of June?', 'Polymarket', 'gold', '关键价位问题更直观，适合放在首屏做快速理解。', NULL, '2026-06-30T00:00:00Z', 1, 0, 310000, 920000, 'yes_gold_001', 'no_gold_001', 0.59, 0.41, '["Yes","No"]', '[0.59,0.41]', 'https://polymarket.com/event/gc-over-under-jun-2026', CURRENT_TIMESTAMP),
('cond_crypto_001', 4, 'what-price-will-bitcoin-hit-before-2027', 'What price will Bitcoin hit in 2026?', 'Polymarket', 'crypto', '高成交额话题适合观察整体风险偏好与主题热度。', NULL, '2026-12-31T00:00:00Z', 1, 0, 530000, 32500000, 'yes_crypto_001', 'no_crypto_001', 1.00, 0.00, '["Yes","No"]', '[1.00,0.00]', 'https://polymarket.com/event/what-price-will-bitcoin-hit-before-2027', CURRENT_TIMESTAMP),
('cond_crypto_002', 5, 'ethereum-all-time-high-by', 'Ethereum all time high by ___?', 'Polymarket', 'crypto', '时间窗口型话题更适合观察中期预期。', NULL, '2026-12-31T00:00:00Z', 1, 0, 145000, 185000, 'yes_crypto_002', 'no_crypto_002', 0.17, 0.83, '["Yes","No"]', '[0.17,0.83]', 'https://polymarket.com/event/ethereum-all-time-high-by', CURRENT_TIMESTAMP);

INSERT INTO market_scores (
  condition_id, product_name, theme, relevance_score, heat_score, anomaly_score, front_score, anomaly_type, score_reason, updated_at
) VALUES
('cond_rates_001', '利率与风险偏好', 'rates', 89, 94, 66, 85.9, 'Hot Macro Topic', '利率预期通常会同时影响成长风格、黄金和美元相关资产。', CURRENT_TIMESTAMP),
('cond_ai_001', '港美科技 / AI', 'ai', 90, 90, 63, 84.6, 'Leader Watch', '龙头公司话题可读性高，容易和科技主题联系起来。', CURRENT_TIMESTAMP),
('cond_gold_001', '黄金主题', 'gold', 91, 84, 58, 81.9, 'Key Level Watch', '关键价位问题更直观，适合放在首屏做快速理解。', CURRENT_TIMESTAMP),
('cond_crypto_001', '数字资产主题', 'crypto', 92, 96, 69, 87.4, 'High Attention', '高成交额话题适合观察整体风险偏好与主题热度。', CURRENT_TIMESTAMP),
('cond_crypto_002', '数字资产主题', 'crypto', 88, 71, 52, 73.9, 'Cycle Watch', '时间窗口型话题更适合观察中期预期。', CURRENT_TIMESTAMP);

INSERT INTO alerts (
  condition_id, slug, severity, alert_type, title, message, score, metadata_json, created_at
) VALUES
('cond_rates_001', 'how-many-fed-rate-cuts-in-2026', '高', 'Hot Macro Topic', '利率话题仍是宏观入口', '利率预期通常会同时影响成长股、黄金和美元相关资产。', 85.9, '{"relevance":89,"heat":94,"anomaly":66}', CURRENT_TIMESTAMP),
('cond_ai_001', 'largest-company-end-of-april-738', '高', 'Leader Watch', '科技龙头话题具备高可读性', '这类问题一眼就能看懂，适合作为科技主题入口。', 84.6, '{"relevance":90,"heat":90,"anomaly":63}', CURRENT_TIMESTAMP),
('cond_crypto_001', 'what-price-will-bitcoin-hit-before-2027', '高', 'High Attention', '数字资产主题关注度较高', '高成交额话题更适合用于观察整体风险偏好和主题热度。', 87.4, '{"relevance":92,"heat":96,"anomaly":69}', CURRENT_TIMESTAMP);

INSERT INTO content_suggestions (
  condition_id, product_name, headline, channel, angle, cta, created_at
) VALUES
('cond_gold_001', '黄金主题', '黄金：先看关键区间，再看关键价位', '首页卡片 / 图文页 / 主题页', '黄金相关话题更适合用区间和关键位来表达，这样更容易读懂，也更适合页面展示。', '查看黄金相关热点。', CURRENT_TIMESTAMP),
('cond_rates_001', '利率与风险偏好', '利率：把宏观路径放到资产方向里理解', '周报 / 热点页 / 宏观解读', '利率预期往往会同时影响成长风格、黄金和美元相关资产，适合作为宏观入口。', '查看利率相关热点。', CURRENT_TIMESTAMP),
('cond_ai_001', '港美科技 / AI', 'AI：优先展示高可读性的龙头话题', '首页首屏 / 主题页 / 海报内容', '像“最大市值公司是谁”这类问题一眼就能看懂，适合做科技主题入口。', '查看科技与 AI 相关热点。', CURRENT_TIMESTAMP),
('cond_crypto_001', '数字资产主题', '数字资产：用高成交额话题观察整体风险偏好', '专题页 / 长图 / 社媒内容', '高成交额市场更适合做数字资产主题总入口，而中长期时间窗口问题更适合补充阅读。', '查看数字资产相关热点。', CURRENT_TIMESTAMP);

INSERT INTO sync_status (
  worker_name, last_run_at, last_success_at, last_error, last_count, detail_json
) VALUES
('discovery', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 5, '{"mode":"seed","note":"示例数据"}'),
('scoring', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, 5, '{"mode":"seed","note":"示例数据"}');

interface Env {
  DB: D1Database;
}

const DATA_BASE = 'https://data-api.polymarket.com';

const PRODUCT_KEYWORDS: Record<string, { theme: string; keywords: string[] }> = {
  '黄金主题': {
    theme: 'gold',
    keywords: ['gold', 'gc', 'inflation', 'cpi', 'bullion', 'safe haven', 'real yields', 'tariffs']
  },
  '利率与风险偏好': {
    theme: 'rates',
    keywords: ['fed', 'rate cuts', 'rates', 'inflation', 'cpi', 'recession', 'yields', 'treasury']
  },
  '港美科技 / AI': {
    theme: 'ai',
    keywords: ['nvidia', 'ai', 'semiconductor', 'semis', 'nasdaq', 'largest company', 'tech', 'tsmc', 'hynix', 'samsung']
  },
  '数字资产主题': {
    theme: 'crypto',
    keywords: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'digital asset', 'stablecoin']
  }
};

export default {
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await safeRun(env);
  },

  async fetch(_request: Request, env: Env): Promise<Response> {
    try {
      const summary = await runScoring(env);
      return Response.json({ ok: true, ...summary });
    } catch (error) {
      return Response.json({ ok: false, error: String(error) }, { status: 500 });
    }
  }
};

async function safeRun(env: Env): Promise<void> {
  try {
    await runScoring(env);
  } catch (error) {
    await updateSyncStatus(env, 'scoring', {
      last_run_at: new Date().toISOString(),
      last_error: String(error),
      detail_json: JSON.stringify({ ok: false })
    });
    throw error;
  }
}

async function runScoring(env: Env): Promise<{ scoredCount: number }> {
  const activeMarkets = await env.DB.prepare(`
    SELECT condition_id, slug, title, category, volume_24h, liquidity, end_date_iso, yes_price, no_price
    FROM markets
    WHERE active = 1 AND closed = 0
    ORDER BY volume_24h DESC
    LIMIT 120
  `).all<any>();

  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];

  statements.push(env.DB.prepare(`DELETE FROM content_suggestions`));
  statements.push(env.DB.prepare(`DELETE FROM alerts`));

  let scoredCount = 0;

  for (const market of activeMarkets.results) {
    const { product, theme, relevance, reason } = scoreRelevance(market.title, market.category);
    if (relevance < 55) continue;

    const oi = await fetchOpenInterest(market.condition_id).catch(() => 0);
    const heat = scoreHeat(Number(market.volume_24h || 0), Number(market.liquidity || 0), oi);
    const anomaly = scoreAnomaly(Number(market.volume_24h || 0), Number(market.liquidity || 0), oi, market.end_date_iso);
    const frontScore = Number((0.5 * relevance + 0.3 * heat + 0.2 * anomaly).toFixed(1));
    const anomalyType = anomaly >= 80 ? 'High Attention' : anomaly >= 65 ? 'Hot Topic' : 'Key Watch';
    const naturalReason = buildNaturalReason(theme, market.title, market.yes_price, market.no_price);

    statements.push(
      env.DB.prepare(`
        INSERT INTO market_scores (
          condition_id, product_name, theme, relevance_score, heat_score, anomaly_score,
          front_score, anomaly_type, score_reason, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(condition_id) DO UPDATE SET
          product_name = excluded.product_name,
          theme = excluded.theme,
          relevance_score = excluded.relevance_score,
          heat_score = excluded.heat_score,
          anomaly_score = excluded.anomaly_score,
          front_score = excluded.front_score,
          anomaly_type = excluded.anomaly_type,
          score_reason = excluded.score_reason,
          updated_at = excluded.updated_at
      `).bind(
        market.condition_id,
        product,
        theme,
        relevance,
        heat,
        anomaly,
        frontScore,
        anomalyType,
        naturalReason,
        now
      )
    );

    if (frontScore >= 72) {
      const headline = buildHeadline(theme);
      const angle = buildAngle(theme, market.title);
      const cta = buildCTA(theme);
      statements.push(
        env.DB.prepare(`
          INSERT INTO content_suggestions (
            condition_id, product_name, headline, channel, angle, cta, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          market.condition_id,
          product,
          headline,
          '首页卡片 / 图文页 / 主题解读',
          angle,
          cta,
          now
        )
      );
    }

    if (frontScore >= 82) {
      statements.push(
        env.DB.prepare(`
          INSERT INTO alerts (
            condition_id, slug, severity, alert_type, title, message, score, metadata_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          market.condition_id,
          market.slug,
          frontScore >= 88 ? '高' : '中',
          anomalyType,
          buildAlertTitle(theme),
          naturalReason,
          frontScore,
          JSON.stringify({ relevance, heat, anomaly, oi }),
          now
        )
      );
    }
    scoredCount += 1;
  }

  if (statements.length) {
    await env.DB.batch(statements);
  }

  await updateSyncStatus(env, 'scoring', {
    last_run_at: now,
    last_success_at: now,
    last_error: null,
    last_count: scoredCount,
    detail_json: JSON.stringify({ scoredCount })
  });

  return { scoredCount };
}

function scoreRelevance(title: string, category?: string | null) {
  const text = `${title} ${category || ''}`.toLowerCase();
  let best = { product: 'General Macro', theme: 'macro', relevance: 0, reason: 'No strong product match' };

  for (const [product, config] of Object.entries(PRODUCT_KEYWORDS)) {
    let hits = 0;
    for (const kw of config.keywords) {
      if (text.includes(kw)) hits += 1;
    }

    const keywordScore = Math.min(hits * 10, 30);
    const themeScore = hits >= 2 ? 20 : hits >= 1 ? 10 : 0;
    const assetScore = hits >= 3 ? 20 : hits >= 2 ? 14 : hits >= 1 ? 8 : 0;
    const readability = text.length < 160 ? 15 : 10;
    const campaignFit = hits >= 2 ? 15 : hits >= 1 ? 8 : 0;
    const total = keywordScore + themeScore + assetScore + readability + campaignFit;

    if (total > best.relevance) {
      best = { product, theme: config.theme, relevance: total, reason: `${hits} keyword hits for ${product}` };
    }
  }

  return best;
}

function scoreHeat(volume24h: number, liquidity: number, oi: number): number {
  const volumeScore = Math.min(volume24h / 1500, 35);
  const liquidityScore = Math.min(liquidity / 1500, 30);
  const oiScore = Math.min(oi / 1500, 20);
  return Number(Math.min(volumeScore + liquidityScore + oiScore + 10, 100).toFixed(1));
}

function scoreAnomaly(volume24h: number, liquidity: number, oi: number, endDateIso?: string | null): number {
  let score = 0;
  if (volume24h > 10000) score += 30;
  else if (volume24h > 3000) score += 18;
  if (liquidity < 5000 && volume24h > 3000) score += 20;
  if (oi > 3000) score += 15;

  if (endDateIso) {
    const hours = (new Date(endDateIso).getTime() - Date.now()) / 36e5;
    if (hours > 0 && hours < 72) score += 20;
    else if (hours > 0 && hours < 168) score += 10;
  }

  return Number(Math.min(score + 15, 100).toFixed(1));
}

async function fetchOpenInterest(conditionId: string): Promise<number> {
  if (!conditionId || !String(conditionId).startsWith('0x')) return 0;
  const url = `${DATA_BASE}/oi?market=${encodeURIComponent(conditionId)}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return 0;
  const data = await res.json<any[]>();
  return Number(data?.[0]?.value || 0);
}

function buildNaturalReason(theme: string, title: string, yesPrice?: number | null, noPrice?: number | null): string {
  const yes = typeof yesPrice === 'number' ? Math.round(yesPrice * 100) : null;
  const no = typeof noPrice === 'number' ? Math.round(noPrice * 100) : null;
  const priceText = yes !== null && no !== null ? `当前 Yes ${yes}% / No ${no}%` : '';
  if (theme === 'gold') return `黄金相关话题更适合结合关键区间和关键价位理解。${priceText}`.trim();
  if (theme === 'rates') return `利率预期仍是理解宏观路径的重要入口。${priceText}`.trim();
  if (theme === 'ai') return `高可读性的龙头问题更适合放在首屏快速阅读。${priceText}`.trim();
  if (theme === 'crypto') return `数字资产高成交额话题更适合观察整体风险偏好。${priceText}`.trim();
  return `${title} 适合作为当前主题的补充观察。`;
}

function buildHeadline(theme: string): string {
  if (theme === 'gold') return '黄金：先看关键区间，再看关键价位';
  if (theme === 'rates') return '利率：把宏观路径放到资产方向里理解';
  if (theme === 'ai') return 'AI：优先展示高可读性的龙头话题';
  if (theme === 'crypto') return '数字资产：用高成交额话题观察整体风险偏好';
  return '热点观察';
}

function buildAngle(theme: string, title: string): string {
  if (theme === 'gold') return `把 ${title} 翻译成更容易理解的区间或关键价位观察。`;
  if (theme === 'rates') return `把 ${title} 放到利率预期与资产方向的宏观框架中理解。`;
  if (theme === 'ai') return `把 ${title} 作为科技主题入口，帮助更快理解龙头与景气线索。`;
  if (theme === 'crypto') return `把 ${title} 作为观察数字资产风险偏好和周期预期的入口。`;
  return `把 ${title} 整理成更适合页面展示的热点内容。`;
}

function buildCTA(theme: string): string {
  if (theme === 'gold') return '查看黄金相关热点。';
  if (theme === 'rates') return '查看利率相关热点。';
  if (theme === 'ai') return '查看科技与 AI 相关热点。';
  if (theme === 'crypto') return '查看数字资产相关热点。';
  return '查看相关热点内容。';
}

function buildAlertTitle(theme: string): string {
  if (theme === 'gold') return '黄金相关话题关注度较高';
  if (theme === 'rates') return '利率话题仍是宏观入口';
  if (theme === 'ai') return '科技龙头话题具备高可读性';
  if (theme === 'crypto') return '数字资产主题关注度较高';
  return '市场热点关注度上升';
}

async function updateSyncStatus(
  env: Env,
  workerName: string,
  values: {
    last_run_at?: string | null;
    last_success_at?: string | null;
    last_error?: string | null;
    last_count?: number | null;
    detail_json?: string | null;
  }
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO sync_status (worker_name, last_run_at, last_success_at, last_error, last_count, detail_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(worker_name) DO UPDATE SET
      last_run_at = excluded.last_run_at,
      last_success_at = COALESCE(excluded.last_success_at, sync_status.last_success_at),
      last_error = excluded.last_error,
      last_count = COALESCE(excluded.last_count, sync_status.last_count),
      detail_json = excluded.detail_json
  `).bind(
    workerName,
    values.last_run_at ?? null,
    values.last_success_at ?? null,
    values.last_error ?? null,
    values.last_count ?? 0,
    values.detail_json ?? null
  ).run();
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const slug = params.slug;

  if (!slug) {
    return Response.json({ ok: false, error: 'Missing slug' }, { status: 400 });
  }

  const marketRes = await env.DB.prepare(`
    SELECT
      m.condition_id AS conditionId,
      m.slug,
      m.title,
      m.platform,
      m.category,
      m.description,
      m.image_url AS imageUrl,
      m.end_date_iso AS endDate,
      m.market_url AS marketUrl,
      m.volume_24h AS volume24h,
      m.liquidity,
      m.yes_price AS yesPrice,
      m.no_price AS noPrice,
      m.outcomes_json AS outcomesJson,
      m.outcome_prices_json AS outcomePricesJson,
      m.last_synced_at AS lastSyncedAt,
      s.product_name AS product,
      s.theme,
      ROUND(s.relevance_score, 1) AS relevance,
      ROUND(s.heat_score, 1) AS heat,
      ROUND(s.anomaly_score, 1) AS anomaly,
      ROUND(s.front_score, 1) AS frontScore,
      s.anomaly_type AS alert,
      s.score_reason AS scoreReason,
      s.updated_at AS updatedAt
    FROM markets m
    LEFT JOIN market_scores s ON s.condition_id = m.condition_id
    WHERE m.slug = ?
    LIMIT 1
  `).bind(slug).first();

  if (!marketRes) {
    return Response.json({ ok: false, error: 'Market not found' }, { status: 404 });
  }

  const alertsRes = await env.DB.prepare(`
    SELECT id, severity, alert_type AS alertType, title, message, score, created_at AS createdAt
    FROM alerts
    WHERE slug = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).bind(slug).all();

  const ideasRes = await env.DB.prepare(`
    SELECT headline, channel, angle, cta, created_at AS createdAt
    FROM content_suggestions
    WHERE condition_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).bind(marketRes.conditionId).all();

  return Response.json({
    ok: true,
    source: 'live',
    readOnly: true,
    tradingEnabled: false,
    item: marketRes,
    alerts: alertsRes.results,
    ideas: ideasRes.results
  });
}

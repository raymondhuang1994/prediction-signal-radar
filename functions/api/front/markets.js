export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const product = url.searchParams.get('product') || 'ALL';
  const minRelevance = Number(url.searchParams.get('minRelevance') || '70');
  const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 100);

  let sql = `
    SELECT
      m.slug,
      m.title,
      m.platform,
      s.product_name AS product,
      s.theme,
      ROUND(s.relevance_score, 1) AS relevance,
      ROUND(s.heat_score, 1) AS heat,
      ROUND(s.anomaly_score, 1) AS anomaly,
      ROUND(s.front_score, 1) AS frontScore,
      s.score_reason AS note,
      m.market_url AS marketUrl,
      m.volume_24h AS volume24h,
      m.liquidity,
      m.yes_price AS yesPrice,
      m.no_price AS noPrice,
      m.end_date_iso AS endDate,
      m.last_synced_at AS lastSyncedAt,
      s.updated_at AS updatedAt
    FROM market_scores s
    JOIN markets m ON m.condition_id = s.condition_id
    WHERE s.relevance_score >= ?
  `;
  const params = [minRelevance];

  if (product !== 'ALL') {
    sql += ` AND s.product_name = ?`;
    params.push(product);
  }

  sql += ` ORDER BY m.volume_24h DESC, s.front_score DESC LIMIT ?`;
  params.push(limit);

  const { results } = await env.DB.prepare(sql).bind(...params).all();

  return Response.json({
    ok: true,
    source: 'live',
    readOnly: true,
    displayMode: 'reference',
    items: results
  });
}

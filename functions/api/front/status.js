export async function onRequestGet(context) {
  const { env } = context;

  const discovery = await env.DB.prepare(`
    SELECT worker_name, last_run_at AS lastRunAt, last_success_at AS lastSuccessAt, last_error AS lastError, last_count AS lastCount, detail_json AS detailJson
    FROM sync_status
    WHERE worker_name = 'discovery'
    LIMIT 1
  `).first();

  const scoring = await env.DB.prepare(`
    SELECT worker_name, last_run_at AS lastRunAt, last_success_at AS lastSuccessAt, last_error AS lastError, last_count AS lastCount, detail_json AS detailJson
    FROM sync_status
    WHERE worker_name = 'scoring'
    LIMIT 1
  `).first();

  const counts = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM markets WHERE active = 1 AND closed = 0) AS activeMarketCount,
      (SELECT COUNT(*) FROM market_scores) AS scoredMarketCount,
      (SELECT MAX(last_synced_at) FROM markets) AS latestMarketSyncAt,
      (SELECT MAX(updated_at) FROM market_scores) AS latestScoringAt
  `).first();

  return Response.json({
    ok: true,
    source: 'live',
    activeMarketCount: counts?.activeMarketCount || 0,
    scoredMarketCount: counts?.scoredMarketCount || 0,
    latestMarketSyncAt: counts?.latestMarketSyncAt || null,
    latestScoringAt: counts?.latestScoringAt || null,
    workers: {
      discovery,
      scoring
    }
  });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const severity = url.searchParams.get('severity');
  const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100);

  let sql = `
    SELECT id, slug, severity, alert_type AS alertType, title, message, score, created_at AS createdAt
    FROM alerts
    WHERE 1 = 1
  `;
  const params = [];
  if (severity) {
    sql += ` AND severity = ?`;
    params.push(severity);
  }
  sql += ` ORDER BY created_at DESC, score DESC LIMIT ?`;
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

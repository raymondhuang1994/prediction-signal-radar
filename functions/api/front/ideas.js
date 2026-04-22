export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const product = url.searchParams.get('product');
  const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100);

  let sql = `
    SELECT product_name AS product, headline, channel, angle, cta, created_at AS createdAt
    FROM content_suggestions
    WHERE 1 = 1
  `;
  const params = [];

  if (product) {
    sql += ` AND product_name = ?`;
    params.push(product);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
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

interface Env {
  DB: D1Database;
}

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const EVENT_LIMIT = 100;
const MAX_EVENT_PAGES = 8;

export default {
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await safeRun(env);
  },

  async fetch(_request: Request, env: Env): Promise<Response> {
    try {
      const summary = await runDiscovery(env);
      return Response.json({ ok: true, ...summary });
    } catch (error) {
      return Response.json({ ok: false, error: String(error) }, { status: 500 });
    }
  }
};

async function safeRun(env: Env): Promise<void> {
  try {
    await runDiscovery(env);
  } catch (error) {
    await updateSyncStatus(env, 'discovery', {
      last_run_at: new Date().toISOString(),
      last_error: String(error),
      detail_json: JSON.stringify({ ok: false })
    });
    throw error;
  }
}

async function runDiscovery(env: Env): Promise<{ eventCount: number; marketCount: number; pagesFetched: number }> {
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  let pagesFetched = 0;
  let eventCount = 0;
  let marketCount = 0;

  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    const offset = page * EVENT_LIMIT;
    const url = `${GAMMA_BASE}/events?active=true&closed=false&order=volume_24hr&ascending=false&limit=${EVENT_LIMIT}&offset=${offset}`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });

    if (!res.ok) {
      throw new Error(`Discovery fetch failed at offset ${offset}: ${res.status}`);
    }

    const events = await res.json<any[]>();
    pagesFetched += 1;

    if (!Array.isArray(events) || events.length === 0) break;
    eventCount += events.length;

    for (const event of events) {
      const category = firstTagLabel(event) || event.category || null;
      const eventImage = event.image || event.icon || event.twitterCardImage || null;
      const eventDescription = event.description || null;
      const eventId = Number(event.id || 0) || null;
      const eventSlug = event.slug || null;
      const markets = Array.isArray(event.markets) ? event.markets : [];

      for (const market of markets) {
        const conditionId = market.conditionId || market.condition_id || market.id;
        if (!conditionId) continue;

        const slug = market.slug || eventSlug || String(conditionId);
        const title = market.question || market.title || event.title || slug;
        const active = market.active ? 1 : 0;
        const closed = market.closed ? 1 : 0;
        const endDate = market.endDate || event.endDate || null;
        const liquidity = Number(market.liquidity || 0);
        const volume24h = Number(market.volume24hr || market.volume24h || 0);
        const tokens = Array.isArray(market.tokens) ? market.tokens : [];
        const yesToken = tokens.find((t: any) => String(t.outcome || '').toLowerCase() === 'yes');
        const noToken = tokens.find((t: any) => String(t.outcome || '').toLowerCase() === 'no');

        const outcomes = parseMaybeJsonArray(market.outcomes);
        const outcomePrices = parseMaybeJsonNumberArray(market.outcomePrices);
        const priceMap = mapOutcomePrices(outcomes, outcomePrices);
        const yesPrice = priceMap.yes;
        const noPrice = priceMap.no;

        const marketUrl = slug ? `https://polymarket.com/event/${slug}` : null;

        statements.push(
          env.DB.prepare(`
            INSERT INTO markets (
              condition_id, event_id, slug, title, platform, category, description, image_url, end_date_iso,
              active, closed, liquidity, volume_24h, yes_asset_id, no_asset_id, yes_price, no_price,
              outcomes_json, outcome_prices_json, market_url, last_synced_at
            ) VALUES (?, ?, ?, ?, 'Polymarket', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(condition_id) DO UPDATE SET
              event_id = excluded.event_id,
              slug = excluded.slug,
              title = excluded.title,
              category = excluded.category,
              description = excluded.description,
              image_url = excluded.image_url,
              end_date_iso = excluded.end_date_iso,
              active = excluded.active,
              closed = excluded.closed,
              liquidity = excluded.liquidity,
              volume_24h = excluded.volume_24h,
              yes_asset_id = excluded.yes_asset_id,
              no_asset_id = excluded.no_asset_id,
              yes_price = excluded.yes_price,
              no_price = excluded.no_price,
              outcomes_json = excluded.outcomes_json,
              outcome_prices_json = excluded.outcome_prices_json,
              market_url = excluded.market_url,
              last_synced_at = excluded.last_synced_at
          `).bind(
            String(conditionId),
            eventId,
            slug,
            title,
            category,
            market.description || eventDescription,
            market.image || eventImage,
            endDate,
            active,
            closed,
            liquidity,
            volume24h,
            yesToken?.token_id || yesToken?.asset_id || null,
            noToken?.token_id || noToken?.asset_id || null,
            yesPrice,
            noPrice,
            JSON.stringify(outcomes),
            JSON.stringify(outcomePrices),
            marketUrl,
            now
          )
        );
        marketCount += 1;
      }
    }

    if (events.length < EVENT_LIMIT) break;
  }

  if (statements.length) {
    await env.DB.batch(statements);
  }

  await updateSyncStatus(env, 'discovery', {
    last_run_at: now,
    last_success_at: now,
    last_error: null,
    last_count: marketCount,
    detail_json: JSON.stringify({ pagesFetched, eventCount, marketCount })
  });

  return { pagesFetched, eventCount, marketCount };
}

function firstTagLabel(event: any): string | null {
  if (!Array.isArray(event.tags) || event.tags.length === 0) return null;
  const tag = event.tags[0];
  return String(tag?.label || tag?.slug || tag?.name || '').trim() || null;
}

function parseMaybeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(v => String(v)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseMaybeJsonNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(v => Number(v)).filter(v => !Number.isNaN(v));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(v => Number(v)).filter(v => !Number.isNaN(v)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapOutcomePrices(outcomes: string[], prices: number[]): { yes: number | null; no: number | null } {
  let yes: number | null = null;
  let no: number | null = null;

  outcomes.forEach((outcome, idx) => {
    const label = String(outcome).toLowerCase();
    if (label === 'yes') yes = prices[idx] ?? null;
    if (label === 'no') no = prices[idx] ?? null;
  });

  if (yes === null && prices.length >= 1) yes = prices[0] ?? null;
  if (no === null && prices.length >= 2) no = prices[1] ?? null;

  return { yes, no };
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

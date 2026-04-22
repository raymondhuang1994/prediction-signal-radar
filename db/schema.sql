-- D1 / SQLite schema for Polymarket read-only display page

CREATE TABLE IF NOT EXISTS markets (
  condition_id TEXT PRIMARY KEY,
  event_id INTEGER,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Polymarket',
  category TEXT,
  description TEXT,
  image_url TEXT,
  end_date_iso TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  closed INTEGER NOT NULL DEFAULT 0,
  liquidity REAL,
  volume_24h REAL,
  yes_asset_id TEXT,
  no_asset_id TEXT,
  yes_price REAL,
  no_price REAL,
  outcomes_json TEXT,
  outcome_prices_json TEXT,
  market_url TEXT,
  last_synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_markets_slug ON markets(slug);
CREATE INDEX IF NOT EXISTS idx_markets_active ON markets(active, closed);

CREATE TABLE IF NOT EXISTS market_scores (
  condition_id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  theme TEXT,
  relevance_score REAL NOT NULL,
  heat_score REAL NOT NULL,
  anomaly_score REAL NOT NULL,
  front_score REAL NOT NULL,
  anomaly_type TEXT,
  score_reason TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (condition_id) REFERENCES markets(condition_id)
);

CREATE INDEX IF NOT EXISTS idx_market_scores_front ON market_scores(front_score DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  condition_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  severity TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  score REAL NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (condition_id) REFERENCES markets(condition_id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

CREATE TABLE IF NOT EXISTS content_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  condition_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  channel TEXT NOT NULL,
  angle TEXT NOT NULL,
  cta TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (condition_id) REFERENCES markets(condition_id)
);

CREATE INDEX IF NOT EXISTS idx_content_suggestions_condition ON content_suggestions(condition_id);

CREATE TABLE IF NOT EXISTS sync_status (
  worker_name TEXT PRIMARY KEY,
  last_run_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  last_count INTEGER DEFAULT 0,
  detail_json TEXT
);

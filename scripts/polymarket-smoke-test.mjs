const base = 'https://gamma-api.polymarket.com';
const url = `${base}/events?active=true&closed=false&order=volume_24hr&ascending=false&limit=5`;

const res = await fetch(url, { headers: { accept: 'application/json' } });
if (!res.ok) {
  console.error('Fetch failed with status:', res.status);
  process.exit(1);
}

const events = await res.json();
console.log(`Fetched ${events.length} active events from Polymarket`);
for (const event of events.slice(0, 5)) {
  const title = event.title || event.slug || '(no title)';
  const volume = event.volume24hr || event.volume24h || event.volume || 0;
  console.log('-', title, '| 24h volume:', volume);
}

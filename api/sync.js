export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const topic = 'servispro_akifkilic_sync';

  if (req.method === 'GET') {
    try {
      const since = req.query.since || '30s';
      const pollUrl = `https://ntfy.sh/${topic}/json?poll=1&since=${encodeURIComponent(since)}`;
      const response = await fetch(pollUrl, { signal: AbortSignal.timeout(8000) });
      const text = await response.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(text);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const ntfyRes = await fetch('https://ntfy.sh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          ...payload
        }),
        signal: AbortSignal.timeout(8000)
      });
      const data = await ntfyRes.json().catch(() => ({ ok: true }));
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

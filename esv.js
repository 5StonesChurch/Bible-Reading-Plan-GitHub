// api/esv.js - Vercel serverless function to proxy ESV requests
// Install: none (Vercel supports fetch and process.env)
export default async function handler(req, res) {
  const ESV_API_KEY = process.env.ESV_API_KEY;
  if (!ESV_API_KEY) {
    res.status(500).json({ error: 'ESV_API_KEY not configured on server' });
    return;
  }
  const q = req.query.q;
  if (!q) {
    res.status(400).json({ error: 'Missing q parameter' });
    return;
  }

  const allowed = [
    'include-footnotes','include-headings','include-crossrefs',
    'include-verse-numbers','include-passage-references','include-short-copyright'
  ];

  const params = new URLSearchParams();
  params.set('q', q);
  for (const k of allowed) {
    if (req.query[k]) params.set(k, req.query[k]);
  }

  try {
    const r = await fetch('https://api.esv.org/v3/passage/text/?' + params.toString(), {
      headers: { Authorization: `Token ${ESV_API_KEY}` }
    });
    const body = await r.text();
    // Try to return JSON if ESVis returning JSON; otherwise return text as a simple JSON wrapper
    const contentType = r.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = JSON.parse(body);
      res.setHeader('Content-Type', 'application/json');
      res.status(r.status).json(json);
    } else {
      // some endpoints return plain text; we will wrap it
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(r.status).send(body);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
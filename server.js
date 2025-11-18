// server.js - simple Express proxy + static server for local testing or Render
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();

const ESV_API_KEY = process.env.ESV_API_KEY;
if (!ESV_API_KEY) {
  console.warn('Warning: ESV_API_KEY not set. Proxy requests to ESV will fail until you set this environment variable.');
}

app.get('/esv', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing q parameter' });

  const allowed = [
    'include-footnotes','include-headings','include-crossrefs',
    'include-verse-numbers','include-passage-references','include-short-copyright'
  ];
  const params = new URLSearchParams();
  params.set('q', q);
  for (const k of allowed) if (req.query[k]) params.set(k, req.query[k]);

  try {
    const r = await fetch('https://api.esv.org/v3/passage/text/?' + params.toString(), {
      headers: { Authorization: `Token ${ESV_API_KEY}` }
    });
    const body = await r.text();
    const contentType = r.headers.get('content-type') || 'text/plain';
    res.status(r.status).set('content-type', contentType).send(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static site files
app.use(express.static(path.join(__dirname, '.')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
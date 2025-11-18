// validate-plan.js - quick script to validate plan.json references via the proxy.
// Usage (locally): set ESV_API_KEY env and run node validate-plan.js
// The script will call the local proxy (/esv) to check each q; it doesn't change anything on the server.
const fs = require('fs');
const fetch = require('node-fetch');

async function validate() {
  const plan = JSON.parse(fs.readFileSync('plan.json', 'utf8'));
  let errors = [];
  for (let i = 0; i < plan.length; i++) {
    const entry = plan[i];
    const passages = Array.isArray(entry.passages) ? entry.passages.join('; ') : entry.passages;
    const url = 'http://localhost:3000/esv?q=' + encodeURIComponent(passages);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text();
        errors.push({ day: entry.day, passages, status: res.status, body: body.substring(0,300) });
        console.log(`Day ${entry.day}: ERROR ${res.status}`);
      } else {
        process.stdout.write('.');
      }
    } catch (err) {
      errors.push({ day: entry.day, passages, error: err.message });
      console.log(`Day ${entry.day}: FETCH ERROR`);
    }
  }
  console.log('\nDone. Errors:', errors.length);
  if (errors.length) console.log(JSON.stringify(errors, null, 2));
}
validate();
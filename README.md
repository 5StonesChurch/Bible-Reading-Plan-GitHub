```markdown
# bible-reading-app

This repo contains a small embeddable web app that shows a 365-day reading plan and fetches passages from the ESV API through a server-side proxy (Express). The front-end is static and the server provides `/esv` which forwards queries to the ESV API using your secret API key (stored in environment variables).

Files included:
- index.html
- styles.css
- script.js
- plan.json (365 entries)
- server.js (Express proxy + static server)
- package.json
- validate-plan.js (optional local validator)
- .gitignore

Quick local test
1. Clone or copy files into a folder.
2. Install dependencies:
   npm install
3. Set your ESV key locally (do NOT commit it to Git):
   macOS / Linux:
     export ESV_API_KEY="your_esv_token_here"
   Windows PowerShell:
     $env:ESV_API_KEY="your_esv_token_here"
4. Start the server:
   npm start
5. Open http://localhost:3000 in your browser. Choose a date and confirm passages load.

Deploy to Render (recommended)
1. Create a GitHub repo (e.g., 5StonesChurch/bible-reading-app) and push all files.
   Example commands:
     git init
     git add .
     git commit -m "Initial commit of bible-reading-app"
     git branch -M main
     git remote add origin https://github.com/<your-username>/bible-reading-app.git
     git push -u origin main

2. Create a new Web Service on Render:
   - Go to https://render.com, sign in and click New → Web Service.
   - Connect your GitHub account and choose the repository and branch (main).
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
   - Instance: choose free or paid depending on traffic.

3. Set environment variable on Render:
   - In your Render service settings → Environment → Add:
     Key: ESV_API_KEY
     Value: <your esv token>
   - Save. Render will redeploy the service.

4. Visit the public URL Render provides (e.g., https://your-service.onrender.com).
   - The frontend calls /esv on the same domain, and the server proxies requests to api.esv.org with your token.

Notes & tips
- DO NOT commit ESV_API_KEY to GitHub.
- Rate limits: consider server-side caching (file or Redis) if traffic grows.
- Validation: after you set the key, you can run `node validate-plan.js` locally to check each plan entry against your proxy.
- If you prefer Vercel/serverless instead of Render, let me know and I will provide the serverless proxy function and small adjustments.

Embedding
- Embed the deployed site in another website with an iframe:
  <iframe src="https://your-service.onrender.com" style="border:0;width:100%;height:800px"></iframe>

If you want, I can now:
- Produce a single ZIP of all files for you to download and upload to GitHub (or provide instructions to push).
- Or provide exact one-line commands to create the repo and push from your machine.

```
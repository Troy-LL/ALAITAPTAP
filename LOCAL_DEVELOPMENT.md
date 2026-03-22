# Local development (temporary defaults)

This repo is configured so **you can run the full stack on your machine** without pointing the frontend at a hosted API.

## Run locally

1. **Backend** (terminal 1), from `saferoute-backend/`:
   - Copy `.env.example` → `.env`, set at least `OPENROUTESERVICE_API_KEY` and `DATABASE_URL` (SQLite is fine).
   - `pip install -r requirements.txt`
   - `python scripts/seed_database.py` (once)
   - `uvicorn app.main:app --reload` — API on **http://localhost:8000**

2. **Frontend** (terminal 2), from `saferoute-frontend/`:
   - `npm install`
   - Ensure `saferoute-frontend/.env` has **`VITE_API_URL` empty** (or omit it) so the Vite dev server **proxies** `/api` to port 8000 (see `vite.config.js`).
   - `npm run dev` — app on **http://localhost:5173**

3. Open **http://localhost:5173** in the browser.

---

## Revert when development is done (production / demo)

When you are ready to ship again (e.g. Vercel + Railway), **undo the local-only workflow**:

1. **Vercel (frontend)** — In the project’s **Environment Variables**, set  
   `VITE_API_URL` = your **Railway (or other) API base URL**, e.g. `https://your-api.up.railway.app`  
   (no trailing slash). Redeploy so the production bundle picks it up.

2. **`saferoute-frontend/.env`** — If this file is used in CI or by teammates for production builds, set `VITE_API_URL` to that same deployed API URL **or** remove local overrides and rely on Vercel-only env (do not commit secrets).

3. **Git** — If you want to drop the “local dev” commit from history later, find it with `git log` and either:
   - `git revert <commit-sha>` (safest), or  
   - reset/rebase only if your team agrees (rewrites history).

4. **Optional cleanup** — Remove or shorten this file (`LOCAL_DEVELOPMENT.md`) if you no longer want the reminder in the repo.

---

**Summary:** Empty `VITE_API_URL` + `npm run dev` = proxy to local API. For production, **set `VITE_API_URL` on Vercel** and rebuild.

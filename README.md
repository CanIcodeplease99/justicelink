
# JusticeLink Court Search — Dockerized (Full)

Deploys on Render using a Dockerfile. Includes:
- `/cases/search` (Concourt + SCA + optional Commercial)
- Postgres cache (works without DB too; cache disabled)
- `openapi.yaml` for Lovable tool import

## Render Setup
1) Push this repo to GitHub (root must show Dockerfile + package.json).
2) Render → New → **Web Service** → connect repo (Dockerfile is auto-detected).
3) No build/start commands needed (Dockerfile drives build).
4) Environment variables:
   - `LOG_LEVEL=info`
   - Optional: `API_KEY=supersecret` (protects endpoints)
   - Later: `DATABASE_URL=postgres://...` (Neon/Supabase/Render PG)
5) **Run migration** once after setting `DATABASE_URL`:
   ```bash
   psql "$DATABASE_URL" -f migrations/001_init.sql
   ```

Test:
- `/health` → `{ ok: true }`
- `/cases/search?q=land%20reform` (add `x-api-key` header if using API_KEY)


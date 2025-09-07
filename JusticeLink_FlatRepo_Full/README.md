
# JusticeLink Court Search (Full)
Flat repo ready for GitHub → Render → Lovable.

## Deploy
1) Push these files to a new GitHub repo (top level must show `package.json`).
2) Render → New → Web Service (Node):
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Env: `LOG_LEVEL=info`, optional `API_KEY`, later `DATABASE_URL`
3) Run the migration once you have a Postgres URL (Neon/Supabase):
   ```bash
   export DATABASE_URL="postgres://USER:PASS@HOST:PORT/DBNAME"
   psql "$DATABASE_URL" -f migrations/001_init.sql
   ```
4) Test:
   - `/health`
   - `/cases/search?q=land%20reform` (include `x-api-key` if you set API_KEY)
5) In Lovable → Tools → Import `openapi.yaml` (set the servers.url to your Render URL).

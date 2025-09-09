
# JusticeLink One-Click Docker (Render)

This repo is prepped for Render with a **Dockerfile** and a **render.yaml** so it just works.

## Deploy steps
1) Unzip this repo and upload **the contents** (not the outer folder) to a new GitHub repo.
2) On Render: **New → Blueprint** (select your repo). This will read `render.yaml` and create the service.
   - Or: **New → Web Service (Docker)** and pick your repo manually.
3) Deploy → visit `/health` on the generated URL.

If Render asks for a root directory, leave it blank (files are at the root).

Once this is green, we can swap in the full court search app.

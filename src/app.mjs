import express from "express";
import "dotenv/config";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (_req, res) => res.json({ ok: true, msg: "JusticeLink OneClick Docker" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on :${port}`));

// --- JusticeLink: /cases/search (temporary stub) ---
app.get("/cases/search", (req, res) => {
  const q = String(req.query.q || "").trim();
  const limit = Number(req.query.limit || 20);
  const offset = Number(req.query.offset || 0);
  res.json({
    query: q,
    fromCache: false,
    total_estimated: 0,
    results: []   // stub results; we’ll swap in real scrapers later
  });
});

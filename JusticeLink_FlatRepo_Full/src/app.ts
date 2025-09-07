
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { z } from "zod";
import cors from "cors";
import { unifiedSearch } from "./search/unified.js";
import { initDb } from "./db.js";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET"] }));

// Optional API key
const API_KEY = process.env.API_KEY;
app.use((req, res, next) => {
  if (!API_KEY) return next();
  if (req.get("x-api-key") !== API_KEY) return res.status(401).json({ error: "unauthorized" });
  next();
});

// Rate limit
app.use(rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false }));

app.get("/", (_req, res) => res.json({ name: "JusticeLink Court Search", ok: true, docs: "/health" }));

const QuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.string().transform((s)=>parseInt(s,10)).pipe(z.number().int().min(1).max(50)).optional(),
  offset: z.string().transform((s)=>parseInt(s,10)).pipe(z.number().int().min(0)).optional()
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/cases/search", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
  const { q, limit = 20, offset = 0 } = parsed.data;
  try {
    const data = await unifiedSearch({ query: q, limit, offset, logger });
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Unified search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

const port = Number(process.env.PORT || 4000);

initDb()
  .then(() => app.listen(port, () => logger.info(`JusticeLink Court Search on :${port}`)))
  .catch((err) => { logger.error({ err }, "DB init failed"); process.exit(1); });

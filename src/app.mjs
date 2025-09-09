import express from "express";
import "dotenv/config";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (_req, res) => res.json({ ok: true, msg: "JusticeLink OneClick Docker" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on :${port}`));

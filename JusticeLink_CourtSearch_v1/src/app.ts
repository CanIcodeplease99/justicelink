
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on :${port}`));

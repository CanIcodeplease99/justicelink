import pino from "pino";
import pLimit from "p-limit";
import { queryCacheFTS, upsertCases } from "../db.js";
import { fetchConcourt } from "../scrapers/concourt.js";
import { fetchSCA } from "../scrapers/sca.js";
import { fetchCommercial } from "../providers/commercial.js";
import { fetchZACC } from "../scrapers/zacc.js"; // NEW

// Raw row coming from scrapers or DB
export type CaseRow = {
  source: string;
  court?: string;
  title: string;
  url: string;
  date?: string | null;
  citation?: string | null;
};

// Normalized hit we return to clients
type CaseHit = {
  title: string;
  url: string;
  source: string;
  court?: string;
  date?: string | null;
  citation?: string | null;
  title_highlight?: string;
};

type PersistRow = {
  title: string;
  url: string;
  court: string;
  date?: string | null;
  citation?: string | null;
};

function normalize(row: CaseRow): CaseRow {
  return {
    ...row,
    title: row.title.replace(/\s+/g, " ").trim(),
    url: row.url.trim(),
    court: row.court || row.source,
  };
}

function dedupe(rows: CaseRow[]): CaseRow[] {
  const byUrl = new Map<string, CaseRow>();
  for (const r of rows) {
    if (!byUrl.has(r.url)) byUrl.set(r.url, r);
  }
  return Array.from(byUrl.values());
}

function highlight(title: string, q: string): string {
  if (!q) return title;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title.replace(new RegExp(`(${safe})`, "ig"), "<mark>$1</mark>");
}

export async function unifiedSearch({
  query,
  limit,
  offset,
  logger,
}: {
  query: string;
  limit: number;
  offset: number;
  logger: pino.Logger;
}) {
  // 1) Try cache first (no DB? queryCacheFTS should just return [])
  const cached = await queryCacheFTS(query, limit, offset);
  if (cached.length) {
    const hits: CaseHit[] = cached.map((r: any): CaseHit => ({
      title: String(r.title ?? ""),
      url: String(r.url ?? ""),
      source: String(r.source ?? r.court ?? "Unknown"),
      court: r.court ?? r.source ?? undefined,
      date: r.date ?? null,
      citation: r.citation ?? null,
      title_highlight: highlight(String(r.title ?? ""), query),
    }));
    return {
      query,
      fromCache: true,
      results: hits,
      total_estimated: cached.length,
    };
  }

  // 2) Live fetch (Concourt DSpace + ZACC + SCA + Commercial) with limited parallelism
  const limitParallel = pLimit(3);
  const tasks = [
    limitParallel(() => fetchConcourt()),
    limitParallel(() => fetchZACC()),          // added
    limitParallel(() => fetchSCA()),
    limitParallel(() => fetchCommercial(query)),
  ];

  const fetched = (await Promise.allSettled(tasks)).flatMap((s) =>
    s.status === "fulfilled" ? s.value : []
  );

  const normalizedRows = fetched.map(normalize);

  // Sort newest first (date may be null)
  const deduped = dedupe(normalizedRows).sort((a, b) => {
    const ad = a.date ? Date.parse(a.date) : 0;
    const bd = b.date ? Date.parse(b.date) : 0;
    return bd - ad;
  });

  // Optional: filter by query to avoid empty-looking results for vague queries
  const q = (query || "").trim().toLowerCase();
  const filtered = q
    ? deduped.filter((r) => r.title.toLowerCase().includes(q))
    : deduped;

  const page = filtered.slice(offset, offset + limit);

  // 3) Fire-and-forget cache upsert (ensure court is a string)
  upsertCases(
    deduped.map<PersistRow>((r) => ({
      title: r.title,
      url: r.url,
      court: r.court ?? r.source,
      date: r.date ?? null,
      citation: r.citation ?? null,
    }))
  ).catch((err) => {
    logger?.warn({ err }, "upsertCases failed (likely no DB configured)");
  });

  // 4) Build results for response
  const results: CaseHit[] = page.map((r) => ({
    title: r.title,
    title_highlight: highlight(r.title, query),
    url: r.url,
    source: r.source,
    court: r.court,
    date: r.date ?? null,
    citation: r.citation ?? null,
  }));

  return {
    query,
    fromCache: false,
    results,
    total_estimated: filtered.length,
  };
}

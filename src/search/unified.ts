
import pino from "pino";
import pLimit from "p-limit";
import { queryCacheFTS, upsertCases } from "../db.js";
import { fetchConcourt } from "../scrapers/concourt.js";
import { fetchSCA } from "../scrapers/sca.js";
import { fetchCommercial } from "../providers/commercial.js";

type CaseRow = { source: string; court: string; title: string; url: string; date: string | null; citation?: string | null };

function normalize(row: CaseRow): CaseRow {
  return { ...row, title: row.title.replace(/\s+/g, " ").trim(), url: row.url.trim(), court: row.court || row.source };
}
function dedupe(rows: CaseRow[]): CaseRow[] {
  const byUrl = new Map<string, CaseRow>();
  for (const r of rows) if (!byUrl.has(r.url)) byUrl.set(r.url, r);
  return Array.from(byUrl.values());
}
function highlight(title: string, q: string): string {
  if (!q) return title;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return title.replace(new RegExp(`(${safe})`, "ig"), "<mark>$1</mark>");
}

export async function unifiedSearch({ query, limit, offset, logger }:{ query: string; limit: number; offset: number; logger: pino.Logger }) {
  // try cache if DB exists
  const cached = await queryCacheFTS(query, limit, offset);
  if (cached.length) {
    return {
      query, fromCache: true,
      results: cached.map(r => ({// Define the shape of a normalized case result
type CaseHit = {
  title: string;
  url: string;
  source: string;
  court?: string;
  date?: string;
  citation?: string;
  title_highlight?: string;
};

// Map results into CaseHit[]
const normalized: CaseHit[] = results.map((r: any): CaseHit => ({
  title: String(r.title ?? ""),
  url: String(r.url ?? ""),
  source: String(r.source ?? "Unknown"),
  court: r.court ?? undefined,
  date: r.date ?? undefined,
  citation: r.citation ?? undefined,
  title_highlight: r.title_highlight ?? undefined,
}));
))
    };
  }

  const limitParallel = pLimit(3);
  const tasks = [
    limitParallel(() => fetchConcourt()),
    limitParallel(() => fetchSCA()),
    limitParallel(() => fetchCommercial(query))
  ];
  const results = (await Promise.allSettled(tasks))
    .flatMap(s => s.status === "fulfilled" ? s.value : [])
    .map(normalize);

  const unique = dedupe(results).sort((a, b) => {
    const ad = a.date ? Date.parse(a.date) : 0;
    const bd = b.date ? Date.parse(b.date) : 0;
    return bd - ad;
  });

  const page = unique.slice(offset, offset + limit);
  upsertCases(unique).catch(() => {});

  return {
    query, fromCache: false,
    results: page.map(r => ({
      title: r.title,
      title_highlight: highlight(r.title, query),
      url: r.url,
      source: r.source,
      court: r.court,
      date: r.date,
      citation: r.citation || null
    })),
    total_estimated: unique.length
  };
}

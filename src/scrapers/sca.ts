
import * as cheerio from "cheerio";
import { http, limiter } from "../lib/http.js";

export async function fetchSCA() {
  const base = "https://www.saflii.org/za/cases/ZASCA/";
  const { data } = await limiter.schedule(() => http.get<string>(base));
  const $ = cheerio.load(data);
  const out: Array<{ source: string; court: string; title: string; url: string; date: string | null; citation?: string | null }> = [];

  $("li a").each((_i, a) => {
    const href = $(a).attr("href");
    const rawText = $(a).text().trim().replace(/\s+/g, " ");
    if (!href) return;
    const url = href.startsWith("http") ? href : `https://www.saflii.org${href}`;
    const dateMatch = rawText.match(/\b(20\d{2}|19\d{2})\b/);
    const date = dateMatch ? `${dateMatch[0]}-01-01` : null;
    out.push({
      source: "SCA",
      court: "Supreme Court of Appeal",
      title: rawText,
      url,
      date,
      citation: null
    });
  });
  return out;
}

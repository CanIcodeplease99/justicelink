
import * as cheerio from "cheerio";
import { http, limiter } from "../lib/http.js";

function parseDateMaybe(s: string): string | null {
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

export async function fetchConcourt() {
  const url = "https://www.concourt.org.za/index.php/judgements";
  const { data } = await limiter.schedule(() => http.get<string>(url));
  const $ = cheerio.load(data);
  const out: Array<{ source: string; court: string; title: string; url: string; date: string | null; citation?: string | null }> = [];

  $("table tr").each((_i, el) => {
    const tds = $(el).find("td");
    if (tds.length < 2) return;
    const dateText = $(tds[0]).text().trim();
    const titleText = $(tds[1]).text().trim().replace(/\s+/g, " ");
    const pdfLink = $(tds[1]).find("a[href$='.pdf'], a[href*='download']").attr("href");
    if (titleText && pdfLink) {
      out.push({
        source: "Concourt",
        court: "Constitutional Court",
        title: titleText,
        url: pdfLink.startsWith("http") ? pdfLink : `https://www.concourt.org.za${pdfLink}`,
        date: parseDateMaybe(dateText),
        citation: null
      });
    }
  });
  return out;
}

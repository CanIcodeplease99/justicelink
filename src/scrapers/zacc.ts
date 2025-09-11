import * as cheerio from "cheerio";
import { http } from "../lib/http.js";
import pino from "pino";

const log = pino({ name: "scraper:zacc" });

/**
 * ZACC index: https://www.saflii.org/za/cases/ZACC/
 * The index links to per-year pages. We'll fetch the latest 3 years.
 */
export async function fetchZACC() {
  const root = "https://www.saflii.org";
  const indexUrl = `${root}/za/cases/ZACC/`;

  try {
    const idx = await http.get(indexUrl);
    if (idx.status >= 400) {
      log.warn({ status: idx.status }, "ZACC non-200 at index");
      return [];
    }
    const $ = cheerio.load(idx.data);

    // Collect year links like /za/cases/ZACC/2024/
    const yearLinks: string[] = [];
    $('a[href^="/za/cases/ZACC/"]').each((_, a) => {
      const href = $(a).attr("href")?.trim() || "";
      const year = href.match(/\/ZACC\/(20\d{2})\/?$/)?.[1];
      if (year) {
        const abs = href.startsWith("http") ? href : root + href;
        if (!yearLinks.includes(abs)) yearLinks.push(abs);
      }
    });

    // Sort years desc and take the latest 3
    const latest = yearLinks
      .map((u) => ({ url: u, year: Number(u.match(/ZACC\/(20\d{2})/)?.[1] || 0) }))
      .filter((x) => x.year > 0)
      .sort((a, b) => b.year - a.year)
      .slice(0, 3);

    const items: any[] = [];

    for (const { url, year } of latest) {
      try {
        const yr = await http.get(url);
        if (yr.status >= 400) {
          log.warn({ status: yr.status, url }, "ZACC non-200 at year page");
          continue;
        }
        const $$ = cheerio.load(yr.data);

        // Judgment links typically look like /za/cases/ZACC/2024/123.html
        $$('a[href*="/za/cases/ZACC/"]').each((_, a) => {
          const href = $$(a).attr("href")?.trim() || "";
          if (!href.match(/\/za\/cases\/ZACC\/20\d{4}\/\d+/)) return;

          const abs = href.startsWith("http") ? href : root + href;
          const title = $$(a).text().replace(/\s+/g, " ").trim() || abs;

          items.push({
            source: "ZACC",
            court: "Constitutional Court",
            title,
            url: abs,
            date: String(year),
          });
        });
      } catch (err: any) {
        log.warn({ url, err: err?.message }, "ZACC fetch year failed");
      }
    }

    if (!items.length) log.warn("ZACC: parsed but found 0 items");
    return items;
  } catch (err: any) {
    log.warn({ err: err?.message }, "ZACC index fetch failed");
    return [];
  }
}

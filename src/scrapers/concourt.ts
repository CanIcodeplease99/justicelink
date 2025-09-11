import * as cheerio from "cheerio";
import { http } from "../lib/http.js";
import pino from "pino";

const log = pino({ name: "scraper:concourt-dspace" });

/**
 * DSpace collection: https://collections.concourt.org.za/handle/20.500.12144/1
 * DSpace typically paginates with "offset" (or "start") and shows items with
 * selectors like ".artifact-title a". We'll fetch the first 3 pages defensively.
 */
export async function fetchConcourt() {
  const base = "https://collections.concourt.org.za";
  const handlePath = "/handle/20.500.12144/1";
  // Fetch first ~60 items (0,20,40). Adjust rpp if needed.
  const pages = [0, 20, 40].map((start) =>
    `${base}${handlePath}?rpp=20&sort_by=2&order=DESC&etal=0&start=${start}`
  );

  const all: any[] = [];

  for (const url of pages) {
    try {
      const res = await http.get(url);
      if (res.status >= 400) {
        log.warn({ status: res.status, url }, "Concourt DSpace non-200");
        continue;
      }

      const $ = cheerio.load(res.data);

      // Common DSpace patterns:
      // - Title links: ".artifact-title a" or ".artifact-title > a"
      // - Item container: ".artifact-description", ".item-wrapper", or "div.ds-artifact-item"
      $(".artifact-title a, .artifact-title > a").each((_, a) => {
        const href = $(a).attr("href")?.trim();
        const title = $(a).text().replace(/\s+/g, " ").trim();

        if (!href || !title) return;

        const urlAbs = href.startsWith("http") ? href : `${base}${href}`;
        // Try to locate a nearby date text (DSpace often renders "Date: YYYY-MM-DD" in fields)
        // We'll inspect the nearest container
        const container = $(a).closest(".artifact-description, .item-wrapper, .ds-artifact-item");
        const textBlob =
          (container.text() || $("body").text() || "").replace(/\s+/g, " ").trim();

        // Extract a date if present (prefer YYYY-MM-DD, fallback to YYYY)
        let date: string | null = null;
        const m1 = textBlob.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        const m2 = textBlob.match(/\b(20\d{2}|19\d{2})\b/);
        if (m1) date = m1[1];
        else if (m2) date = m2[1];

        all.push({
          source: "Concourt",
          court: "Constitutional Court",
          title,
          url: urlAbs,
          date,
        });
      });

      // If nothing matched on this page, log once to help debugging
      if (!all.length) {
        log.warn({ url }, "Concourt DSpace: page parsed but no items found");
      }
    } catch (err: any) {
      log.warn({ url, err: err?.message }, "Concourt DSpace fetch failed");
    }
  }

  return all;
}

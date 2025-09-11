import * as cheerio from "cheerio";
import { http } from "../lib/http.js";
import pino from "pino";

const log = pino({ name: "scraper:sca" });

export async function fetchSCA() {
  const base = "https://www.saflii.org";
  const indexUrl = `${base}/za/cases/ZASCA/`;

  try {
    const res = await http.get(indexUrl);
    if (res.status >= 400) {
      log.warn({ status: res.status }, "SCA non-200");
      return [];
    }
    const $ = cheerio.load(res.data);
    const items: any[] = [];

    // Links like /za/cases/ZASCA/2024/123.html
    $('a[href*="/za/cases/ZASCA/"]').each((_, a) => {
      const href = $(a).attr("href")?.trim() || "";
      const text = $(a).text().replace(/\s+/g, " ").trim();
      if (!href.match(/\/za\/cases\/ZASCA\/\d{4}\/\d+/)) return;

      const abs = href.startsWith("http") ? href : base + href;
      items.push({
        source: "SCA",
        court: "Supreme Court of Appeal",
        title: text || abs,
        url: abs,
        date: null,
      });
    });

    if (!items.length) log.warn("SCA: parsed but found 0 items");
    return items;
  } catch (err: any) {
    log.warn({ err: err?.message }, "SCA fetch failed");
    return [];
  }
}


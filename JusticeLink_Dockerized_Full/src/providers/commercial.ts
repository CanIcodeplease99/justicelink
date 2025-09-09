
import { http } from "../lib/http.js";

export async function fetchCommercial(query: string) {
  if (!process.env.COMMERCIAL_PROXY_URL) return [];
  try {
    const { data } = await http.post(process.env.COMMERCIAL_PROXY_URL, { query });
    return (data?.cases || []).map((c: any) => ({
      source: "Commercial",
      court: c.court || "Commercial Provider",
      title: c.title,
      url: c.url,
      date: c.date || null,
      citation: c.citation || null
    }));
  } catch {
    return [];
  }
}

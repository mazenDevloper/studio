import type { IptvSource } from "@/lib/m3u-loader";

/**
 * The main lists, loaded together (merged, each channel once) until the user loads another link:
 * iptv.llc, iptv-org's Arabic-language list on GitHub and iptvcat's UAE channels.
 */
export const MAIN_IPTV_LISTS = [
  { name: "iptv.llc", url: "https://iptv.llc" },
  { name: "iptv-org · العربية", url: "https://iptv-org.github.io/iptv/languages/ara.m3u" },
  { name: "iptvcat · الإمارات", url: "https://iptvcat.com/united_arab_emirates__6" },
];
/** several links in one source: separated by spaces or new lines */
export const DEFAULT_IPTV_URL = MAIN_IPTV_LISTS.map(l => l.url).join("\n");

export const DEFAULT_IPTV_SOURCE: IptvSource = { kind: "url", url: DEFAULT_IPTV_URL };

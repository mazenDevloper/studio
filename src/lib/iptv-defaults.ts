import type { IptvSource } from "@/lib/m3u-loader";

/**
 * The two main lists, loaded together (merged, each channel once) until the user loads another link:
 * iptv.llc and iptv-org's Arabic-language list on GitHub.
 */
export const MAIN_IPTV_LISTS = [
  { name: "iptv.llc", url: "https://iptv.llc" },
  { name: "iptv-org · العربية", url: "https://iptv-org.github.io/iptv/languages/ara.m3u" },
];
/** several links in one source: separated by spaces or new lines */
export const DEFAULT_IPTV_URL = MAIN_IPTV_LISTS.map(l => l.url).join("\n");

export const DEFAULT_IPTV_SOURCE: IptvSource = { kind: "url", url: DEFAULT_IPTV_URL };

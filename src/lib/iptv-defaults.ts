import type { IptvSource } from "@/lib/m3u-loader";

/** Playlist loaded automatically on the IPTV screen until the user loads another link. */
export const DEFAULT_IPTV_URL =
  "http://megaunpr.com:2095/get.php?username=W87d737&password=Pd37qj34&type=m3u_plus&output=m3u8";

export const DEFAULT_IPTV_SOURCE: IptvSource = { kind: "url", url: DEFAULT_IPTV_URL };

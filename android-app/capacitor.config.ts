import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The app opens the live site (updates to the site reach the app without a new APK). Change APP_URL when the
 * site moves (e.g. to the main production domain) and rebuild.
 */
const APP_URL = process.env.APP_URL || "https://cplay2.vercel.app";

const config: CapacitorConfig = {
  appId: "com.drivecast.sovereign",
  appName: "DriveCast",
  webDir: "www",
  server: {
    url: APP_URL,
    cleartext: true, // IPTV streams on plain http
    androidScheme: "https",
    // stay inside the app for every page (Vercel sign-in / redirects included): a navigation to another host used
    // to open an external browser tab with its address bar, where the native permissions don't exist
    allowNavigation: ["*"],
  },
  android: {
    // not fullscreen: the status bar stays visible and the page starts below it
    adjustMarginsForEdgeToEdge: "force",
    backgroundColor: "#000000",
    allowMixedContent: true,
  },
};

export default config;

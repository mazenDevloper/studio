import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The app opens the live site (updates to the site reach the app without a new APK). Change APP_URL when the
 * site moves (e.g. to the main production domain) and rebuild.
 */
const APP_URL = process.env.APP_URL || "https://studio-git-claude-practical-mend-1e3f52-mazendevlopers-projects.vercel.app";

const config: CapacitorConfig = {
  appId: "com.drivecast.sovereign",
  appName: "DriveCast",
  webDir: "www",
  server: {
    url: APP_URL,
    cleartext: true, // IPTV streams on plain http
    androidScheme: "https",
  },
  android: {
    // not fullscreen: the status bar stays visible and the page starts below it
    adjustMarginsForEdgeToEdge: "force",
    backgroundColor: "#000000",
    allowMixedContent: true,
  },
};

export default config;

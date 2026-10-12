// Capacitor APK wrapper — thin shell around the production PWA (PRD 7.10).
// No native logic fork: same Next.js build, same API.
// The WebView loads your LIVE site (server.url). capacitor-www/ holds only a
// tiny offline splash shown if the server is unreachable.
// Build the APK/AAB on a machine with Android Studio:
//   1. Set server.url below to your Netlify URL (no trailing slash)
//   2. npm run apk:sync        (copies web assets into android/)
//   3. npm run apk:open        (opens Android Studio → Build → Generate App Bundle)
// Permissions (android/app/src/main/AndroidManifest.xml): CAMERA (QR fallback),
// POST_NOTIFICATIONS (booking alerts). versionCode bumps per release.
// Store notes: "Requires internet; saved passes readable offline."
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.viewproof.app",
  appName: "ViewProof",
  webDir: "capacitor-www",
  server: {
    // TODO: replace with your production URL, e.g. https://viewproof.netlify.app
    url: "https://viewproof.netlify.app",
    cleartext: false,
  },
};

export default config;

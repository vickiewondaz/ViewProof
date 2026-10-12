// Capacitor APK wrapper — thin shell around the production PWA (PRD 7.10).
// No native logic fork: same Next.js build, same API.
// Steps (on a machine with Android Studio):
//   1. npm i @capacitor/core @capacitor/cli @capacitor/android
//   2. npx cap init ViewProof com.viewproof.app --web-dir=out (or PWA URL via server.url below)
//   3. npx cap add android
//   4. npx cap sync && npx cap open android  (build AAB/APK, bump versionCode per web release)
// Permissions: CAMERA (QR fallback), POST_NOTIFICATIONS (booking alerts).
// Store notes: "Requires internet; saved passes readable offline."
/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.viewproof.app",
  appName: "ViewProof",
  webDir: "public",
  // For TWA-style live wrapper, comment webDir and use:
  // server: { url: "https://viewproof.netlify.app", cleartext: false },
};

export default config;

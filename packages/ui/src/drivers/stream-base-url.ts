// Base for the local test-streams fixtures. Empty on web: they live under
// public/ and are served same-origin.
export const streamBaseUrl = "";

// Absolute base of the shared API server, baked at bundle time. Empty means
// same-origin: the web server build rewrites /api/stream to the API. A
// packaged desktop app has no backend on tauri://localhost, so its bundle
// must carry a non-empty base.
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

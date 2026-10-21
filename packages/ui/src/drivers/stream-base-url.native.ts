// The IP goes by env var and can not be hardcoded
export const streamBaseUrl = process.env.EXPO_PUBLIC_STREAM_BASE_URL ?? "";
// Absolute base of the shared API server, inlined at bundle time. Changing it
// at runtime is impossible, so it must be passed when the bundle is built.
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

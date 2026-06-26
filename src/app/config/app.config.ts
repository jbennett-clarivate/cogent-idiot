/**
 * Runtime application configuration.
 *
 * This is the single switch that decides whether the app talks to a real
 * backend or runs entirely self-contained (the in-browser mock backend).
 *
 *  - apiServerUrl === ""   -> SELF-CONTAINED MODE.
 *      All /api/* calls are answered in-browser by mock-backend.interceptor.ts.
 *      No Node server is required. This is what lets the app deploy as static
 *      files (e.g. GoDaddy/Apache) and still perform the full login handshake.
 *
 *  - apiServerUrl set      -> REAL SERVER MODE.
 *      e.g. "https://api.example.com" or "http://localhost:3000".
 *      The interceptor steps aside and requests go to that origin's /api.
 *
 * Switching environments is therefore a one-line change here.
 */
export interface AppConfig {
	/** Base origin of a real API server, or "" to use the built-in mock backend. */
	apiServerUrl: string;
}

export const APP_CONFIG: AppConfig = {
	apiServerUrl: "",
};

/** True when no real server is configured and the mock backend should answer. */
export function useMockBackend(): boolean {
	return !APP_CONFIG.apiServerUrl;
}
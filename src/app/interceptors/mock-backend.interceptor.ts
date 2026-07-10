import { Injectable } from "@angular/core";
import {
	HttpInterceptor,
	HttpRequest,
	HttpHandler,
	HttpEvent,
	HttpResponse,
} from "@angular/common/http";
import { Observable, of, from } from "rxjs";
import { delay, mergeMap, materialize, dematerialize } from "rxjs/operators";
import { useMockBackend } from "@app/config/app.config";

/**
 * In-browser mock backend.
 *
 * Replicates the Express auth handshake (pepper -> salt -> hashed login) and the
 * supporting endpoints entirely client-side, so the app can run as static files
 * with no Node server. Behaviour is intentionally identical to server.js so the
 * UI cannot tell the difference. When app.config.ts points at a real server,
 * this interceptor disables itself and lets requests pass through.
 *
 * Security note: this is a *simulation* of the handshake for demo purposes. The
 * "database" lives in the browser, so it is not a real authentication boundary.
 * It deliberately mirrors the server's anti-enumeration behaviour (always
 * returning a salt-shaped response) so the demo reflects the production design.
 */
@Injectable()
export class MockBackendInterceptor implements HttpInterceptor {
	/**
	 * Demo accounts. Mirrors a real USER table row: we store the salt and the
	 * pre-computed storedDHP = sha256(salt + password) - never the plaintext
	 * password. This keeps credentials out of the readable bundle, exactly as a
	 * real database would only ever hold the hash.
	 *
	 *   GLaDOS@brightmatter.tools -> password "ABCDGH" (salt "salt123")
	 */
	private readonly seedUsers: { email: string; salt: string; storedDHP: string }[] = [
		{
			email: "glados@brightmatter.tools",
			salt: "salt123",
			storedDHP: "bcfa442fe2e65153c13ce1f4da73883d72c59b0083393d8caa87dab4e0dbc4d1",
		},
	];

	/** Per-"session" handshake state, mirroring express-session fields. */
	private session: {
		pepper?: string;
		username?: string;
		salt?: string;
	} = {};

	intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
		if (!useMockBackend()) {
			return next.handle(req);
		}

		// Only our own /api/* routes are mocked. Anything else (e.g. external
		// services like api.pwnedpasswords.com) must pass through untouched even
		// in self-contained mode.
		if (!this.pathOf(req.url).includes("/api/")) {
			return next.handle(req);
		}

		// Wrap in defer-like async pipeline; add a tiny delay to feel networky.
		return of(null).pipe(
			mergeMap(() => this.handleRoute(req)),
			materialize(),
			delay(120),
			dematerialize(),
		);
	}

	private handleRoute(req: HttpRequest<any>): Observable<HttpEvent<any>> {
		const url = req.url;
		const method = req.method.toUpperCase();
		const path = this.pathOf(url);

		if (path.endsWith("/api/health") && method === "GET") {
			return this.ok({
				status: "OK",
				message: "Mock backend running",
				environment: "static-demo",
				timestamp: new Date().toISOString(),
			});
		}

		if (path.endsWith("/api/auth/pepper") && method === "GET") {
			return this.handlePepper();
		}

		if (path.endsWith("/api/auth/salt") && method === "POST") {
			return this.handleSalt(req.body);
		}

		if (path.endsWith("/api/login") && method === "POST") {
			return from(this.handleLogin(req.body));
		}

		if (path.endsWith("/api/auth/status") && method === "GET") {
			return this.handleStatus();
		}

		if (path.endsWith("/api/auth/refresh") && method === "POST") {
			return this.handleRefresh();
		}

		if (path.endsWith("/api/logout") && method === "POST") {
			this.clearLogin();
			return this.ok({ success: true });
		}

		if (path.endsWith("/api/tools") && method === "GET") {
			return this.ok(this.tools());
		}

		// Unknown API route under mock backend.
		return this.error(404, { error: "Not found" });
	}

	// --- Handshake endpoints -------------------------------------------------

	private handlePepper(): Observable<HttpEvent<any>> {
		const pepper = this.randomString(12);
		this.session.pepper = pepper;
		return this.ok({ pepper });
	}

	private handleSalt(body: any): Observable<HttpEvent<any>> {
		const username = (body?.username || "").toString();
		if (!username || username.length > 256) {
			return this.error(400, { error: "Invalid username" });
		}

		const normalized = username.toLowerCase().trim();
		const known = this.seedUsers.find(u => u.email === normalized);

		// Anti-enumeration: always return a salt-shaped value. Unknown users get a
		// deterministic fake salt so responses are indistinguishable from real ones.
		const salt = known ? known.salt : this.fakeSalt(normalized);

		this.session.username = normalized;
		this.session.salt = salt;
		return this.ok({ salt });
	}

	private async handleLogin(body: any): Promise<HttpEvent<any>> {
		const hashedPepperedPassword = body?.hashedPepperedPassword;
		const { username, salt, pepper } = this.session;

		if (!hashedPepperedPassword || !username || !salt || !pepper) {
			return this.rawError(400, { error: "Invalid login attempt - session data missing" });
		}

		const known = this.seedUsers.find(u => u.email === username);
		// For unknown users we still compute against a value that will never match,
		// keeping timing/shape similar and avoiding an existence oracle.
		const storedDHP = known
			? known.storedDHP
			: await this.sha256(salt + "\u0000no-such-user");

		const expectedHash = await this.sha256(storedDHP + pepper);

		if (this.constantTimeEquals(expectedHash, String(hashedPepperedPassword)) && known) {
			this.setLogin(known.email);
			// Burn the pepper so the captured wire value cannot be replayed.
			this.session.pepper = undefined;
			this.session.username = undefined;
			this.session.salt = undefined;
			return this.rawOk({ success: true, email: known.email });
		}

		return this.rawError(401, { error: "Authentication failed" });
	}

	private handleStatus(): Observable<HttpEvent<any>> {
		const login = this.getLogin();
		if (login) {
			return this.ok({
				authenticated: true,
				email: login.email,
				logged_in_at: login.logged_in_at,
			});
		}
		return this.ok({ authenticated: false });
	}

	private handleRefresh(): Observable<HttpEvent<any>> {
		const login = this.getLogin();
		if (login) {
			const updated = { email: login.email, logged_in_at: Math.floor(Date.now() / 1000) };
			sessionStorage.setItem(this.LOGIN_KEY, JSON.stringify(updated));
			return this.ok({ authenticated: true, ...updated });
		}
		return this.ok({ authenticated: false });
	}

	// --- Login persistence (mirrors server session) -------------------------

	private readonly LOGIN_KEY = "mock_session_login";

	private setLogin(email: string): void {
		sessionStorage.setItem(
			this.LOGIN_KEY,
			JSON.stringify({ email, logged_in_at: Math.floor(Date.now() / 1000) }),
		);
	}

	private getLogin(): { email: string; logged_in_at: number } | null {
		const raw = sessionStorage.getItem(this.LOGIN_KEY);
		return raw ? JSON.parse(raw) : null;
	}

	private clearLogin(): void {
		sessionStorage.removeItem(this.LOGIN_KEY);
	}

	// --- Helpers ------------------------------------------------------------

	private tools(): any[] {
		return [
			{ id: "bayes", name: "Bayes Calculator", description: "Calculate Bayesian probabilities" },
			{ id: "listclean", name: "List Cleaner", description: "Clean and format lists" },
			{ id: "listcomparator", name: "List Comparator", description: "Compare two lists" },
			{ id: "listiterator", name: "List Iterator", description: "Iterate through list items" },
			{ id: "listrandom", name: "List Randomizer", description: "Randomize list order" },
			{ id: "message", name: "TZ Tool", description: "Send messages" },
			{ id: "pascal", name: "Pascal Calculator", description: "Pascal triangle calculations" },
			{ id: "safecron", name: "Safe Cron", description: "Manage cron jobs safely" },
			{ id: "taxes", name: "Tax Calculator", description: "Calculate taxes" },
		];
	}

	private pathOf(url: string): string {
		try {
			return new URL(url, window.location.origin).pathname;
		} catch {
			return url;
		}
	}

	private randomString(len: number): string {
		const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
		const bytes = new Uint8Array(len);
		crypto.getRandomValues(bytes);
		let out = "";
		for (let i = 0; i < len; i++) {
			out += chars.charAt(bytes[i] % chars.length);
		}
		return out;
	}

	/** Deterministic, salt-shaped value for unknown users (anti-enumeration). */
	private fakeSalt(username: string): string {
		let h = 2166136261;
		for (let i = 0; i < username.length; i++) {
			h ^= username.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return ("00000000" + (h >>> 0).toString(16)).slice(-8);
	}

	private constantTimeEquals(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false;
		}
		let diff = 0;
		for (let i = 0; i < a.length; i++) {
			diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
		}
		return diff === 0;
	}

	private async sha256(message: string): Promise<string> {
		const buf = new TextEncoder().encode(message);
		const digest = await crypto.subtle.digest("SHA-256", buf);
		return Array.from(new Uint8Array(digest))
			.map(b => b.toString(16).padStart(2, "0"))
			.join("");
	}

	// --- Response builders --------------------------------------------------

	private ok(body: any): Observable<HttpEvent<any>> {
		return of(new HttpResponse({ status: 200, body }));
	}

	private rawOk(body: any): HttpEvent<any> {
		return new HttpResponse({ status: 200, body });
	}

	private error(status: number, body: any): Observable<HttpEvent<any>> {
		return from(Promise.reject({ status, error: body }));
	}

	private rawError(status: number, body: any): HttpEvent<any> {
		throw { status, error: body };
	}
}
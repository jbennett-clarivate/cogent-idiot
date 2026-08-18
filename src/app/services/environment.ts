import { Injectable } from "@angular/core";
import { AppUtils } from "./app-utils";
import { APP_CONFIG, useMockBackend } from "@app/config/app.config";

@Injectable({
	providedIn: "root",
})
export class Environment {
	private readonly _isLocalhost: boolean;
	private readonly _apiBaseUrl: string;

	constructor(private appUtils: AppUtils) {
		this._isLocalhost = this.detectLocalhost();
		this._apiBaseUrl = this.getApiBaseUrl();
	}

	private detectLocalhost(): boolean {
		const hostname = window.location.hostname;
		return this.appUtils.safeStringCompare(hostname, "localhost") || hostname === "127.0.0.1" || hostname === "::1";
	}

	private getApiBaseUrl(): string {
		if (useMockBackend()) {
			return "/api";
		}
		return `${APP_CONFIG.apiServerUrl.replace(/\/$/, "")}/api`;
	}

	get apiBaseUrl(): string {
		return this._apiBaseUrl;
	}

	get isLocalhost(): boolean {
		return this._isLocalhost;
	}

	get usingMockBackend(): boolean {
		return useMockBackend();
	}
}

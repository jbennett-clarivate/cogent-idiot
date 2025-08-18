import { Injectable } from '@angular/core';
import { AppUtils } from './app-utils';

@Injectable({
  providedIn: 'root'
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
    return this.appUtils.safeStringCompare(hostname, 'localhost') || hostname === '127.0.0.1' || hostname === '::1';
  }

  private getApiBaseUrl(): string {
    if (this._isLocalhost) {
      // In local development, use full URL to backend server
      return 'http://localhost:3000/api';
    } else {
      // In production, use relative paths
      return '/api';
    }
  }

  get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }
}

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private _isLocalhost: boolean;
  private _apiBaseUrl: string;

  constructor() {
    this._isLocalhost = this.detectLocalhost();
    this._apiBaseUrl = this.getApiBaseUrl();
  }

  private detectLocalhost(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
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

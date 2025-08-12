import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';

export interface AuthResponse {
  success: boolean;
  email?: string;
  error?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  email?: string;
  logged_in_at?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl: string;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<string | null>(null);

  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private environmentService: EnvironmentService) {
    this.baseUrl = this.environmentService.apiBaseUrl;
    this.checkAuthStatus();
  }

  logout(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/logout`, {}).pipe(
      tap(response => {
        if (response.success) {
          this.isAuthenticatedSubject.next(false);
          this.currentUserSubject.next(null);
          localStorage.clear();
        }
      }),
      catchError(error => {
        console.error('Logout error:', error);
        // Even if logout fails, clear local state
        this.isAuthenticatedSubject.next(false);
        this.currentUserSubject.next(null);
        localStorage.clear();
        return of({ success: true });
      })
    );
  }

  checkAuthStatus(): void {
    this.http.get<AuthStatus>(`${this.baseUrl}/auth/status`).pipe(
      catchError(error => {
        console.error('Auth status check failed:', error);
        return of({ authenticated: false, email: undefined });
      })
    ).subscribe(status => {
      this.isAuthenticatedSubject.next(status.authenticated);
      this.currentUserSubject.next((status as AuthStatus).email || null);
    });
  }

  refreshLogin(): Observable<AuthStatus> {
    return this.http.post<AuthStatus>(`${this.baseUrl}/auth/refresh`, {}).pipe(
      tap(status => {
        this.isAuthenticatedSubject.next(status.authenticated);
        this.currentUserSubject.next(status.email || null);
      }),
      catchError(error => {
        console.error('Refresh login error:', error);
        this.isAuthenticatedSubject.next(false);
        this.currentUserSubject.next(null);
        return of({ authenticated: false });
      })
    );
  }

  // Method to update auth state after successful login
  setAuthenticatedUser(email: string): void {
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next(email);
  }
}

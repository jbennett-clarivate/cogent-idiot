import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { EnvironmentService } from '../services/environment.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  pepper = '';
  salt = '';
  showPasswordField = false;
  errorMessage = '';
  private baseUrl: string;

  @ViewChild('passwordInput') passwordInput!: ElementRef;

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private environmentService: EnvironmentService
  ) {
    this.baseUrl = this.environmentService.apiBaseUrl;
  }

  ngOnInit() {
    // Step #2 & #5: Get pepper when page loads
    this.http.get<{pepper: string}>(`${this.baseUrl}/auth/pepper`).subscribe({
      next: (response) => {
        this.pepper = response.pepper;
      },
      error: (error) => {
        console.error('Failed to get pepper:', error);
      }
    });
  }

  onFirstNext() {
    if (!this.username.trim()) {
      this.errorMessage = 'Please enter a username';
      return;
    }

    // Step #4: Get user salt
    this.http.post<{salt: string}>(`${this.baseUrl}/auth/salt`, { username: this.username }).subscribe({
      next: (response) => {
        this.salt = response.salt;
        this.showPasswordField = true;
        this.errorMessage = '';

        // Focus the password input after the view updates
        setTimeout(() => {
          this.passwordInput?.nativeElement.focus();
        }, 0);
      },
      error: (error) => {
        this.errorMessage = 'User not found';
        console.error('Failed to get salt:', error);
      }
    });
  }

  async onSecondNext() {
    if (!this.password.trim()) {
      this.errorMessage = 'Please enter a password';
      return;
    }

    try {
      // Client-side hashing process:
      // 1. Salt + hash the password to create DHP
      const saltedPassword = this.salt + this.password;
      const dhp = await this.sha256(saltedPassword);

      // 2. Pepper the DHP and hash again
      const pepperedDHP = dhp + this.pepper;
      const hashedPepperedPassword = await this.sha256(pepperedDHP);

      // 3. Send to server
      this.http.post<{success: boolean, email?: string, error?: string}>(`${this.baseUrl}/login`, {
        hashedPepperedPassword
      }).subscribe({
        next: (response) => {
          if (response.success && response.email) {
            // Update auth service state
            this.authService.setAuthenticatedUser(response.email);
            this.router.navigate(['/']);
          } else {
            this.errorMessage = response.error || 'Login failed';
          }
        },
        error: (error) => {
          this.errorMessage = 'Login failed';
          console.error('Login error:', error);
        }
      });
    } catch (error) {
      this.errorMessage = 'Error processing login';
      console.error('Hashing error:', error);
    }
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

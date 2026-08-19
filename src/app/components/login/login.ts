import { Component, OnInit, ElementRef, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "@services/auth.service";
import { Environment } from "@services/environment";
import { LLM_CHECKLIST, ChecklistSection } from "./llm-questions.data";

@Component({
	selector: "app-login",
	imports: [CommonModule, FormsModule],
	templateUrl: "./login.html",
	styleUrls: ["./login.scss"],
})
export class LoginComponent implements OnInit {
	username = "";
	password = "";
	pepper = "";
	salt = "";
	showPasswordField = false;
	errorMessage = "";
	private baseUrl: string;

	// --- LLM Questions checklist state ---
	private static readonly CHECKLIST_STORAGE_KEY = "llm-server-checklist";
	sections: ChecklistSection[] = LLM_CHECKLIST;
	showChecklist = false;
	checkedState: Record<string, boolean> = {};
	collapsedState: Record<number, boolean> = {};
	totalQuestions = 0;
	answeredQuestions = 0;
	progressPct = 0;

	@ViewChild("passwordInput") passwordInput!: ElementRef;

	constructor(
		private router: Router,
		private http: HttpClient,
		private authService: AuthService,
		private environmentService: Environment,
	) {
		this.baseUrl = this.environmentService.apiBaseUrl;
	}

	ngOnInit() {
		this.totalQuestions = this.sections.reduce((n, s) => n + s.questions.length, 0);
		this.loadChecklist();
		this.updateProgress();

		this.http.get<{ pepper: string }>(`${this.baseUrl}/auth/pepper`).subscribe({
			next: (response) => {
				this.pepper = response.pepper;
			},
			error: (error) => {
				console.error("Failed to get pepper:", error);
			},
		});
	}

	// --- Checklist overlay controls ---
	openChecklist() {
		this.showChecklist = true;
	}

	closeChecklist() {
		this.showChecklist = false;
	}

	toggleSection(index: number) {
		this.collapsedState[index] = !this.collapsedState[index];
	}

	/** Single handler wired to every checkbox: saves the value and refreshes progress. */
	onQuestionToggle(id: string, checked: boolean) {
		this.checkedState[id] = checked;
		this.saveChecklist();
		this.updateProgress();
	}

	sectionAnswered(section: ChecklistSection): number {
		return section.questions.filter(q => this.checkedState[q.id]).length;
	}

	resetChecklist() {
		if (!confirm("Clear all checkboxes?")) return;
		this.checkedState = {};
		this.saveChecklist();
		this.updateProgress();
	}

	expandAll() {
		this.collapsedState = {};
	}

	collapseAll() {
		this.sections.forEach((_s, i) => (this.collapsedState[i] = true));
	}

	private updateProgress() {
		this.answeredQuestions = Object.values(this.checkedState).filter(Boolean).length;
		this.progressPct = this.totalQuestions
			? Math.round((this.answeredQuestions / this.totalQuestions) * 100)
			: 0;
	}

	private saveChecklist() {
		try {
			localStorage.setItem(
				LoginComponent.CHECKLIST_STORAGE_KEY,
				JSON.stringify(this.checkedState),
			);
		} catch (e) {
			console.error("Failed to save checklist:", e);
		}
	}

	private loadChecklist() {
		try {
			const raw = localStorage.getItem(LoginComponent.CHECKLIST_STORAGE_KEY);
			if (raw) {
				this.checkedState = JSON.parse(raw) || {};
			}
		} catch (e) {
			this.checkedState = {};
		}
	}

	onFirstNext() {
		if (!this.username.trim()) {
			this.errorMessage = "Please enter a username";
			return;
		}

		this.http.post<{ salt: string }>(`${this.baseUrl}/auth/salt`, { username: this.username }).subscribe({
			next: (response) => {
				this.salt = response.salt;
				this.showPasswordField = true;
				this.errorMessage = "";

				setTimeout(() => {
					this.passwordInput?.nativeElement.focus();
				}, 0);
			},
			error: (error) => {
				this.errorMessage = "User not found";
				console.error("Failed to get salt:", error);
			},
		});
	}

	async onSecondNext() {
		if (!this.password.trim()) {
			this.errorMessage = "Please enter a password";
			return;
		}

		try {
			const saltedPassword = this.salt + this.password;
			const dhp = await this.sha256(saltedPassword);
			const pepperedDHP = dhp + this.pepper;
			const hashedPepperedPassword = await this.sha256(pepperedDHP);

			this.http.post<{ success: boolean, email?: string, error?: string }>(`${this.baseUrl}/login`, {
				hashedPepperedPassword,
			}).subscribe({
				next: (response) => {
					if (response.success && response.email) {
						// Update auth service state
						this.authService.setAuthenticatedUser(response.email);
						this.router.navigate(["/home"]);
					} else {
						this.errorMessage = response.error || "Login failed";
					}
				},
				error: (error) => {
					this.errorMessage = "Login failed";
					console.error("Login error:", error);
				},
			});
		} catch (error) {
			this.errorMessage = "Error processing login";
			console.error("Hashing error:", error);
		}
	}

	reset() {
		this.username = "";
		this.password = "";
		this.salt = "";
		this.showPasswordField = false;
		this.errorMessage = "";
		setTimeout(() => {
			const usernameInput = document.getElementById("username");
			if (usernameInput) {
				(usernameInput as HTMLInputElement).focus();
			}
		}, 0);
	}

	private async sha256(message: string): Promise<string> {
		const msgBuffer = new TextEncoder().encode(message);
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
	}
}


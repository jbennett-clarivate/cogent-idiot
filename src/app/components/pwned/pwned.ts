import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

type CheckState = "idle" | "checking" | "safe" | "pwned" | "error";

@Component({
	selector: "app-pwned",
	imports: [CommonModule, FormsModule],
	templateUrl: "./pwned.html",
	styleUrls: ["./pwned.scss"],
})
export class PwnedComponent {
	password = "";
	state: CheckState = "idle";
	breachCount = 0;
	errorMessage = "";

	constructor(private http: HttpClient) {}

	onKeydown(event: KeyboardEvent): void {
		if (event.key === "ArrowRight") {
			event.preventDefault();
			this.check();
		}
	}

	async check(): Promise<void> {
		const pw = this.password;
		if (!pw) {
			return;
		}

		this.state = "checking";
		this.breachCount = 0;
		this.errorMessage = "";

		try {
			const fullHash = (await this.sha1(pw)).toUpperCase();
			const prefix = fullHash.substring(0, 5);
			const suffix = fullHash.substring(5);
			const body = await firstValueFrom(
				this.http.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
					responseType: "text",
				}),
			);

			const count = this.findSuffix(body, suffix);
			if (count > 0) {
				this.breachCount = count;
				this.state = "pwned";
			} else {
				this.state = "safe";
			}
		} catch (err) {
			this.state = "error";
			this.errorMessage = "Could not reach the breach database. Please try again.";
			console.error("Pwned check failed:", err);
		}
	}

	reset(): void {
		this.password = "";
		this.state = "idle";
		this.breachCount = 0;
		this.errorMessage = "";
	}

	private findSuffix(responseText: string, suffix: string): number {
		const lines = responseText.split("\n");
		for (const line of lines) {
			const idx = line.indexOf(":");
			if (idx === -1) {
				continue;
			}
			const lineSuffix = line.substring(0, idx).trim().toUpperCase();
			if (lineSuffix === suffix) {
				const count = parseInt(line.substring(idx + 1).trim(), 10);
				return isNaN(count) ? 0 : count;
			}
		}
		return 0;
	}

	private async sha1(message: string): Promise<string> {
		const buffer = new TextEncoder().encode(message);
		const digest = await crypto.subtle.digest("SHA-1", buffer);
		return Array.from(new Uint8Array(digest))
			.map(b => b.toString(16).padStart(2, "0"))
			.join("");
	}
}
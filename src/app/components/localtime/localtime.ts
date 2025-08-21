import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
	selector: "app-localtime",
	templateUrl: "./localtime.html",
	styleUrls: ["./localtime.scss"],
	imports: [FormsModule, CommonModule],
})
export class LocaltimeComponent {
	logInput: string = "";
	localtimeOutput: string = "";
	errorMessage: string = "";

	translateLocaltime(): void {
		this.errorMessage = "";
		this.localtimeOutput = "";

		if (!this.logInput) {
			this.errorMessage = "Please enter a timestamp";
			return;
		}

		try {
			// Parse the log timestamp format: 2025-08-18 20:15:38,371
			const timestamp = this.parseLogTimestamp(this.logInput);
			if (!timestamp) {
				this.errorMessage = "Invalid timestamp format. Expected: YYYY-MM-DD HH:mm:ss,SSS";
				return;
			}

			// Convert to local timezone with proper formatting
			this.localtimeOutput = this.formatLocalTime(timestamp);
		} catch (error) {
			this.errorMessage = "Error parsing timestamp. Please check the format.";
		}
	}

	private parseLogTimestamp(input: string): Date | null {
		// Expected format: 2025-08-18 20:15:38,371
		const regex = /^(\d{4})-(\d{2})-(\d{2})[\sT]+(\d{2}):(\d{2}):(\d{2})[.,]?(\d{3})?Z?$/;
		const match = input.trim().match(regex);

		if (!match) {
			return null;
		}

		const [, year, month, day, hour, minute, second, millisecond = "0"] = match;

		const y = parseInt(year);
		const m = parseInt(month);
		const d = parseInt(day);
		const h = parseInt(hour);
		const min = parseInt(minute);
		const s = parseInt(second);
		const ms = parseInt(millisecond);

		if (
			y < 1970 ||
			y > 2100 ||
			m < 1 ||
			m > 12 ||
			d < 1 ||
			d > 31 ||
			h > 23 ||
			min > 59 ||
			s > 59
		) {
			return null;
		}

		// assume UTC input
		const utcMillis = Date.UTC(y, m - 1, d, h, min, s, ms);

		return new Date(utcMillis);
	}

	private formatLocalTime(date: Date): string {
		try {
			const tzAbbrev = this.getShortTimezoneAbbrev(date);
			const timezoneName = this.getUserTimezoneName();

			const year = date.getFullYear();
			const month = (date.getMonth() + 1).toString().padStart(2, "0");
			const day = date.getDate().toString().padStart(2, "0");
			const hours = date.getHours();
			const minutes = date.getMinutes().toString().padStart(2, "0");
			const seconds = date.getSeconds().toString().padStart(2, "0");
			const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
			const period = hours >= 12 ? "PM" : "AM";
			const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

			return `${year}-${month}-${day} ${displayHours}:${minutes}:${seconds}.${milliseconds} ${period} ${tzAbbrev} (${timezoneName})`;
		} catch (error) {
			console.log(error);
			return "Error formatting local time";
		}
	}

	private getShortTimezoneAbbrev(date: Date): string {
		try {
			const parts = new Intl.DateTimeFormat("en-US", {
				hour: "numeric",
				minute: "2-digit",
				timeZoneName: "short",
			}).formatToParts(date);
			const tz = parts.find(p => p.type === "timeZoneName")?.value;
			if (tz) return tz;
		} catch (e) {
			// fall through to offset-based fallback
		}
		// Fallback: UTC offset as abbreviation
		const offsetMin = -date.getTimezoneOffset();
		const sign = offsetMin >= 0 ? "+" : "-";
		const hh = Math.floor(Math.abs(offsetMin) / 60).toString().padStart(2, "0");
		const mm = (Math.abs(offsetMin) % 60).toString().padStart(2, "0");
		return `UTC${sign}${hh}:${mm}`;
	}

	private getUserTimezoneName(): string {
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone;
		} catch (e) {
			const offset = -new Date().getTimezoneOffset();
			const sign = offset >= 0 ? "+" : "-";
			const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0");
			const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
			return `UTC${sign}${hours}:${minutes}`;
		}
	}

	get hasOutput(): boolean {
		return !!this.localtimeOutput || !!this.errorMessage;
	}

	reset(): void {
		this.logInput = "";
		this.localtimeOutput = "";
		this.errorMessage = "";
	}
}

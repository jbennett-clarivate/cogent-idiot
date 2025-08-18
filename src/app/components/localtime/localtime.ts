import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-localtime',
  templateUrl: './localtime.html',
  styleUrls: ['./localtime.scss'],
  imports: [FormsModule, CommonModule]
})
export class LocaltimeComponent {
  logInput = '';
  localtimeOutput = '';
  errorMessage = '';

  translateLocaltime() {
    this.errorMessage = '';
    this.localtimeOutput = '';

    if (!this.logInput.trim()) {
      this.errorMessage = 'Please enter a timestamp';
      return;
    }

    try {
      // Parse the log timestamp format: 2025-08-18 20:15:38,371
      const timestamp = this.parseLogTimestamp(this.logInput.trim());
      if (!timestamp) {
        this.errorMessage = 'Invalid timestamp format. Expected: YYYY-MM-DD HH:mm:ss,SSS';
        return;
      }

      // Convert to local timezone with proper formatting
      this.localtimeOutput = this.formatLocalTime(timestamp);
    } catch (error) {
      this.errorMessage = 'Error parsing timestamp. Please check the format.';
    }
  }

  private parseLogTimestamp(input: string): Date | null {
    // Expected format: 2025-08-18 20:15:38,371
    const regex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;
    const match = input.match(regex);

    if (!match) {
      return null;
    }

    const [, year, month, day, hour, minute, second, millisecond] = match;

    // Create date object (month is 0-indexed in JavaScript)
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second),
      parseInt(millisecond)
    );

    // Validate the date
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  private formatLocalTime(date: Date): string {
    try {
      // Get timezone abbreviation
      const tzAbbrev = this.getShortTimezoneAbbrev(date);
      const timezoneName = this.getUserTimezoneName();

      // Format the date in local timezone
      const localDate = new Date(date.getTime());

      const year = localDate.getFullYear();
      const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
      const day = localDate.getDate().toString().padStart(2, '0');

      let hours = localDate.getHours();
      const minutes = localDate.getMinutes().toString().padStart(2, '0');
      const seconds = localDate.getSeconds().toString().padStart(2, '0');
      const milliseconds = localDate.getMilliseconds().toString().padStart(3, '0');

      // 12-hour format
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

      return `${year}-${month}-${day} ${displayHours}:${minutes}:${seconds}.${milliseconds} ${period} ${tzAbbrev} (${timezoneName})`;
    } catch (error) {
      return 'Error formatting local time';
    }
  }

  private getShortTimezoneAbbrev(date: Date): string {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      }).formatToParts(date);
      const tz = parts.find(p => p.type === 'timeZoneName')?.value;
      if (tz) return tz;
    } catch (e) {
      // fall through to offset-based fallback
    }
    // Fallback: UTC offset as abbreviation
    const offsetMin = -date.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const hh = Math.floor(Math.abs(offsetMin) / 60).toString().padStart(2, '0');
    const mm = (Math.abs(offsetMin) % 60).toString().padStart(2, '0');
    return `UTC${sign}${hh}:${mm}`;
  }

  private getUserTimezoneName(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      const offset = -new Date().getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
      const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
      return `UTC${sign}${hours}:${minutes}`;
    }
  }

  get hasOutput(): boolean {
    return !!this.localtimeOutput || !!this.errorMessage;
  }

  reset() {
    this.logInput = '';
    this.localtimeOutput = '';
    this.errorMessage = '';
  }
}

import { Component, ElementRef, ViewChild, AfterViewInit, signal, computed, effect } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

interface TimeZoneData {
	iana: string;
	code: string;
	city: string;
	weight: number;
	color: string;
}

interface TimeZoneOption {
	value: string;
	label: string;
}

@Component({
	selector: "app-safecron",
	imports: [CommonModule, FormsModule],
	templateUrl: "./safecron.html",
	styleUrl: "./safecron.scss",
})
export class SafecronComponent implements AfterViewInit {
	@ViewChild("cronChart", { static: false }) cronChart!: ElementRef<HTMLCanvasElement>;

	private timeZoneData: TimeZoneData[] = [];

	selectedZone = signal<string>("");
	selectedWeight = signal<string>("1");
	meetingTime = signal<string>("");
	downtime = signal<string>("");
	selectedLocalTimes = signal<TimeZoneData[]>([]);
	safeScheduleArray = signal<number[]>([]);

	timeZones = computed(() => this.timeZoneData.map(tz => ({
		value: tz.code,
		label: this.describeZone(tz),
	})));

	canComputeSafeTime = computed(() => this.selectedLocalTimes().length > 0);

	weights: string[] = ["1", "2", "3"];

	constructor() {
		this.initializeTimeZoneData();

		effect(() => {
			if (this.selectedLocalTimes().length > 0) {
				this.updateChart();
			}
		});
	}

	ngAfterViewInit() {
		this.setupCanvasEventListeners();
	}

	private initializeTimeZoneData() {
		this.timeZoneData = [
			{ iana: "Pacific/Honolulu", code: "HONOLULU", city: "Honolulu", weight: 0, color: "" },
			{ iana: "America/Los_Angeles", code: "LOS_ANGELES", city: "Los Angeles", weight: 0, color: "" },
			{ iana: "America/Denver", code: "DENVER", city: "Denver", weight: 0, color: "" },
			{ iana: "America/Chicago", code: "CHICAGO", city: "Chicago", weight: 0, color: "" },
			{ iana: "America/New_York", code: "NEW_YORK", city: "New York", weight: 0, color: "" },
			{ iana: "America/Sao_Paulo", code: "SAO_PAULO", city: "São Paulo", weight: 0, color: "" },
			{ iana: "Europe/London", code: "LONDON", city: "London", weight: 0, color: "" },
			{ iana: "Europe/Berlin", code: "BERLIN", city: "Berlin", weight: 0, color: "" },
			{ iana: "Africa/Johannesburg", code: "JOHANNESBURG", city: "Johannesburg", weight: 0, color: "" },
			{ iana: "Europe/Moscow", code: "MOSCOW", city: "Moscow", weight: 0, color: "" },
			{ iana: "Asia/Dubai", code: "DUBAI", city: "Dubai", weight: 0, color: "" },
			{ iana: "Asia/Karachi", code: "KARACHI", city: "Karachi", weight: 0, color: "" },
			{ iana: "Asia/Kolkata", code: "MUMBAI", city: "Mumbai", weight: 0, color: "" },
			{ iana: "Asia/Bangkok", code: "BANGKOK", city: "Bangkok", weight: 0, color: "" },
			{ iana: "Asia/Singapore", code: "SINGAPORE", city: "Singapore", weight: 0, color: "" },
			{ iana: "Asia/Tokyo", code: "TOKYO", city: "Tokyo", weight: 0, color: "" },
			{ iana: "Australia/Sydney", code: "SYDNEY", city: "Sydney", weight: 0, color: "" },
			{ iana: "Pacific/Auckland", code: "AUCKLAND", city: "Auckland", weight: 0, color: "" },
		];
	}

	private offsetHoursFor(iana: string, at: Date = new Date()): number {
		const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
		const local = new Date(at.toLocaleString("en-US", { timeZone: iana }));
		return Math.round(((local.getTime() - utc.getTime()) / 3600000) * 4) / 4;
	}

	private abbrevFor(iana: string, at: Date = new Date()): string {
		try {
			const parts = new Intl.DateTimeFormat("en-US", {
				timeZone: iana,
				timeZoneName: "short",
				hour: "numeric",
			}).formatToParts(at);
			return parts.find(p => p.type === "timeZoneName")?.value ?? "";
		} catch {
			return "";
		}
	}

	private formatOffset(offset: number): string {
		const sign = offset >= 0 ? "+" : "-";
		const abs = Math.abs(offset);
		const hours = Math.floor(abs);
		const minutes = Math.round((abs - hours) * 60);
		return `UTC${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
	}

	private describeZone(zone: TimeZoneData, at: Date = new Date()): string {
		const offset = this.offsetHoursFor(zone.iana, at);
		const abbrev = this.abbrevFor(zone.iana, at);
		const offsetStr = this.formatOffset(offset);
		return abbrev ? `${zone.city} (${offsetStr}, ${abbrev})` : `${zone.city} (${offsetStr})`;
	}

	getTooltipText(code: string): string {
		const zone = this.timeZoneData.find(tz => tz.code === code);
		return zone ? this.describeZone(zone) : "";
	}

	private getLocalOffsetHours(): number {
		return new Date().getTimezoneOffset() / -60;
	}

	private mod96(value: number): number {
		return ((Math.round(value) % 96) + 96) % 96;
	}

	private computeZoneSlots(zone: TimeZoneData, localOffsetHours: number): { start: number; end: number } {
		const offset = this.offsetHoursFor(zone.iana) - localOffsetHours;
		const workStart = 9 - offset;
		const workEnd = workStart + 8;
		return {
			start: this.mod96(workStart * 4),
			end: this.mod96(workEnd * 4),
		};
	}

	private getRandomColor(): string {
		const letters = "0123456789ABCDEF";
		let color = "#";
		for (let i = 0; i < 6; i++) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}

	addZone() {
		const selectedZoneValue = this.selectedZone();
		const selectedWeightValue = this.selectedWeight();

		if (selectedZoneValue && selectedWeightValue) {
			const timeZone = this.timeZoneData.find(tz => tz.code === selectedZoneValue);
			if (timeZone) {
				this.selectedLocalTimes.update(times => {
					const existingZone = times.find(t => t.code === selectedZoneValue);
					if (existingZone) {
						existingZone.weight += parseInt(selectedWeightValue);
						return [...times];
					} else {
						const newZone: TimeZoneData = {
							...timeZone,
							weight: parseInt(selectedWeightValue),
							color: this.getRandomColor(),
						};
						return [...times, newZone];
					}
				});

				this.selectedZone.set("");
				this.selectedWeight.set("1");
			}
		}
	}

	computeSafeTime() {
		const currentSelectedTimes = this.selectedLocalTimes();
		if (currentSelectedTimes.length === 0) return;

		const localOffsetHours = this.getLocalOffsetHours();
		const newSafeScheduleArray = new Array(96).fill(0);
		const workingWindowSlots = 32; // eight hours, in 15-minute slots

		currentSelectedTimes.forEach(localTime => {
			const { start } = this.computeZoneSlots(localTime, localOffsetHours);
			for (let i = 0; i < workingWindowSlots; i++) {
				const slot = (start + i) % 96;
				newSafeScheduleArray[slot] += localTime.weight;
			}
		});

		this.safeScheduleArray.set(newSafeScheduleArray);
		this.calculateBestTimes(localOffsetHours);
	}

	private calculateBestTimes(localOffsetHours: number) {
		const currentArray = this.safeScheduleArray();
		if (!currentArray || currentArray.length !== 96) {
			this.meetingTime.set("");
			this.downtime.set("");
			return;
		}

		const windowSize = 4; // one hour (4 x 15 minutes)
		const windowSums = this.slidingWindowSums(currentArray, windowSize);
		const zones = this.selectedLocalTimes();
		const maxWeight = zones.reduce((acc, z) => Math.max(acc, z.weight), 0);
		const topZones = zones.filter(z => z.weight === maxWeight && maxWeight > 0);
		const zoneWindows = new Map<string, { start: number; end: number }>();
		zones.forEach(zone => {
			const w = this.computeZoneSlots(zone, localOffsetHours);
			zoneWindows.set(zone.code, w);
		});

		const maxSum = Math.max(...windowSums);
		const candidates: number[] = [];
		for (let i = 0; i < windowSums.length; i++) {
			if (windowSums[i] === maxSum) candidates.push(i);
		}

		const containedCandidates = candidates.filter(start => this.isContainedForTopZones(start, windowSize, topZones, zoneWindows));
		const finalMeetingCandidates = containedCandidates.length > 0 ? containedCandidates : candidates;

		const meetingStart = this.tieBreakMeeting(finalMeetingCandidates, topZones, zoneWindows);

		const minSum = Math.min(...windowSums);
		const downtimeCandidates: number[] = [];
		for (let i = 0; i < windowSums.length; i++) {
			if (windowSums[i] === minSum) downtimeCandidates.push(i);
		}
		const downtimeStart = this.tieBreakDowntime(downtimeCandidates);

		this.meetingTime.set(this.getTimeLabelWithAbbrev(meetingStart));
		this.downtime.set(this.getTimeLabelWithAbbrev(downtimeStart));
	}

	private slidingWindowSums(arr: number[], windowSize: number): number[] {
		const n = arr.length;
		const sums = new Array(n).fill(0);
		let s = 0;
		for (let k = 0; k < windowSize; k++) {
			s += arr[k % n];
		}
		sums[0] = s;
		for (let i = 1; i < n; i++) {
			s = s - arr[(i - 1) % n] + arr[(i + windowSize - 1) % n];
			sums[i] = s;
		}
		return sums;
	}

	private isContainedForTopZones(start: number, windowSize: number, topZones: TimeZoneData[], zoneWindows: Map<string, { start: number, end: number }>): boolean {
		if (topZones.length === 0) return true;
		for (const z of topZones) {
			const w = zoneWindows.get(z.code)!;
			if (!this.isWindowInside(start, windowSize, w.start, w.end)) return false;
		}
		return true;
	}

	private isWindowInside(start: number, windowSize: number, zoneStart: number, zoneEnd: number): boolean {
		for (let k = 0; k < windowSize; k++) {
			const slot = (start + k) % 96;
			if (!this.isSlotInSpan(slot, zoneStart, zoneEnd)) return false;
		}
		return true;
	}

	private isSlotInSpan(slot: number, spanStart: number, spanEnd: number): boolean {
		if (spanStart === spanEnd) return false; // empty span (should not happen)
		if (spanStart < spanEnd) {
			return slot >= spanStart && slot < spanEnd;
		}
		return slot >= spanStart || slot < spanEnd;
	}

	private tieBreakMeeting(candidates: number[], topZones: TimeZoneData[], zoneWindows: Map<string, { start: number, end: number }>): number {
		if (candidates.length === 0) return 0;
		if (candidates.length === 1) return candidates[0];

		const distances = candidates.map(start => {
			let total = 0;
			if (topZones.length === 0) return { start, score: 0 };
			for (const z of topZones) {
				const w = zoneWindows.get(z.code)!;
				const d = (start - w.start + 96) % 96; // forward distance from zone start
				total += d;
			}
			return { start, score: total };
		});
		distances.sort((a, b) => a.score - b.score || a.start - b.start);

		const now = new Date();
		const nowSlot = now.getHours() * 4 + Math.floor(now.getMinutes() / 15);

		const bestScore = distances[0].score;
		const topByScore = distances.filter(d => d.score === bestScore).map(d => d.start);

		if (topByScore.length === 1) return topByScore[0];

		let best = topByScore[0];
		let bestDist = (best - nowSlot + 96) % 96;
		for (let i = 1; i < topByScore.length; i++) {
			const s = topByScore[i];
			const d = (s - nowSlot + 96) % 96;
			if (d < bestDist || (d === bestDist && s < best)) {
				best = s;
				bestDist = d;
			}
		}
		return best;
	}

	private tieBreakDowntime(candidates: number[]): number {
		if (candidates.length === 0) return 0;
		if (candidates.length === 1) return candidates[0];
		return Math.min(...candidates);
	}

	private indexOfMin(arr: number[]): number {
		return arr.indexOf(Math.min(...arr));
	}

	private indexOfMax(arr: number[]): number {
		return arr.indexOf(Math.max(...arr));
	}

	private getTimestamp(index: number): string {
		const hours = Math.floor(index / 4) % 24;
		const quarterHours = index % 4;
		const minutes = (quarterHours * 15) % 60;

		let displayHours = hours;
		let period = "AM";

		if (hours === 0) {
			displayHours = 12;
			period = "AM";
		} else if (hours < 12) {
			displayHours = hours;
			period = "AM";
		} else if (hours === 12) {
			displayHours = 12;
			period = "PM";
		} else {
			displayHours = hours - 12;
			period = "PM";
		}

		const minutesStr = minutes.toString().padStart(2, "0");
		const userTimezoneName = this.getUserTimezoneName();

		return `${displayHours}:${minutesStr} ${period} ${userTimezoneName}`;
	}

	private getTimeLabelWithAbbrev(index: number): string {
		const hours = Math.floor(index / 4) % 24;
		const quarterHours = index % 4;
		const minutes = (quarterHours * 15) % 60;

		let displayHours = hours;
		let period = "AM";

		if (hours === 0) {
			displayHours = 12;
			period = "AM";
		} else if (hours < 12) {
			displayHours = hours;
			period = "AM";
		} else if (hours === 12) {
			displayHours = 12;
			period = "PM";
		} else {
			displayHours = hours - 12;
			period = "PM";
		}

		const minutesStr = minutes.toString().padStart(2, "0");
		const today = new Date();
		const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0, 0);
		const tzAbbrev = this.getShortTimezoneAbbrev(localDate);

		return `${displayHours}:${minutesStr} ${period} ${tzAbbrev}`;
	}

	private getShortTimezoneAbbrev(date: Date): string {
		try {
			const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).formatToParts(date);
			const tz = parts.find(p => p.type === "timeZoneName")?.value;
			if (tz) return tz;
		} catch (e) {
			// fall through to offset-based fallback
		}
		const offsetMin = -date.getTimezoneOffset();
		const sign = offsetMin >= 0 ? "+" : "-";
		const hh = Math.floor(Math.abs(offsetMin) / 60).toString().padStart(2, "0");
		const mm = (Math.abs(offsetMin) % 60).toString().padStart(2, "0");
		return `UTC${sign}${hh}:${mm}`;
	}

	private getTimeRange(startIndex: number, windowSize: number): string {
		const endIndex = (startIndex + windowSize) % 96;
		const startStr = this.getTimestamp(startIndex);
		const endStr = this.getTimestamp(endIndex);
		const endParts = endStr.split(" ");
		const endTime = endParts.slice(0, 2).join(" ");
		const tz = this.getUserTimezoneName();
		return `${startStr} - ${endTime} ${tz}`;
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

	private updateChart() {
		if (!this.cronChart) return;

		const canvas = this.cronChart.nativeElement;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = 800;
		canvas.height = 400;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		this.drawGrid(ctx, canvas);
		this.drawTimeZoneSchedules(ctx, canvas);
	}

	private drawGrid(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
		const margin = { top: 40, right: 40, bottom: 80, left: 100 };
		const chartWidth = canvas.width - margin.left - margin.right;
		const chartHeight = canvas.height - margin.top - margin.bottom;

		ctx.strokeStyle = "#e0e0e0";
		ctx.lineWidth = 1;

		for (let i = 0; i <= 96; i += 4) { // Every hour
			const x = margin.left + (i / 96) * chartWidth;
			ctx.beginPath();
			ctx.moveTo(x, margin.top);
			ctx.lineTo(x, margin.top + chartHeight);
			ctx.stroke();
			ctx.save();
			ctx.translate(x, canvas.height - 70); // Move up from bottom edge
			ctx.rotate(-Math.PI / 4); // Rotate 45 degrees
			ctx.fillStyle = "#333";
			ctx.font = "10px Arial";
			ctx.textAlign = "right";

			let hours = Math.floor(i / 4);
			let displayHours = hours;
			let period = "AM";

			hours = hours % 24; // Ensure hours are within 0-23

			if (hours === 0) {
				displayHours = 12;
				period = "AM";
			} else if (hours < 12) {
				displayHours = hours;
				period = "AM";
			} else if (hours === 12) {
				displayHours = 12;
				period = "PM";
			} else {
				displayHours = hours - 12;
				period = "PM";
			}

			ctx.fillText(`${displayHours}:00${period}`, 0, 0);
			ctx.restore();
		}

		const selectedTimes = this.selectedLocalTimes();
		const numZones = selectedTimes.length;
		const zoneHeight = numZones > 0 ? chartHeight / numZones : chartHeight;

		for (let i = 0; i <= numZones; i++) {
			const y = margin.top + i * zoneHeight;
			ctx.beginPath();
			ctx.moveTo(margin.left, y);
			ctx.lineTo(margin.left + chartWidth, y);
			ctx.stroke();
		}

		this.drawCurrentTimeLine(ctx, canvas, margin, chartWidth, chartHeight);

		selectedTimes.forEach((zone: TimeZoneData, index: number) => {
			const y = margin.top + (index + 0.5) * zoneHeight;
			ctx.fillStyle = "#333";
			ctx.font = "12px Arial";
			ctx.textAlign = "right";
			ctx.fillText(zone.city, margin.left - 10, y + 4);
		});

		const userTimezoneName = this.getUserTimezoneName();
		ctx.fillStyle = "#333";
		ctx.font = "14px Arial";
		ctx.textAlign = "center";
		ctx.fillText(`${userTimezoneName} (You)`, canvas.width / 2, canvas.height - 10);

		ctx.save();
		ctx.translate(15, canvas.height / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.fillText("Time Zones", 0, 0);
		ctx.restore();
	}

	private drawCurrentTimeLine(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement,
		margin: any, chartWidth: number, chartHeight: number) {
		const now = new Date();
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();
		const currentTimeSlot = currentHour * 4 + Math.floor(currentMinute / 15);
		const x = margin.left + (currentTimeSlot / 96) * chartWidth;

		// Draw the current timeline
		ctx.strokeStyle = "#ff0000";
		ctx.lineWidth = 2;
		ctx.setLineDash([5, 5]); // Dashed line

		ctx.beginPath();
		ctx.moveTo(x, margin.top);
		ctx.lineTo(x, margin.top + chartHeight);
		ctx.stroke();
	}

	private drawTimeZoneSchedules(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
		const margin = { top: 40, right: 40, bottom: 80, left: 100 };
		const chartWidth = canvas.width - margin.left - margin.right;
		const chartHeight = canvas.height - margin.top - margin.bottom;
		const selectedTimes = this.selectedLocalTimes();
		const numZones = selectedTimes.length;
		const zoneHeight = numZones > 0 ? chartHeight / numZones : chartHeight;
		const localOffsetHours = this.getLocalOffsetHours();

		selectedTimes.forEach((zone, index) => {
			const r = parseInt(zone.color.slice(1, 3), 16);
			const g = parseInt(zone.color.slice(3, 5), 16);
			const b = parseInt(zone.color.slice(5, 7), 16);
			ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
			const y = margin.top + index * zoneHeight;

			const { start: startSlot, end: endSlot } = this.computeZoneSlots(zone, localOffsetHours);

			if (startSlot < endSlot) {
				const x = margin.left + (startSlot / 96) * chartWidth;
				const width = ((endSlot - startSlot) / 96) * chartWidth;
				ctx.fillRect(x, y, width, zoneHeight);
			} else { // Wraps around midnight
				const x1 = margin.left + (startSlot / 96) * chartWidth;
				const width1 = ((96 - startSlot) / 96) * chartWidth;
				ctx.fillRect(x1, y, width1, zoneHeight);

				const x2 = margin.left;
				const width2 = (endSlot / 96) * chartWidth;
				ctx.fillRect(x2, y, width2, zoneHeight);
			}
		});
	}

	private setupCanvasEventListeners() {
		if (!this.cronChart) return;

		const canvas = this.cronChart.nativeElement;

		canvas.addEventListener("mousemove", (event) => {
			this.handleCanvasMouseMove(event);
		});

		canvas.addEventListener("mouseleave", () => {
			this.hideCanvasTooltip();
		});
	}

	private handleCanvasMouseMove(event: MouseEvent) {
		if (!this.cronChart || this.selectedLocalTimes().length === 0) return;

		const canvas = this.cronChart.nativeElement;
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const margin = { top: 40, right: 40, bottom: 80, left: 100 };
		const chartHeight = canvas.height - margin.top - margin.bottom;
		const zoneHeight = chartHeight / this.selectedLocalTimes().length;

		if (x >= 10 && x <= margin.left - 10) {
			for (let i = 0; i < this.selectedLocalTimes().length; i++) {
				const labelY = margin.top + (i + 0.5) * zoneHeight;
				if (y >= labelY - zoneHeight / 2 && y <= labelY + zoneHeight / 2) {
					const zone = this.selectedLocalTimes()[i];
					this.showCanvasTooltip(event, this.describeZone(zone));
					return;
				}
			}
		}

		this.hideCanvasTooltip();
	}

	private showCanvasTooltip(event: MouseEvent, text: string) {
		this.hideCanvasTooltip();

		const tooltip = document.createElement("div");
		tooltip.id = "canvas-tooltip";
		tooltip.innerHTML = text;
		tooltip.style.cssText = `
      position: fixed;
      background: #333;
      color: white;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      white-space: nowrap;
      left: ${event.clientX + 10}px;
      top: ${event.clientY - 30}px;
    `;

		document.body.appendChild(tooltip);
	}

	private hideCanvasTooltip() {
		const existingTooltip = document.getElementById("canvas-tooltip");
		if (existingTooltip) {
			existingTooltip.remove();
		}
	}
}

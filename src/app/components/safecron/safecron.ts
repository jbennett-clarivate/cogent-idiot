import { Component, ElementRef, ViewChild, AfterViewInit, signal, computed, effect } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

interface TimeZoneData {
	offset: number;
	code: string;
	weight: number;
	description: string;
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

	// Signals for reactive state management
	selectedZone = signal<string>("");
	selectedWeight = signal<string>("1");
	meetingTime = signal<string>("");
	downtime = signal<string>("");
	selectedLocalTimes = signal<TimeZoneData[]>([]);
	safeScheduleArray = signal<number[]>([]);

	// Computed values
	timeZones = computed(() => this.timeZoneData.map(tz => ({
		value: tz.code,
		label: `UTC${tz.offset >= 0 ? "+" : ""}${tz.offset}`,
	})));

	canComputeSafeTime = computed(() => this.selectedLocalTimes().length > 0);

	weights: string[] = ["1", "2", "3"];

	constructor() {
		this.initializeTimeZoneData();

		// Effect to update chart when selected times change
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
			{ offset: -12, code: "IDLW", weight: 0, description: "UTC-12:00", color: "" },
			{ offset: -11, code: "SST", weight: 0, description: "UTC-11:00", color: "" },
			{ offset: -10, code: "TAHT", weight: 0, description: "UTC-10:00", color: "" },
			{ offset: -9.5, code: "MART", weight: 0, description: "UTC-09:30", color: "" },
			{ offset: -9, code: "HDT", weight: 0, description: "UTC-09:00", color: "" },
			{ offset: -8, code: "PST", weight: 0, description: "UTC-08:00", color: "" },
			{ offset: -7, code: "MST", weight: 0, description: "UTC-07:00", color: "" },
			{ offset: -6, code: "CST", weight: 0, description: "UTC-06:00", color: "" },
			{ offset: -5, code: "ST", weight: 0, description: "UTC-05:00", color: "" },
			{ offset: -4, code: "VET", weight: 0, description: "UTC-04:00", color: "" },
			{ offset: -3.5, code: "NST", weight: 0, description: "UTC-03:30", color: "" },
			{ offset: -3, code: "CLST", weight: 0, description: "UTC-03:00", color: "" },
			{ offset: -2.5, code: "NDT", weight: 0, description: "UTC-02:30", color: "" },
			{ offset: -2, code: "GST", weight: 0, description: "UTC-02:00", color: "" },
			{ offset: -1, code: "AZOT", weight: 0, description: "UTC-01:00", color: "" },
			{ offset: 0, code: "UTC", weight: 0, description: "UTC+00:00", color: "" },
			{ offset: 1, code: "CET", weight: 0, description: "UTC+01:00", color: "" },
			{ offset: 2, code: "CAT", weight: 0, description: "UTC+02:00", color: "" },
			{ offset: 3, code: "AST", weight: 0, description: "UTC+03:00", color: "" },
			{ offset: 3.5, code: "IRST", weight: 0, description: "UTC+03:30", color: "" },
			{ offset: 4, code: "SAMT", weight: 0, description: "UTC+04:00", color: "" },
			{ offset: 4.5, code: "IRDT", weight: 0, description: "UTC+04:30", color: "" },
			{ offset: 5, code: "ORAT", weight: 0, description: "UTC+05:00", color: "" },
			{ offset: 5.5, code: "IST", weight: 0, description: "UTC+05:30", color: "" },
			{ offset: 5.75, code: "NPT", weight: 0, description: "UTC+05:45", color: "" },
			{ offset: 6, code: "BTT", weight: 0, description: "UTC+06:00", color: "" },
			{ offset: 6.5, code: "MMT", weight: 0, description: "UTC+06:30", color: "" },
			{ offset: 7, code: "THA", weight: 0, description: "UTC+07:00", color: "" },
			{ offset: 8, code: "HKT", weight: 0, description: "UTC+08:00", color: "" },
			{ offset: 8.75, code: "ACWST", weight: 0, description: "UTC+08:45", color: "" },
			{ offset: 9, code: "JST", weight: 0, description: "UTC+09:00", color: "" },
			{ offset: 9.5, code: "ACST", weight: 0, description: "UTC+09:30", color: "" },
			{ offset: 10, code: "PGT", weight: 0, description: "UTC+10:00", color: "" },
			{ offset: 10.5, code: "LHST", weight: 0, description: "UTC+10:30", color: "" },
			{ offset: 11, code: "SBT", weight: 0, description: "UTC+11:00", color: "" },
			{ offset: 12, code: "FJT", weight: 0, description: "UTC+12:00", color: "" },
			{ offset: 12.75, code: "CHAST", weight: 0, description: "UTC+12:45", color: "" },
			{ offset: 13, code: "TKT", weight: 0, description: "UTC+13:00", color: "" },
			{ offset: 13.75, code: "CHADT", weight: 0, description: "UTC+13:45", color: "" },
			{ offset: 14, code: "LINT", weight: 0, description: "UTC+14:00", color: "" },
		];
	}

	getTooltipText(code: string): string {
		const zone = this.timeZoneData.find(tz => tz.code === code);
		return zone ? `${zone.code} - ${zone.description}` : "";
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
						// Update weight of existing zone
						existingZone.weight += parseInt(selectedWeightValue);
						return [...times];
					} else {
						// Add new zone
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

		// Initialize safe schedule array
		const newSafeScheduleArray = new Array(96).fill(0);

		// Calculate safe schedule based on selected time zones
		currentSelectedTimes.forEach(localTime => {
			let offset = (new Date().getTimezoneOffset()) / -60;
			const differentWorkingHoursBegin = localTime.offset;
			offset = differentWorkingHoursBegin - offset;
			const workStart = 9 - offset;
			const workEnd = workStart + 8;

			const startMinutes = workStart * 60;
			const endMinutes = workEnd * 60;

			for (let m = startMinutes; m < endMinutes; m += 15) {
				const slot = Math.floor(m / 15 + 96) % 96;
				newSafeScheduleArray[slot] += localTime.weight;
			}
		});

		// Update signal
		this.safeScheduleArray.set(newSafeScheduleArray);
		this.calculateBestTimes();
	}

	private calculateBestTimes() {
		const currentArray = this.safeScheduleArray();
		if (!currentArray || currentArray.length !== 96) {
			this.meetingTime.set("");
			this.downtime.set("");
			return;
		}

		const windowSize = 4; // one hour (4 x 15 minutes)

		// Precompute sliding window sums across the entire day
		const windowSums = this.slidingWindowSums(currentArray, windowSize);

		// Determine highest-weight zones and their working windows in local index space
		const zones = this.selectedLocalTimes();
		const maxWeight = zones.reduce((acc, z) => Math.max(acc, z.weight), 0);
		const topZones = zones.filter(z => z.weight === maxWeight && maxWeight > 0);
		const zoneWindows = new Map<string, { start: number; end: number }>();
		zones.forEach(zone => {
			const w = this.computeZoneWorkWindow(zone);
			zoneWindows.set(zone.code, w);
		});

		// Candidate meeting starts: maximize sum, then enforce containment for top zones
		const maxSum = Math.max(...windowSums);
		const candidates: number[] = [];
		for (let i = 0; i < windowSums.length; i++) {
			if (windowSums[i] === maxSum) candidates.push(i);
		}

		const containedCandidates = candidates.filter(start => this.isContainedForTopZones(start, windowSize, topZones, zoneWindows));
		const finalMeetingCandidates = containedCandidates.length > 0 ? containedCandidates : candidates;

		const meetingStart = this.tieBreakMeeting(finalMeetingCandidates, topZones, zoneWindows);

		// Downtime: minimize sum over sliding window
		const minSum = Math.min(...windowSums);
		const downtimeCandidates: number[] = [];
		for (let i = 0; i < windowSums.length; i++) {
			if (windowSums[i] === minSum) downtimeCandidates.push(i);
		}
		const downtimeStart = this.tieBreakDowntime(downtimeCandidates);

		// Update signals with concise time labels (start only with short TZ abbrev)
		this.meetingTime.set(this.getTimeLabelWithAbbrev(meetingStart));
		this.downtime.set(this.getTimeLabelWithAbbrev(downtimeStart));
	}

	private slidingWindowSums(arr: number[], windowSize: number): number[] {
		const n = arr.length;
		const sums = new Array(n).fill(0);
		// Compute initial window sum starting at 0
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

	private computeZoneWorkWindow(zone: TimeZoneData): { start: number; end: number } {
		let offset = (new Date().getTimezoneOffset()) / -60;
		const differentWorkingHoursBegin = zone.offset;
		offset = differentWorkingHoursBegin - offset;
		const workStart = 9 - offset;
		const workEnd = workStart + 8;
		const startSlot = (Math.floor(workStart * 4 + 96) % 96 + (this.fractionToQuarter(workStart) || 0)) % 96;
		const endSlot = (Math.floor(workEnd * 4 + 96) % 96 + (this.fractionToQuarter(workEnd) || 0)) % 96;
		// The above adds quarter offsets defensively; in practice workStart/workEnd should align to quarter-hour
		return { start: startSlot, end: endSlot };
	}

	private fractionToQuarter(value: number): number {
		const frac = value - Math.floor(value);
		if (Math.abs(frac - 0.75) < 1e-9) return 3;
		if (Math.abs(frac - 0.5) < 1e-9) return 2;
		if (Math.abs(frac - 0.25) < 1e-9) return 1;
		return 0;
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
		// Check each slot in the meeting window is within the zone's working span [zoneStart, zoneEnd) with wrap-around
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
		// wrap-around span
		return slot >= spanStart || slot < spanEnd;
	}

	private tieBreakMeeting(candidates: number[], topZones: TimeZoneData[], zoneWindows: Map<string, { start: number, end: number }>): number {
		if (candidates.length === 0) return 0;
		if (candidates.length === 1) return candidates[0];

		// Prefer starts closest to the beginning of top zones' work windows (forward distance)
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

		// Earliest upcoming relative to now as a secondary tie-breaker
		const now = new Date();
		const nowSlot = now.getHours() * 4 + Math.floor(now.getMinutes() / 15);

		const bestScore = distances[0].score;
		const topByScore = distances.filter(d => d.score === bestScore).map(d => d.start);

		if (topByScore.length === 1) return topByScore[0];

		// Choose the one with minimal forward distance from now
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
		// Pick the earliest index deterministically
		return Math.min(...candidates);
	}

	private indexOfMin(arr: number[]): number {
		return arr.indexOf(Math.min(...arr));
	}

	private indexOfMax(arr: number[]): number {
		return arr.indexOf(Math.max(...arr));
	}

	private getTimestamp(index: number): string {
		// Index is already in the user's local day space (0..95)
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
		// Build local time string and append short timezone abbreviation (e.g., MDT)
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
		// Fallback: UTC offset as abbreviation
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
		// Remove timezone from the end string to avoid duplication
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

		// Set canvas size
		canvas.width = 800;
		canvas.height = 400;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw chart background
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw grid and axes
		this.drawGrid(ctx, canvas);
		this.drawTimeZoneSchedules(ctx, canvas);
	}

	private drawGrid(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
		const margin = { top: 40, right: 40, bottom: 80, left: 100 };
		const chartWidth = canvas.width - margin.left - margin.right;
		const chartHeight = canvas.height - margin.top - margin.bottom;

		ctx.strokeStyle = "#e0e0e0";
		ctx.lineWidth = 1;

		// Draw vertical grid lines (15-minute intervals)
		for (let i = 0; i <= 96; i += 4) { // Every hour
			const x = margin.left + (i / 96) * chartWidth;
			ctx.beginPath();
			ctx.moveTo(x, margin.top);
			ctx.lineTo(x, margin.top + chartHeight);
			ctx.stroke();

			// Draw hour labels (rotated for readability) - fixed positioning
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

		// Draw horizontal grid lines (time zones)
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

		// Draw current time indicator line
		this.drawCurrentTimeLine(ctx, canvas, margin, chartWidth, chartHeight);

		// Draw time zone labels (matches original format)
		selectedTimes.forEach((zone: TimeZoneData, index: number) => {
			const y = margin.top + (index + 0.5) * zoneHeight;
			ctx.fillStyle = "#333";
			ctx.font = "12px Arial";
			ctx.textAlign = "right";
			ctx.fillText(`GMT${zone.offset >= 0 ? "+" : ""}${zone.offset}`, margin.left - 10, y + 4);
		});

		// Draw axis labels - use user's local timezone
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
		// Get current time in user's local timezone
		const now = new Date();
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();

		// Convert to quarter-hour slots (0-95)
		const currentTimeSlot = currentHour * 4 + Math.floor(currentMinute / 15);

		// Calculate x position on chart
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

		selectedTimes.forEach((zone, index) => {
			const r = parseInt(zone.color.slice(1, 3), 16);
			const g = parseInt(zone.color.slice(3, 5), 16);
			const b = parseInt(zone.color.slice(5, 7), 16);
			ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
			const y = margin.top + index * zoneHeight;

			let offset = (new Date().getTimezoneOffset()) / -60;
			const differentWorkingHoursBegin = zone.offset;
			offset = differentWorkingHoursBegin - offset;
			const workStart = 9 - offset;
			const workEnd = workStart + 8;

			const startSlot = (workStart * 4 + 96) % 96;
			const endSlot = (workEnd * 4 + 96) % 96;

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

		// Add mouse move event listener for tooltips
		canvas.addEventListener("mousemove", (event) => {
			this.handleCanvasMouseMove(event);
		});

		// Add mouse leave event listener to hide tooltips
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

		// Check if mouse is over y-axis label area
		if (x >= 10 && x <= margin.left - 10) {
			// Check which timezone label we're hovering over
			for (let i = 0; i < this.selectedLocalTimes().length; i++) {
				const labelY = margin.top + (i + 0.5) * zoneHeight;
				if (y >= labelY - zoneHeight / 2 && y <= labelY + zoneHeight / 2) {
					const zone = this.selectedLocalTimes()[i];
					this.showCanvasTooltip(event, `${zone.code} - ${zone.description}`);
					return;
				}
			}
		}

		this.hideCanvasTooltip();
	}

	private showCanvasTooltip(event: MouseEvent, text: string) {
		// Remove any existing tooltip
		this.hideCanvasTooltip();

		// Create tooltip element
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

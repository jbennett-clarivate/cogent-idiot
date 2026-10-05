import { Component, AfterViewInit, ElementRef, ViewChild, HostListener } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { InputControllerDirective } from "../../directives/input-controller.directive";
import { clamp, isPositiveNumber, toFiniteNumber } from "../../services/number-utils";
import { QuadrantAnchorDirective } from "../../directives/quadrant-anchor.directive";
import { TOOL_INFO } from "@app/config/tool-info";

@Component({
	selector: "app-taxes",
	imports: [CommonModule, FormsModule, InputControllerDirective, QuadrantAnchorDirective],
	templateUrl: "./taxes.html",
	styleUrls: ["./taxes.scss"],
})
export class TaxesComponent implements AfterViewInit {
	@ViewChild("taxCanvas") canvasRef!: ElementRef<HTMLCanvasElement>;

	readonly numberValidator = InputControllerDirective.numberValidator;
	readonly noWhitespaceEnforcer = InputControllerDirective.noWhitespaceEnforcer;

	// The explanatory prose lives in tool-info.ts and surfaces through info
	// icons rather than inline paragraphs, so the tool fits a phone viewport.
	readonly info = TOOL_INFO["/tools/taxes"].fields!;
	activeInfo: string | null = null;

	// One tap on a phone delivers touchstart, then a SYNTHETIC mouseenter, then
	// a click. Handling all three naively makes the popup flash and vanish:
	// touchstart opens it, mouseenter re-sets the same key, and the click's
	// toggle then reads "already open" and shuts it.
	//
	// So touchstart owns the gesture and both follow-up events are swallowed:
	// `hasTouch` permanently disables hover for this device, and
	// `suppressNextClick` eats exactly the one click that belongs to the tap.
	// A real mouse never sets either flag and keeps hover plus click.
	private hasTouch = false;
	private suppressNextClick = false;

	onTouchStart(key: string): void {
		this.hasTouch = true;
		this.suppressNextClick = true;
		this.toggleInfo(key);
	}

	onMarkerClick(key: string): void {
		if (this.suppressNextClick) {
			this.suppressNextClick = false;
			return;
		}
		this.toggleInfo(key);
	}

	showInfo(key: string): void {
		if (this.hasTouch) {
			return;
		}
		this.activeInfo = key;
	}

	hideInfo(key: string): void {
		if (this.hasTouch) {
			return;
		}
		if (this.activeInfo === key) {
			this.activeInfo = null;
		}
	}

	toggleInfo(key: string): void {
		this.activeInfo = this.activeInfo === key ? null : key;
	}

	// Any tap or click outside an info marker dismisses an open popup; on a
	// phone there is no pointer to move away, so this is the only way back.
	@HostListener("document:pointerdown", ["$event"])
	onDocumentPointerDown(event: Event): void {
		if (this.activeInfo === null) {
			return;
		}
		const target = event.target as HTMLElement | null;
		if (target?.closest(".info-marker") || target?.closest(".anchor-content")) {
			return;
		}
		this.activeInfo = null;
	}

	@HostListener("document:keydown.escape")
	onEscape(): void {
		this.activeInfo = null;
	}
	private static readonly DEFAULT_POVERTY = 15060;

	baseline: number = TaxesComponent.DEFAULT_POVERTY;
	current: number = TaxesComponent.DEFAULT_POVERTY;
	userIncome: number = 50000;
	minIncome = 10000;
	maxIncome = 1000000;
	exponent = 0;
	// True when the take-home curve has no interior maximum over the drawn
	// range, i.e. the exponent 1.5*L/L0 is at or below 1 and take-home rises
	// all the way to the right edge. peakIncome is then the edge of the chart,
	// not a turning point, and the template says so instead of naming an
	// income the curve never turns at.
	peakIsAtRangeEdge = false;
	peakIncome = 0;
	peakTaxRate = 0;
	peakTakeHome = 0;
	middleAnchor = 0;
	userTaxRate = 0;
	userTax = 0;
	userTakeHome = 0;

	private readonly COLOR_PROPOSED = "#2563eb"; // blue
	private readonly COLOR_FEDERAL = "#dc2626"; // red
	private readonly COLOR_TAKEHOME = "#16a34a"; // green

	constructor() {
		this.computeDerived();
	}

	ngAfterViewInit(): void {
		this.draw();
	}

	@HostListener("window:resize")
	onResize(): void {
		this.draw();
	}

	recompute(): void {
		this.computeDerived();
		this.draw();
	}

	private computeDerived(): void {
		const L = toFiniteNumber(this.current, 0);
		const L0 = toFiniteNumber(this.baseline, 0);
		if (!isPositiveNumber(L) || !isPositiveNumber(L0)) {
			return;
		}

		this.exponent = (1.5 * L) / L0;
		this.middleAnchor = 10 * L;

		const xMax = 100 * L;
		let bestX = 0;
		let bestTH = -Infinity;
		const coarse = 4000;
		for (let i = 1; i <= coarse; i++) {
			const x = (xMax * i) / coarse;
			const th = this.takeHomeAt(x);
			if (th > bestTH) {
				bestTH = th;
				bestX = x;
			}
		}

		// When the exponent is at or below 1 the take-home curve is strictly
		// increasing and has no interior maximum, so the coarse scan pins
		// bestX to its last sample. Refining around that sample used to widen
		// the bracket to bestX + span and walk off the end of the chart,
		// reporting an income beyond the x axis (e.g. $900,225 on a $900,000
		// axis). Both ends of the bracket are now clamped to the drawn range.
		const span = xMax / coarse;
		let lo = clamp(bestX - span, 1, xMax);
		let hi = clamp(bestX + span, 1, xMax);
		for (let pass = 0; pass < 40; pass++) {
			const mLeft = lo + (hi - lo) / 3;
			const mRight = hi - (hi - lo) / 3;
			if (this.takeHomeAt(mLeft) < this.takeHomeAt(mRight)) {
				lo = mLeft;
			} else {
				hi = mRight;
			}
		}
		bestX = clamp((lo + hi) / 2, 1, xMax);

		// Distinguish a real turning point from the range edge: if take-home
		// is still climbing at the far right, there is no peak to report.
		const edgeProbe = xMax * (1 - 1e-6);
		this.peakIsAtRangeEdge = this.takeHomeAt(xMax) >= this.takeHomeAt(edgeProbe);

		this.peakIncome = bestX;
		this.peakTaxRate = this.taxRateAt(bestX);
		this.peakTakeHome = this.takeHomeAt(bestX);

		// The explorer's slider must stay inside the range the chart plots, or
		// the black dot silently disappears across its upper travel while the
		// readouts keep updating.
		this.maxIncome = Math.round(xMax);
		this.minIncome = Math.min(10000, this.maxIncome);
		this.userIncome = clamp(toFiniteNumber(this.userIncome, this.minIncome), this.minIncome, this.maxIncome);

		this.computeUser();
	}

	onUserIncome(): void {
		this.computeUser();
		this.draw();
	}

	private computeUser(): void {
		const x = toFiniteNumber(this.userIncome, 0);
		this.userTaxRate = this.taxRateAt(x);
		this.userTax = (x * this.userTaxRate) / 100;
		this.userTakeHome = x - this.userTax;
	}

	taxRateAt(x: number): number {
		// Guarded here rather than only in computeDerived: the template calls
		// this directly, so an emptied or negative poverty-line field reaches
		// Math.pow with a non-positive base and renders as "NaN".
		const L = toFiniteNumber(this.current, 0);
		const L0 = toFiniteNumber(this.baseline, 0);
		if (!isPositiveNumber(x) || !isPositiveNumber(L) || !isPositiveNumber(L0)) {
			return 0;
		}
		const n = (1.5 * L) / L0;
		return 100 / (1 + 9 * Math.pow((10 * L) / x, n));
	}

	takeHomeAt(x: number): number {
		if (!isPositiveNumber(x)) {
			return 0;
		}
		return x * (1 - this.taxRateAt(x) / 100);
	}

	federalEffectiveRate(gross: number): number {
		if (gross <= 0) {
			return 0;
		}
		const taxable = Math.max(0, gross - 14600);
		return (this.federalTax(taxable) / gross) * 100;
	}

	private federalTax(taxable: number): number {
		const brackets: [number, number][] = [
			[0, 0.1],
			[11600, 0.12],
			[47150, 0.22],
			[100525, 0.24],
			[191950, 0.32],
			[243725, 0.35],
			[609350, 0.37],
		];
		let tax = 0;
		for (let i = 0; i < brackets.length; i++) {
			const lower = brackets[i][0];
			const rate = brackets[i][1];
			const upper = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
			if (taxable > lower) {
				tax += (Math.min(taxable, upper) - lower) * rate;
			} else {
				break;
			}
		}
		return tax;
	}

	private draw(): void {
		const canvas = this.canvasRef?.nativeElement;
		if (!canvas) {
			return;
		}
		const wrap = canvas.parentElement;
		if (!wrap) {
			return;
		}
		const W = wrap.clientWidth || 800;
		const H = 500;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = W * dpr;
		canvas.height = H * dpr;
		canvas.style.width = W + "px";
		canvas.style.height = H + "px";
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return;
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);

		const L = this.current;
		if (!L || L <= 0) {
			return;
		}

		const marginLeft = 72;
		const marginRight = 88;
		const marginTop = 36;
		const marginBottom = 56;
		const plotW = W - marginLeft - marginRight;
		const plotH = H - marginTop - marginBottom;

		const xMax = 100 * L;
		const moneyMax = this.niceCeil(this.peakTakeHome * 1.12);

		const xToPx = (x: number) => marginLeft + (x / xMax) * plotW;
		const rateToPy = (r: number) => marginTop + (1 - r / 100) * plotH;
		const moneyToPy = (m: number) => marginTop + (1 - m / moneyMax) * plotH;

		ctx.fillStyle = "#fff";
		ctx.fillRect(marginLeft, marginTop, plotW, plotH);
		ctx.strokeStyle = "#e5e7eb";
		ctx.fillStyle = "#374151";
		ctx.lineWidth = 1;
		ctx.font = "12px 'Trebuchet MS', sans-serif";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		for (let r = 0; r <= 100; r += 10) {
			const py = rateToPy(r);
			ctx.beginPath();
			ctx.moveTo(marginLeft, py);
			ctx.lineTo(marginLeft + plotW, py);
			ctx.stroke();
			if (r < 100) {
				ctx.fillText(r + "%", marginLeft - 8, py);
			}
		}
		ctx.textAlign = "left";
		ctx.fillStyle = this.COLOR_TAKEHOME;
		const moneyTicks = 5;
		for (let i = 0; i <= moneyTicks; i++) {
			const m = (moneyMax * i) / moneyTicks;
			const py = moneyToPy(m);
			ctx.fillText(this.formatMoney(m), marginLeft + plotW + 8, py);
		}
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillStyle = "#374151";
		const xTicks = this.buildXTicks(xMax, L);
		for (const t of xTicks) {
			const px = xToPx(t);
			ctx.strokeStyle = "#f3f4f6";
			ctx.beginPath();
			ctx.moveTo(px, marginTop);
			ctx.lineTo(px, marginTop + plotH);
			ctx.stroke();
			ctx.strokeStyle = "#9ca3af";
			ctx.beginPath();
			ctx.moveTo(px, marginTop + plotH);
			ctx.lineTo(px, marginTop + plotH + 5);
			ctx.stroke();
			ctx.fillText(this.formatMoney(t), px, marginTop + plotH + 8);
		}
		ctx.strokeStyle = "#9ca3af";
		ctx.lineWidth = 1;
		ctx.strokeRect(marginLeft, marginTop, plotW, plotH);
		const samples = 600;
		this.drawCurve(ctx, samples, xMax, xToPx, x => moneyToPy(this.takeHomeAt(x)), this.COLOR_TAKEHOME, 2.5);
		this.drawCurve(ctx, samples, xMax, xToPx, x => rateToPy(this.federalEffectiveRate(x)), this.COLOR_FEDERAL, 2);
		this.drawCurve(ctx, samples, xMax, xToPx, x => rateToPy(this.taxRateAt(x)), this.COLOR_PROPOSED, 2.5);
		this.drawMarker(ctx, xToPx(L), marginTop, plotH, "Poverty Line");
		this.drawMarker(ctx, xToPx(10 * L), marginTop, plotH, "10% Tax Anchor");
		this.drawMarker(
			ctx,
			xToPx(this.peakIncome),
			marginTop,
			plotH,
			this.peakIsAtRangeEdge ? "Still Rising" : "Peak Take-Home",
		);

		if (this.userIncome > 0 && this.userIncome <= xMax) {
			const dotX = xToPx(this.userIncome);
			const dotY = rateToPy(this.taxRateAt(this.userIncome));
			ctx.beginPath();
			ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
			ctx.fillStyle = "#111827";
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#fff";
			ctx.stroke();
		}

		ctx.fillStyle = "#111827";
		ctx.font = "14px 'Trebuchet MS', sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText("Annual Gross Income", marginLeft + plotW / 2, H - 6);
		ctx.save();
		ctx.translate(16, marginTop + plotH / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = "center";
		ctx.fillText("Tax Rate", 0, 0);
		ctx.restore();
		ctx.save();
		ctx.translate(W - 14, marginTop + plotH / 2);
		ctx.rotate(Math.PI / 2);
		ctx.textAlign = "center";
		ctx.fillStyle = this.COLOR_TAKEHOME;
		ctx.fillText("Annual Take-Home Pay", 0, 0);
		ctx.restore();

		this.drawLegend(ctx, marginLeft + plotW, marginTop);
	}

	private drawCurve(
		ctx: CanvasRenderingContext2D,
		samples: number,
		xMax: number,
		xToPx: (x: number) => number,
		yToPy: (x: number) => number,
		color: string,
		width: number,
	): void {
		ctx.beginPath();
		ctx.lineWidth = width;
		ctx.strokeStyle = color;
		for (let i = 0; i <= samples; i++) {
			const x = (xMax * i) / samples;
			const px = xToPx(x);
			const py = yToPy(x);
			if (i === 0) {
				ctx.moveTo(px, py);
			} else {
				ctx.lineTo(px, py);
			}
		}
		ctx.stroke();
	}

	private drawMarker(ctx: CanvasRenderingContext2D, px: number, top: number, plotH: number, label: string): void {
		ctx.save();
		ctx.setLineDash([6, 4]);
		ctx.strokeStyle = "#6b7280";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(px, top + 4);
		ctx.lineTo(px, top + plotH);
		ctx.stroke();
		ctx.restore();

		ctx.save();
		ctx.font = "11px 'Trebuchet MS', sans-serif";
		ctx.fillStyle = "#374151";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText(label, px, top + 2);
		ctx.restore();
	}

	private drawLegend(ctx: CanvasRenderingContext2D, rightEdge: number, top: number): void {
		const items = [
			{ label: "Proposed Tax Rate", color: this.COLOR_PROPOSED },
			{ label: "Current Federal Effective Rate", color: this.COLOR_FEDERAL },
			{ label: "Proposed Take-Home Pay", color: this.COLOR_TAKEHOME },
		];
		ctx.font = "12px 'Trebuchet MS', sans-serif";
		let maxW = 0;
		for (const it of items) {
			maxW = Math.max(maxW, ctx.measureText(it.label).width);
		}
		const boxW = maxW + 44;
		const rowH = 20;
		const boxH = items.length * rowH + 12;
		const x = rightEdge - boxW - 10;
		const y = top + 10;

		ctx.fillStyle = "rgba(255,255,255,0.9)";
		ctx.strokeStyle = "#d1d5db";
		ctx.lineWidth = 1;
		ctx.fillRect(x, y, boxW, boxH);
		ctx.strokeRect(x, y, boxW, boxH);

		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		items.forEach((it, i) => {
			const ly = y + 6 + rowH / 2 + i * rowH;
			ctx.strokeStyle = it.color;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(x + 10, ly);
			ctx.lineTo(x + 32, ly);
			ctx.stroke();
			ctx.fillStyle = "#111827";
			ctx.fillText(it.label, x + 38, ly);
		});
	}

	private buildXTicks(xMax: number, L: number): number[] {
		const ticks = new Set<number>();
		const step = this.niceStep(xMax / 7);
		for (let v = step; v < xMax; v += step) {
			ticks.add(Math.round(v));
		}
		ticks.add(Math.round(L));
		ticks.add(Math.round(10 * L));
		ticks.add(Math.round(this.peakIncome));

		const sorted = Array.from(ticks)
			.filter(v => v > 0 && v <= xMax)
			.sort((a, b) => a - b);

		const minGap = xMax * 0.04;
		const result: number[] = [];
		for (const v of sorted) {
			if (result.length === 0 || v - result[result.length - 1] >= minGap) {
				result.push(v);
			}
		}
		return result;
	}

	private niceStep(raw: number): number {
		const pow = Math.pow(10, Math.floor(Math.log10(raw)));
		const norm = raw / pow;
		let nice: number;
		if (norm < 1.5) nice = 1;
		else if (norm < 3) nice = 2;
		else if (norm < 7) nice = 5;
		else nice = 10;
		return nice * pow;
	}

	private niceCeil(value: number): number {
		if (value <= 0) {
			return 1;
		}
		const pow = Math.pow(10, Math.floor(Math.log10(value)));
		return Math.ceil(value / pow) * pow;
	}

	formatMoney(v: number): string {
		if (!Number.isFinite(v)) {
			return "$0";
		}
		// Thresholds are tested against the value AFTER this function's own
		// rounding: 999999 rounds to 1000K, a magnitude the "M" unit covers,
		// so it must cross into the upper branch rather than print "$1000K".
		if (Math.round(v / 1e3) >= 1e3) {
			// Decide the decimal from the ROUNDED mantissa: 999999/1e6 is
			// 0.999999, which prints as "1.0M" if the fraction is tested
			// before rounding. One decimal place is what toFixed(1) keeps, so
			// that is the precision the whole-number test must use.
			const m = Math.round(v / 1e5) / 10;
			return "$" + (Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)) + "M";
		}
		if (v >= 1e3) {
			return "$" + Math.round(v / 1e3) + "K";
		}
		return "$" + Math.round(v);
	}
}

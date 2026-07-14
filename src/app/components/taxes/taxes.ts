import { Component, AfterViewInit, ElementRef, ViewChild, HostListener } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
	selector: "app-taxes",
	imports: [CommonModule, FormsModule],
	templateUrl: "./taxes.html",
	styleUrls: ["./taxes.scss"],
})
export class TaxesComponent implements AfterViewInit {
	@ViewChild("taxCanvas") canvasRef!: ElementRef<HTMLCanvasElement>;

	// 2024 federal poverty guideline for a single adult in the 48 contiguous states.
	private static readonly DEFAULT_POVERTY = 15060;

	// L0 - the permanent anchor, set from the first field.
	baseline: number = TaxesComponent.DEFAULT_POVERTY;
	// L - the current poverty line, the adjustment mechanism.
	current: number = TaxesComponent.DEFAULT_POVERTY;

	// Bonus income explorer
	userIncome: number = 50000;
	minIncome = 10000;
	maxIncome = 1000000;

	// Derived values
	exponent = 0;
	peakIncome = 0;
	peakTaxRate = 0;
	peakTakeHome = 0;
	middleAnchor = 0;

	// User explorer results
	userTaxRate = 0;
	userTax = 0;
	userTakeHome = 0;

	// Colors
	private readonly COLOR_PROPOSED = "#2563eb"; // blue
	private readonly COLOR_FEDERAL = "#dc2626"; // red
	private readonly COLOR_TAKEHOME = "#16a34a"; // green

	constructor() {
		// Compute derived values eagerly so the first change-detection pass sees
		// the final numbers (avoids NG0100 ExpressionChangedAfterItHasBeenChecked).
		this.computeDerived();
	}

	ngAfterViewInit(): void {
		// Canvas only exists now, so draw here. Derived values are already set.
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
		const L = this.current;
		const L0 = this.baseline;
		if (!L || !L0 || L <= 0 || L0 <= 0) {
			return;
		}

		this.exponent = 1.5 * L / L0;
		this.middleAnchor = 10 * L;

		// Find the income where take-home pay peaks (numeric search + refinement).
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
		// Refine around the best coarse point.
		const span = xMax / coarse;
		let lo = Math.max(1, bestX - span);
		let hi = bestX + span;
		for (let pass = 0; pass < 40; pass++) {
			const mLeft = lo + (hi - lo) / 3;
			const mRight = hi - (hi - lo) / 3;
			if (this.takeHomeAt(mLeft) < this.takeHomeAt(mRight)) {
				lo = mLeft;
			} else {
				hi = mRight;
			}
		}
		bestX = (lo + hi) / 2;

		this.peakIncome = bestX;
		this.peakTaxRate = this.taxRateAt(bestX);
		this.peakTakeHome = this.takeHomeAt(bestX);

		this.computeUser();
	}

	onUserIncome(): void {
		this.computeUser();
		this.draw();
	}

	private computeUser(): void {
		const x = this.userIncome;
		this.userTaxRate = this.taxRateAt(x);
		this.userTax = (x * this.userTaxRate) / 100;
		this.userTakeHome = x - this.userTax;
	}

	// Proposed formula tax rate (percent) at a given gross income.
	taxRateAt(x: number): number {
		if (x <= 0) {
			return 0;
		}
		const L = this.current;
		const L0 = this.baseline;
		const n = 1.5 * L / L0;
		return 100 / (1 + 9 * Math.pow((10 * L) / x, n));
	}

	// Net take-home pay under the proposed formula.
	takeHomeAt(x: number): number {
		return x * (1 - this.taxRateAt(x) / 100);
	}

	// Current US federal effective tax rate using the 2024 single-filer schedule.
	federalEffectiveRate(gross: number): number {
		if (gross <= 0) {
			return 0;
		}
		const taxable = Math.max(0, gross - 14600); // 2024 standard deduction, single
		return (this.federalTax(taxable) / gross) * 100;
	}

	private federalTax(taxable: number): number {
		// 2024 single-filer brackets: [lowerBound, rate]
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

	// ---- Drawing ----

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

		// Plot background
		ctx.fillStyle = "#fff";
		ctx.fillRect(marginLeft, marginTop, plotW, plotH);

		// ---- Grid + left y-axis (tax rate %) ----
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
			// Skip the 100% label: it sits at the very top where the marker
			// labels live, and 100% is already implied by the axis bound.
			if (r < 100) {
				ctx.fillText(r + "%", marginLeft - 8, py);
			}
		}

		// ---- Right y-axis (take-home $) ----
		ctx.textAlign = "left";
		ctx.fillStyle = this.COLOR_TAKEHOME;
		const moneyTicks = 5;
		for (let i = 0; i <= moneyTicks; i++) {
			const m = (moneyMax * i) / moneyTicks;
			const py = moneyToPy(m);
			ctx.fillText(this.formatMoney(m), marginLeft + plotW + 8, py);
		}

		// ---- X-axis ticks ----
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

		// Plot border
		ctx.strokeStyle = "#9ca3af";
		ctx.lineWidth = 1;
		ctx.strokeRect(marginLeft, marginTop, plotW, plotH);

		// ---- Curves ----
		const samples = 600;

		// Take-home (green, right axis) - draw first so rate lines sit on top.
		this.drawCurve(ctx, samples, xMax, xToPx, x => moneyToPy(this.takeHomeAt(x)), this.COLOR_TAKEHOME, 2.5);

		// Federal effective rate (red, left axis)
		this.drawCurve(ctx, samples, xMax, xToPx, x => rateToPy(this.federalEffectiveRate(x)), this.COLOR_FEDERAL, 2);

		// Proposed tax rate (blue, left axis)
		this.drawCurve(ctx, samples, xMax, xToPx, x => rateToPy(this.taxRateAt(x)), this.COLOR_PROPOSED, 2.5);

		// ---- Annotation markers ----
		this.drawMarker(ctx, xToPx(L), marginTop, plotH, "Poverty Line");
		this.drawMarker(ctx, xToPx(10 * L), marginTop, plotH, "10% Tax Anchor");
		this.drawMarker(ctx, xToPx(this.peakIncome), marginTop, plotH, "Peak Take-Home");

		// ---- User income dot ----
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

		// ---- Axis labels ----
		ctx.fillStyle = "#111827";
		ctx.font = "14px 'Trebuchet MS', sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText("Annual Gross Income", marginLeft + plotW / 2, H - 6);

		// Left axis label (rotated)
		ctx.save();
		ctx.translate(16, marginTop + plotH / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = "center";
		ctx.fillText("Tax Rate", 0, 0);
		ctx.restore();

		// Right axis label (rotated)
		ctx.save();
		ctx.translate(W - 14, marginTop + plotH / 2);
		ctx.rotate(Math.PI / 2);
		ctx.textAlign = "center";
		ctx.fillStyle = this.COLOR_TAKEHOME;
		ctx.fillText("Annual Take-Home Pay", 0, 0);
		ctx.restore();

		// ---- Legend (upper right inside plot) ----
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
		// Round "nice" ticks across the range.
		const step = this.niceStep(xMax / 7);
		for (let v = step; v < xMax; v += step) {
			ticks.add(Math.round(v));
		}
		// Meaningful multiples of L and the peak income.
		ticks.add(Math.round(L));
		ticks.add(Math.round(10 * L));
		ticks.add(Math.round(this.peakIncome));

		const sorted = Array.from(ticks)
			.filter(v => v > 0 && v <= xMax)
			.sort((a, b) => a - b);

		// Drop ticks that would overlap (closer than 4% of range).
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
		if (v >= 1e6) {
			const m = v / 1e6;
			return "$" + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + "M";
		}
		if (v >= 1e3) {
			return "$" + Math.round(v / 1e3) + "K";
		}
		return "$" + Math.round(v);
	}
}

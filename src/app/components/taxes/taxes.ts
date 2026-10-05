import { Component, AfterViewInit, ElementRef, ViewChild, HostListener } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { InputControllerDirective } from "../../directives/input-controller.directive";
import { clamp, isPositiveNumber, toFiniteNumber } from "../../services/number-utils";
import { QuadrantAnchorDirective } from "../../directives/quadrant-anchor.directive";
import { TOOL_INFO } from "@app/config/tool-info";
import {
	projectRevenue,
	makeRateFn,
	solveSteepnessForRevenue,
	reachableRevenue,
	findIncomeCeiling,
	projectRevenueWithCeilingBehaviour,
	FORCED_REALISATION_FRACTION,
	ANCHOR_MULTIPLE,
	ANCHOR_RATE_PCT,
	type RevenueProjection,
} from "./revenue-model";

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

	// US individual income tax collected in 2022, in billions. The starting
	// point for the calibration target; the input is free from here.
	private static readonly DEFAULT_REVENUE_TARGET_BILLIONS = 2140;

	// The curve's original hardcoded steepness. Only used when the target is
	// unreachable, so the curve still draws something rather than nothing.
	private static readonly FALLBACK_STEEPNESS = 1.22;

	/** Exposed for tests and for the template's fallback notice. */
	readonly fallbackSteepness = TaxesComponent.FALLBACK_STEEPNESS;

	// Mirror of ANCHOR_MULTIPLE, so the template and the curve agree.
	private static readonly ANCHOR_MULTIPLE_LOCAL = ANCHOR_MULTIPLE;

	// Fallback chart width, as a multiple of the poverty line, when the curve
	// has no ceiling to frame.
	private static readonly DEFAULT_X_MULTIPLE = 100;

	// The x axis is logarithmic. A linear axis spanning the poverty line to a
	// $70M ceiling squeezes every income below $300k into about two pixels,
	// which hides the part of the curve most people live on. Log spacing gives
	// each decade equal width, so the middle class and the ceiling are both
	// legible. The domain starts at half a poverty line because log(0) is
	// undefined and incomes below that are not interesting.
	private static readonly X_MIN_POVERTY_FRACTION = 0.5;

	// Plot width below which x-axis labels snap to 45 degrees. Chosen to match
	// the 480px phone breakpoint in taxes.scss.
	private static readonly ROTATE_LABELS_BELOW_PX = 480;
	private static readonly TICK_FONT = "12px 'Trebuchet MS', sans-serif";
	// Bottom x-axis labels trail down-left from their tick; top marker labels
	// mirror that and trail up-left. Opposite signs, same reading order: the
	// text still runs left-to-right INTO the tick it belongs to, and
	// successive labels stack away from the plot instead of overlapping.
	private static readonly LABEL_ANGLE_RAD = -Math.PI / 4;
	private static readonly MARKER_ANGLE_RAD = Math.PI / 4;
	private static readonly MARKER_FONT = "11px 'Trebuchet MS', sans-serif";
	private static readonly SIN_45 = Math.SQRT1_2;

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

	// What the curve would actually raise, measured against real IRS filer
	// data. The curve itself is blind to population density, so this is the
	// only place the tool can show that a pretty rate schedule and a workable
	// one are different things.
	revenue?: RevenueProjection;
	neutralSteepness: number | null = null;

	// The revenue target the curve is calibrated against, in BILLIONS of
	// dollars, which is the unit the published headline figures use. It starts
	// at the 2022 total and is editable, so a later year's figure keeps the
	// tool useful without a code change. Whatever is in the box is what
	// Calibrate solves for.
	revenueTargetBillions = TaxesComponent.DEFAULT_REVENUE_TARGET_BILLIONS;

	/** Reachable revenue span for the current poverty lines, in billions. */
	reachableMinBillions = 0;
	reachableMaxBillions = 0;
	targetOutOfReach = false;

	// The maximum income the curve implies: the point where take-home turns
	// over, so earning more leaves you with less. It exists only when the
	// exponent is above 1, which is why the anchor sits at 20x the poverty
	// line rather than 10x -- see revenue-model.ts.
	ceilingIncome = 0;
	ceilingTakeHome = 0;
	ceilingMultiple = 0;
	ceilingRate = 0;
	hasCeiling = false;
	// Pessimistic companion to the headline figure: what arrives if the bands
	// whose mean income sits above the ceiling report only the ceiling.
	behaviouralTotalMillions = 0;
	behaviouralShortfallMillions = 0;
	cappedBandNames: readonly string[] = [];
	readonly forcedRealisationPct = FORCED_REALISATION_FRACTION * 100;

	topBandRatePct = 0;
	topBandName = "";
	topRateIsExtreme = false;
	readonly anchorMultiple = ANCHOR_MULTIPLE;
	readonly anchorRatePct = ANCHOR_RATE_PCT;

	// Curve steepness. The formula was originally written with this fixed at
	// 1.5, but that value makes the curve raise about $4.17T against 2022's
	// $2.14T -- and it only gets there by charging the top 1% an effective
	// rate near 85%, which no real system uses. So the tool opens on the
	// steepness that matches the revenue target instead, and "Calibrate"
	// re-solves it after the target or the poverty lines change. 1.5 is kept
	// only as the fallback for the degenerate case where no steepness reaches
	// the target at all.
	steepness = TaxesComponent.FALLBACK_STEEPNESS;

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

		// Resolve steepness first: the peak search, the readouts and the chart
		// all call taxRateAt, which reads it. Solving it afterwards would
		// leave every derived number one edit behind.
		this.resolveSteepness(L, L0);

		this.exponent = (this.steepness * L) / L0;
		this.middleAnchor = TaxesComponent.ANCHOR_MULTIPLE_LOCAL * L;

		const xMax = this.chartXMax(L);
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
		this.computeRevenue(L, L0);
	}

	/**
	 * Pick the steepness that raises the revenue target, and record whether a
	 * solution exists. Adopted automatically: there is no control for the
	 * original 1.5, because that curve raises roughly double the target by
	 * charging the top 1% about 85%.
	 */
	private resolveSteepness(L: number, L0: number): void {
		const targetMillions = this.targetMillions();
		this.neutralSteepness = solveSteepnessForRevenue(targetMillions, L, L0);
		this.targetOutOfReach = this.neutralSteepness === null;

		// Surface the span the curve can actually reach, so an unreachable
		// target reads as a property of the curve rather than a failed input.
		const span = reachableRevenue(L, L0);
		this.reachableMinBillions = span ? Math.ceil(span.minMillions / 1e3) : 0;
		this.reachableMaxBillions = span ? Math.floor(span.maxMillions / 1e3) : 0;

		this.steepness = this.neutralSteepness ?? TaxesComponent.FALLBACK_STEEPNESS;

		const ceiling = findIncomeCeiling(this.steepness, L, L0);
		this.hasCeiling = ceiling !== null;
		this.ceilingIncome = ceiling?.income ?? 0;
		this.ceilingTakeHome = ceiling?.takeHome ?? 0;
		this.ceilingMultiple = ceiling?.multipleOfPovertyLine ?? 0;
		// Exactly 100/exponent -- see ceilingRatePct in revenue-model.ts.
		this.ceilingRate = ceiling?.ratePct ?? 0;
	}

	private computeRevenue(L: number, L0: number): void {
		this.revenue = projectRevenue(makeRateFn(this.steepness, L, L0), undefined, this.targetMillions());

		// Flag a rate the curve needs but no real system uses. Searched across
		// anchors and anchor rates, every funding curve with an income ceiling
		// charges the top band above 60%; saying so is more useful than
		// presenting the number without comment.
		// If the ceiling is real, the bands above it have no reason to keep
		// reporting what they report today.
		if (this.hasCeiling) {
			const behavioural = projectRevenueWithCeilingBehaviour(
				makeRateFn(this.steepness, L, L0),
				this.ceilingIncome,
			);
			this.behaviouralTotalMillions = behavioural.proposedTotalMillions;
			this.cappedBandNames = behavioural.cappedGroups;
			this.behaviouralShortfallMillions = Math.max(
				0,
				this.revenue.proposedTotalMillions - behavioural.proposedTotalMillions,
			);
		} else {
			this.behaviouralTotalMillions = this.revenue.proposedTotalMillions;
			this.cappedBandNames = [];
			this.behaviouralShortfallMillions = 0;
		}

		const top = this.revenue.groups[0];
		this.topBandRatePct = top?.proposedRatePct ?? 0;
		this.topBandName = top?.name ?? "";
		this.topRateIsExtreme = this.topBandRatePct >= 60;
	}

	/** Left edge of the logarithmic x domain. */
	private chartXMin(L: number): number {
		return L * TaxesComponent.X_MIN_POVERTY_FRACTION;
	}

	/**
	 * The income range the chart covers.
	 *
	 * The point of the curve is the ceiling, so the x axis has to reach past
	 * it -- otherwise the one feature worth seeing sits off the right edge.
	 * With a ceiling, the axis runs to 1.35x the ceiling income so the
	 * turn-over is visibly a turn and not just a flattening. Without one it
	 * falls back to a fixed multiple of the poverty line.
	 */
	private chartXMax(L: number): number {
		if (this.hasCeiling && this.ceilingIncome > 0) {
			return this.ceilingIncome * 1.35;
		}
		return TaxesComponent.DEFAULT_X_MULTIPLE * L;
	}

	/** The calibration target in millions, guarded against a bad input. */
	private targetMillions(): number {
		const fallback = TaxesComponent.DEFAULT_REVENUE_TARGET_BILLIONS;
		const billions = toFiniteNumber(this.revenueTargetBillions, fallback);
		return (billions > 0 ? billions : fallback) * 1e3;
	}

	/** Recompute after the revenue target changes; the curve itself is unmoved. */
	onRevenueTarget(): void {
		this.computeDerived();
		this.draw();
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
		const n = (this.steepness * L) / L0;
		const coefficient = (100 - ANCHOR_RATE_PCT) / ANCHOR_RATE_PCT;
		return 100 / (1 + coefficient * Math.pow((ANCHOR_MULTIPLE * L) / x, n));
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
		// Rotated labels claim roughly 110px more of the canvas in margins
		// than horizontal ones. Growing the canvas on a narrow viewport keeps
		// the plot area itself about as tall as it is on a desktop, instead of
		// squeezing the curves into what the labels leave over.
		const narrow = W - 72 - 88 < TaxesComponent.ROTATE_LABELS_BELOW_PX;
		const H = narrow ? 580 : 500;
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

		// On a narrow canvas the x labels ("$1.5M", "$301K") run into each
		// other, so they snap to 45 degrees rather than being rotated by a
		// continuously computed angle. The threshold is the plot width, not
		// the device, so a narrowed desktop window gets the same treatment.
		// Compared against the horizontal-label plot width so the decision
		// does not depend on the margin it is about to pick.
		const rotateXLabels = W - marginLeft - marginRight < TaxesComponent.ROTATE_LABELS_BELOW_PX;

		// The three marker labels ("Poverty Line", "10% Tax Anchor", ...) sit
		// above the plot and are far longer than the money ticks, so they
		// collide first. They rotate on the same threshold, and marginTop has
		// to make room the same way marginBottom does below.
		let marginTop = 36;
		if (rotateXLabels) {
			ctx.font = TaxesComponent.MARKER_FONT;
			const widestMarker = this.widestMarkerLabel(ctx);
			marginTop = 20 + Math.ceil(widestMarker * TaxesComponent.SIN_45);
		}

		// A label rotated 45 degrees occupies textWidth * sin(45) vertically
		// instead of a line height, so the bottom margin has to grow or the
		// canvas clips it. Only the widest label matters for sizing.
		ctx.font = TaxesComponent.TICK_FONT;
		let marginBottom = 56;
		if (rotateXLabels) {
			const widest = this.widestXLabel(ctx, this.chartXMax(L), L);
			marginBottom = 56 + Math.ceil(widest * TaxesComponent.SIN_45) - 14;
		}

		const plotW = W - marginLeft - marginRight;
		const plotH = H - marginTop - marginBottom;

		const xMax = this.chartXMax(L);
		const moneyMax = this.niceCeil(this.peakTakeHome * 1.12);

		// Logarithmic: equal pixel width per decade of income.
		const xMin = this.chartXMin(L);
		const logSpan = Math.log(xMax / xMin);
		const xToPx = (x: number) => marginLeft + (Math.log(clamp(x, xMin, xMax) / xMin) / logSpan) * plotW;
		const rateToPy = (r: number) => marginTop + (1 - r / 100) * plotH;
		const moneyToPy = (m: number) => marginTop + (1 - m / moneyMax) * plotH;

		ctx.fillStyle = "#fff";
		ctx.fillRect(marginLeft, marginTop, plotW, plotH);
		ctx.strokeStyle = "#e5e7eb";
		ctx.fillStyle = "#374151";
		ctx.lineWidth = 1;
		ctx.font = TaxesComponent.TICK_FONT;
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
		ctx.fillStyle = "#374151";
		// Rotated labels anchor by their right end at the tick, so the text
		// trails away down-left; horizontal ones stay centred under it.
		ctx.textAlign = rotateXLabels ? "right" : "center";
		ctx.textBaseline = rotateXLabels ? "middle" : "top";
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

			const label = this.formatMoney(t);
			if (rotateXLabels) {
				// translate to the tick, then rotate: the transform must be
				// undone per label, since ctx.rotate() is cumulative.
				ctx.save();
				ctx.translate(px, marginTop + plotH + 10);
				ctx.rotate(TaxesComponent.LABEL_ANGLE_RAD);
				ctx.fillText(label, 0, 0);
				ctx.restore();
			} else {
				ctx.fillText(label, px, marginTop + plotH + 8);
			}
		}
		ctx.strokeStyle = "#9ca3af";
		ctx.lineWidth = 1;
		ctx.strokeRect(marginLeft, marginTop, plotW, plotH);
		const samples = 600;
		this.drawCurve(ctx, samples, xMin, xMax, xToPx, x => moneyToPy(this.takeHomeAt(x)), this.COLOR_TAKEHOME, 2.5);
		this.drawCurve(
			ctx,
			samples,
			xMin,
			xMax,
			xToPx,
			x => rateToPy(this.federalEffectiveRate(x)),
			this.COLOR_FEDERAL,
			2,
		);
		this.drawCurve(ctx, samples, xMin, xMax, xToPx, x => rateToPy(this.taxRateAt(x)), this.COLOR_PROPOSED, 2.5);
		this.drawMarker(ctx, xToPx(L), marginTop, plotH, "Poverty Line", rotateXLabels);
		this.drawMarker(ctx, xToPx(ANCHOR_MULTIPLE * L), marginTop, plotH, ANCHOR_RATE_PCT + "% Anchor", rotateXLabels);
		if (this.hasCeiling) {
			this.drawMarker(ctx, xToPx(this.ceilingIncome), marginTop, plotH, "Income Ceiling", rotateXLabels);
			// A dot where the ceiling meets the rate curve. The rate there is
			// 100/exponent, and it is the number that decides whether the
			// curve is usable, so it gets a mark of its own.
			const cx = xToPx(this.ceilingIncome);
			const cy = rateToPy(this.ceilingRate);
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, 5, 0, Math.PI * 2);
			ctx.fillStyle = this.COLOR_PROPOSED;
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#fff";
			ctx.stroke();
			ctx.restore();
		}
		this.drawMarker(
			ctx,
			xToPx(this.peakIncome),
			marginTop,
			plotH,
			this.peakIsAtRangeEdge ? "Still Rising" : "Peak Take-Home",
			rotateXLabels,
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
		// Saying the scale is log is not optional: without it the curve looks
		// like a different function than it is.
		ctx.fillText("Annual Gross Income (log scale)", marginLeft + plotW / 2, H - 6);
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
		xMin: number,
		xMax: number,
		xToPx: (x: number) => number,
		yToPy: (x: number) => number,
		color: string,
		width: number,
	): void {
		ctx.beginPath();
		ctx.lineWidth = width;
		ctx.strokeStyle = color;
		// Sample geometrically, to match the axis. Linear sampling on a log
		// axis puts almost every point in the last decade and renders the
		// low-income end of the curve as a few straight segments.
		const ratio = xMax / xMin;
		for (let i = 0; i <= samples; i++) {
			const x = xMin * Math.pow(ratio, i / samples);
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

	private drawMarker(
		ctx: CanvasRenderingContext2D,
		px: number,
		top: number,
		plotH: number,
		label: string,
		rotated: boolean,
	): void {
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
		ctx.font = TaxesComponent.MARKER_FONT;
		ctx.fillStyle = "#374151";
		if (rotated) {
			// +45 degrees, the mirror of the bottom axis's -45. Anchored at
			// the text's right end so it reads up-LEFT into the tick, keeping
			// left-to-right as the primary reading direction.
			ctx.translate(px, top - 4);
			ctx.rotate(TaxesComponent.MARKER_ANGLE_RAD);
			ctx.textAlign = "right";
			ctx.textBaseline = "middle";
			ctx.fillText(label, 0, 0);
		} else {
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.fillText(label, px, top + 2);
		}
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

	// Width of the longest marker label, used to size the top margin when the
	// markers are rotated. The set is fixed, so both peak variants are
	// measured: the margin must not change when the curve regime flips.
	private widestMarkerLabel(ctx: CanvasRenderingContext2D): number {
		const labels = ["Poverty Line", "10% Tax Anchor", "Peak Take-Home", "Still Rising"];
		let widest = 0;
		for (const label of labels) {
			widest = Math.max(widest, ctx.measureText(label).width);
		}
		return widest;
	}

	// Width of the longest x-axis label, used to size the bottom margin when
	// the labels are rotated. Measures only what buildXTicks will actually
	// draw, so an axis of "$50K"s reserves less room than one reaching "$1.5M".
	private widestXLabel(ctx: CanvasRenderingContext2D, xMax: number, L: number): number {
		let widest = 0;
		for (const t of this.buildXTicks(xMax, L)) {
			widest = Math.max(widest, ctx.measureText(this.formatMoney(t)).width);
		}
		return widest;
	}

	/**
	 * Tick values for the logarithmic x axis.
	 *
	 * One tick at 1, 2 and 5 per decade, which is the usual log-axis
	 * convention and lands about a dozen labels across the range. The curve's
	 * own landmarks are added on top, then crowding is resolved in LOG space:
	 * a linear minimum gap would discard every tick below the top decade,
	 * because $20K and $50K sit a rounding error apart next to $50M.
	 */
	private buildXTicks(xMax: number, L: number): number[] {
		const xMin = this.chartXMin(L);
		const decades: number[] = [];
		const firstDecade = Math.floor(Math.log10(xMin));
		const lastDecade = Math.ceil(Math.log10(xMax));
		for (let d = firstDecade; d <= lastDecade; d++) {
			for (const mantissa of [1, 2, 5]) {
				decades.push(mantissa * Math.pow(10, d));
			}
		}

		// Landmarks first, so crowding removes a round decade tick rather than
		// the poverty line or the ceiling.
		const landmarks = [L, ANCHOR_MULTIPLE * L];
		if (this.hasCeiling) {
			landmarks.push(this.ceilingIncome);
		}

		const inRange = (v: number) => v >= xMin && v <= xMax;
		const logSpan = Math.log(xMax / xMin);
		const minLogGap = logSpan * 0.045;

		const result: number[] = [];
		const accept = (value: number) => {
			if (!inRange(value) || !(value > 0)) {
				return;
			}
			const rounded = Math.round(value);
			for (const existing of result) {
				if (Math.abs(Math.log(rounded / existing)) < minLogGap) {
					return;
				}
			}
			result.push(rounded);
		};

		landmarks.forEach(accept);
		decades.forEach(accept);
		return result.sort((a, b) => a - b);
	}

	private niceCeil(value: number): number {
		if (value <= 0) {
			return 1;
		}
		const pow = Math.pow(10, Math.floor(Math.log10(value)));
		return Math.ceil(value / pow) * pow;
	}

	/** Formats a dollar amount given in millions, for revenue scale. */
	formatBigMoney(millions: number): string {
		if (!Number.isFinite(millions)) {
			return "$0";
		}
		if (Math.abs(millions) >= 1e6) {
			return "$" + (millions / 1e6).toFixed(2) + "T";
		}
		return "$" + Math.round(millions / 1e3) + "B";
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

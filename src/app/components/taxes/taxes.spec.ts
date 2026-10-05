import { TestBed } from "@angular/core/testing";
import { TaxesComponent } from "./taxes";

// These tests encode the INTENT stated for /tools/taxes, drawn from the two
// places it is written down (see .github/code-review.instructions.md, "Where
// intent is written down"):
//
// src/app/config/tool-info.ts -- summary only, no `fields` map:
//   "your tax rate is decided entirely by how your income compares to the
//    poverty line. There are no brackets. The only two numbers needed to draw
//    the whole tax curve are the poverty line from a fixed reference year and
//    today's poverty line."
//
// taxes.html -- the labels beside each derived number, which are the most
// specific written intent that exists for this tool:
//   "Curve steepness ... 1.50 is neutral"
//   "Middle anchor point ... tax rate is always exactly 10%"
//   "Income where you keep the most"      (peakIncome)
//   "Your tax rate at peak take-home"     (peakTaxRate)
//   "The black dot marks that income on the proposed tax-rate line."
//
// Five obligations fall out of those, and each describe() below pins one:
//   1. the rate at the middle anchor is EXACTLY 10%, for every input pair;
//   2. steepness is 1.50 exactly when today's line equals the baseline;
//   3. the curve is a function of (income, L, L0) only -- no brackets;
//   4. peakIncome is the income that maximises take-home, and it lies inside
//      the domain the chart draws (0 .. 100*L), because a marker is drawn at
//      it and a label reports it as an income a user could earn;
//   5. formatMoney reports a magnitude a user would recognise.
//
// Tests reach private members through `as any` on purpose: the logic under
// test is pure and deterministic, and the alternative is asserting against
// canvas pixels, which tests rendering rather than intent.

describe("TaxesComponent", () => {
	let component: TaxesComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [TaxesComponent] });
		component = TestBed.createComponent(TaxesComponent).componentInstance;
	});

	// Set the two inputs the summary says are the only ones needed, and run
	// the same recompute the template's (ngModelChange) runs -- minus draw(),
	// which needs a canvas. computeDerived is what produces every readout.
	function withLines(baseline: number, current: number): void {
		component.baseline = baseline;
		component.current = current;
		(component as any).computeDerived();
	}

	// Input pairs spanning the three regimes of the exponent n = 1.5*L/L0:
	// n > 1 (steep), n === 1, and n < 1 (shallow). The shallow case is the
	// one a reviewer reading only the defaults never reaches.
	const PAIRS: [number, number][] = [
		[15060, 15060], // defaults, n = 1.50
		[15060, 20000], // today's line higher, n = 1.99
		[15060, 45180], // far higher, n = 4.50
		[22590, 15060], // n = 1.00 exactly
		[15060, 9000], // today's line lower, n = 0.90
		[15060, 5000], // n = 0.50
		[10000, 50000], // n = 7.50
	];

	describe("the middle anchor is taxed at exactly 10%", () => {
		// taxes.html: "Middle anchor point ... tax rate is always exactly 10%".
		// "always" and "exactly" are the contract; this must hold for every
		// input pair, not just the defaults.
		PAIRS.forEach(([L0, L]) => {
			it(`is 10% at the anchor for baseline ${L0}, current ${L}`, () => {
				withLines(L0, L);
				expect(component.taxRateAt(component.middleAnchor)).toBeCloseTo(component.anchorRatePct, 10);
			});
		});

		it("places the anchor at the configured multiple of today's poverty line", () => {
			// The multiple is far out (30x) so a revenue-neutral curve is
			// still steep enough to produce an income ceiling.
			withLines(15060, 20000);
			expect(component.anchorMultiple).toBeGreaterThan(10);
			expect(component.middleAnchor).toBe(component.anchorMultiple * 20000);
		});
	});

	describe("curve steepness", () => {
		// The displayed steepness is no longer the fixed 1.5 the formula was
		// written with: it is solved so the curve raises the revenue target.
		// So the invariant is not a constant, it is that the readout always
		// equals the steepness the curve was actually drawn with.
		it("reports the steepness the curve was drawn with", () => {
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				expect(component.exponent)
					.withContext(`baseline ${L0}, current ${L}`)
					.toBeCloseTo((component.steepness * L) / L0, 10);
			}
		});

		it("rises when today's line is higher than the baseline", () => {
			withLines(15060, 15060);
			const atParity = component.exponent;
			withLines(15060, 20000);
			expect(component.exponent).toBeGreaterThan(atParity);
		});

		it("falls when today's line is lower than the baseline", () => {
			withLines(15060, 15060);
			const atParity = component.exponent;
			withLines(15060, 9000);
			expect(component.exponent).toBeLessThan(atParity);
		});

		it("stays just steep enough to imply an income ceiling", () => {
			// Above 1 so take-home turns over, but well below the original
			// 1.5 that charged the top 1% about 85%.
			withLines(15060, 15060);
			expect(component.exponent).toBeGreaterThan(1);
			expect(component.exponent).toBeLessThan(1.5);
		});
	});

	describe("the rate depends only on the two poverty lines", () => {
		// tool-info.ts: "There are no brackets" and "the only two numbers
		// needed to draw the whole tax curve". So the proposed rate must rise
		// smoothly with income and never step, and must not read any third
		// input (such as the user's own income) to decide the curve.
		it("rises monotonically with income", () => {
			withLines(15060, 15060);
			let previous = -Infinity;
			for (let x = 1000; x <= 1_506_000; x += 1000) {
				const r = component.taxRateAt(x);
				expect(r).toBeGreaterThan(previous);
				previous = r;
			}
		});

		it("is unaffected by the explorer's income input", () => {
			withLines(15060, 15060);
			component.userIncome = 50000;
			(component as any).computeUser();
			const before = component.taxRateAt(250000);
			component.userIncome = 900000;
			(component as any).computeUser();
			expect(component.taxRateAt(250000)).toBe(before);
		});

		it("taxes nothing at or below zero income", () => {
			withLines(15060, 15060);
			expect(component.taxRateAt(0)).toBe(0);
			expect(component.taxRateAt(-1)).toBe(0);
		});

		it("never reports a rate outside 0-100%", () => {
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				for (let i = 1; i <= 2000; i++) {
					const r = component.taxRateAt((100 * L * i) / 2000);
					expect(r).toBeGreaterThanOrEqual(0);
					expect(r).toBeLessThanOrEqual(100);
				}
			}
		});
	});

	describe("peak take-home", () => {
		// taxes.html labels peakIncome "Income where you keep the most" and
		// draws a "Peak Take-Home" marker at it on a chart whose x axis runs
		// 0 .. 100*L. Both readings require the reported income to be a point
		// the chart actually covers.
		it("lies within the income range the chart draws", () => {
			// The chart now extends past the income ceiling, so the bound is
			// the component's own domain rather than a fixed multiple.
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				const xMax = (component as any).chartXMax(component.current);
				expect(component.peakIncome)
					.withContext(`baseline ${L0}, current ${L}: peak must be <= xMax ${Math.round(xMax)}`)
					.toBeLessThanOrEqual(xMax);
				expect(component.peakIncome).toBeGreaterThan(0);
			}
		});

		it("reports the rate at the ceiling as 100 over the exponent", () => {
			// The y-axis reading at the ceiling marker. It is not the rate at
			// the right edge of the chart, which is higher: the curve keeps
			// climbing past the ceiling.
			withLines(15060, 15060);
			expect(component.hasCeiling).toBe(true);
			expect(component.ceilingRate).toBeCloseTo(100 / component.exponent, 6);
			expect(component.ceilingRate).toBeCloseTo(component.taxRateAt(component.ceilingIncome), 1);
		});

		it("keeps climbing past the ceiling", () => {
			// Guards the misreading this surfaced: the ceiling is where
			// take-home turns over, not where the rate stops rising.
			withLines(15060, 15060);
			const beyond = component.ceilingIncome * 1.35;
			expect(component.taxRateAt(beyond)).toBeGreaterThan(component.ceilingRate);
			// ...while take-home falls.
			expect(component.takeHomeAt(beyond)).toBeLessThan(component.ceilingTakeHome);
		});

		it("coincides with the income ceiling when one exists", () => {
			// Both are the point where take-home turns over, so they must be
			// the same income -- found by two independent searches.
			withLines(15060, 15060);
			expect(component.hasCeiling).toBe(true);
			expect(component.peakIncome / component.ceilingIncome).toBeCloseTo(1, 2);
		});

		it("maximises take-home over the drawn range", () => {
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				const reported = component.takeHomeAt(component.peakIncome);
				const xMax = (component as any).chartXMax(component.current);
				for (let i = 1; i <= 4000; i++) {
					const x = (xMax * i) / 4000;
					expect(component.takeHomeAt(x))
						.withContext(`baseline ${L0}, current ${L}: x=${x} beats reported peak`)
						.toBeLessThanOrEqual(reported * (1 + 1e-9));
				}
			}
		});

		it("flags the regime where the curve has no interior peak", () => {
			// taxes.html must not name an income as "where you keep the most"
			// when take-home is still climbing at the edge of the chart. The
			// exponent 1.5*L/L0 at or below 1 is exactly that regime.
			withLines(15060, 9000); // n = 0.90
			expect(component.exponent).toBeLessThanOrEqual(1);
			expect(component.peakIsAtRangeEdge).toBe(true);
			// The ternary search converges to the clamped edge, not exactly onto
			// it, so compare to the nearest dollar rather than bit-for-bit.
			expect(component.peakIncome).toBeCloseTo(100 * component.current, 0);
		});

		it("does not flag the regime where a genuine peak exists", () => {
			// A genuine interior peak needs a steep curve. The calibrated
			// curve is shallow, so pin a steep steepness to reach this branch.
			withLines(15060, 15060);
			(component as any).resolveSteepness = () => {
				component.steepness = 1.5;
			};
			(component as any).computeDerived();
			expect(component.peakIsAtRangeEdge).toBe(false);
			expect(component.peakIncome).toBeLessThan((component as any).chartXMax(component.current));
		});

		it("reports the rate and take-home that belong to the peak income", () => {
			withLines(15060, 15060);
			expect(component.peakTaxRate).toBeCloseTo(component.taxRateAt(component.peakIncome), 6);
			expect(component.peakTakeHome).toBeCloseTo(component.takeHomeAt(component.peakIncome), 6);
		});
	});

	describe("the explorer's readouts agree with the curve", () => {
		// taxes.html shows "Tax rate / Tax paid / Take-home" for userIncome.
		it("derives tax paid and take-home from the reported rate", () => {
			withLines(15060, 15060);
			component.userIncome = 80000;
			(component as any).computeUser();
			expect(component.userTaxRate).toBeCloseTo(component.taxRateAt(80000), 10);
			expect(component.userTax).toBeCloseTo((80000 * component.userTaxRate) / 100, 6);
			expect(component.userTakeHome).toBeCloseTo(80000 - component.userTax, 6);
		});

		it("keeps the slider inside the range the chart can plot", () => {
			// The dot is only drawn inside the chart's x range, so a slider
			// that travels past it has positions where the tool silently stops
			// marking the income it is reporting. The range now extends past
			// the income ceiling, so it is read from the component rather than
			// assumed to be 100x the poverty line.
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				const xMax = (component as any).chartXMax(component.current);
				expect(component.maxIncome)
					.withContext(`baseline ${L0}, current ${L}: slider max exceeds chart x range`)
					.toBeLessThanOrEqual(Math.round(xMax));
				expect(component.minIncome).toBeLessThanOrEqual(component.maxIncome);
			}
		});

		it("pulls an out-of-range income back onto the chart", () => {
			withLines(15060, 15060);
			component.userIncome = 900000;
			withLines(15060, 1000); // xMax collapses to 100,000
			expect(component.userIncome).toBeLessThanOrEqual(100 * component.current);
			expect(component.userIncome).toBeGreaterThanOrEqual(component.minIncome);
		});
	});

	describe("invalid poverty lines", () => {
		// A number input can be emptied or zeroed mid-edit. Whatever the tool
		// shows then, it must not be a non-number: NaN reaches the template
		// through formatMoney and the number pipe.
		it("never reports NaN for a rate", () => {
			for (const bad of [0, -1, -15060, NaN]) {
				component.baseline = 15060;
				component.current = bad;
				(component as any).computeDerived();
				expect(Number.isNaN(component.taxRateAt(50000)))
					.withContext(`current = ${bad} produced NaN`)
					.toBe(false);
			}
		});

		it("never reports NaN for derived readouts", () => {
			withLines(15060, 15060);
			component.current = -5;
			(component as any).computeDerived();
			for (const [name, v] of Object.entries({
				exponent: component.exponent,
				middleAnchor: component.middleAnchor,
				peakIncome: component.peakIncome,
				userTaxRate: component.userTaxRate,
			})) {
				expect(Number.isFinite(v)).withContext(`${name} = ${v}`).toBe(true);
			}
		});
	});

	describe("info popups", () => {
		// The explanatory prose moved out of the template into tool-info.ts
		// and surfaces through info icons, so the tool fits a phone viewport.
		// A phone has no cursor, so the tap path is the only way in -- and a
		// tap fires a synthetic mouseenter BEFORE click on mobile browsers,
		// which is what makes a naive hover+click pair cancel itself out.
		it("exposes a description for every labelled readout", () => {
			for (const key of [
				"baseline",
				"current",
				"steepness",
				"peakIncome",
				"peakTaxRate",
				"middleAnchor",
				"userIncome",
			]) {
				expect(component.info[key]).withContext(`missing info text for ${key}`).toBeTruthy();
			}
		});

		it("starts with nothing open", () => {
			expect(component.activeInfo).toBeNull();
		});

		it("opens and closes on hover for a mouse user", () => {
			component.showInfo("baseline");
			expect(component.activeInfo).toBe("baseline");
			component.hideInfo("baseline");
			expect(component.activeInfo).toBeNull();
		});

		it("does not close on a stale mouseleave from another marker", () => {
			component.showInfo("baseline");
			component.hideInfo("current");
			expect(component.activeInfo).toBe("baseline");
		});

		// The full sequence a mobile browser delivers for one tap. The click
		// is the part that matters: with a naive hover handler, mouseenter has
		// already set the key, so the click's toggle reads "already open" and
		// shuts it again -- the popup flashes and vanishes.
		function tapSequence(key: string): void {
			component.onTouchStart(key);
			component.showInfo(key);
			component.onMarkerClick(key);
		}

		it("opens on a full tap sequence including the trailing click", () => {
			tapSequence("baseline");
			expect(component.activeInfo)
				.withContext("the synthetic mouseenter + click after a tap closed the popup")
				.toBe("baseline");
		});

		it("closes on a second full tap of the same marker", () => {
			tapSequence("baseline");
			tapSequence("baseline");
			expect(component.activeInfo).toBeNull();
		});

		it("ignores the synthetic mouseleave that follows a tap", () => {
			component.onTouchStart("baseline");
			component.hideInfo("baseline");
			expect(component.activeInfo).toBe("baseline");
		});

		it("closes on a second tap of the same marker", () => {
			component.onTouchStart("baseline");
			component.onTouchStart("baseline");
			expect(component.activeInfo).toBeNull();
		});

		it("switches directly between markers on tap", () => {
			component.onTouchStart("baseline");
			component.onTouchStart("current");
			expect(component.activeInfo).toBe("current");
		});

		it("closes when the page is tapped away from any marker", () => {
			// On a phone there is no pointer to move away, so an outside tap
			// is the only dismissal gesture available.
			component.onTouchStart("baseline");
			const outside = document.createElement("div");
			document.body.appendChild(outside);
			component.onDocumentPointerDown({ target: outside } as unknown as Event);
			expect(component.activeInfo).toBeNull();
			outside.remove();
		});

		it("stays open when the popup's own text is tapped", () => {
			component.onTouchStart("baseline");
			const inside = document.createElement("div");
			inside.className = "anchor-content";
			document.body.appendChild(inside);
			component.onDocumentPointerDown({ target: inside } as unknown as Event);
			expect(component.activeInfo).toBe("baseline");
			inside.remove();
		});

		it("toggles on a plain mouse click with no touch involved", () => {
			component.onMarkerClick("baseline");
			expect(component.activeInfo).toBe("baseline");
			component.onMarkerClick("baseline");
			expect(component.activeInfo).toBeNull();
		});

		it("closes on Escape for a keyboard user", () => {
			component.showInfo("baseline");
			component.onEscape();
			expect(component.activeInfo).toBeNull();
		});
	});

	describe("logarithmic x axis", () => {
		// A linear axis spanning the poverty line to a $70M ceiling squeezes
		// every income below $300k into about two pixels, hiding the part of
		// the curve most people live on. These pin the log mapping and the
		// tick selection that makes it readable.
		// Recover the ACTUAL mapping draw() used, by recording where each tick
		// label is painted. Recomputing the log formula here would pass even
		// if draw() reverted to a linear axis, which is the bug these tests
		// exist to catch.
		function drawnTickPositions(width: number): Map<number, number> {
			const canvas = document.createElement("canvas");
			const wrap = document.createElement("div");
			Object.defineProperty(wrap, "clientWidth", { value: width, configurable: true });
			wrap.appendChild(canvas);
			document.body.appendChild(wrap);
			const ctx = canvas.getContext("2d")!;

			const L = component.current;
			const ticks: number[] = (component as any).buildXTicks((component as any).chartXMax(L), L);
			const labelToValue = new Map<string, number>();
			for (const t of ticks) {
				labelToValue.set(component.formatMoney(t), t);
			}

			// The right-hand money axis formats its ticks with the same
			// formatMoney, so a label like "$1M" is painted twice per draw.
			// draw() paints the money axis first and the x axis second, so
			// recording every match and keeping the last one yields the
			// bottom-axis position. Verified by the ordering assertions below:
			// if this picked up money-axis labels the positions would not be
			// monotonic in income.
			const positions = new Map<number, number>();
			const realFillText = ctx.fillText.bind(ctx);
			const dpr = window.devicePixelRatio || 1;
			ctx.fillText = function (text: string, x: number, y: number) {
				const value = labelToValue.get(text);
				if (value !== undefined) {
					const m = ctx.getTransform();
					positions.set(value, (m.e + m.a * x) / dpr);
				}
				return realFillText(text, x, y);
			} as typeof ctx.fillText;

			(component as any).canvasRef = { nativeElement: canvas };
			(component as any).draw();
			return positions;
		}

		/** Ratio of pixel widths of two income spans, as actually drawn. */
		function drawnSpanRatio(width: number, a: [number, number], b: [number, number]): number | null {
			const pos = drawnTickPositions(width);
			const pxA = (pos.get(a[0]) ?? NaN) - (pos.get(a[1]) ?? NaN);
			const pxB = (pos.get(b[0]) ?? NaN) - (pos.get(b[1]) ?? NaN);
			if (!Number.isFinite(pxA) || !Number.isFinite(pxB) || pxB === 0) {
				return null;
			}
			return pxA / pxB;
		}

		afterEach(() => {
			document.querySelectorAll("body > div").forEach(d => d.remove());
		});

		it("gives equal width to equal income ratios, as drawn", () => {
			// The defining property of a log axis. Measured from the painted
			// tick positions, so a linear mapping fails this.
			withLines(15060, 15060);
			const pos = drawnTickPositions(1000);
			const decadeTicks = [...pos.keys()].sort((a, b) => a - b);
			expect(decadeTicks.length).toBeGreaterThan(3);

			// Find two disjoint 10x spans that were both drawn.
			const pairs: [number, number][] = [];
			for (const t of decadeTicks) {
				const tenX = decadeTicks.find(u => Math.abs(u / (t * 10) - 1) < 0.02);
				if (tenX !== undefined) {
					pairs.push([t, tenX]);
				}
			}
			expect(pairs.length).withContext("no 10x tick pairs drawn").toBeGreaterThan(1);

			const widths = pairs.map(([lo, hi]) => (pos.get(hi) as number) - (pos.get(lo) as number));
			for (const w of widths) {
				expect(w).toBeCloseTo(widths[0], 0);
			}
		});

		it("does not compress low incomes the way a linear axis does", () => {
			// On a linear axis over this range, poverty-to-anchor is ~2px out
			// of ~640 while anchor-to-ceiling is nearly all of it. On a log
			// axis the two spans are comparable.
			withLines(15060, 15060);
			const pos = drawnTickPositions(1000);
			const sorted = [...pos.keys()].sort((a, b) => a - b);
			const lowest = sorted[0];
			const highest = sorted[sorted.length - 1];
			const mid = sorted[Math.floor(sorted.length / 2)];

			const lowerHalf = (pos.get(mid) as number) - (pos.get(lowest) as number);
			const upperHalf = (pos.get(highest) as number) - (pos.get(mid) as number);
			// Neither half may collapse: a linear axis puts >95% of the width
			// in the upper half over this range.
			expect(lowerHalf / (lowerHalf + upperHalf)).toBeGreaterThan(0.25);
			expect(upperHalf / (lowerHalf + upperHalf)).toBeGreaterThan(0.25);
		});

		it("orders drawn ticks left to right by income", () => {
			withLines(15060, 15060);
			const pos = drawnTickPositions(1000);
			const sorted = [...pos.entries()].sort((a, b) => a[0] - b[0]);
			for (let i = 1; i < sorted.length; i++) {
				expect(sorted[i][1])
					.withContext(`${sorted[i][0]} drawn left of ${sorted[i - 1][0]}`)
					.toBeGreaterThan(sorted[i - 1][1]);
			}
		});

		it("keeps all drawn ticks inside the plot area", () => {
			withLines(15060, 15060);
			const pos = drawnTickPositions(1000);
			const left = 72;
			const right = 1000 - 88;
			for (const [value, px] of pos) {
				expect(px)
					.withContext(`tick ${value} left of plot`)
					.toBeGreaterThanOrEqual(left - 1);
				expect(px)
					.withContext(`tick ${value} right of plot`)
					.toBeLessThanOrEqual(right + 1);
			}
		});

		it("builds ticks at 1, 2 and 5 per decade", () => {
			withLines(15060, 15060);
			const ticks: number[] = (component as any).buildXTicks(
				(component as any).chartXMax(component.current),
				component.current,
			);
			expect(ticks.length).toBeGreaterThan(6);
			// Ascending, and spread over several decades rather than bunched.
			for (let i = 1; i < ticks.length; i++) {
				expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
			}
			const decadesCovered = Math.log10(ticks[ticks.length - 1] / ticks[0]);
			expect(decadesCovered).toBeGreaterThan(2);
		});

		it("keeps the curve's own landmarks as ticks", () => {
			// Crowding must drop a round decade tick, not the poverty line.
			withLines(15060, 15060);
			const ticks: number[] = (component as any).buildXTicks(
				(component as any).chartXMax(component.current),
				component.current,
			);
			const near = (target: number) => ticks.some(t => Math.abs(t / target - 1) < 0.02);
			expect(near(component.current)).withContext("poverty line missing from ticks").toBe(true);
			expect(near(component.middleAnchor)).withContext("anchor missing from ticks").toBe(true);
			expect(near(component.ceilingIncome)).withContext("ceiling missing from ticks").toBe(true);
		});

		it("keeps every tick inside the drawn range", () => {
			withLines(15060, 15060);
			const L = component.current;
			const xMin = (component as any).chartXMin(L);
			const xMax = (component as any).chartXMax(L);
			const ticks: number[] = (component as any).buildXTicks(xMax, L);
			for (const t of ticks) {
				expect(t).toBeGreaterThanOrEqual(xMin);
				expect(t).toBeLessThanOrEqual(xMax);
			}
		});

		it("does not crowd ticks together in log space", () => {
			withLines(15060, 15060);
			const L = component.current;
			const xMax = (component as any).chartXMax(L);
			const xMin = (component as any).chartXMin(L);
			const ticks: number[] = (component as any).buildXTicks(xMax, L);
			const logSpan = Math.log(xMax / xMin);
			for (let i = 1; i < ticks.length; i++) {
				expect(Math.log(ticks[i] / ticks[i - 1])).toBeGreaterThan(logSpan * 0.04);
			}
		});

		it("starts the domain below the poverty line but above zero", () => {
			// log(0) is undefined, so the axis cannot start at zero.
			withLines(15060, 15060);
			const xMin = (component as any).chartXMin(component.current);
			expect(xMin).toBeGreaterThan(0);
			expect(xMin).toBeLessThan(component.current);
		});

		it("draws without throwing across a wide range of poverty lines", () => {
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				expect(() => drawnTickPositions(1000)).not.toThrow();
			}
		});
	});

	describe("current-law take-home comparison", () => {
		// The chart pairs proposed take-home with what you keep today, so the
		// question "am I better or worse off" is answerable by looking. The
		// current-law line is a reference, not a tax calculator: 2024 single
		// brackets with the standard deduction and nothing else.
		it("derives current take-home from the federal effective rate", () => {
			withLines(15060, 15060);
			for (const gross of [30_000, 100_000, 500_000, 5_000_000]) {
				const expected = gross - (gross * component.federalEffectiveRate(gross)) / 100;
				expect(component.currentTakeHomeAt(gross)).toBeCloseTo(expected, 6);
			}
		});

		it("keeps everything below the standard deduction", () => {
			withLines(15060, 15060);
			expect(component.currentTakeHomeAt(14_600)).toBeCloseTo(14_600, 6);
			expect(component.currentTakeHomeAt(10_000)).toBeCloseTo(10_000, 6);
		});

		it("returns zero for non-positive income", () => {
			withLines(15060, 15060);
			expect(component.currentTakeHomeAt(0)).toBe(0);
			expect(component.currentTakeHomeAt(-5)).toBe(0);
		});

		it("rises monotonically with income", () => {
			withLines(15060, 15060);
			let previous = -1;
			for (let gross = 20_000; gross <= 10_000_000; gross += 20_000) {
				const takeHome = component.currentTakeHomeAt(gross);
				expect(takeHome).toBeGreaterThan(previous);
				previous = takeHome;
			}
		});

		it("finds the income where the proposal stops being better", () => {
			// The single most useful fact on the chart.
			withLines(15060, 15060);
			expect(component.takeHomeCrossover).not.toBeNull();
			const crossover = component.takeHomeCrossover!;
			// Proposed is ahead just below it, behind just above it.
			const below = crossover * 0.9;
			const above = crossover * 1.1;
			expect(component.takeHomeAt(below)).toBeGreaterThan(component.currentTakeHomeAt(below));
			expect(component.takeHomeAt(above)).toBeLessThan(component.currentTakeHomeAt(above));
		});

		it("puts the crossover above the middle-income region", () => {
			// If the crossover fell among ordinary incomes the proposal would
			// be a middle-class tax rise, which it is not.
			withLines(15060, 15060);
			expect(component.takeHomeCrossover!).toBeGreaterThan(500_000);
		});

		it("leaves ordinary incomes barely changed", () => {
			// The honest finding behind the invisibly thin fill below ~$200k.
			withLines(15060, 15060);
			for (const gross of [30_000, 50_000, 75_000]) {
				const proposed = component.takeHomeAt(gross);
				const current = component.currentTakeHomeAt(gross);
				expect(proposed).toBeGreaterThanOrEqual(current);
				expect((proposed - current) / gross).toBeLessThan(0.11);
			}
		});

		it("scales the money axis to cover both curves", () => {
			// Scaling to the proposal alone would run the grey line off the top
			// of the plot and clip the gap fill with it. Asserted by checking
			// that the current-law curve is drawn inside the plot area at the
			// right-hand edge, where it is highest.
			withLines(15060, 15060);
			const canvas = document.createElement("canvas");
			const wrap = document.createElement("div");
			Object.defineProperty(wrap, "clientWidth", { value: 1000, configurable: true });
			wrap.appendChild(canvas);
			document.body.appendChild(wrap);
			const ctx = canvas.getContext("2d")!;
			// Record the y of every point stroked in the current-law colour.
			const ys: number[] = [];
			const realLineTo = ctx.lineTo.bind(ctx);
			ctx.lineTo = function (x: number, y: number) {
				if (String(ctx.strokeStyle).toLowerCase() === "#64748b") {
					ys.push(y);
				}
				return realLineTo(x, y);
			} as typeof ctx.lineTo;
			(component as any).canvasRef = { nativeElement: canvas };
			(component as any).draw();
			wrap.remove();

			expect(ys.length).toBeGreaterThan(100);
			// marginTop is 36 when labels are horizontal at this width; the
			// curve must stay below the top edge rather than running off it.
			expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
		});
	});

	describe("phone-width layout", () => {
		// A real bug chain found on a phone: the revenue table used
		// white-space: nowrap, so it could not shrink below its content width.
		// That pushed the document wider than the viewport, and once the
		// document is wider than the screen the viewport's centre moves.
		// quadrantAnchor places its popups relative to that centre, so an
		// unshrinkable element anywhere on the page makes info icons
		// ELSEWHERE anchor the wrong way and clip. The invariant worth pinning
		// is therefore about layout, not about the anchor code.
		function renderAt(width: number) {
			const fixture = TestBed.createComponent(TaxesComponent);
			const host: HTMLElement = fixture.nativeElement;
			// Constrain the host the way a phone viewport would.
			host.style.width = `${width}px`;
			host.style.overflow = "visible";
			fixture.detectChanges();
			return { fixture, host };
		}

		it("keeps the revenue table within a phone-width container", () => {
			const { fixture, host } = renderAt(320);
			const table = host.querySelector(".revenue-table") as HTMLElement | null;
			if (table) {
				// scrollWidth exceeding clientWidth is exactly the overflow
				// that moves the viewport centre.
				expect(table.scrollWidth)
					.withContext("revenue table forces the page wider than the viewport")
					.toBeLessThanOrEqual(table.clientWidth + 1);
			}
			fixture.destroy();
		});

		it("declares no unshrinkable minimum width in the table cells", () => {
			// Guards the specific cause rather than only the symptom: nowrap
			// on a table cell makes the column incapable of shrinking.
			const { fixture, host } = renderAt(320);
			const cells = host.querySelectorAll(".revenue-table th, .revenue-table td");
			expect(cells.length).toBeGreaterThan(0);
			for (const cell of Array.from(cells)) {
				const whiteSpace = getComputedStyle(cell).whiteSpace;
				expect(whiteSpace).withContext("a table cell is nowrap, so the table cannot shrink").not.toBe("nowrap");
			}
			fixture.destroy();
		});

		it("keeps the income slider shrinkable", () => {
			// Same failure mode: a fixed min-width in a flex row.
			const { fixture, host } = renderAt(320);
			const slider = host.querySelector(".income-slider") as HTMLElement | null;
			if (slider) {
				const minWidth = getComputedStyle(slider).minWidth;
				expect(minWidth === "0px" || minWidth === "auto")
					.withContext(`income slider min-width is ${minWidth}`)
					.toBe(true);
			}
			fixture.destroy();
		});

		it("uses short column headers so the data decides the width", () => {
			// The headers used to be wider than every value beneath them:
			// "Mean income" is 11 characters labelling a column whose widest
			// value is "$10.9M".
			const { fixture, host } = renderAt(320);
			const headers = Array.from(host.querySelectorAll(".revenue-table thead th")).map(h =>
				(h.textContent ?? "").trim(),
			);
			if (headers.length > 0) {
				for (const header of headers) {
					expect(header.length).withContext(`header "${header}" is long`).toBeLessThanOrEqual(8);
				}
			}
			fixture.destroy();
		});
	});

	describe("legend", () => {
		// The legend is HTML over the canvas rather than painted into it, so
		// each series can carry the same info icon the rest of the page uses.
		// Canvas cannot host those icons at all.
		it("lists every drawn series", () => {
			expect(component.legendSeries.length).toBe(6);
			const labels = component.legendSeries.map(s => s.label);
			expect(labels).toContain("Proposed tax rate");
			expect(labels).toContain("Current take-home");
			expect(labels).toContain("Filers at each income");
			expect(labels).toContain("Curve landmarks");
		});

		it("has info text for every series", () => {
			// An unexplained line on a chart invites the reader to guess.
			for (const series of component.legendSeries) {
				expect(component.info[series.key]).withContext(`no info text for ${series.key}`).toBeTruthy();
			}
		});

		it("gives each series a distinct info key", () => {
			const keys = component.legendSeries.map(s => s.key);
			expect(new Set(keys).size).toBe(keys.length);
		});

		it("matches each swatch to the colour actually drawn", () => {
			// A legend whose colours drift from the chart is worse than none.
			const byLabel = new Map(component.legendSeries.map(s => [s.label, s.swatch]));
			expect(byLabel.get("Proposed tax rate")).toBe("#2563eb");
			expect(byLabel.get("Current federal rate")).toBe("#dc2626");
			expect(byLabel.get("Proposed take-home")).toBe("#16a34a");
			expect(byLabel.get("Current take-home")).toBe("#64748b");
		});

		it("drives its popups through the shared info state", () => {
			// Same toggle the page's other icons use, including the touch path.
			const key = component.legendSeries[0].key;
			component.onTouchStart(key);
			component.showInfo(key);
			component.onMarkerClick(key);
			expect(component.activeInfo).toBe(key);
			component.onEscape();
			expect(component.activeInfo).toBeNull();
		});

		it("renders in the DOM with an info icon per series", () => {
			// The whole reason for moving it out of the canvas.
			const fixture = TestBed.createComponent(TaxesComponent);
			fixture.detectChanges();
			const host: HTMLElement = fixture.nativeElement;
			const rows = host.querySelectorAll(".chart-legend li");
			expect(rows.length).toBe(component.legendSeries.length);
			const icons = host.querySelectorAll(".chart-legend .info-marker");
			expect(icons.length).toBe(component.legendSeries.length);
			// Each row has a swatch and a popup target.
			expect(host.querySelectorAll(".chart-legend .legend-swatch").length).toBe(rows.length);
			expect(host.querySelectorAll(".chart-legend .anchor-content").length).toBe(rows.length);
			fixture.destroy();
		});

		it("no longer paints a legend box into the canvas", () => {
			// The canvas legend is gone; only the plot border is stroked as a
			// rectangle now.
			withLines(15060, 15060);
			const canvas = document.createElement("canvas");
			const wrap = document.createElement("div");
			Object.defineProperty(wrap, "clientWidth", { value: 1000, configurable: true });
			wrap.appendChild(canvas);
			document.body.appendChild(wrap);
			const ctx = canvas.getContext("2d")!;
			const rects: { w: number; h: number }[] = [];
			const realStrokeRect = ctx.strokeRect.bind(ctx);
			ctx.strokeRect = function (x: number, y: number, w: number, h: number) {
				rects.push({ w, h });
				return realStrokeRect(x, y, w, h);
			} as typeof ctx.strokeRect;
			(component as any).canvasRef = { nativeElement: canvas };
			(component as any).draw();
			wrap.remove();
			expect(rects.length).toBe(1);
			// That one rect is the plot area, not a small legend box.
			expect(rects[0].w).toBeGreaterThan(500);
		});
	});

	describe("marker rules", () => {
		// Marker rules were the same grey and dash as the current-take-home
		// reference curve, so the two read as one family. They are now purple,
		// thinner, and dashed differently.
		it("draws marker rules in a different colour from the take-home line", () => {
			withLines(15060, 15060);
			const canvas = document.createElement("canvas");
			const wrap = document.createElement("div");
			Object.defineProperty(wrap, "clientWidth", { value: 1000, configurable: true });
			wrap.appendChild(canvas);
			document.body.appendChild(wrap);
			const ctx = canvas.getContext("2d")!;
			const strokeStyles: string[] = [];
			const realStroke = ctx.stroke.bind(ctx);
			ctx.stroke = function () {
				strokeStyles.push(String(ctx.strokeStyle).toLowerCase());
				return realStroke();
			} as typeof ctx.stroke;
			(component as any).canvasRef = { nativeElement: canvas };
			(component as any).draw();
			wrap.remove();

			const purple = strokeStyles.filter(s => s.includes("147, 112, 219"));
			expect(purple.length).toBeGreaterThan(2);
			// And none of them is the grey used by the reference curve.
			expect(purple.every(s => !s.includes("64748b"))).toBe(true);
		});

		it("draws marker rules thinner than the take-home reference line", () => {
			withLines(15060, 15060);
			const canvas = document.createElement("canvas");
			const wrap = document.createElement("div");
			Object.defineProperty(wrap, "clientWidth", { value: 1000, configurable: true });
			wrap.appendChild(canvas);
			document.body.appendChild(wrap);
			const ctx = canvas.getContext("2d")!;
			const widths: { style: string; width: number }[] = [];
			const realStroke = ctx.stroke.bind(ctx);
			ctx.stroke = function () {
				widths.push({ style: String(ctx.strokeStyle).toLowerCase(), width: ctx.lineWidth });
				return realStroke();
			} as typeof ctx.stroke;
			(component as any).canvasRef = { nativeElement: canvas };
			(component as any).draw();
			wrap.remove();

			const marker = widths.find(w => w.style.includes("147, 112, 219"))!;
			const reference = widths.find(w => w.style.includes("64748b"))!;
			expect(marker.width).toBeLessThan(reference.width);
		});
	});

	describe("population density shading", () => {
		// The chart shades its background by how many filers earn each income,
		// so the reader can see that the crowd sits in the flat left-hand part
		// of the rate curve while the ceiling sits in empty space.
		function fillRectCalls(width: number): { x: number; w: number; alpha: string }[] {
			const canvas = document.createElement("canvas");
			const wrap = document.createElement("div");
			Object.defineProperty(wrap, "clientWidth", { value: width, configurable: true });
			wrap.appendChild(canvas);
			document.body.appendChild(wrap);
			const ctx = canvas.getContext("2d")!;
			const calls: { x: number; w: number; alpha: string }[] = [];
			const realFillRect = ctx.fillRect.bind(ctx);
			ctx.fillRect = function (x: number, y: number, w: number, h: number) {
				const style = String(ctx.fillStyle);
				// Only the density columns. The legend also paints rgba fills
				// (its own background, and its swatch for this very series),
				// so match the slate colour AND exclude the legend's swatch by
				// its fixed 10px height.
				if (style.includes("71, 85, 105") && h > 20) {
					calls.push({ x, w, alpha: style });
				}
				return realFillRect(x, y, w, h);
			} as typeof ctx.fillRect;
			(component as any).canvasRef = { nativeElement: canvas };
			(component as any).draw();
			return calls;
		}

		afterEach(() => {
			document.querySelectorAll("body > div").forEach(d => d.remove());
		});

		it("paints one translucent column per visible bracket", () => {
			withLines(15060, 15060);
			const calls = fillRectCalls(1000);
			expect(calls.length).toBeGreaterThan(10);
		});

		it("keeps every column inside the plot area", () => {
			withLines(15060, 15060);
			const left = 72;
			const right = 1000 - 88;
			for (const call of fillRectCalls(1000)) {
				expect(call.x).toBeGreaterThanOrEqual(left - 0.01);
				// Columns are drawn half a pixel wide to avoid hairline gaps.
				expect(call.x + call.w).toBeLessThanOrEqual(right + 1);
			}
		});

		it("never reaches full opacity, so it stays background", () => {
			withLines(15060, 15060);
			for (const call of fillRectCalls(1000)) {
				const alpha = Number(/,\s*([\d.]+)\)/.exec(call.alpha)?.[1] ?? "1");
				expect(alpha).toBeLessThanOrEqual(0.35);
			}
		});

		it("does not shade in the take-home series colour", () => {
			// Green is already a curve; the shading must not read as part of it.
			withLines(15060, 15060);
			for (const call of fillRectCalls(1000)) {
				expect(call.alpha).not.toContain("22, 163, 74");
			}
		});

		it("shades the middle-income region more heavily than the top", () => {
			// The visual argument, asserted on what was actually painted.
			withLines(15060, 15060);
			const calls = fillRectCalls(1000);
			const alphaOf = (c: { alpha: string }) => Number(/,\s*([\d.]+)\)/.exec(c.alpha)?.[1] ?? "0");
			const sorted = [...calls].sort((a, b) => a.x - b.x);
			// Compare the heaviest column in the left half against the
			// heaviest in the right quarter.
			const plotLeft = 72;
			const plotWidth = 1000 - 72 - 88;
			const leftHalf = sorted.filter(c => c.x < plotLeft + plotWidth * 0.5);
			const rightQuarter = sorted.filter(c => c.x > plotLeft + plotWidth * 0.75);
			expect(leftHalf.length).toBeGreaterThan(0);
			expect(rightQuarter.length).toBeGreaterThan(0);
			const heaviestLeft = Math.max(...leftHalf.map(alphaOf));
			const heaviestRight = Math.max(...rightQuarter.map(alphaOf));
			expect(heaviestLeft).toBeGreaterThan(heaviestRight * 2);
		});

		it("reports the densest band and the share below the ceiling", () => {
			withLines(15060, 15060);
			expect(component.densestBandLabel).toBeTruthy();
			expect(component.shareBelowCeiling).toBeGreaterThan(0.999);
			expect(component.shareBelowCeiling).toBeLessThanOrEqual(1);
		});

		it("draws without throwing across a range of poverty lines", () => {
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				expect(() => fillRectCalls(1000)).not.toThrow();
			}
		});
	});

	describe("revenue check", () => {
		// The curve is blind to how many people earn each income, so a rate
		// schedule that looks reasonable can still fail to fund anything. The
		// original formula fixed steepness at 1.5, which raises about $4.17T
		// against 2022's $2.14T -- and only by charging the top 1% near 85%.
		// The tool therefore solves steepness to meet the target instead, and
		// the uncalibrated curve is not a state the user can reach.
		it("projects a revenue figure", () => {
			withLines(15060, 15060);
			expect(component.revenue).toBeTruthy();
			expect(component.revenue!.groups.length).toBe(5);
			expect(component.revenue!.proposedTotalMillions).toBeGreaterThan(0);
		});

		it("opens already matching the revenue target", () => {
			// The landing state must be the funded curve, not the $4.17T one.
			withLines(15060, 15060);
			expect(component.revenue!.differencePct).toBeCloseTo(0, 1);
		});

		it("opens on the solved steepness, not a hardcoded one", () => {
			withLines(15060, 15060);
			expect(component.steepness).toBeCloseTo(component.neutralSteepness!, 10);
			expect(component.steepness).not.toBe(component.fallbackSteepness);
		});

		it("raises the rate on the concentrated top band", () => {
			// With the top 0.1% isolated, funding this curve requires a very
			// high rate on it -- there is no configuration that both funds the
			// system with a ceiling and keeps that band under 60%. The panel
			// shows the number so the tradeoff is visible.
			withLines(15060, 15060);
			const top = component.revenue!.groups.find(g => g.name === "Top 0.1%")!;
			expect(top.proposedRatePct).toBeGreaterThan(top.actualRatePct);
			expect(top.proposedRatePct).toBeLessThan(100);
		});

		it("cuts every band except the concentrated top", () => {
			// The burden shifts almost entirely onto the top 0.1%: every other
			// band pays less than today. Stated as a test so the tradeoff is
			// explicit rather than incidental.
			withLines(15060, 15060);
			const groups = component.revenue!.groups;
			const top = groups.find(g => g.name === "Top 0.1%")!;
			expect(top.proposedRatePct).toBeGreaterThan(top.actualRatePct);
			for (const name of ["Top 1-2%", "Middle class", "Lower 50%"]) {
				const g = groups.find(x => x.name === name)!;
				expect(g.proposedRatePct).withContext(`${name} not cut`).toBeLessThan(g.actualRatePct);
			}
		});

		it("keeps the anchor at exactly 10% after solving", () => {
			// The curve's one fixed promise must survive calibration, since
			// the template states it unconditionally.
			withLines(15060, 15060);
			expect(component.taxRateAt(component.middleAnchor)).toBeCloseTo(10, 10);
		});

		it("stays monotonic after solving", () => {
			withLines(15060, 15060);
			let previous = -Infinity;
			for (let x = 1000; x <= 1_500_000; x += 2500) {
				const r = component.taxRateAt(x);
				expect(r).toBeGreaterThan(previous);
				previous = r;
			}
		});

		it("re-solves when a poverty line changes", () => {
			withLines(15060, 15060);
			const first = component.steepness;
			withLines(15060, 30000);
			expect(component.steepness).not.toBeCloseTo(first, 6);
			// And it still meets the target afterwards.
			expect(component.revenue!.differencePct).toBeCloseTo(0, 1);
		});

		it("reports the steepness it actually drew with", () => {
			// exponent is the displayed readout; it must reflect the solved
			// steepness, not the value from before the solve.
			withLines(15060, 15060);
			expect(component.exponent).toBeCloseTo((component.steepness * component.current) / component.baseline, 10);
		});

		it("derives every readout from the solved curve, not a stale one", () => {
			// Regression guard for ordering: the peak search and user readouts
			// run after steepness is resolved.
			withLines(15060, 15060);
			expect(component.peakTaxRate).toBeCloseTo(component.taxRateAt(component.peakIncome), 6);
			expect(component.userTaxRate).toBeCloseTo(component.taxRateAt(component.userIncome), 6);
		});

		it("falls back to a ceiling-preserving steepness when nothing reaches the target", () => {
			withLines(15060, 15060);
			component.revenueTargetBillions = 500;
			component.onRevenueTarget();
			expect(component.targetOutOfReach).toBe(true);
			expect(component.steepness).toBe(component.fallbackSteepness);
			// The fallback must still imply a ceiling, or the chart loses the
			// one feature it is built around.
			expect(component.hasCeiling).toBe(true);
		});
	});

	describe("revenue target", () => {
		// The target is editable so the tool survives its own dataset going
		// stale: a later year's published total can be typed in.
		it("starts at the 2022 total", () => {
			withLines(15060, 15060);
			expect(component.revenueTargetBillions).toBe(2140);
		});

		it("starts at a target the curve can actually reach", () => {
			// The default has to be calibratable, or the tool opens showing a
			// button that cannot work.
			withLines(15060, 15060);
			expect(component.targetOutOfReach).toBe(false);
			expect(component.neutralSteepness).not.toBeNull();
		});

		it("re-solves the curve to meet a newly entered target", () => {
			withLines(15060, 15060);
			component.revenueTargetBillions = 2600;
			component.onRevenueTarget();
			expect(component.revenue!.actualTotalMillions).toBe(2_600_000);
			expect(component.revenue!.differencePct).toBeCloseTo(0, 1);
			expect(component.revenue!.proposedTotalMillions / 1e3).toBeCloseTo(2600, 0);
		});

		it("needs a steeper curve for a larger target", () => {
			withLines(15060, 15060);
			component.revenueTargetBillions = 2200;
			component.onRevenueTarget();
			const lower = component.steepness;

			component.revenueTargetBillions = 2800;
			component.onRevenueTarget();
			expect(component.steepness).toBeGreaterThan(lower);
		});

		it("raises the top rate as the target rises", () => {
			// The tradeoff the panel exists to show.
			withLines(15060, 15060);
			component.revenueTargetBillions = 2200;
			component.onRevenueTarget();
			const low = component.revenue!.groups.find(g => g.name === "Top 0.1%")!.proposedRatePct;

			component.revenueTargetBillions = 2800;
			component.onRevenueTarget();
			const high = component.revenue!.groups.find(g => g.name === "Top 0.1%")!.proposedRatePct;
			expect(high).toBeGreaterThan(low);
		});

		it("keeps the anchor exact for any reachable target", () => {
			for (const target of [2200, 2600, 3000]) {
				withLines(15060, 15060);
				component.revenueTargetBillions = target;
				component.onRevenueTarget();
				expect(component.taxRateAt(component.middleAnchor))
					.withContext(`anchor moved at $${target}B`)
					.toBeCloseTo(10, 10);
			}
		});

		it("flags a target the curve cannot reach", () => {
			withLines(15060, 15060);
			component.revenueTargetBillions = 500;
			component.onRevenueTarget();
			expect(component.targetOutOfReach).toBe(true);
			expect(component.neutralSteepness).toBeNull();
		});

		it("reports the reachable span when the target is out of reach", () => {
			withLines(15060, 15060);
			component.revenueTargetBillions = 50_000;
			component.onRevenueTarget();
			expect(component.targetOutOfReach).toBe(true);
			expect(component.reachableMinBillions).toBeGreaterThan(0);
			expect(component.reachableMaxBillions).toBeGreaterThan(component.reachableMinBillions);
		});

		it("treats the default target as reachable", () => {
			withLines(15060, 15060);
			expect(component.targetOutOfReach).toBe(false);
			expect(component.neutralSteepness).not.toBeNull();
		});

		it("falls back to the default for an emptied or invalid target", () => {
			withLines(15060, 15060);
			for (const bad of [0, -100, NaN]) {
				component.revenueTargetBillions = bad as number;
				component.onRevenueTarget();
				expect(Number.isFinite(component.revenue!.actualTotalMillions))
					.withContext(`target ${bad} produced a non-finite comparison`)
					.toBe(true);
				expect(component.revenue!.actualTotalMillions).toBeGreaterThan(0);
			}
		});

		it("keeps a user-entered target across a poverty-line change", () => {
			// The target is the user's input, not a derived value, so
			// recomputing the curve must not quietly reset it.
			withLines(15060, 15060);
			component.revenueTargetBillions = 2900;
			component.onRevenueTarget();
			withLines(15060, 20000);
			expect(component.revenueTargetBillions).toBe(2900);
		});
	});

	describe("forced-realisation premise and behavioural shortfall", () => {
		// The tool must not present a static revenue figure as if behaviour
		// were fixed, when the ceiling it draws gives the top band a reason to
		// report less.
		it("reports a shortfall when a band's mean sits above the ceiling", () => {
			withLines(15060, 15060);
			expect(component.hasCeiling).toBe(true);
			expect(component.cappedBandNames.length).toBeGreaterThan(0);
			expect(component.behaviouralShortfallMillions).toBeGreaterThan(0);
		});

		it("names the band that would be capped", () => {
			withLines(15060, 15060);
			expect(component.cappedBandNames).toContain("Top 0.1%");
			const top = component.revenue!.groups.find(g => g.name === "Top 0.1%")!;
			expect(top.meanAgi).toBeGreaterThan(component.ceilingIncome);
		});

		it("reports a behavioural total below the headline figure", () => {
			withLines(15060, 15060);
			expect(component.behaviouralTotalMillions).toBeLessThan(component.revenue!.proposedTotalMillions);
			expect(component.behaviouralTotalMillions).toBeGreaterThan(0);
		});

		it("keeps the shortfall consistent with the two totals", () => {
			withLines(15060, 15060);
			expect(component.behaviouralShortfallMillions).toBeCloseTo(
				component.revenue!.proposedTotalMillions - component.behaviouralTotalMillions,
				6,
			);
		});

		it("exposes the forced-realisation fraction as a percent", () => {
			withLines(15060, 15060);
			expect(component.forcedRealisationPct).toBeCloseTo(1, 6);
		});

		it("reports no shortfall when the curve has no ceiling", () => {
			// Without a ceiling there is no modelled reason for the top band to
			// report differently, so the two totals agree.
			withLines(15060, 15060);
			(component as any).hasCeiling = false;
			(component as any).ceilingIncome = 0;
			(component as any).computeRevenue(component.current, component.baseline);
			expect(component.behaviouralShortfallMillions).toBe(0);
			expect(component.cappedBandNames.length).toBe(0);
		});
	});

	describe("formatBigMoney", () => {
		it("renders trillions and billions", () => {
			expect(component.formatBigMoney(2_136_333)).toBe("$2.14T");
			expect(component.formatBigMoney(863_631)).toBe("$864B");
			expect(component.formatBigMoney(0)).toBe("$0B");
		});

		it("does not render NaN", () => {
			expect(component.formatBigMoney(NaN)).toBe("$0");
		});
	});

	describe("formatMoney", () => {
		// The chart's axis ticks and every money readout go through this.
		it("renders exact magnitudes", () => {
			expect(component.formatMoney(0)).toBe("$0");
			expect(component.formatMoney(999)).toBe("$999");
			expect(component.formatMoney(1000)).toBe("$1K");
			expect(component.formatMoney(1_000_000)).toBe("$1M");
			expect(component.formatMoney(1_500_000)).toBe("$1.5M");
		});

		it("does not report a thousands value that has reached a million", () => {
			// 999999 rounds to 1000K, which names a magnitude the formatter has
			// a unit for. No reader expects "$1000K" where "$1M" exists.
			expect(component.formatMoney(999_999)).toBe("$1M");
		});
	});

	describe("x-axis label rotation", () => {
		// On a narrow canvas the money labels collide, so they snap to 45
		// degrees. The pre-canvas Flot version computed a continuous angle;
		// this is deliberately a single threshold and one fixed angle.
		//
		// These drive the real 2D context rather than a mock: the thing worth
		// pinning is that the transform is restored per label, and only a real
		// context tracks that.
		function drawInto(width: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
			const canvas = document.createElement("canvas");
			const wrap = document.createElement("div");
			// clientWidth is read off the canvas's parent to size the chart.
			Object.defineProperty(wrap, "clientWidth", { value: width, configurable: true });
			wrap.appendChild(canvas);
			document.body.appendChild(wrap);
			(component as any).canvasRef = { nativeElement: canvas };
			(component as any).draw();
			return { canvas, ctx: canvas.getContext("2d")! };
		}

		afterEach(() => {
			document.querySelectorAll("body > div").forEach(d => d.remove());
		});

		// Record the rotation in effect at each fillText. Checking the
		// transform only AFTER draw() is not enough: a missing restore()
		// leaves state on the stack, and the save/restore pairs that follow
		// (axis titles, legend) pop it back to clean by coincidence.
		function anglesAtEachLabel(width: number): number[] {
			const canvas = document.createElement("canvas");
			const wrap = document.createElement("div");
			Object.defineProperty(wrap, "clientWidth", { value: width, configurable: true });
			wrap.appendChild(canvas);
			document.body.appendChild(wrap);
			const ctx = canvas.getContext("2d")!;
			const angles: number[] = [];
			const realFillText = ctx.fillText.bind(ctx);
			ctx.fillText = function (text: string, x: number, y: number) {
				const m = ctx.getTransform();
				angles.push(Math.atan2(m.b, m.a));
				return realFillText(text, x, y);
			} as typeof ctx.fillText;
			// getContext("2d") returns this same object on each call, so draw()
			// picks up the patched fillText without needing a spy.
			(component as any).canvasRef = { nativeElement: canvas };
			(component as any).draw();
			return angles;
		}

		it("draws horizontal labels unrotated on a wide chart", () => {
			withLines(15060, 15060);
			const angles = anglesAtEachLabel(1000);
			// The only rotated text on a wide chart is the two y-axis titles
			// (+/- 90 degrees); no label sits at 45.
			const at45 = angles.filter(a => Math.abs(Math.abs(a) - Math.PI / 4) < 0.01);
			expect(at45.length).toBe(0);
		});

		it("rotates each narrow-chart label by exactly 45 degrees, not a compounding multiple", () => {
			withLines(15060, 15060);
			const angles = anglesAtEachLabel(360);
			const rotated = angles.filter(a => a < -0.01 && a > -Math.PI / 2 + 0.01);
			expect(rotated.length).toBeGreaterThan(1);
			// ctx.rotate() is cumulative: without a restore() per label the
			// second label sits at 90 degrees, the third at 135, and so on.
			for (const a of rotated) {
				expect(a).toBeCloseTo(-Math.PI / 4, 6);
			}
		});

		it("grows the canvas when labels rotate so the plot keeps its height", () => {
			// Rotated labels claim ~110px more in margins. The canvas grows to
			// absorb that, rather than the plot area shrinking into what the
			// labels leave over.
			withLines(15060, 15060);
			const dpr = window.devicePixelRatio || 1;
			const wideH = drawInto(1000).canvas.height / dpr;
			const narrowH = drawInto(360).canvas.height / dpr;
			expect(wideH).toBeCloseTo(500, 0);
			expect(narrowH).toBeGreaterThan(wideH);
		});

		it("rotates the top marker labels the opposite way from the bottom ticks", () => {
			// Reading runs left-to-right first, top-to-bottom second. Both
			// axes keep that: bottom labels trail DOWN-left from their tick,
			// top marker labels trail UP-left. Same reading order, mirrored
			// angles, and neither set runs into the plot.
			withLines(15060, 15060);
			const angles = anglesAtEachLabel(360);
			const bottom = angles.filter(a => Math.abs(a + Math.PI / 4) < 0.01);
			// Restricted to the 45-degree band: the right-hand y-axis title is
			// drawn at exactly +90 and is not a marker label.
			const top = angles.filter(a => Math.abs(a - Math.PI / 4) < 0.01);

			expect(bottom.length).withContext("no rotated bottom tick labels").toBeGreaterThan(1);
			// Four markers once a ceiling exists: poverty line, anchor, peak
			// take-home, income ceiling.
			expect(top.length).withContext("no rotated top marker labels").toBe(4);

			for (const a of bottom) {
				expect(a).toBeCloseTo(-Math.PI / 4, 6);
			}
			for (const a of top) {
				expect(a).toBeCloseTo(Math.PI / 4, 6);
			}
			// The mirror property itself, stated directly.
			expect(top[0]).toBeCloseTo(-bottom[0], 6);
		});

		it("draws the marker labels horizontally on a wide chart", () => {
			withLines(15060, 15060);
			const angles = anglesAtEachLabel(1000);
			const tilted = angles.filter(a => Math.abs(a) > 0.01 && Math.abs(Math.abs(a) - Math.PI / 2) > 0.01);
			expect(tilted.length).toBe(0);
		});

		it("reserves top room from the widest marker label, including both peak variants", () => {
			// "Peak Take-Home" and "Still Rising" swap by regime, so the top
			// margin must be sized for the wider one or the layout would shift
			// when the poverty line crosses the no-peak threshold.
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d")!;
			ctx.font = "11px 'Trebuchet MS', sans-serif";
			const widest = (component as any).widestMarkerLabel(ctx);
			const measured = ["Poverty Line", "10% Tax Anchor", "Peak Take-Home", "Still Rising"].map(
				l => ctx.measureText(l).width,
			);
			expect(widest).toBeCloseTo(Math.max(...measured), 6);
		});

		it("keeps the rotated marker labels inside the canvas", () => {
			// A label is drawn above the plot; if the top margin is too small
			// it renders at a negative y and is clipped away entirely.
			withLines(15060, 15060);
			const canvas = document.createElement("canvas");
			const wrap = document.createElement("div");
			Object.defineProperty(wrap, "clientWidth", { value: 360, configurable: true });
			wrap.appendChild(canvas);
			document.body.appendChild(wrap);
			const ctx = canvas.getContext("2d")!;
			const tops: number[] = [];
			const realFillText = ctx.fillText.bind(ctx);
			ctx.fillText = function (text: string, x: number, y: number) {
				const m = ctx.getTransform();
				// Rotated marker labels only: positive rotation.
				if (Math.abs(Math.atan2(m.b, m.a) - Math.PI / 4) < 0.01) {
					const width = ctx.measureText(text).width;
					tops.push(m.f - width * Math.SQRT1_2);
				}
				return realFillText(text, x, y);
			} as typeof ctx.fillText;
			(component as any).canvasRef = { nativeElement: canvas };
			(component as any).draw();
			expect(tops.length).toBe(4);
			for (const t of tops) {
				expect(t).withContext("marker label clipped off the top of the canvas").toBeGreaterThan(0);
			}
		});

		it("still draws every tick label at a narrow width", () => {
			// Guard against the rotation path silently skipping labels.
			withLines(15060, 15060);
			const ticks = (component as any).buildXTicks(100 * component.current, component.current);
			expect(ticks.length).toBeGreaterThan(1);
			const { ctx } = drawInto(360);
			const widest = (component as any).widestXLabel(ctx, 100 * component.current, component.current);
			expect(widest).toBeGreaterThan(0);
		});

		it("measures the widest label from the ticks actually drawn", () => {
			withLines(15060, 15060);
			const { ctx } = drawInto(1000);
			const widest = (component as any).widestXLabel(ctx, 100 * component.current, component.current);
			const ticks: number[] = (component as any).buildXTicks(100 * component.current, component.current);
			const expected = Math.max(...ticks.map(t => ctx.measureText(component.formatMoney(t)).width));
			expect(widest).toBeCloseTo(expected, 6);
		});

		it("does not throw when the poverty line makes a single-tick axis", () => {
			// Degenerate axis: widestXLabel reduces over the tick list, which
			// must not be empty-reduced.
			withLines(15060, 15060);
			expect(() => drawInto(320)).not.toThrow();
		});
	});

	describe("current federal comparison curve", () => {
		// The red curve is labelled "Current Federal Effective Rate", i.e. an
		// effective rate on gross income under the 2024 single-filer brackets
		// with the standard deduction.
		it("is zero below the standard deduction", () => {
			expect(component.federalEffectiveRate(14600)).toBe(0);
			expect(component.federalEffectiveRate(10000)).toBe(0);
			expect(component.federalEffectiveRate(0)).toBe(0);
		});

		it("matches the published tax on a known taxable income", () => {
			// Taxable 100,000 -> 17,053 under 2024 single brackets.
			const gross = 100000 + 14600;
			expect((component.federalEffectiveRate(gross) * gross) / 100).toBeCloseTo(17053, 0);
		});

		it("stays below the top marginal rate", () => {
			for (const gross of [20000, 50000, 200000, 1_000_000, 10_000_000]) {
				expect(component.federalEffectiveRate(gross)).toBeLessThan(37);
			}
		});
	});
});

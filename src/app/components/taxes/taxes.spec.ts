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
				expect(component.taxRateAt(component.middleAnchor)).toBeCloseTo(10, 10);
			});
		});

		it("places the anchor at ten times today's poverty line", () => {
			withLines(15060, 20000);
			expect(component.middleAnchor).toBe(200000);
		});
	});

	describe("curve steepness", () => {
		// taxes.html: "Curve steepness ... 1.50 is neutral". Neutral must mean
		// the case where nothing has changed: today's line equals the baseline.
		it("is exactly 1.50 when today's line equals the baseline", () => {
			withLines(15060, 15060);
			expect(component.exponent).toBeCloseTo(1.5, 10);
		});

		it("is above neutral when today's line is higher than the baseline", () => {
			withLines(15060, 20000);
			expect(component.exponent).toBeGreaterThan(1.5);
		});

		it("is below neutral when today's line is lower than the baseline", () => {
			withLines(15060, 9000);
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
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				const xMax = 100 * L;
				expect(component.peakIncome)
					.withContext(`baseline ${L0}, current ${L}: peak must be <= xMax ${xMax}`)
					.toBeLessThanOrEqual(xMax);
				expect(component.peakIncome).toBeGreaterThan(0);
			}
		});

		it("maximises take-home over the drawn range", () => {
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				const reported = component.takeHomeAt(component.peakIncome);
				const xMax = 100 * L;
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
			withLines(15060, 15060); // n = 1.50
			expect(component.peakIsAtRangeEdge).toBe(false);
			expect(component.peakIncome).toBeLessThan(100 * component.current);
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
			// The dot is only drawn when userIncome <= 100*L, so a slider that
			// travels past that bound has positions where the tool silently
			// stops marking the income it is reporting.
			for (const [L0, L] of PAIRS) {
				withLines(L0, L);
				expect(component.maxIncome)
					.withContext(`baseline ${L0}, current ${L}: slider max exceeds chart x range`)
					.toBeLessThanOrEqual(100 * component.current);
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

import {
	INCOME_GROUPS,
	TOTAL_RETURNS,
	TOTAL_AGI_MILLIONS,
	TOTAL_TAX_MILLIONS,
	meanAgiOf,
	projectRevenue,
	makeRateFn,
	solveNeutralSteepness,
	solveSteepnessForRevenue,
	reachableRevenue,
	MIN_STEEPNESS,
	MAX_STEEPNESS,
	ANCHOR_MULTIPLE,
	ANCHOR_RATE_PCT,
	findIncomeCeiling,
	ceilingRatePct,
	steepnessForCeilingRate,
	projectRevenueWithCeilingBehaviour,
	FORCED_REALISATION_FRACTION,
} from "./revenue-model";

// The proposed curve is shaped only by two poverty lines, so it carries no
// information about how many people earn each income. That is the defect this
// module exists to measure: US filers are bunched below $100k, so cutting
// rates there costs more than raising rates on a thin top tail recovers.
//
// Two kinds of test here, and the distinction matters:
//
//   1. Tests of the DATA -- that the transcribed IRS table reconciles to its
//      own published totals. These catch a typo in a hand-entered figure,
//      which would silently corrupt every projection.
//   2. Tests of the MATH -- that projection and calibration behave, including
//      on degenerate input.
//
// Source: IRS SOI tax year 2022 via Tax Foundation, "Who Pays Federal Income
// Taxes?" (2025 edition).

describe("revenue model data", () => {
	it("partitions all filers: group returns sum to the published total", () => {
		const sum = INCOME_GROUPS.reduce((a, g) => a + g.returns, 0);
		// The percentile groups are disjoint and exhaustive, so this is exact
		// up to the published rounding.
		// Within IRS rounding: the bands are differences of published
		// cumulative columns, each rounded to the nearest thousand returns.
		expect(sum / TOTAL_RETURNS).toBeCloseTo(1, 5);
	});

	it("group AGI sums to the published total", () => {
		const sum = INCOME_GROUPS.reduce((a, g) => a + g.agiMillions, 0);
		expect(sum / TOTAL_AGI_MILLIONS).toBeCloseTo(1, 3);
	});

	it("group tax sums to the published total", () => {
		const sum = INCOME_GROUPS.reduce((a, g) => a + g.taxMillions, 0);
		expect(sum / TOTAL_TAX_MILLIONS).toBeCloseTo(1, 3);
	});

	it("each group's stated average rate matches its own tax over its own AGI", () => {
		// Guards a transposed digit in any single row: the published rate and
		// the published amounts have to agree with each other.
		for (const g of INCOME_GROUPS) {
			const derived = (g.taxMillions / g.agiMillions) * 100;
			expect(derived)
				.withContext(`${g.name}: stated ${g.actualRatePct}%, derived ${derived.toFixed(2)}%`)
				.toBeCloseTo(g.actualRatePct, 1);
		}
	});

	it("is ordered from highest to lowest income", () => {
		const means = INCOME_GROUPS.map(meanAgiOf);
		for (let i = 1; i < means.length; i++) {
			expect(means[i]).toBeLessThan(means[i - 1]);
		}
	});

	it("splits the top end finely, where the curve's behaviour is decided", () => {
		// Wealth is concentrated enough that a single "Top 1%" row hides the
		// story: the top 0.1% is a tenth of that group's filers but reports a
		// comparable share of its income.
		const names = INCOME_GROUPS.map(g => g.name);
		expect(names).toEqual(["Top 0.1%", "Top 0.1-1%", "Top 1-2%", "Middle class", "Lower 50%"]);

		const top01 = INCOME_GROUPS[0];
		const rest1 = INCOME_GROUPS[1];
		// A tenth of the filers of the 0.1-1% band...
		expect(top01.returns / rest1.returns).toBeLessThan(0.15);
		// ...but a comparable amount of AGI and tax.
		expect(top01.agiMillions / rest1.agiMillions).toBeGreaterThan(0.8);
		expect(top01.taxMillions / rest1.taxMillions).toBeGreaterThan(0.8);
	});

	it("shows the top 0.1% reporting a tenth of all income", () => {
		const top01 = INCOME_GROUPS.find(g => g.name === "Top 0.1%")!;
		expect(top01.returns / TOTAL_RETURNS).toBeCloseTo(0.001, 3);
		expect(top01.agiMillions / TOTAL_AGI_MILLIONS).toBeGreaterThan(0.1);
		expect(top01.taxMillions / TOTAL_TAX_MILLIONS).toBeGreaterThan(0.19);
	});

	it("puts the middle class where most filers above the median are", () => {
		// 2% to 50%: the band between the wealthy and the bottom half.
		const middle = INCOME_GROUPS.find(g => g.name === "Middle class")!;
		expect(middle.returns / TOTAL_RETURNS).toBeGreaterThan(0.45);
		expect(middle.returns / TOTAL_RETURNS).toBeLessThan(0.5);
		const mean = meanAgiOf(middle);
		expect(mean).toBeGreaterThan(50_000);
		expect(mean).toBeLessThan(200_000);
	});

	it("reflects the concentration that breaks the naive curve", () => {
		// The bottom 50% is half the filers but a small share of both AGI and
		// tax. This is the fact the rate curve alone cannot see.
		const bottom = INCOME_GROUPS.find(g => g.name === "Lower 50%")!;
		expect(bottom.returns / TOTAL_RETURNS).toBeCloseTo(0.5, 2);
		expect(bottom.agiMillions / TOTAL_AGI_MILLIONS).toBeLessThan(0.15);
		expect(bottom.taxMillions / TOTAL_TAX_MILLIONS).toBeLessThan(0.05);
	});
});

describe("meanAgiOf", () => {
	it("converts millions of AGI over a return count into dollars per return", () => {
		expect(meanAgiOf({ name: "x", returns: 2, agiMillions: 1, taxMillions: 0, actualRatePct: 0 })).toBe(500_000);
	});

	it("returns zero rather than dividing by zero on an empty group", () => {
		expect(meanAgiOf({ name: "x", returns: 0, agiMillions: 1, taxMillions: 0, actualRatePct: 0 })).toBe(0);
	});
});

describe("projectRevenue", () => {
	it("reproduces actual revenue when handed the actual rates", () => {
		// Sanity check on the machinery itself: feed each group its own
		// published rate and the projection must land on the published total.
		const byMean = new Map(INCOME_GROUPS.map(g => [meanAgiOf(g), g.actualRatePct]));
		const result = projectRevenue(income => byMean.get(income) ?? 0);
		expect(result.proposedTotalMillions / TOTAL_TAX_MILLIONS).toBeCloseTo(1, 2);
		expect(result.differencePct).toBeCloseTo(0, 0);
	});

	it("collects nothing from a zero-rate system", () => {
		const result = projectRevenue(() => 0);
		expect(result.proposedTotalMillions).toBe(0);
		expect(result.differencePct).toBeCloseTo(-100, 6);
	});

	it("collects all AGI from a 100% rate", () => {
		const result = projectRevenue(() => 100);
		expect(result.proposedTotalMillions).toBeCloseTo(
			INCOME_GROUPS.reduce((a, g) => a + g.agiMillions, 0),
			6,
		);
	});

	it("treats a non-finite rate as zero rather than poisoning the total", () => {
		const result = projectRevenue(() => NaN);
		expect(Number.isFinite(result.proposedTotalMillions)).toBe(true);
		expect(result.proposedTotalMillions).toBe(0);
	});

	it("reports the actual total independently of the proposed rate", () => {
		const a = projectRevenue(() => 0);
		const b = projectRevenue(() => 50);
		expect(a.actualTotalMillions).toBe(b.actualTotalMillions);
	});

	it("shows the original 10x-anchor curve over-collecting via the top group", () => {
		// The original finding, pinned at the anchor it was found with: a 1.5
		// steepness against a 10x anchor raises roughly double current law,
		// and only by charging the top 1% a rate no system actually uses.
		const rateAt = makeRateFn(1.5, 15060, 15060, 10, 10);
		const result = projectRevenue(rateAt);
		expect(result.differencePct).toBeGreaterThan(50);

		const top = result.groups.find(g => g.name === "Top 0.1%")!;
		expect(top.proposedRatePct).toBeGreaterThan(70);
		expect(top.actualRatePct).toBeLessThan(30);

		// And the bottom half is cut to a fraction of what it pays now.
		const bottom = result.groups.find(g => g.name === "Lower 50%")!;
		expect(bottom.proposedRatePct).toBeLessThan(bottom.actualRatePct);
	});

	it("has no income ceiling at the original 10x anchor and a funding steepness", () => {
		// Why the anchor moved. At a 10x anchor, the steepness that raises
		// current revenue is about 0.54 -- found here by direct search, since
		// the shipped solver deliberately refuses to go below 1 -- and a
		// curve that shallow never turns over, so no maximum income exists.
		const L = 15060;
		const target = 2_140_000;
		let lo = 0.01;
		let hi = 1;
		for (let i = 0; i < 200; i++) {
			const mid = (lo + hi) / 2;
			const revenue = projectRevenue(makeRateFn(mid, L, L, 10, 10)).proposedTotalMillions;
			if (revenue > target) {
				hi = mid;
			} else {
				lo = mid;
			}
		}
		const fundingSteepness = (lo + hi) / 2;
		expect(projectRevenue(makeRateFn(fundingSteepness, L, L, 10, 10)).proposedTotalMillions / target).toBeCloseTo(
			1,
			2,
		);
		expect(fundingSteepness).toBeLessThan(1);
		expect(findIncomeCeiling(fundingSteepness, L, L, 10, 10)).toBeNull();
	});
});

describe("makeRateFn", () => {
	it("keeps the anchor exactly at its stated rate for any steepness", () => {
		// The curve's defining property: at the anchor multiple of the poverty
		// line the rate is exactly the anchor rate, whatever the steepness is.
		for (const k of [0.1, 0.535, 1, 1.5, 3, 5]) {
			const rateAt = makeRateFn(k, 15060, 15060);
			expect(rateAt(ANCHOR_MULTIPLE * 15060))
				.withContext(`steepness ${k} moved the anchor`)
				.toBeCloseTo(ANCHOR_RATE_PCT, 10);
		}
	});

	it("honours a different anchor multiple and rate", () => {
		const rateAt = makeRateFn(0.5, 15060, 15060, 8, 12);
		expect(rateAt(8 * 15060)).toBeCloseTo(12, 10);
	});

	it("matches the curve's closed form at a given steepness", () => {
		// Pins this generalised form against the explicit expression, so the
		// two cannot drift.
		const L = 15060;
		const L0 = 22590;
		const rateAt = makeRateFn(1.5, L, L0);
		const c = (100 - ANCHOR_RATE_PCT) / ANCHOR_RATE_PCT;
		for (const x of [1000, 25_000, 150_600, 1_000_000]) {
			const original = 100 / (1 + c * Math.pow((ANCHOR_MULTIPLE * L) / x, (1.5 * L) / L0));
			expect(rateAt(x)).toBeCloseTo(original, 10);
		}
	});

	it("rises with income and never leaves 0-100%", () => {
		const rateAt = makeRateFn(0.535, 15060, 15060);
		let previous = -Infinity;
		for (let x = 1000; x <= 10_000_000; x += 5000) {
			const r = rateAt(x);
			expect(r).toBeGreaterThan(previous);
			expect(r).toBeGreaterThanOrEqual(0);
			expect(r).toBeLessThanOrEqual(100);
			previous = r;
		}
	});

	it("returns zero for non-positive income or poverty lines", () => {
		expect(makeRateFn(1.5, 15060, 15060)(0)).toBe(0);
		expect(makeRateFn(1.5, 15060, 15060)(-1)).toBe(0);
		expect(makeRateFn(1.5, 0, 15060)(50_000)).toBe(0);
		expect(makeRateFn(1.5, 15060, 0)(50_000)).toBe(0);
	});
});

describe("solveSteepnessForRevenue", () => {
	// The target is a parameter so the tool outlives its bundled dataset: a
	// user can type in a later year's published total and calibrate to that.
	const L = 15060;

	it("hits an arbitrary target inside the reachable range", () => {
		// The solver only searches steepnesses that keep a ceiling in
		// existence, which raises the revenue floor; 1800 is now below it.
		for (const targetBillions of [2200, 2400, 2600, 3000]) {
			const target = targetBillions * 1e3;
			const k = solveSteepnessForRevenue(target, L, L);
			expect(k).withContext(`no steepness for $${targetBillions}B`).not.toBeNull();
			const got = projectRevenue(makeRateFn(k!, L, L)).proposedTotalMillions;
			expect(got / target)
				.withContext(`$${targetBillions}B target missed`)
				.toBeCloseTo(1, 3);
		}
	});

	it("needs a steeper curve for a bigger target", () => {
		const low = solveSteepnessForRevenue(2_200_000, L, L)!;
		const high = solveSteepnessForRevenue(2_800_000, L, L)!;
		expect(high).toBeGreaterThan(low);
	});

	it("raises the top rate as the target rises", () => {
		// The tradeoff the tool exists to show: more revenue from this curve
		// shape means a heavier top rate, not a broader base.
		const a = projectRevenue(makeRateFn(solveSteepnessForRevenue(2_200_000, L, L)!, L, L));
		const b = projectRevenue(makeRateFn(solveSteepnessForRevenue(2_800_000, L, L)!, L, L));
		const topA = a.groups.find(g => g.name === "Top 0.1%")!.proposedRatePct;
		const topB = b.groups.find(g => g.name === "Top 0.1%")!.proposedRatePct;
		expect(topB).toBeGreaterThan(topA);
	});

	it("returns null for a target below what the curve can go", () => {
		// The floor is set by the shallowest curve that still has a ceiling,
		// so a low target has no solution.
		expect(solveSteepnessForRevenue(500_000, L, L)).toBeNull();
		expect(solveSteepnessForRevenue(1_800_000, L, L)).toBeNull();
	});

	it("returns null for a target above what the curve can reach", () => {
		expect(solveSteepnessForRevenue(20_000_000, L, L)).toBeNull();
	});

	it("returns null for a nonsensical target", () => {
		expect(solveSteepnessForRevenue(0, L, L)).toBeNull();
		expect(solveSteepnessForRevenue(-1, L, L)).toBeNull();
		expect(solveSteepnessForRevenue(NaN, L, L)).toBeNull();
		expect(solveSteepnessForRevenue(Infinity, L, L)).toBeNull();
	});

	it("keeps the anchor exact whatever the target", () => {
		for (const targetBillions of [2200, 2600, 3000]) {
			const k = solveSteepnessForRevenue(targetBillions * 1e3, L, L)!;
			expect(makeRateFn(k, L, L)(ANCHOR_MULTIPLE * L)).toBeCloseTo(ANCHOR_RATE_PCT, 10);
		}
	});

	it("stays inside the documented steepness bounds", () => {
		const k = solveSteepnessForRevenue(2_600_000, L, L)!;
		expect(k).toBeGreaterThanOrEqual(MIN_STEEPNESS);
		expect(k).toBeLessThanOrEqual(MAX_STEEPNESS);
	});
});

describe("reachableRevenue", () => {
	it("brackets the targets that have a solution", () => {
		const L = 15060;
		const span = reachableRevenue(L, L)!;
		expect(span.minMillions).toBeLessThan(span.maxMillions);
		// A target just inside each end resolves; just outside does not.
		expect(solveSteepnessForRevenue(span.minMillions * 1.01, L, L)).not.toBeNull();
		expect(solveSteepnessForRevenue(span.maxMillions * 0.99, L, L)).not.toBeNull();
		expect(solveSteepnessForRevenue(span.minMillions * 0.5, L, L)).toBeNull();
		expect(solveSteepnessForRevenue(span.maxMillions * 2, L, L)).toBeNull();
	});

	it("includes the bundled year's own total, so the default always calibrates", () => {
		const L = 15060;
		const span = reachableRevenue(L, L)!;
		expect(TOTAL_TAX_MILLIONS).toBeGreaterThan(span.minMillions);
		expect(TOTAL_TAX_MILLIONS).toBeLessThan(span.maxMillions);
	});

	it("returns null for invalid poverty lines", () => {
		expect(reachableRevenue(0, 15060)).toBeNull();
		expect(reachableRevenue(15060, -1)).toBeNull();
	});
});

describe("projectRevenue with an explicit target", () => {
	it("measures the difference against the supplied total, not the bundled one", () => {
		const rateAt = makeRateFn(1.5, 15060, 15060);
		const againstBundled = projectRevenue(rateAt);
		const againstBigger = projectRevenue(rateAt, undefined, TOTAL_TAX_MILLIONS * 2);
		expect(againstBigger.actualTotalMillions).toBe(TOTAL_TAX_MILLIONS * 2);
		expect(againstBigger.differencePct).toBeLessThan(againstBundled.differencePct);
		// Same curve, so the projected take is unchanged.
		expect(againstBigger.proposedTotalMillions).toBeCloseTo(againstBundled.proposedTotalMillions, 6);
	});

	it("falls back to the bundled total for a nonsensical target", () => {
		// The fallback is the sum of the group rows, which differs from the
		// published headline total by $1M of IRS rounding -- hence the
		// tolerance rather than an exact match.
		const rateAt = makeRateFn(1.5, 15060, 15060);
		const rowSum = INCOME_GROUPS.reduce((a, g) => a + g.taxMillions, 0);
		for (const bad of [0, -5, NaN]) {
			const r = projectRevenue(rateAt, undefined, bad);
			expect(r.actualTotalMillions).toBe(rowSum);
			expect(r.actualTotalMillions / TOTAL_TAX_MILLIONS).toBeCloseTo(1, 5);
		}
	});
});

describe("solveNeutralSteepness", () => {
	it("finds a steepness that reproduces current revenue", () => {
		const k = solveNeutralSteepness(15060, 15060);
		expect(k).not.toBeNull();
		const result = projectRevenue(makeRateFn(k!, 15060, 15060));
		expect(result.differencePct).toBeCloseTo(0, 1);
	});

	it("lands just above 1, where a ceiling exists but rates stay sane", () => {
		const k = solveNeutralSteepness(15060, 15060)!;
		expect(k).toBeGreaterThan(1);
		expect(k).toBeLessThan(1.5);
	});

	it("funds the system only by taxing the concentrated top heavily", () => {
		// With the top 0.1% broken out as its own band, the arithmetic is
		// stark: a curve of this shape cannot fund the system from the broad
		// base, so the solved curve puts a very high rate on the top 0.1% and
		// cuts everyone else. The tool reports this rather than hiding it.
		const k = solveNeutralSteepness(15060, 15060)!;
		const result = projectRevenue(makeRateFn(k, 15060, 15060));
		const top = result.groups.find(g => g.name === "Top 0.1%")!;
		const bottom = result.groups.find(g => g.name === "Lower 50%")!;

		expect(top.proposedRatePct).toBeGreaterThan(top.actualRatePct);
		expect(bottom.proposedRatePct).toBeLessThan(bottom.actualRatePct);
	});

	it("cannot keep the top 0.1% under 60% while funding the system with a ceiling", () => {
		// A documented property of this curve shape, not an accident of the
		// chosen anchor: searched across anchor multiples and anchor rates,
		// every exponent above 1 that raises the target charges the top 0.1%
		// more than 60%. Pinned so a future anchor tweak cannot quietly imply
		// otherwise.
		const L = 15060;
		let anyUnder60 = false;
		for (let multiple = 21; multiple <= 60 && !anyUnder60; multiple += 1) {
			for (const ratePct of [6, 8, 10, 12, 15]) {
				const k = solveSteepnessForRevenue(2_140_000, L, L, multiple, ratePct);
				if (k === null) {
					continue;
				}
				const result = projectRevenue(makeRateFn(k, L, L, multiple, ratePct));
				const top = result.groups.find(g => g.name === "Top 0.1%")!;
				if (top.proposedRatePct < 60) {
					anyUnder60 = true;
					break;
				}
			}
		}
		expect(anyUnder60).toBe(false);
	});

	it("still honours the anchor after calibration", () => {
		const k = solveNeutralSteepness(15060, 15060)!;
		expect(makeRateFn(k, 15060, 15060)(ANCHOR_MULTIPLE * 15060)).toBeCloseTo(ANCHOR_RATE_PCT, 10);
	});

	it("returns null for invalid poverty lines instead of a bogus constant", () => {
		expect(solveNeutralSteepness(0, 15060)).toBeNull();
		expect(solveNeutralSteepness(15060, 0)).toBeNull();
		expect(solveNeutralSteepness(-1, 15060)).toBeNull();
		expect(solveNeutralSteepness(NaN, 15060)).toBeNull();
	});

	it("returns null when the target is out of reach for the given lines", () => {
		// A poverty line so high that even a near-flat curve overshoots, or so
		// low that no steepness in range gets there. Either way the honest
		// answer is "no such constant", not a clamped endpoint.
		const absurd = solveNeutralSteepness(1, 1_000_000_000);
		if (absurd !== null) {
			const result = projectRevenue(makeRateFn(absurd, 1, 1_000_000_000));
			expect(result.differencePct).toBeCloseTo(0, 0);
		} else {
			expect(absurd).toBeNull();
		}
	});
});

describe("findIncomeCeiling", () => {
	// The point of the system: an income past which earning more leaves you
	// with less, so it acts as a maximum income. It only exists when the
	// exponent is above 1.
	const L = 15060;

	it("finds no ceiling for a shallow curve", () => {
		expect(findIncomeCeiling(0.537, L, L)).toBeNull();
		expect(findIncomeCeiling(1, L, L)).toBeNull();
	});

	it("finds a ceiling once the exponent passes 1", () => {
		const c = findIncomeCeiling(1.05, L, L);
		expect(c).not.toBeNull();
		expect(c!.income).toBeGreaterThan(ANCHOR_MULTIPLE * L);
	});

	it("reports the income where take-home actually turns over", () => {
		const steepness = 1.2;
		const c = findIncomeCeiling(steepness, L, L)!;
		const rateAt = makeRateFn(steepness, L, L);
		const takeHome = (x: number) => x * (1 - rateAt(x) / 100);
		// Nothing nearby beats it, in either direction.
		expect(takeHome(c.income * 1.1)).toBeLessThan(c.takeHome);
		expect(takeHome(c.income * 0.9)).toBeLessThan(c.takeHome);
	});

	it("reports take-home at the ceiling and its multiple of the poverty line", () => {
		const c = findIncomeCeiling(1.2, L, L)!;
		expect(c.takeHome).toBeGreaterThan(0);
		expect(c.takeHome).toBeLessThan(c.income);
		expect(c.multipleOfPovertyLine).toBeCloseTo(c.takeHome / L, 6);
	});

	it("scales with the poverty line, which is the design goal", () => {
		// "Maximum income locked to the poverty line": double the line and
		// the ceiling doubles with it.
		const a = findIncomeCeiling(1.2, L, L)!;
		const b = findIncomeCeiling(1.2, 2 * L, 2 * L)!;
		expect(b.income / a.income).toBeCloseTo(2, 3);
		expect(b.multipleOfPovertyLine).toBeCloseTo(a.multipleOfPovertyLine, 3);
	});

	it("gets steeper curves to a lower ceiling", () => {
		const shallow = findIncomeCeiling(1.1, L, L)!;
		const steep = findIncomeCeiling(2, L, L)!;
		expect(steep.income).toBeLessThan(shallow.income);
	});

	it("returns null for invalid input", () => {
		expect(findIncomeCeiling(1.2, 0, L)).toBeNull();
		expect(findIncomeCeiling(1.2, L, 0)).toBeNull();
		expect(findIncomeCeiling(NaN, L, L)).toBeNull();
	});

	it("exists on the curve the solver actually picks", () => {
		// The solver is constrained to keep a ceiling, so this must hold for
		// the default target.
		const k = solveNeutralSteepness(L, L)!;
		expect(findIncomeCeiling(k, L, L)).not.toBeNull();
	});
});

describe("rate at the income ceiling", () => {
	// The rate where take-home turns over is exactly 100/exponent, and it
	// depends on nothing else: not the anchor multiple, not the anchor rate,
	// not the poverty line. Derivation is in revenue-model.ts; these pin it
	// numerically against the searched ceiling, because the identity is the
	// one number that says whether a curve is usable.
	const L = 15060;

	it("equals 100 divided by the exponent", () => {
		for (const steepness of [1.05, 1.1, 1.2164, 1.5, 2, 3]) {
			expect(ceilingRatePct(steepness, L, L))
				.withContext(`steepness ${steepness}`)
				.toBeCloseTo(100 / steepness, 9);
		}
	});

	it("matches the rate at the ceiling found by search", () => {
		for (const steepness of [1.05, 1.2164, 1.5, 2]) {
			const ceiling = findIncomeCeiling(steepness, L, L)!;
			expect(ceiling.ratePct)
				.withContext(`steepness ${steepness}: searched vs analytic`)
				.toBeCloseTo(ceilingRatePct(steepness, L, L)!, 2);
		}
	});

	it("is independent of the anchor and the poverty line", () => {
		// Same exponent, wildly different anchors and lines: same rate.
		const steepness = 1.5;
		const a = findIncomeCeiling(steepness, L, L, 30, 10)!;
		const b = findIncomeCeiling(steepness, L, L, 10, 8)!;
		const c = findIncomeCeiling(steepness, 40_000, 40_000, 25, 12)!;
		for (const found of [a, b, c]) {
			expect(found.ratePct).toBeCloseTo(100 / steepness, 2);
		}
	});

	it("puts a steepness of 1.5 at exactly two thirds", () => {
		// The value the original formula implied, and a useful landmark.
		expect(ceilingRatePct(1.5, L, L)).toBeCloseTo(66.667, 3);
	});

	it("approaches 100% as the exponent approaches 1", () => {
		expect(ceilingRatePct(1.01, L, L)!).toBeGreaterThan(98);
		expect(ceilingRatePct(1.0001, L, L)!).toBeGreaterThan(99.9);
	});

	it("falls as the curve steepens", () => {
		const shallow = ceilingRatePct(1.1, L, L)!;
		const steep = ceilingRatePct(2.5, L, L)!;
		expect(steep).toBeLessThan(shallow);
	});

	it("has no value when no ceiling exists", () => {
		expect(ceilingRatePct(1, L, L)).toBeNull();
		expect(ceilingRatePct(0.537, L, L)).toBeNull();
		expect(ceilingRatePct(NaN, L, L)).toBeNull();
		expect(ceilingRatePct(1.5, 0, L)).toBeNull();
	});

	it("scales with the exponent, not the steepness, when the lines differ", () => {
		// The exponent is steepness * L / L0, so unequal lines shift it.
		const steepness = 1.5;
		const exponent = (steepness * 20_000) / 15_060;
		expect(ceilingRatePct(steepness, 20_000, 15_060)).toBeCloseTo(100 / exponent, 9);
	});

	it("inverts: steepnessForCeilingRate answers the design question", () => {
		// "What steepness caps the top rate at 70%?"
		for (const target of [50, 66.667, 70, 82.21, 95]) {
			const steepness = steepnessForCeilingRate(target)!;
			expect(ceilingRatePct(steepness, L, L)).toBeCloseTo(target, 6);
		}
	});

	it("refuses impossible target rates", () => {
		expect(steepnessForCeilingRate(0)).toBeNull();
		expect(steepnessForCeilingRate(100)).toBeNull();
		expect(steepnessForCeilingRate(-5)).toBeNull();
		expect(steepnessForCeilingRate(NaN)).toBeNull();
	});
});

describe("behavioural response to the ceiling", () => {
	// Every other projection here is static: it applies new rates to incomes
	// reported under the old ones. The ceiling makes that assumption fail in a
	// way worth measuring -- a band whose mean income is above the ceiling has
	// no reason, under this system, to keep reporting it.
	const L = 15060;

	function solvedRate() {
		const k = solveNeutralSteepness(L, L)!;
		return { rateAt: makeRateFn(k, L, L), ceiling: findIncomeCeiling(k, L, L)! };
	}

	it("caps the bands whose mean income sits above the ceiling", () => {
		const { rateAt, ceiling } = solvedRate();
		const result = projectRevenueWithCeilingBehaviour(rateAt, ceiling.income);
		expect(result.cappedGroups.length).toBeGreaterThan(0);
		// It is the top band that is affected, by construction.
		expect(result.cappedGroups).toContain("Top 0.1%");
	});

	it("raises less than the static projection", () => {
		const { rateAt, ceiling } = solvedRate();
		const stat = projectRevenue(rateAt).proposedTotalMillions;
		const behavioural = projectRevenueWithCeilingBehaviour(rateAt, ceiling.income).proposedTotalMillions;
		expect(behavioural).toBeLessThan(stat);
	});

	it("leaves bands below the ceiling untouched", () => {
		// Only the top is capped, so the shortfall cannot exceed that band's
		// static contribution.
		const { rateAt, ceiling } = solvedRate();
		const stat = projectRevenue(rateAt);
		const topStatic = stat.groups.find(g => g.name === "Top 0.1%")!.proposedTaxMillions;
		const behavioural = projectRevenueWithCeilingBehaviour(rateAt, ceiling.income).proposedTotalMillions;
		expect(stat.proposedTotalMillions - behavioural).toBeLessThan(topStatic);
	});

	it("caps nothing when the ceiling is above every band's mean", () => {
		// A very high ceiling constrains no one.
		const { rateAt } = solvedRate();
		const result = projectRevenueWithCeilingBehaviour(rateAt, 1e12);
		expect(result.cappedGroups.length).toBe(0);
		expect(result.proposedTotalMillions).toBeCloseTo(projectRevenue(rateAt).proposedTotalMillions, 6);
	});

	it("falls back to the static projection for a nonsensical ceiling", () => {
		const { rateAt } = solvedRate();
		for (const bad of [0, -1]) {
			const result = projectRevenueWithCeilingBehaviour(rateAt, bad);
			expect(result.proposedTotalMillions).toBeCloseTo(projectRevenue(rateAt).proposedTotalMillions, 6);
			expect(result.cappedGroups.length).toBe(0);
		}
	});

	it("records the forced-realisation premise the system depends on", () => {
		// Not measured from data: a stated premise, since an income tax cannot
		// reach wealth held as unrealised equity.
		expect(FORCED_REALISATION_FRACTION).toBeGreaterThan(0);
		expect(FORCED_REALISATION_FRACTION).toBeLessThan(1);
	});
});

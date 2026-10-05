import {
	FILER_BRACKETS,
	NO_AGI_RETURNS,
	TABLE_11_TOTAL_RETURNS,
	buildDensityBands,
	densestBand,
	shareAtOrBelow,
} from "./filer-density";

// Two kinds of test, same split as revenue-model.spec.ts:
//
//   1. DATA -- the transcribed IRS Table 1.1 reconciles to its own published
//      totals, and each bracket's implied mean AGI matches the published mean.
//      These catch a typo in a hand-entered figure.
//   2. MATH -- the shading intensity is a density with respect to the LOG axis,
//      not a raw count, because each pixel column on a log axis spans a wider
//      income range than the one left of it. Shading by count would inflate the
//      top end through bin width alone and overstate how many people are there,
//      which is backwards from the point the chart is making.

describe("filer density data", () => {
	it("sums to the published total number of returns", () => {
		const sum = FILER_BRACKETS.reduce((a, b) => a + b.returns, 0) + NO_AGI_RETURNS;
		expect(sum / TABLE_11_TOTAL_RETURNS).toBeCloseTo(1, 5);
	});

	it("matches the published mean AGI for each bracket", () => {
		// Published column 5 ("Average (dollars)") for a sample of brackets.
		// A transposed digit in either returns or AGI breaks this.
		const published: Record<string, number> = {
			"1": 2384,
			"5000": 7553,
			"10000": 12497,
			"30000": 34904,
			"50000": 61602,
			"100000": 137792,
			"10000000": 30364400,
		};
		for (const bracket of FILER_BRACKETS) {
			const expected = published[String(bracket.minIncome)];
			if (expected === undefined) {
				continue;
			}
			const mean = (bracket.agiThousands * 1000) / bracket.returns;
			expect(mean).withContext(`bracket from ${bracket.minIncome}: mean AGI`).toBeCloseTo(expected, -2);
		}
	});

	it("is ordered and non-overlapping", () => {
		for (let i = 1; i < FILER_BRACKETS.length; i++) {
			const previous = FILER_BRACKETS[i - 1];
			const current = FILER_BRACKETS[i];
			expect(previous.maxIncome).toBe(current.minIncome);
			expect(current.minIncome).toBeGreaterThan(previous.minIncome);
		}
	});

	it("leaves only the top bracket open-ended", () => {
		const open = FILER_BRACKETS.filter(b => b.maxIncome === null);
		expect(open.length).toBe(1);
		expect(open[0]).toBe(FILER_BRACKETS[FILER_BRACKETS.length - 1]);
	});

	it("has enough brackets to read as a gradient", () => {
		// The five percentile bands in revenue-model.ts would paint five flat
		// blocks; this table is what makes a gradient possible.
		expect(FILER_BRACKETS.length).toBeGreaterThan(15);
	});

	it("shows filers concentrated below six figures", () => {
		// The fact the shading exists to display.
		const belowSixFigures = FILER_BRACKETS.filter(b => (b.maxIncome ?? Infinity) <= 100_000).reduce(
			(a, b) => a + b.returns,
			0,
		);
		expect(belowSixFigures / TABLE_11_TOTAL_RETURNS).toBeGreaterThan(0.6);
	});

	it("shows almost nobody at the top", () => {
		const aboveFiveMillion = FILER_BRACKETS.filter(b => b.minIncome >= 5_000_000).reduce(
			(a, b) => a + b.returns,
			0,
		);
		expect(aboveFiveMillion / TABLE_11_TOTAL_RETURNS).toBeLessThan(0.001);
	});
});

describe("buildDensityBands", () => {
	const xMin = 7530;
	const xMax = 13_069_065;

	it("normalises the densest band to full intensity", () => {
		const bands = buildDensityBands(xMin, xMax);
		expect(bands.length).toBeGreaterThan(10);
		const max = Math.max(...bands.map(b => b.intensity));
		expect(max).toBeCloseTo(1, 10);
	});

	it("keeps every intensity within 0 and 1", () => {
		for (const band of buildDensityBands(xMin, xMax)) {
			expect(band.intensity).toBeGreaterThanOrEqual(0);
			expect(band.intensity).toBeLessThanOrEqual(1);
		}
	});

	it("clips bands to the domain", () => {
		const bands = buildDensityBands(xMin, xMax);
		for (const band of bands) {
			expect(band.minIncome).toBeGreaterThanOrEqual(xMin);
			expect(band.maxIncome).toBeLessThanOrEqual(xMax);
			expect(band.maxIncome).toBeGreaterThan(band.minIncome);
		}
	});

	it("puts peak density in the middle-income region, not at the top", () => {
		// The whole point of using density per log unit. A raw count per
		// bracket would still peak here, but a count per PIXEL would not.
		const peak = densestBand(buildDensityBands(xMin, xMax))!;
		expect(peak.minIncome).toBeGreaterThanOrEqual(20_000);
		expect(peak.maxIncome).toBeLessThanOrEqual(200_000);
	});

	it("fades to near nothing at the income ceiling", () => {
		// The visual argument: the ceiling sits in empty space.
		const bands = buildDensityBands(xMin, xMax);
		const atCeiling = bands.find(b => b.minIncome <= 9_680_789 && b.maxIncome > 9_680_789);
		expect(atCeiling).toBeTruthy();
		expect(atCeiling!.intensity).toBeLessThan(0.05);
	});

	it("corrects for log bin width rather than shading by raw count", () => {
		// $200-500k holds 10.0M returns; $20-25k holds 8.0M. By raw count the
		// first looks denser. Per log unit the second is far denser, because
		// it spans a much narrower ratio of incomes. The shading must reflect
		// the second reading.
		const bands = buildDensityBands(xMin, xMax);
		const wide = bands.find(b => b.minIncome === 200_000)!;
		const narrow = bands.find(b => b.minIncome === 20_000)!;
		expect(wide.returns).toBeGreaterThan(narrow.returns);
		expect(narrow.intensity).toBeGreaterThan(wide.intensity);
	});

	it("prorates a bracket clipped by the domain edge", () => {
		// Half a bracket visible should contribute about half its filers, not
		// all of them crammed into the visible sliver.
		const full = buildDensityBands(1, 1e9);
		const clipped = buildDensityBands(1, 30_000);
		const fullBand = full.find(b => b.minIncome === 25_000)!;
		const clippedBand = clipped.find(b => b.minIncome === 25_000)!;
		// Same bracket fully visible in both cases, so same filer count.
		expect(clippedBand.returns).toBeCloseTo(fullBand.returns, 0);
	});

	it("returns nothing for a degenerate domain", () => {
		expect(buildDensityBands(0, 100).length).toBe(0);
		expect(buildDensityBands(100, 100).length).toBe(0);
		expect(buildDensityBands(100, 50).length).toBe(0);
		expect(buildDensityBands(NaN, 100).length).toBe(0);
	});

	it("produces monotonically rising then falling intensity", () => {
		// A single hump: density rises to the middle-income peak and falls
		// away. Not strictly required by the math, but true of this data, and
		// a sign the bands are ordered correctly.
		const bands = buildDensityBands(xMin, xMax);
		const peakIndex = bands.findIndex(b => b.intensity === 1);
		expect(peakIndex).toBeGreaterThan(0);
		expect(peakIndex).toBeLessThan(bands.length - 1);
		// Falls away to the right of the peak, allowing no increase.
		for (let i = peakIndex + 2; i < bands.length; i++) {
			expect(bands[i].intensity).toBeLessThanOrEqual(bands[i - 1].intensity + 1e-9);
		}
	});
});

describe("shareAtOrBelow", () => {
	it("is zero at or below zero income", () => {
		expect(shareAtOrBelow(0)).toBe(0);
		expect(shareAtOrBelow(-1)).toBe(0);
	});

	it("rises monotonically with income", () => {
		let previous = -1;
		for (const income of [5_000, 25_000, 50_000, 100_000, 500_000, 5_000_000, 50_000_000]) {
			const share = shareAtOrBelow(income);
			expect(share).toBeGreaterThan(previous);
			previous = share;
		}
	});

	it("approaches everyone at very high income", () => {
		expect(shareAtOrBelow(1e9)).toBeGreaterThan(0.99);
		expect(shareAtOrBelow(1e9)).toBeLessThanOrEqual(1);
	});

	it("puts most filers below six figures", () => {
		const share = shareAtOrBelow(100_000);
		expect(share).toBeGreaterThan(0.6);
		expect(share).toBeLessThan(0.85);
	});

	it("puts nearly everyone below the income ceiling", () => {
		// The sentence the chart should make obvious.
		expect(shareAtOrBelow(9_680_789)).toBeGreaterThan(0.999);
	});
});

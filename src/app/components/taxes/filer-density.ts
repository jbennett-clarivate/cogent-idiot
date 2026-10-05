// Population density by income, for the chart's background shading.
//
// The rate curve is blind to how many people earn each income, which is the
// whole finding the revenue panel reports in numbers. This renders the same
// fact in the chart: a field behind the curves whose weight shows where filers
// actually are. On a log x axis the crowd sits in the near-flat left portion of
// the rate curve, while the income ceiling sits in near-empty space.
//
// Data: IRS Statistics of Income Table 1.1, "All Returns: Selected Income and
// Tax Items, by Size and Accumulated Size of Adjusted Gross Income, Tax Year
// 2022". Nineteen AGI brackets, which is enough resolution to read as a
// gradient rather than a handful of blocks.
//
//   https://www.irs.gov/statistics/soi-tax-stats-individual-statistical-tables-by-size-of-adjusted-gross-income
//   (file: 22in11si.xls)
//
// IMPORTANT: this is a DIFFERENT universe from INCOME_GROUPS in
// revenue-model.ts. Table 1.1 counts ALL returns (161.3M, dependents
// included); the revenue model uses Table 4.1, which excludes dependents
// (153.8M). The two must not be summed or compared filer-for-filer. This table
// is used only for shading, never for revenue.

/** One AGI bracket as published. */
export interface FilerBracket {
	/** Lower bound of the bracket in dollars, inclusive. */
	readonly minIncome: number;
	/** Upper bound in dollars, exclusive; null for the open top bracket. */
	readonly maxIncome: number | null;
	/** Number of returns in the bracket. */
	readonly returns: number;
	/** Total AGI less deficit, in thousands of dollars. */
	readonly agiThousands: number;
}

/**
 * IRS Table 1.1, tax year 2022. The "no adjusted gross income" row is omitted:
 * it has no income band to place on the axis, and its AGI is negative.
 */
export const FILER_BRACKETS: readonly FilerBracket[] = [
	{ minIncome: 1, maxIncome: 5_000, returns: 8_195_780, agiThousands: 19_538_900 },
	{ minIncome: 5_000, maxIncome: 10_000, returns: 8_747_730, agiThousands: 66_070_800 },
	{ minIncome: 10_000, maxIncome: 15_000, returns: 9_642_320, agiThousands: 120_503_000 },
	{ minIncome: 15_000, maxIncome: 20_000, returns: 9_058_380, agiThousands: 157_739_000 },
	{ minIncome: 20_000, maxIncome: 25_000, returns: 8_035_280, agiThousands: 180_311_000 },
	{ minIncome: 25_000, maxIncome: 30_000, returns: 8_005_290, agiThousands: 219_958_000 },
	{ minIncome: 30_000, maxIncome: 40_000, returns: 15_771_600, agiThousands: 550_490_000 },
	{ minIncome: 40_000, maxIncome: 50_000, returns: 13_255_100, agiThousands: 593_955_000 },
	{ minIncome: 50_000, maxIncome: 75_000, returns: 23_805_800, agiThousands: 1_466_490_000 },
	{ minIncome: 75_000, maxIncome: 100_000, returns: 15_181_000, agiThousands: 1_315_620_000 },
	{ minIncome: 100_000, maxIncome: 200_000, returns: 25_887_100, agiThousands: 3_567_050_000 },
	{ minIncome: 200_000, maxIncome: 500_000, returns: 10_017_600, agiThousands: 2_891_060_000 },
	{ minIncome: 500_000, maxIncome: 1_000_000, returns: 1_674_610, agiThousands: 1_124_300_000 },
	{ minIncome: 1_000_000, maxIncome: 1_500_000, returns: 360_882, agiThousands: 435_178_000 },
	{ minIncome: 1_500_000, maxIncome: 2_000_000, returns: 148_222, agiThousands: 254_477_000 },
	{ minIncome: 2_000_000, maxIncome: 5_000_000, returns: 208_129, agiThousands: 621_044_000 },
	{ minIncome: 5_000_000, maxIncome: 10_000_000, returns: 52_968, agiThousands: 362_816_000 },
	{ minIncome: 10_000_000, maxIncome: null, returns: 34_630, agiThousands: 1_051_520_000 },
];

/** Returns with no AGI, excluded from the bands above. */
export const NO_AGI_RETURNS = 3_254_220;

/** All returns in Table 1.1, including the no-AGI row. */
export const TABLE_11_TOTAL_RETURNS = 161_337_000;
export const DENSITY_TAX_YEAR = 2022;

/** A shaded column: where to draw it and how heavily. */
export interface DensityBand {
	readonly minIncome: number;
	readonly maxIncome: number;
	readonly returns: number;
	/**
	 * Filers per unit of natural-log income, normalised so the densest band in
	 * range is 1. This is the quantity to shade by, NOT the raw count: each
	 * pixel column on a log axis spans a wider income range than the one to
	 * its left, so shading by count alone would inflate the top end purely
	 * through bin width and overstate how many people are there.
	 */
	readonly intensity: number;
}

/**
 * Build shading bands clipped to a chart's income domain.
 *
 * Brackets are clipped rather than dropped, so a bracket straddling the edge of
 * the domain still contributes its overlapping portion, with its filer count
 * prorated by the share of its log-width that falls inside.
 */
export function buildDensityBands(
	xMin: number,
	xMax: number,
	brackets: readonly FilerBracket[] = FILER_BRACKETS,
): readonly DensityBand[] {
	if (!(xMin > 0) || !(xMax > xMin)) {
		return [];
	}

	const raw: { minIncome: number; maxIncome: number; returns: number; perLog: number }[] = [];
	for (const bracket of brackets) {
		// The open top bracket is given a finite top so it has a width at all.
		// Its real upper end is unbounded; the domain edge is the only
		// meaningful stop for drawing.
		const bracketMax = bracket.maxIncome ?? Math.max(xMax, bracket.minIncome * 10);
		const lo = Math.max(bracket.minIncome, xMin);
		const hi = Math.min(bracketMax, xMax);
		if (!(hi > lo)) {
			continue;
		}
		const fullWidth = Math.log(bracketMax / Math.max(bracket.minIncome, 1));
		const clippedWidth = Math.log(hi / lo);
		if (!(clippedWidth > 0) || !(fullWidth > 0)) {
			continue;
		}
		// Prorate by the visible share of the bracket, so clipping does not
		// concentrate a whole bracket's filers into a sliver.
		const visibleReturns = bracket.returns * (clippedWidth / fullWidth);
		raw.push({
			minIncome: lo,
			maxIncome: hi,
			returns: visibleReturns,
			perLog: visibleReturns / clippedWidth,
		});
	}

	const densest = raw.reduce((max, b) => Math.max(max, b.perLog), 0);
	if (!(densest > 0)) {
		return [];
	}
	return raw.map(b => ({
		minIncome: b.minIncome,
		maxIncome: b.maxIncome,
		returns: b.returns,
		intensity: b.perLog / densest,
	}));
}

/** The income band holding the most filers per log unit, for labelling. */
export function densestBand(bands: readonly DensityBand[]): DensityBand | null {
	if (bands.length === 0) {
		return null;
	}
	return bands.reduce((best, b) => (b.intensity > best.intensity ? b : best));
}

/** Share of all filers at or below `income`, as a fraction of Table 1.1 returns. */
export function shareAtOrBelow(income: number, brackets: readonly FilerBracket[] = FILER_BRACKETS): number {
	if (!(income > 0)) {
		return 0;
	}
	let counted = NO_AGI_RETURNS;
	for (const bracket of brackets) {
		const bracketMax = bracket.maxIncome;
		if (bracketMax !== null && bracketMax <= income) {
			counted += bracket.returns;
			continue;
		}
		if (bracket.minIncome >= income) {
			continue;
		}
		// Partially covered: prorate within the bracket on a log scale, to
		// match how the band is drawn.
		const top = bracketMax ?? Math.max(income, bracket.minIncome * 10);
		const full = Math.log(top / Math.max(bracket.minIncome, 1));
		const part = Math.log(income / Math.max(bracket.minIncome, 1));
		if (full > 0 && part > 0) {
			counted += bracket.returns * Math.min(1, part / full);
		}
	}
	return Math.min(1, counted / TABLE_11_TOTAL_RETURNS);
}

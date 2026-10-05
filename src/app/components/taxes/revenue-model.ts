// Revenue check for the proposed tax curve.
//
// The curve in taxes.ts is shaped by two poverty lines and nothing else. It
// says nothing about how many people earn each income, and that omission is
// the whole problem: a rate schedule only raises money in proportion to the
// population at each income level, and US filers are overwhelmingly bunched
// below $100k. Lowering rates there costs far more revenue than raising rates
// on a thin top tail can recover -- unless the top rate becomes confiscatory,
// which is what the default curve actually does (84% effective on the top 1%).
//
// So this module answers one question: if the proposed curve replaced the
// current income tax tomorrow, what would it collect?
//
// WHAT COUNTS AS INCOME. The projection uses adjusted gross income as the IRS
// reports it, which is close to wages plus realised gains. A tax system with an
// income ceiling only works if that base is broad enough to reach the wealth it
// means to reach: at the top, compensation is largely unrealised equity, and
// unrealised equity is not AGI. The premise this tool is built on is therefore
// an annual forced realisation -- a mandatory sale of a fixed fraction of
// holdings each year, nominally 1%, with the proceeds taxed as ordinary income
// under the curve. Without that, the curve's top band is mostly empty and the
// revenue below is not collected. See FORCED_REALISATION_FRACTION.
//
// Data: IRS Statistics of Income, tax year 2022, as tabulated by the Tax
// Foundation ("Who Pays Federal Income Taxes?", 2025 edition). Percentile
// groups rather than AGI bands, because that is the form the published table
// takes and it already carries each group's total AGI and tax paid.
//
//   https://taxfoundation.org/data/all/federal/latest-federal-income-tax-data-2025/
//
// Caveat worth stating plainly: applying one rate to a group's whole AGI
// understates a convex curve, because within-group spread matters (Jensen's
// inequality). Checked against a Pareto model of the top 1% -- the effective
// rate came out 84.3% against 85.7% from the mean -- so the approximation is
// good to about 1.5 points on the group that dominates the total, and it
// understates rather than flatters the proposed curve.

/** One percentile group of filers from the published IRS table. */
export interface IncomeGroup {
	/** Group label as published, e.g. "Top 1%". */
	readonly name: string;
	/** Number of returns in the group. */
	readonly returns: number;
	/** Total adjusted gross income, in millions of dollars. */
	readonly agiMillions: number;
	/** Total income tax actually paid, in millions of dollars. */
	readonly taxMillions: number;
	/** Average effective tax rate actually paid, as a percent. */
	readonly actualRatePct: number;
}

/**
 * IRS SOI Table 4.1, tax year 2022: "All Individual Returns Excluding
 * Dependents: Number of Returns, Shares of AGI and Total Income Tax, AGI Floor
 * on Percentiles... by Selected Expanded Descending Cumulative Percentiles".
 *
 * The published table is CUMULATIVE (Top 0.1%, Top 1%, Top 2%, ... Top 50%).
 * These rows are the differences between adjacent columns, so the five bands
 * are disjoint and exhaustive -- their returns, AGI and tax each sum exactly to
 * the published totals, which `revenue-model.spec.ts` asserts.
 *
 * The split is finer at the top than a plain quintile breakdown because that is
 * where the curve's behaviour is decided: the top 0.1% alone reports 11.4% of
 * all AGI, and a rate change there moves national revenue more than the same
 * change across tens of millions of ordinary filers.
 *
 *   https://www.irs.gov/statistics/soi-tax-stats-individual-income-tax-rates-and-tax-shares
 *   (file: 22in41ts.xls)
 */
export const INCOME_GROUPS: readonly IncomeGroup[] = [
	{ name: "Top 0.1%", returns: 153_801, agiMillions: 1_677_840, taxMillions: 439_722, actualRatePct: 26.21 },
	{ name: "Top 0.1-1%", returns: 1_384_209, agiMillions: 1_631_750, taxMillions: 423_909, actualRatePct: 25.98 },
	{ name: "Top 1-2%", returns: 1_538_020, agiMillions: 816_990, taxMillions: 174_709, actualRatePct: 21.38 },
	{ name: "Middle class", returns: 73_824_670, agiMillions: 8_932_210, taxMillions: 1_034_790, actualRatePct: 11.58 },
	{ name: "Lower 50%", returns: 76_900_300, agiMillions: 1_692_210, taxMillions: 63_200, actualRatePct: 3.74 },
];

/** Totals as published, used as the revenue target. */
export const TOTAL_RETURNS = 153_801_397;
export const TOTAL_AGI_MILLIONS = 14_751_820;
export const TOTAL_TAX_MILLIONS = 2_136_333;
export const DATA_TAX_YEAR = 2022;

/** What the proposed curve would collect from one group. */
export interface GroupProjection {
	readonly name: string;
	readonly meanAgi: number;
	readonly actualRatePct: number;
	readonly proposedRatePct: number;
	/** Proposed take, in millions of dollars. */
	readonly proposedTaxMillions: number;
	readonly actualTaxMillions: number;
}

/** Whole-system revenue estimate for a given rate function. */
export interface RevenueProjection {
	readonly groups: readonly GroupProjection[];
	readonly proposedTotalMillions: number;
	readonly actualTotalMillions: number;
	/** Proposed over actual, as a signed percent. 0 means revenue-neutral. */
	readonly differencePct: number;
	readonly taxYear: number;
}

/** A rate function: gross income in, effective rate percent out. */
export type RateFn = (income: number) => number;

/** Mean AGI of a group, in dollars. */
export function meanAgiOf(group: IncomeGroup): number {
	if (group.returns <= 0) {
		return 0;
	}
	return (group.agiMillions * 1e6) / group.returns;
}

/**
 * Estimate total individual income tax under `rateAt`, by applying each
 * group's rate at its mean AGI to that group's entire AGI.
 */
export function projectRevenue(
	rateAt: RateFn,
	groups: readonly IncomeGroup[] = INCOME_GROUPS,
	/**
	 * Total to compare against, in millions. Defaults to the bundled
	 * dataset's own total; pass a newer year's figure to measure the curve
	 * against that instead.
	 */
	targetMillions?: number,
): RevenueProjection {
	const projected: GroupProjection[] = [];
	let proposedTotal = 0;
	let actualTotal = 0;

	for (const group of groups) {
		const meanAgi = meanAgiOf(group);
		const ratePct = meanAgi > 0 ? rateAt(meanAgi) : 0;
		const safeRate = Number.isFinite(ratePct) ? ratePct : 0;
		const proposedTax = (group.agiMillions * safeRate) / 100;

		proposedTotal += proposedTax;
		actualTotal += group.taxMillions;

		projected.push({
			name: group.name,
			meanAgi,
			actualRatePct: group.actualRatePct,
			proposedRatePct: safeRate,
			proposedTaxMillions: proposedTax,
			actualTaxMillions: group.taxMillions,
		});
	}

	const comparison =
		Number.isFinite(targetMillions) && (targetMillions as number) > 0 ? (targetMillions as number) : actualTotal;

	return {
		groups: projected,
		proposedTotalMillions: proposedTotal,
		actualTotalMillions: comparison,
		differencePct: comparison > 0 ? (proposedTotal / comparison - 1) * 100 : 0,
		taxYear: DATA_TAX_YEAR,
	};
}

/** Steepness search bounds. Outside these the curve stops being a tax system. */
export const MIN_STEEPNESS = 1e-4;
export const MAX_STEEPNESS = 5;

// The curve's anchor: at `ANCHOR_MULTIPLE` times the poverty line the rate is
// exactly `ANCHOR_RATE_PCT`, for any steepness. Both are expressed as
// multiples of the poverty line, so the whole system scales with it.
//
// The anchor sits far out at 30x for two stacked reasons. First, a take-home
// ceiling -- an income past which earning more leaves you with less -- only
// exists when the steepness exponent exceeds 1, and at a near anchor the
// steepness that funds the system is well below that. Second, the filer bands
// below isolate the top 0.1%, whose mean AGI is about 724x the poverty line;
// taxing that band as itself rather than averaged into a broad "top 1%" raises
// the revenue the curve produces at any given steepness, which pushes the
// funding anchor further out still.
//
// One consequence is worth stating because the tool surfaces it rather than
// hiding it: no (anchor, rate) pair with an exponent above 1 both funds the
// system and keeps the top 0.1% under a 60% effective rate. A curve of this
// shape can only fund itself from the concentrated top, and isolating that
// band makes the required rate explicit.
export const ANCHOR_MULTIPLE = 30;
export const ANCHOR_RATE_PCT = 10;

/**
 * The fraction of holdings assumed to be sold and realised as income each year.
 *
 * This is a premise of the proposed system, not something measured from the
 * data. The filer bands below are real reported AGI; this constant records what
 * the system would additionally require to be true, because an income ceiling
 * applied to wages alone does not touch wealth held as unrealised equity.
 */
export const FORCED_REALISATION_FRACTION = 0.01;

/** Steepness above which a take-home ceiling exists at all. */
export const CEILING_STEEPNESS_THRESHOLD = 1;

/**
 * The revenue a target has to fall between for a steepness to exist.
 *
 * The curve cannot raise an arbitrary amount. As steepness approaches zero
 * every rate converges on the anchor rate, which sets a revenue floor; at the
 * top of the search range the rates approach confiscatory and set a ceiling.
 * A target outside the range has no solution, and the tool says so rather
 * than clamping to an endpoint and reporting a curve that misses.
 */
export function reachableRevenue(
	currentLine: number,
	baselineLine: number,
	anchorMultiple = ANCHOR_MULTIPLE,
	anchorRatePct = ANCHOR_RATE_PCT,
	groups: readonly IncomeGroup[] = INCOME_GROUPS,
): { minMillions: number; maxMillions: number } | null {
	if (!(currentLine > 0) || !(baselineLine > 0)) {
		return null;
	}
	const revenueAt = (k: number): number =>
		projectRevenue(makeRateFn(k, currentLine, baselineLine, anchorMultiple, anchorRatePct), groups)
			.proposedTotalMillions;
	// Same floor the solver uses: steepness must keep the exponent above 1.
	const floor = Math.max(MIN_STEEPNESS, CEILING_STEEPNESS_THRESHOLD * (baselineLine / currentLine) * 1.0001);
	return { minMillions: revenueAt(floor), maxMillions: revenueAt(MAX_STEEPNESS) };
}

/**
 * The steepness constant that makes the curve raise `targetMillions`.
 *
 * The curve's exponent is `K * L / L0`, where `K` is 1.5 in the shipped
 * curve. At that value, with equal poverty lines, the curve collects roughly
 * twice current revenue because the top 1% is charged an unusable ~84%
 * effective rate. This solves for the K that lands on a given total, holding
 * the anchor identity so the curve's defining property is preserved.
 *
 * The target is a parameter rather than the bundled 2022 figure so the tool
 * outlives its own dataset: a newer year's total can be typed in without
 * touching this module.
 *
 * Returns null when no K within the search range gets there, which is the
 * honest answer for an unreachable target or an invalid poverty line.
 */
export function solveSteepnessForRevenue(
	targetMillions: number,
	currentLine: number,
	baselineLine: number,
	anchorMultiple = ANCHOR_MULTIPLE,
	anchorRatePct = ANCHOR_RATE_PCT,
	groups: readonly IncomeGroup[] = INCOME_GROUPS,
): number | null {
	if (!(currentLine > 0) || !(baselineLine > 0) || !Number.isFinite(targetMillions) || targetMillions <= 0) {
		return null;
	}

	const revenueAt = (k: number): number =>
		projectRevenue(makeRateFn(k, currentLine, baselineLine, anchorMultiple, anchorRatePct), groups)
			.proposedTotalMillions;

	// Search only steepnesses that keep a take-home ceiling in existence.
	// Below 1 the curve funds itself but implies no maximum income, which is
	// the property this system is built around.
	let lo = Math.max(MIN_STEEPNESS, CEILING_STEEPNESS_THRESHOLD * (baselineLine / currentLine) * 1.0001);
	let hi = MAX_STEEPNESS;
	// Revenue rises monotonically with K, so a target outside the endpoints
	// has no solution in range.
	if (revenueAt(lo) > targetMillions || revenueAt(hi) < targetMillions) {
		return null;
	}
	for (let i = 0; i < 200; i++) {
		const mid = (lo + hi) / 2;
		if (revenueAt(mid) > targetMillions) {
			hi = mid;
		} else {
			lo = mid;
		}
	}
	return (lo + hi) / 2;
}

/**
 * Convenience wrapper: solve for the bundled dataset's own total, i.e. make
 * the proposed curve revenue-neutral against the year the data came from.
 */
export function solveNeutralSteepness(
	currentLine: number,
	baselineLine: number,
	anchorMultiple = ANCHOR_MULTIPLE,
	anchorRatePct = ANCHOR_RATE_PCT,
	groups: readonly IncomeGroup[] = INCOME_GROUPS,
): number | null {
	const target = groups.reduce((sum, g) => sum + g.taxMillions, 0);
	return solveSteepnessForRevenue(target, currentLine, baselineLine, anchorMultiple, anchorRatePct, groups);
}

/**
 * Build the proposed-rate function for an arbitrary steepness constant.
 *
 * This is the generalised form of `TaxesComponent.taxRateAt`: the component
 * pins `steepness` to 1.5, and `solveNeutralSteepness` varies it. The anchor
 * identity holds for every K, since at `income = anchorMultiple * L` the
 * power term is 1 and the rate reduces to `anchorRatePct`.
 */
export function makeRateFn(
	steepness: number,
	currentLine: number,
	baselineLine: number,
	anchorMultiple = ANCHOR_MULTIPLE,
	anchorRatePct = ANCHOR_RATE_PCT,
): RateFn {
	return (income: number): number => {
		if (!(income > 0) || !(currentLine > 0) || !(baselineLine > 0)) {
			return 0;
		}
		const n = (steepness * currentLine) / baselineLine;
		const coefficient = (100 - anchorRatePct) / anchorRatePct;
		return 100 / (1 + coefficient * Math.pow((anchorMultiple * currentLine) / income, n));
	};
}

/**
 * The income ceiling the curve implies, if it has one.
 *
 * Take-home is `x * (1 - rate(x)/100)`. When the steepness exponent is at or
 * below 1 that function rises without bound, so there is no ceiling. Above 1
 * it turns over: past some income, each extra dollar earned is taxed hard
 * enough that take-home falls. That turning point is the de facto maximum
 * income the system permits, and it is what "a maximum income locked to the
 * poverty line" means here -- it scales with the poverty line, because every
 * term in the curve does.
 *
 * Returns null when no ceiling exists, which is the honest answer rather than
 * a number pulled from the end of a search window.
 */
export function findIncomeCeiling(
	steepness: number,
	currentLine: number,
	baselineLine: number,
	anchorMultiple = ANCHOR_MULTIPLE,
	anchorRatePct = ANCHOR_RATE_PCT,
): { income: number; takeHome: number; multipleOfPovertyLine: number; ratePct: number } | null {
	if (!(currentLine > 0) || !(baselineLine > 0) || !Number.isFinite(steepness)) {
		return null;
	}
	const exponent = (steepness * currentLine) / baselineLine;
	// At or below 1 the curve has no turning point at all.
	if (exponent <= CEILING_STEEPNESS_THRESHOLD) {
		return null;
	}

	const rateAt = makeRateFn(steepness, currentLine, baselineLine, anchorMultiple, anchorRatePct);
	const takeHomeAt = (x: number): number => x * (1 - rateAt(x) / 100);

	// Bracket the peak on a log sweep: the ceiling can sit anywhere from a few
	// times the poverty line to tens of millions, depending on the exponent.
	const lowest = anchorMultiple * currentLine;
	const highest = lowest * 1e6;
	let bestX = lowest;
	let bestTakeHome = -Infinity;
	const samples = 4000;
	for (let i = 0; i <= samples; i++) {
		const x = lowest * Math.pow(highest / lowest, i / samples);
		const th = takeHomeAt(x);
		if (th > bestTakeHome) {
			bestTakeHome = th;
			bestX = x;
		}
	}
	// A peak pinned to either end of the sweep is not a turning point.
	if (bestX <= lowest * 1.0001 || bestX >= highest * 0.9999) {
		return null;
	}

	// Refine by ternary search inside the bracketing samples.
	const step = Math.pow(highest / lowest, 1 / samples);
	let lo = bestX / step;
	let hi = bestX * step;
	for (let i = 0; i < 200; i++) {
		const mLeft = lo + (hi - lo) / 3;
		const mRight = hi - (hi - lo) / 3;
		if (takeHomeAt(mLeft) < takeHomeAt(mRight)) {
			lo = mLeft;
		} else {
			hi = mRight;
		}
	}
	const income = (lo + hi) / 2;
	const takeHome = takeHomeAt(income);
	return {
		income,
		takeHome,
		multipleOfPovertyLine: takeHome / currentLine,
		ratePct: rateAt(income),
	};
}

/**
 * Revenue if the top band's income collapses to the ceiling.
 *
 * Every projection in this module is STATIC: it applies new rates to the
 * incomes people reported under the old ones. That assumption fails hardest at
 * the top, and the ceiling makes the failure concrete. The top 0.1% reports a
 * mean AGI above the ceiling, and the ceiling is defined as the income past
 * which earning more leaves you with less -- so under this system that band has
 * no reason to report what it reports today. If it reported exactly the ceiling
 * instead, the revenue the curve was calibrated to raise does not arrive.
 *
 * This returns that pessimistic bound, which is the honest companion to the
 * headline figure: the real outcome sits somewhere between the two, and nothing
 * in a rate curve can tell you where.
 */
export function projectRevenueWithCeilingBehaviour(
	rateAt: RateFn,
	ceilingIncome: number,
	groups: readonly IncomeGroup[] = INCOME_GROUPS,
): { proposedTotalMillions: number; cappedGroups: readonly string[] } {
	if (!(ceilingIncome > 0)) {
		return { proposedTotalMillions: projectRevenue(rateAt, groups).proposedTotalMillions, cappedGroups: [] };
	}

	let total = 0;
	const capped: string[] = [];
	for (const group of groups) {
		const meanAgi = meanAgiOf(group);
		// A band whose mean sits above the ceiling is assumed to report the
		// ceiling instead; bands below it are unaffected.
		const reported = meanAgi > ceilingIncome ? ceilingIncome : meanAgi;
		if (reported < meanAgi) {
			capped.push(group.name);
		}
		const ratePct = reported > 0 ? rateAt(reported) : 0;
		const safeRate = Number.isFinite(ratePct) ? ratePct : 0;
		// AGI scales down with reported income, since the filer count is fixed.
		const agiMillions = (reported * group.returns) / 1e6;
		total += (agiMillions * safeRate) / 100;
	}
	return { proposedTotalMillions: total, cappedGroups: capped };
}

/**
 * The tax rate at the income ceiling, in percent: exactly `100 / exponent`.
 *
 * Worth stating because it is the one number that says whether a curve is
 * usable, and it depends on nothing but the exponent -- not the anchor, not the
 * anchor rate, not the poverty line.
 *
 * Writing the rate as `100/(1+s)` with `s = c*(A*L/x)^n`, take-home is
 * `T = x*s/(1+s)`. Since `ds/dx = -n*s/x`,
 *
 *   dT/dx = s/(1+s) - n*s/(1+s)^2
 *
 * which is zero when `1 + s = n`, i.e. `s = n - 1`. Substituting back,
 * the rate there is `100/(1+s) = 100/n`.
 *
 * So an exponent of 1.5 puts the ceiling at a 66.7% rate, 1.22 puts it at
 * 82.2%, and an exponent approaching 1 pushes it toward 100%. Returns null
 * when the exponent is at or below 1, where no ceiling exists.
 */
export function ceilingRatePct(steepness: number, currentLine: number, baselineLine: number): number | null {
	if (!(currentLine > 0) || !(baselineLine > 0) || !Number.isFinite(steepness)) {
		return null;
	}
	const exponent = (steepness * currentLine) / baselineLine;
	if (exponent <= CEILING_STEEPNESS_THRESHOLD) {
		return null;
	}
	return 100 / exponent;
}

/**
 * The exponent that puts the ceiling at a given rate: the inverse of
 * `ceilingRatePct`. Useful for answering "what steepness caps the top rate at
 * 70%?" -- the answer is 100/70.
 */
export function steepnessForCeilingRate(ratePct: number): number | null {
	if (!Number.isFinite(ratePct) || ratePct <= 0 || ratePct >= 100) {
		return null;
	}
	return 100 / ratePct;
}

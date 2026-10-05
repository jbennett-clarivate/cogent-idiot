// Numeric guards shared by the tools that do arithmetic on user input.
//
// Two problems recur across these components and both produce a wrong number
// on screen rather than an error:
//
//   1. A value computed by a search or a slider leaves the range its consumer
//      assumes. The taxes peak-finder widened its bracket to `bestX + span`
//      with no upper bound and reported an income past the end of the chart.
//   2. A number arrives from an `[(ngModel)]` text input, so it can be "",
//      NaN, Infinity, or negative, and flows straight into `Math.pow`, which
//      returns NaN and renders as "NaN" through the number pipe.
//
// `THREE.MathUtils.clamp` already covers (1) but only inside the ice
// component; it is not worth pulling three.js into a 2D canvas tool.

/**
 * Constrain `value` to the inclusive range [`min`, `max`].
 *
 * Returns `min` when `value` is NaN, so a clamp can never pass NaN through to
 * a consumer that trusted its bounds. Bounds given the wrong way round are
 * swapped rather than producing an empty range.
 */
export function clamp(value: number, min: number, max: number): number {
	const lo = Math.min(min, max);
	const hi = Math.max(min, max);
	if (Number.isNaN(value)) {
		return lo;
	}
	return Math.min(hi, Math.max(lo, value));
}

/**
 * True when `value` is a real, finite number: not NaN, not ±Infinity, and not
 * a non-numeric type that slipped through an `any`.
 */
export function isRealNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

/**
 * True when `value` is a finite number strictly greater than zero.
 *
 * This is the precondition for the poverty lines in the taxes tool: they are
 * divisors and the base of a `Math.pow`, so zero and negatives are not merely
 * unrealistic, they produce NaN.
 */
export function isPositiveNumber(value: unknown): value is number {
	return isRealNumber(value) && value > 0;
}

/**
 * Coerce an `[(ngModel)]` value to a finite number, falling back to
 * `fallback` when it is empty, non-numeric, NaN or infinite.
 *
 * A text input bound with `numberValidator` still hands the component a
 * string, and an emptied field hands it "".
 */
export function toFiniteNumber(value: unknown, fallback: number): number {
	if (isRealNumber(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return fallback;
}

import { clamp, isRealNumber, isPositiveNumber, toFiniteNumber } from "./number-utils";

// These pin the contract stated in number-utils.ts. The module exists because
// two classes of bug were found in /tools/taxes (see taxes.spec.ts): a search
// bracket that left its own domain, and NaN reaching the template from a
// poverty-line input. Each helper's job is to make one of those unreachable,
// so the degenerate inputs below are the point of the module, not edge cases.

describe("clamp", () => {
	it("passes a value already inside the range through unchanged", () => {
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(0, 0, 10)).toBe(0);
		expect(clamp(10, 0, 10)).toBe(10);
	});

	it("constrains a value outside the range to the nearer bound", () => {
		expect(clamp(-1, 0, 10)).toBe(0);
		expect(clamp(11, 0, 10)).toBe(10);
	});

	it("never passes NaN through to a consumer that trusted its bounds", () => {
		expect(clamp(NaN, 2, 8)).toBe(2);
	});

	it("constrains infinities to the bounds", () => {
		expect(clamp(Infinity, 0, 10)).toBe(10);
		expect(clamp(-Infinity, 0, 10)).toBe(0);
	});

	it("swaps bounds given the wrong way round rather than emptying the range", () => {
		expect(clamp(5, 10, 0)).toBe(5);
		expect(clamp(-3, 10, 0)).toBe(0);
		expect(clamp(99, 10, 0)).toBe(10);
	});

	it("handles a single-point range", () => {
		expect(clamp(5, 3, 3)).toBe(3);
	});
});

describe("isRealNumber", () => {
	it("accepts finite numbers, including zero and negatives", () => {
		expect(isRealNumber(0)).toBe(true);
		expect(isRealNumber(-15060)).toBe(true);
		expect(isRealNumber(1.5)).toBe(true);
	});

	it("rejects NaN and the infinities", () => {
		expect(isRealNumber(NaN)).toBe(false);
		expect(isRealNumber(Infinity)).toBe(false);
		expect(isRealNumber(-Infinity)).toBe(false);
	});

	it("rejects non-numeric values that slipped through an any", () => {
		expect(isRealNumber("5")).toBe(false);
		expect(isRealNumber(null)).toBe(false);
		expect(isRealNumber(undefined)).toBe(false);
		expect(isRealNumber({})).toBe(false);
	});
});

describe("isPositiveNumber", () => {
	it("accepts finite values above zero", () => {
		expect(isPositiveNumber(15060)).toBe(true);
		expect(isPositiveNumber(0.0001)).toBe(true);
	});

	it("rejects zero and negatives, which are the NaN-producing divisors", () => {
		expect(isPositiveNumber(0)).toBe(false);
		expect(isPositiveNumber(-1)).toBe(false);
	});

	it("rejects NaN, infinities and non-numbers", () => {
		expect(isPositiveNumber(NaN)).toBe(false);
		expect(isPositiveNumber(Infinity)).toBe(false);
		expect(isPositiveNumber("15060")).toBe(false);
		expect(isPositiveNumber(null)).toBe(false);
	});
});

describe("toFiniteNumber", () => {
	it("returns a finite number as given", () => {
		expect(toFiniteNumber(42, 0)).toBe(42);
		expect(toFiniteNumber(-7.5, 0)).toBe(-7.5);
	});

	it("parses a numeric string, which is what an ngModel text input supplies", () => {
		expect(toFiniteNumber("15060", 0)).toBe(15060);
		expect(toFiniteNumber(" 200 ", 0)).toBe(200);
	});

	it("falls back when the field was emptied", () => {
		expect(toFiniteNumber("", 15060)).toBe(15060);
		expect(toFiniteNumber("   ", 15060)).toBe(15060);
		expect(toFiniteNumber(null, 15060)).toBe(15060);
		expect(toFiniteNumber(undefined, 15060)).toBe(15060);
	});

	it("falls back on non-numeric and non-finite input", () => {
		expect(toFiniteNumber("abc", 15060)).toBe(15060);
		expect(toFiniteNumber(NaN, 15060)).toBe(15060);
		expect(toFiniteNumber(Infinity, 15060)).toBe(15060);
	});
});

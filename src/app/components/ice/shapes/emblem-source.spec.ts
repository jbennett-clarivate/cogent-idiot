import { buildIceEmblem } from "./index";
import { RODS, SPHERES } from "./emblem-source";
import { SCALE } from "./shape-utils";

// The 3D model and the flat reference drawings under src/assets/images/ used
// to carry independently hand-copied coordinates, and drifted far enough
// apart that they described different objects (one lower spike sat 280 units
// too low, another kept a pre-rounding vertex 431 units out of place). Both
// now derive from emblem-source.ts; this asserts the built mesh still spans
// exactly what that source describes, so a future edit to one side cannot
// quietly diverge from the other.
describe("ice emblem source reconciliation", () => {
	function sourceBounds(): { width: number; height: number } {
		let x0 = Infinity;
		let x1 = -Infinity;
		let y0 = Infinity;
		let y1 = -Infinity;
		for (const rod of RODS) {
			for (const [x, y] of rod.polygon) {
				x0 = Math.min(x0, x);
				x1 = Math.max(x1, x);
				y0 = Math.min(y0, y);
				y1 = Math.max(y1, y);
			}
		}
		for (const s of SPHERES) {
			x0 = Math.min(x0, s.x - s.r);
			x1 = Math.max(x1, s.x + s.r);
			y0 = Math.min(y0, s.y - s.r);
			y1 = Math.max(y1, s.y + s.r);
		}
		return { width: x1 - x0, height: y1 - y0 };
	}

	it("builds a mesh spanning the source polygons' own bounds", () => {
		const geometry = buildIceEmblem();
		geometry.computeBoundingBox();
		const box = geometry.boundingBox!;
		const expected = sourceBounds();

		// buildIceEmblem() centres the mesh, so compare extents, not positions.
		const width = (box.max.x - box.min.x) / SCALE;
		const height = (box.max.y - box.min.y) / SCALE;

		expect(width).toBeCloseTo(expected.width, 0);
		expect(height).toBeCloseTo(expected.height, 0);
	});

	// A spine that starts or ends outside its own envelope puts that rod's cap
	// in open space, detached from the body it is meant to close - which is
	// how one spike came to begin 339 units beyond its own outline.
	it("keeps every rod's centerline inside its own envelope", () => {
		for (const rod of RODS) {
			for (const point of rod.centerline) {
				const contained =
					pointInPolygon(point, rod.polygon) ||
					// A rod tip legitimately lands exactly on an envelope vertex,
					// where a strict inside/outside test can fall either way.
					distanceToBoundary(point, rod.polygon) < 1;
				expect(contained)
					.withContext(`${rod.name} centerline point ${JSON.stringify(point)}`)
					.toBe(true);
			}
		}
	});
});

function pointInPolygon([px, py]: number[], polygon: number[][]): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];
		const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
}

function distanceToBoundary(point: number[], polygon: number[][]): number {
	let best = Infinity;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		best = Math.min(best, pointSegmentDistance(point, polygon[j], polygon[i]));
	}
	return best;
}

function pointSegmentDistance([px, py]: number[], a: number[], b: number[]): number {
	const abx = b[0] - a[0];
	const aby = b[1] - a[1];
	const len2 = abx * abx + aby * aby || 1;
	let t = ((px - a[0]) * abx + (py - a[1]) * aby) / len2;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(px - (a[0] + t * abx), py - (a[1] + t * aby));
}

import * as THREE from "three";

/**
 * Shared parametric geometry helpers for the ice emblem (Milestone 2).
 *
 * The filled shapes in src/assets/images/3d-image.svg are treated as strict
 * front-projection ENVELOPES. Each object authors:
 *   - its exact filled polygon (raw SVG units), and
 *   - a medial centreline through that polygon (raw SVG units).
 *
 * Every circular cross-section's radius is then derived automatically as the
 * local half-width of the polygon, measured perpendicular to the centreline.
 *
 * Why this enforces the two hard requirements:
 *   1. Path constraint - the sweep follows the authored medial centreline
 *      ("centre of gravity" line) of the shape.
 *   2. Thickness constraint - a planar tube swept with an in-plane normal N and
 *      an out-of-plane binormal B = +Z projects, when viewed along Z, to a
 *      ribbon of width 2r about the centreline. Setting r to the polygon
 *      half-width therefore makes the projected geometry exactly fill - and
 *      never exceed - the filled SVG area, hemispherical caps included.
 */

/** SVG viewBox centre X (bilateral symmetry axis). */
export const CX = 10777;
/** SVG viewBox reference Y (vertical centring). */
export const CY = 15287;
/** ViewBox-units to world-units scale factor. */
export const SCALE = 0.00024;

/** Converts raw SVG coordinates to a world-space point on the z = 0 plane. */
export const toWorld3 = (x: number, y: number): THREE.Vector3 =>
	new THREE.Vector3((x - CX) * SCALE, -(y - CY) * SCALE, 0);

/** Converts a raw SVG radius/length to world units. */
export const rawRadius = (radius: number): number => radius * SCALE;

/** Mirrors a raw x-coordinate across the bilateral symmetry axis. */
export const mirrorX = (x: number): number => 2 * CX - x;

/** Mirrors an [x, y] point list across the symmetry axis (order preserved). */
export const mirrorPoints = (points: number[][]): number[][] =>
	points.map(([x, y]) => [mirrorX(x), y]);

export type CapKind = "apex" | "dome";

export interface EnvelopeSweptOptions {
	/** Exact filled polygon in raw SVG units (the containment envelope). */
	polygon: number[][];
	/** Medial centreline through the polygon in raw SVG units (>= 2 points). */
	centerline: number[][];
	/** Terminal treatment at the first centreline point. */
	startCap?: CapKind;
	/** Terminal treatment at the last centreline point. */
	endCap?: CapKind;
	/** Rings sampled along the centreline. */
	tubularSegments?: number;
	/** Vertices around each ring. */
	radialSegments?: number;
	/** Latitude rings per hemispherical dome cap. */
	capSegments?: number;
	/**
	 * Fraction of the measured half-width actually used as the radius. A value
	 * slightly below 1 keeps the skin just inside the boundary, avoiding
	 * z-fighting between neighbouring objects that share an SVG edge.
	 */
	fill?: number;
	/** Optional hard ceiling on radius (raw SVG units). */
	maxRadius?: number;
	/** Emit a containment report to the console (development aid). */
	validate?: boolean;
	/** Object name for validation messages. */
	name?: string;
}

/**
 * Finds the largest hemisphere radius whose projected half-disc footprint stays
 * inside the polygon. The dome extends `direction * tangent` forward and spans
 * +/- radius along the in-plane normal, so we sample that half-disc and shrink
 * until every sample is contained (or the initial radius already fits).
 */
function fitDomeRadius(
	s: { x: number; y: number; nx: number; ny: number },
	direction: -1 | 1,
	polygon: number[][],
	maxR: number,
): number {
	if (maxR <= 0) return 0;
	// Tangent (SVG) recovered from the in-plane normal (N rotated -90).
	const tx = s.ny * direction;
	const ty = -s.nx * direction;

	const fits = (r: number): boolean => {
		const lat = 4;
		const lon = 8;
		for (let a = 0; a <= lat; a++) {
			const phi = (a / lat) * (Math.PI / 2);
			const axial = r * Math.sin(phi);
			const ringR = r * Math.cos(phi);
			const cx = s.x + tx * axial;
			const cy = s.y + ty * axial;
			for (let b = 0; b < lon; b++) {
				// Only the in-plane (front-projected) extent matters for width.
				const sign = b < lon / 2 ? 1 : -1;
				const px = cx + s.nx * ringR * sign;
				const py = cy + s.ny * ringR * sign;
				if (!pointInPolygon(px, py, polygon)) return false;
			}
		}
		return true;
	};

	if (fits(maxR)) return maxR;
	let lo = 0;
	let hi = maxR;
	for (let iter = 0; iter < 24; iter++) {
		const mid = (lo + hi) / 2;
		if (fits(mid)) lo = mid;
		else hi = mid;
	}
	return lo;
}

/** Even-odd point-in-polygon test (raw SVG units). */
function pointInPolygon(px: number, py: number, polygon: number[][]): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];
		const intersects =
			yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
}

/**
 * Distance from ray origin O (heading in unit direction D) to the nearest
 * polygon edge intersection, or Infinity when the ray escapes the polygon.
 */
function rayToBoundary(
	ox: number,
	oy: number,
	dx: number,
	dy: number,
	polygon: number[][],
): number {
	let best = Infinity;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const ax = polygon[j][0];
		const ay = polygon[j][1];
		const bx = polygon[i][0];
		const by = polygon[i][1];
		const ex = bx - ax;
		const ey = by - ay;
		const denom = dx * ey - dy * ex;
		if (Math.abs(denom) < 1e-9) continue; // parallel
		const s = ((ax - ox) * ey - (ay - oy) * ex) / denom; // along ray
		const u = ((ax - ox) * dy - (ay - oy) * dx) / denom; // along edge
		if (s > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 && s < best) best = s;
	}
	return best;
}

/**
 * Builds a single watertight shell by sweeping a circular cross-section along a
 * planar medial centreline, with the radius clamped to the polygon envelope.
 *
 * The frame is fixed and planar: tangent T lies in the SVG plane, the in-plane
 * normal N is T rotated 90 degrees, and the binormal B is +Z (out of plane).
 * This guarantees the projection property described in the file header and
 * avoids Frenet-frame flips. Apex ends collapse to a point; dome ends continue
 * seamlessly from the boundary ring as a true hemisphere. No interior caps or
 * partition faces are produced.
 */
export function buildEnvelopeSweep(options: EnvelopeSweptOptions): THREE.BufferGeometry {
	const {
		polygon,
		centerline,
		startCap = "apex",
		endCap = "apex",
		tubularSegments = 48,
		radialSegments = 24,
		capSegments = 9,
		fill = 1,
		maxRadius = Infinity,
		validate = false,
		name = "shape",
	} = options;

	if (centerline.length < 2) throw new Error(`[ice] ${name}: centreline needs >= 2 points.`);

	// Sample centreline positions and tangents in SVG space.
	const spine = new THREE.CatmullRomCurve3(
		centerline.map(([x, y]) => new THREE.Vector3(x, y, 0)),
		false,
		"centripetal",
	);

	interface Station {
		x: number;
		y: number;
		nx: number;
		ny: number; // in-plane unit normal
		r: number; // radius (SVG units)
	}

	const stations: Station[] = [];
	for (let i = 0; i <= tubularSegments; i++) {
		const t = i / tubularSegments;
		const p = spine.getPointAt(t);
		const tan = spine.getTangentAt(t);
		// In-plane normal = tangent rotated 90 degrees (SVG plane).
		let nx = -tan.y;
		let ny = tan.x;
		const nlen = Math.hypot(nx, ny) || 1;
		nx /= nlen;
		ny /= nlen;

		// Cast the perpendicular BOTH ways to find the two silhouette walls.
		// Re-centre the ring on the midpoint of those walls and span the full
		// boundary-to-boundary width. This makes the head-on projection fill the
		// SVG silhouette exactly even when the authored centreline is slightly
		// off the true medial axis, and keeps the tube inside the envelope.
		const dPlus = rayToBoundary(p.x, p.y, nx, ny, polygon);
		const dMinus = rayToBoundary(p.x, p.y, -nx, -ny, polygon);

		let cx = p.x;
		let cy = p.y;
		let r = 0;
		if (isFinite(dPlus) && isFinite(dMinus)) {
			// Midpoint between the two walls; radius = half the full span.
			cx = p.x + nx * (dPlus - dMinus) * 0.5;
			cy = p.y + ny * (dPlus - dMinus) * 0.5;
			r = (dPlus + dMinus) * 0.5;
		} else if (isFinite(dPlus)) {
			r = dPlus;
		} else if (isFinite(dMinus)) {
			r = dMinus;
		}
		r *= fill;
		if (r > maxRadius) r = maxRadius;

		stations.push({ x: cx, y: cy, nx, ny, r });
	}

	// Force pointed apices exactly to zero radius at capped ends.
	if (startCap === "apex") stations[0].r = 0;
	if (endCap === "apex") stations[stations.length - 1].r = 0;

	// Fit dome-capped ends so the whole projected half-disc stays contained.
	// A hemisphere's SVG-plane footprint spans r forward along the tangent and
	// +/- r sideways along the normal; sampling that region and binary-searching
	// keeps angular terminals from bulging past the envelope. The connected body
	// ring is clamped to the same radius so the join remains seamless.
	if (startCap === "dome") {
		stations[0].r = fitDomeRadius(stations[0], -1, polygon, stations[0].r);
	}
	if (endCap === "dome") {
		const last = stations.length - 1;
		stations[last].r = fitDomeRadius(stations[last], 1, polygon, stations[last].r);
	}

	const positions: number[] = [];
	const indices: number[] = [];
	const EPS = 1e-6;

	// SVG-space vertex -> world space (z is the out-of-plane component).
	const pushVertex = (sx: number, sy: number, sz: number): number => {
		positions.push((sx - CX) * SCALE, -(sy - CY) * SCALE, sz * SCALE);
		return positions.length / 3 - 1;
	};

	// A ring in the (N, +Z) plane about a station centre.
	const makeRing = (s: Station, radius: number, cx: number, cy: number): number[] => {
		const ring: number[] = [];
		for (let j = 0; j < radialSegments; j++) {
			const a = (j / radialSegments) * Math.PI * 2;
			const inPlane = Math.cos(a) * radius;
			const outPlane = Math.sin(a) * radius;
			ring.push(pushVertex(cx + inPlane * s.nx, cy + inPlane * s.ny, outPlane));
		}
		return ring;
	};

	const rings: Array<number[] | undefined> = new Array(stations.length);
	const apexes: Array<number | undefined> = new Array(stations.length);

	for (let i = 0; i < stations.length; i++) {
		const s = stations[i];
		if (s.r <= EPS) apexes[i] = pushVertex(s.x, s.y, 0);
		else rings[i] = makeRing(s, s.r, s.x, s.y);
	}

	const connectRings = (first: number[], second: number[]): void => {
		for (let j = 0; j < radialSegments; j++) {
			const k = (j + 1) % radialSegments;
			indices.push(first[j], second[j], first[k]);
			indices.push(second[j], second[k], first[k]);
		}
	};

	const connectApex = (apex: number, ring: number[], atStart: boolean): void => {
		for (let j = 0; j < radialSegments; j++) {
			const k = (j + 1) % radialSegments;
			if (atStart) indices.push(apex, ring[j], ring[k]);
			else indices.push(apex, ring[k], ring[j]);
		}
	};

	for (let i = 0; i < stations.length - 1; i++) {
		const a = rings[i];
		const b = rings[i + 1];
		if (a && b) connectRings(a, b);
		else if (apexes[i] !== undefined && b) connectApex(apexes[i]!, b, true);
		else if (a && apexes[i + 1] !== undefined) connectApex(apexes[i + 1]!, a, false);
	}

	// Seamless hemisphere grown from an end ring along +/- the tangent.
	const addDome = (index: number, direction: -1 | 1): void => {
		const boundary = rings[index];
		if (!boundary) return;
		const s = stations[index];
		// Tangent (SVG) recovered from the in-plane normal (N rotated -90).
		const tx = s.ny * direction;
		const ty = -s.nx * direction;
		let previous = boundary;

		for (let lat = 1; lat <= capSegments; lat++) {
			const phi = (lat / capSegments) * (Math.PI / 2);
			const axial = s.r * Math.sin(phi);
			const cx = s.x + tx * axial;
			const cy = s.y + ty * axial;

			if (lat === capSegments) {
				const pole = pushVertex(cx, cy, 0);
				connectApex(pole, previous, direction < 0);
				continue;
			}

			const ringRadius = s.r * Math.cos(phi);
			const ring = makeRing(s, ringRadius, cx, cy);
			if (direction > 0) connectRings(previous, ring);
			else connectRings(ring, previous);
			previous = ring;
		}
	};

	if (startCap === "dome") addDome(0, -1);
	if (endCap === "dome") addDome(stations.length - 1, 1);

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();

	if (validate) validateContainment(name, positions, polygon);
	return geometry;
}

/**
 * Development aid: verifies every generated vertex, projected back to the SVG
 * plane, lies inside the source polygon (with a small tolerance). Reports the
 * worst breach so path/thickness regressions are caught early.
 */
function validateContainment(name: string, positions: number[], polygon: number[][]): void {
	let breaches = 0;
	let worst = 0;
	for (let i = 0; i < positions.length; i += 3) {
		const sx = positions[i] / SCALE + CX;
		const sy = -positions[i + 1] / SCALE + CY;
		if (!pointInPolygon(sx, sy, polygon)) {
			breaches++;
			let dist = Infinity;
			for (let a = 0, b = polygon.length - 1; a < polygon.length; b = a++) {
				const d = pointSegmentDistance(sx, sy, polygon[b], polygon[a]);
				if (d < dist) dist = d;
			}
			if (dist > worst) worst = dist;
		}
	}
	const total = positions.length / 3;
	if (breaches === 0) {
		console.info(`[ice] ${name}: contained (${total} vertices inside envelope).`);
	} else {
		console.warn(
			`[ice] ${name}: ${breaches}/${total} vertices outside envelope; ` +
			`worst breach ${worst.toFixed(1)} SVG units.`,
		);
	}
}

function pointSegmentDistance(px: number, py: number, a: number[], b: number[]): number {
	const abx = b[0] - a[0];
	const aby = b[1] - a[1];
	const apx = px - a[0];
	const apy = py - a[1];
	const len2 = abx * abx + aby * aby || 1;
	let t = (apx * abx + apy * aby) / len2;
	t = Math.max(0, Math.min(1, t));
	const cx = a[0] + t * abx;
	const cy = a[1] + t * aby;
	return Math.hypot(px - cx, py - cy);
}

/**
 * Builds one complete decorative sphere from an SVG circle. These remain full,
 * single-shell spheres; hemispheres are only used for terminal caps elsewhere.
 */
export function buildSphere(x: number, y: number, radius: number): THREE.BufferGeometry {
	const sphere = new THREE.SphereGeometry(rawRadius(radius), 32, 24);
	const centre = toWorld3(x, y);
	sphere.translate(centre.x, centre.y, centre.z);
	return sphere;
}
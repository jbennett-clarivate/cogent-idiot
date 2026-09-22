import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const CX = 10777;
export const CY = 15287;
export const SCALE = 0.00024;
export const toWorld3 = (x: number, y: number): THREE.Vector3 =>
	new THREE.Vector3((x - CX) * SCALE, -(y - CY) * SCALE, 0);
export const rawRadius = (radius: number): number => radius * SCALE;
export const mirrorX = (x: number): number => 2 * CX - x;
export const mirrorPoints = (points: number[][]): number[][] =>
	points.map(([x, y]) => [mirrorX(x), y]);
export type CapKind = "apex" | "dome";
export interface EnvelopeSweptOptions {
	polygon: number[][];
	centerline: number[][];
	startCap?: CapKind;
	endCap?: CapKind;
	tubularSegments?: number;
	radialSegments?: number;
	fill?: number;
	maxRadius?: number;
	/**
	 * The rod's own radius from its start to its end, taking the place of
	 * reading the radius off the envelope. One number holds a uniform
	 * thickness. A list of numbers is walked at even fractions along the
	 * spine, so [a, b] is a linear taper and [a, b, c] puts b at the
	 * halfway point. A list of [at, radius] pairs places each control point
	 * explicitly, for a rod whose landmarks do not fall at even intervals.
	 *
	 * The envelope is a poor source of radius for these rods. A
	 * cross-section ray can escape through a concave notch and report the
	 * whole shape's span; and where the outline is asymmetric about the
	 * spine, the re-centring step drags each ring sideways off the path,
	 * which makes a bend read as two misaligned runs that merely overlap.
	 */
	radiusProfile?: number | number[] | Array<[number, number]>;
	validate?: boolean;
	name?: string;
}

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
		if (Math.abs(denom) < 1e-9) continue;
		const s = ((ax - ox) * ey - (ay - oy) * ex) / denom;
		const u = ((ax - ox) * dy - (ay - oy) * dx) / denom;
		if (s > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 && s < best) best = s;
	}
	return best;
}

// Largest radius a circle centred at (px,py) can have and still stay inside
// the polygon - i.e. the distance to the nearest edge. Used to size a dome
// cap's sphere: a sphere's footprint in the XY plane is exactly a circle of
// its own radius, so this is an exact fit check, not an approximation.
function distanceToPolygonBoundary(px: number, py: number, polygon: number[][]): number {
	let dist = Infinity;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const d = pointSegmentDistance(px, py, polygon[j], polygon[i]);
		if (d < dist) dist = d;
	}
	return dist;
}

export function buildEnvelopeSweep(options: EnvelopeSweptOptions): THREE.BufferGeometry {
	const {
		polygon,
		centerline,
		startCap = "apex",
		endCap = "apex",
		tubularSegments = 48,
		radialSegments = 24,
		fill = 1,
		maxRadius = Infinity,
		radiusProfile,
		validate = false,
		name = "shape",
	} = options;

	// Normalize every accepted form to [at, radius] pairs sorted along the spine.
	const profile: Array<[number, number]> | undefined = radiusProfile === undefined
		? undefined
		: typeof radiusProfile === "number"
			? [[0, radiusProfile], [1, radiusProfile]]
			: Array.isArray(radiusProfile[0])
				? (radiusProfile as Array<[number, number]>)
				: (radiusProfile as number[]).map((r, i, all) =>
					[all.length === 1 ? 0 : i / (all.length - 1), r] as [number, number]);

	// Radius at fraction `at` along the spine, interpolating between the
	// nearest control points on either side.
	const radiusAt = (at: number): number => {
		const stops = profile!;
		if (stops.length === 1) return stops[0][1];
		const t = Math.min(1, Math.max(0, at));
		if (t <= stops[0][0]) return stops[0][1];
		for (let i = 1; i < stops.length; i++) {
			if (t > stops[i][0]) continue;
			const [t0, r0] = stops[i - 1];
			const [t1, r1] = stops[i];
			const span = t1 - t0;
			return span <= 0 ? r1 : r0 + (r1 - r0) * ((t - t0) / span);
		}
		return stops[stops.length - 1][1];
	};

	if (centerline.length < 2) throw new Error(`[ice] ${name}: centreline needs >= 2 points.`);

	const spine = new THREE.CatmullRomCurve3(
		centerline.map(([x, y]) => new THREE.Vector3(x, y, 0)),
		false,
		"centripetal",
	);

	interface Station {
		x: number;
		y: number;
		nx: number;
		ny: number;
		r: number;
		px: number;
		py: number;
	}

	const stations: Station[] = [];
	for (let i = 0; i <= tubularSegments; i++) {
		const t = i / tubularSegments;
		const p = spine.getPointAt(t);
		const tan = spine.getTangentAt(t);
		let nx = -tan.y;
		let ny = tan.x;
		const nlen = Math.hypot(nx, ny) || 1;
		nx /= nlen;
		ny /= nlen;
		let cx = p.x;
		let cy = p.y;
		let r: number;

		if (profile) {
			// The spine is authoritative here, so it keeps its own position -
			// re-centring it on envelope rays would drag the rod off its
			// intended path wherever the envelope is asymmetric about it.
			r = radiusAt(t);
		} else {
			const dPlus = rayToBoundary(p.x, p.y, nx, ny, polygon);
			const dMinus = rayToBoundary(p.x, p.y, -nx, -ny, polygon);
			r = 0;
			if (isFinite(dPlus) && isFinite(dMinus)) {
				cx = p.x + nx * (dPlus - dMinus) * 0.5;
				cy = p.y + ny * (dPlus - dMinus) * 0.5;
				r = (dPlus + dMinus) * 0.5;
			} else if (isFinite(dPlus)) {
				r = dPlus;
			} else if (isFinite(dMinus)) {
				r = dMinus;
			}
			r *= fill;
		}

		if (r > maxRadius) r = maxRadius;
		stations.push({ x: cx, y: cy, nx, ny, r, px: p.x, py: p.y });
	}

	// A tube bent tighter than its own radius self-intersects on the inside of
	// the turn - the classic pinched-hose problem. The polygon-based radius
	// above has no notion of the spine's own curvature, so clamp each station's
	// radius to a safe fraction of the local bend radius (the radius of the
	// circle through it and its two neighbours), which is the largest a tube
	// can be at that point without folding into itself.
	// Skipped for a constant-radius rod: thinning it at the bends would make
	// it visibly pinch there, and a uniform rod's bends are authored wide
	// enough to accommodate its own thickness.
	for (let i = 1; profile === undefined && i < stations.length - 1; i++) {
		const a = stations[i - 1];
		const b = stations[i];
		const c = stations[i + 1];
		const abLen = Math.hypot(b.px - a.px, b.py - a.py);
		const bcLen = Math.hypot(c.px - b.px, c.py - b.py);
		const caLen = Math.hypot(a.px - c.px, a.py - c.py);
		const area2 = Math.abs(
			(b.px - a.px) * (c.py - a.py) - (c.px - a.px) * (b.py - a.py),
		);
		if (area2 < 1e-6) continue;
		const bendRadius = (abLen * bcLen * caLen) / (2 * area2);
		const safeRadius = bendRadius * 0.85;
		if (b.r > safeRadius) b.r = safeRadius;
	}

	if (startCap === "apex") stations[0].r = 0;
	if (endCap === "apex") stations[stations.length - 1].r = 0;

	// A dome cap is just a sphere plugged into the open end of the tube, radius
	// matched to that end's station. A sphere's cross-section through any plane
	// that passes through its centre is a circle at the sphere's own radius, so
	// this seals the opening cleanly no matter which way the tube is pointing at
	// that end - no need to compute or align a cap axis. The only thing left to
	// check is that the sphere itself doesn't bulge past the polygon envelope,
	// which (unlike the tube body) it can do in every direction, not just the
	// two the centreline normal checks - so clamp its radius to the actual
	// distance to the nearest polygon edge.
	//
	// Dome ends usually sit near a corner or a tight curve of the polygon (the
	// tip of a blade, the top of a crown arm), which is exactly where that true
	// distance is meaningfully smaller than the two-ray estimate the rest of the
	// tube uses. Clamping only the last station would leave a visible step right
	// before the sphere, so the shrink is eased back over a few stations to read
	// as a gradual neck rather than a shoulder.
	const smoothstep = (t: number): number => {
		const c = Math.min(1, Math.max(0, t));
		return c * c * (3 - 2 * c);
	};
	const domeSpheres: Array<{ x: number; y: number; r: number }> = [];
	const capWithDome = (index: number, direction: -1 | 1): void => {
		const s = stations[index];
		// A constant-radius rod keeps its thickness right to the end, so its
		// cap is a hemisphere of the rod's own radius with no easing taper.
		// A rod with its own radius profile gets a hemisphere of exactly the
		// rod's radius at that end, and no easing taper. Clamping it to the
		// envelope instead is what made a blunt end read as a pea on a stick:
		// the nearest outline edge can be a fraction of the rod's own radius,
		// so the cap came out at 103 units against a 425-unit rod.
		if (profile !== undefined) {
			domeSpheres.push({ x: s.x, y: s.y, r: s.r });
			return;
		}
		const target = Math.min(s.r, distanceToPolygonBoundary(s.x, s.y, polygon));
		s.r = target;
		if (target <= 1e-6) return;
		domeSpheres.push({ x: s.x, y: s.y, r: target });

		const easeCount = Math.max(3, Math.round(tubularSegments * 0.15));
		for (let k = 1; k <= easeCount; k++) {
			const idx = index + direction * k;
			if (idx < 0 || idx >= stations.length) break;
			const weight = smoothstep(1 - (k - 1) / easeCount);
			const st = stations[idx];
			st.r = st.r * (1 - weight) + target * weight;
		}
	};
	if (startCap === "dome") capWithDome(0, 1);
	if (endCap === "dome") capWithDome(stations.length - 1, -1);

	const positions: number[] = [];
	const indices: number[] = [];
	const EPS = 1e-6;
	const pushVertex = (sx: number, sy: number, sz: number): number => {
		positions.push((sx - CX) * SCALE, -(sy - CY) * SCALE, sz * SCALE);
		return positions.length / 3 - 1;
	};

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

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();

	if (validate) validateContainment(name, positions, polygon);
	if (domeSpheres.length === 0) return geometry;

	const sources = [geometry, ...domeSpheres.map(({ x, y, r }) => buildSphere(x, y, r))];
	const normalized = sources.map(source => {
		const nonIndexed = source.index ? source.toNonIndexed() : source.clone();
		nonIndexed.deleteAttribute("uv");
		return nonIndexed;
	});
	const merged = mergeGeometries(normalized, false);
	if (!merged) throw new Error(`[ice] ${name}: mergeGeometries returned null.`);
	sources.forEach(source => source.dispose());
	normalized.forEach(source => source.dispose());
	return merged;
}

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

export function buildSphere(x: number, y: number, radius: number): THREE.BufferGeometry {
	const sphere = new THREE.SphereGeometry(rawRadius(radius), 32, 24);
	const centre = toWorld3(x, y);
	sphere.translate(centre.x, centre.y, centre.z);
	return sphere;
}

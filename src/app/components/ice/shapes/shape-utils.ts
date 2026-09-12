import * as THREE from "three";

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
	capSegments?: number;
	fill?: number;
	maxRadius?: number;
	validate?: boolean;
	name?: string;
}

function fitDomeRadius(
	s: { x: number; y: number; nx: number; ny: number },
	tx: number,
	ty: number,
	polygon: number[][],
	maxR: number,
): number {
	if (maxR <= 0) return 0;

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
		const dPlus = rayToBoundary(p.x, p.y, nx, ny, polygon);
		const dMinus = rayToBoundary(p.x, p.y, -nx, -ny, polygon);

		let cx = p.x;
		let cy = p.y;
		let r = 0;
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
		if (r > maxRadius) r = maxRadius;
		stations.push({ x: cx, y: cy, nx, ny, r });
	}

	if (startCap === "apex") stations[0].r = 0;
	if (endCap === "apex") stations[stations.length - 1].r = 0;

	const alignDomeStation = (index: number): { tx: number; ty: number } => {
		const s = stations[index];
		const adjacentIndex = index === 0 ? 1 : index - 1;
		const adj = stations[adjacentIndex];
		let tx = s.x - adj.x;
		let ty = s.y - adj.y;
		let length = Math.hypot(tx, ty);
		if (length < 1e-6) {
			const direction = index === 0 ? -1 : 1;
			tx = s.ny * direction;
			ty = -s.nx * direction;
			length = Math.hypot(tx, ty) || 1;
		}
		tx /= length;
		ty /= length;

		let nx = -ty;
		let ny = tx;
		if (nx * s.nx + ny * s.ny < 0) {
			nx = -nx;
			ny = -ny;
		}
		s.nx = nx;
		s.ny = ny;

		const dPlus = rayToBoundary(s.x, s.y, nx, ny, polygon);
		const dMinus = rayToBoundary(s.x, s.y, -nx, -ny, polygon);
		if (isFinite(dPlus) && isFinite(dMinus)) {
			s.x += nx * (dPlus - dMinus) * 0.5;
			s.y += ny * (dPlus - dMinus) * 0.5;
			s.r = Math.min((dPlus + dMinus) * 0.5 * fill, maxRadius);
		} else {
			const measured = isFinite(dPlus) ? dPlus : isFinite(dMinus) ? dMinus : 0;
			s.r = Math.min(measured * fill, maxRadius);
		}

		return { tx, ty };
	};

	const domeVectors = new Map<number, { tx: number; ty: number }>();

	if (startCap === "dome") {
		const v = alignDomeStation(0);
		domeVectors.set(0, v);
		stations[0].r = fitDomeRadius(stations[0], v.tx, v.ty, polygon, stations[0].r);
	}
	if (endCap === "dome") {
		const last = stations.length - 1;
		const v = alignDomeStation(last);
		domeVectors.set(last, v);
		stations[last].r = fitDomeRadius(
			stations[last],
			v.tx,
			v.ty,
			polygon,
			stations[last].r,
		);
	}

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

	const addDome = (index: number, direction: -1 | 1): void => {
		const boundary = rings[index];
		const terminal = domeVectors.get(index);
		if (!boundary || !terminal) return;
		const s = stations[index];
		const { tx, ty } = terminal;
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

			const ringRadius = Math.min(s.r, s.r * Math.cos(phi));
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
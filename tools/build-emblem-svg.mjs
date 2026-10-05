// Generates the flat reference drawings under src/assets/images/ from the
// single source of truth in src/app/components/ice/shapes/emblem-source.ts.
//
// The emblem's coordinates used to be hand-copied between the Three.js
// builders and a throwaway SVG script, which let the two drift until the 3D
// model and the drawings described different objects. Everything here is
// derived, so the only place to edit the emblem is emblem-source.ts.
//
// Usage: node tools/build-emblem-svg.mjs

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const sourceTs = join(repoRoot, "src/app/components/ice/shapes/emblem-source.ts");
const imagesDir = join(repoRoot, "src/assets/images");

const FILL = "rgb(114,159,207)";
const STROKE = "rgb(52,101,164)";
const BORDER_WIDTH = 120;
const FILLET_RATIO = 0.6;

// emblem-source.ts imports mirrorPoints from shape-utils.ts, which pulls in
// three. Bundling resolves that without needing three at runtime here,
// because only the pure coordinate helpers are actually reached.
function loadSource() {
	const dir = mkdtempSync(join(tmpdir(), "emblem-src-"));
	const out = join(dir, "emblem-source.mjs");
	try {
		execFileSync(
			join(repoRoot, "node_modules/.bin/esbuild"),
			[sourceTs, "--bundle", "--format=esm", "--platform=neutral", `--outfile=${out}`, "--log-level=warning"],
			{ stdio: "inherit" },
		);
		return import(`file://${out}`);
	} finally {
		process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
	}
}

const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Replace every non-sharp vertex with a quadratic fillet blending its two
// adjacent edges; sharp vertices stay exact corners. Fillet reach is clamped
// to half of either adjacent edge so neighbouring fillets cannot overrun each
// other on short segments.
function roundedPath(points, sharp) {
	const sharpSet = new Set(sharp);
	const n = points.length;
	const inPoint = new Array(n);
	const outPoint = new Array(n);

	for (let i = 0; i < n; i++) {
		if (sharpSet.has(i)) {
			inPoint[i] = points[i];
			outPoint[i] = points[i];
			continue;
		}
		const p = points[i];
		const a = points[(i - 1 + n) % n];
		const b = points[(i + 1) % n];
		const edgeIn = dist(a, p);
		const edgeOut = dist(p, b);
		const r = Math.min(edgeIn, edgeOut) * FILLET_RATIO;
		inPoint[i] = lerp(p, a, Math.min(0.5, r / edgeIn));
		outPoint[i] = lerp(p, b, Math.min(0.5, r / edgeOut));
	}

	const xy = p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
	let d = `M ${xy(inPoint[0])} `;
	for (let i = 0; i < n; i++) {
		if (sharpSet.has(i)) {
			if (i !== 0) d += `L ${xy(points[i])} `;
		} else {
			d += `Q ${xy(points[i])} ${xy(outPoint[i])} `;
		}
		const j = (i + 1) % n;
		if (!sharpSet.has(j)) d += `L ${xy(inPoint[j])} `;
	}
	return `${d}Z`;
}

function writeFaceOn({ RODS, SPHERES }) {
	const paths = RODS.map(
		rod =>
			`      <!-- ${rod.name} -->\n` +
			`      <path fill="${FILL}" stroke="${STROKE}" d="${roundedPath(rod.polygon, rod.sharp)}"/>`,
	).join("\n");

	const circles = SPHERES.map(
		s => `      <circle fill="${FILL}" stroke="${STROKE}" cx="${s.x}" cy="${s.y}" r="${s.r}"/>`,
	).join("\n");

	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.2" width="215.9mm" height="279.4mm" viewBox="0 0 21590 27940" preserveAspectRatio="xMidYMid" fill-rule="evenodd" stroke-width="${BORDER_WIDTH}" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" xml:space="preserve">
  <g class="Page">
    <g class="RoundedClosedObjects">
${paths}
${circles}
    </g>
  </g>
</svg>
`;
	const out = join(imagesDir, "3d-image-rounded.svg");
	writeFileSync(out, svg);
	console.log("Wrote", out);
}

// Edge-on panels. Every rod currently lies in the Z=0 plane, so looking down
// X or Y collapses the emblem to a silhouette no thicker than the widest
// single rod diameter. Overlapping rods are unioned into one outline rather
// than stroked individually, because a border drawn at an overlap marks a
// boundary that does not exist on the real object.
function writeEdgeOn({ RODS, SPHERES }, { horizKey, label, fileName }) {
	const SAMPLES = 2000;
	const axis = horizKey === "y" ? 1 : 0;
	const centerConst = horizKey === "y" ? 15287 : 10777;

	// Rod radius comes from the rod's own declared profile where it has one,
	// falling back to measuring the envelope across the local spine direction.
	// Kept per rod, not flattened: consecutive stations are interpolated
	// below, and a flat list would bridge the gap between one rod's last
	// station and the next rod's first, inventing material between them.
	const perRod = RODS.map(rod => {
		const line = rod.centerline;
		const segs = line.length - 1;
		// Normalized to [at, radius] pairs, matching buildEnvelopeSweep's radiusAt.
		const profile =
			rod.radiusProfile === undefined
				? undefined
				: typeof rod.radiusProfile === "number"
					? [
							[0, rod.radiusProfile],
							[1, rod.radiusProfile],
						]
					: Array.isArray(rod.radiusProfile[0])
						? rod.radiusProfile
						: rod.radiusProfile.map((r, i, all) => [all.length === 1 ? 0 : i / (all.length - 1), r]);
		const radiusAt = at => {
			if (profile.length === 1) return profile[0][1];
			const t = Math.min(1, Math.max(0, at));
			if (t <= profile[0][0]) return profile[0][1];
			for (let i = 1; i < profile.length; i++) {
				if (t > profile[i][0]) continue;
				const [t0, r0] = profile[i - 1];
				const [t1, r1] = profile[i];
				const span = t1 - t0;
				return span <= 0 ? r1 : r0 + (r1 - r0) * ((t - t0) / span);
			}
			return profile[profile.length - 1][1];
		};
		const stations = [];
		const steps = 24;
		for (let s = 0; s < segs; s++) {
			const a = line[s];
			const b = line[s + 1];
			for (let i = 0; i < steps; i++) {
				const local = i / steps;
				const p = lerp(a, b, local);
				let tx = b[0] - a[0];
				let ty = b[1] - a[1];
				const len = Math.hypot(tx, ty) || 1;
				tx /= len;
				ty /= len;
				// Fraction along the whole spine, so a taper spans the rod
				// rather than restarting on each segment.
				const along = (s + local) / segs;
				const r = profile ? radiusAt(along) : envelopeRadius(p, -ty, tx, rod.polygon);
				stations.push({ p, r });
			}
		}
		return stations;
	});

	let lo = Infinity;
	let hi = -Infinity;
	let maxR = 0;
	for (const stations of perRod) {
		for (const st of stations) {
			lo = Math.min(lo, st.p[axis]);
			hi = Math.max(hi, st.p[axis]);
			maxR = Math.max(maxR, st.r);
		}
	}
	for (const s of SPHERES) {
		const h = axis === 0 ? s.x : s.y;
		lo = Math.min(lo, h - s.r);
		hi = Math.max(hi, h + s.r);
		maxR = Math.max(maxR, s.r);
	}

	const step = (hi - lo) / SAMPLES;
	const env = new Array(SAMPLES + 1).fill(0);

	for (const stations of perRod) {
		for (let i = 0; i < stations.length - 1; i++) {
			const a = stations[i];
			const b = stations[i + 1];
			const h0 = a.p[axis];
			const h1 = b.p[axis];
			const i0 = Math.max(0, Math.floor((Math.min(h0, h1) - lo) / step));
			const i1 = Math.min(SAMPLES, Math.ceil((Math.max(h0, h1) - lo) / step));
			for (let k = i0; k <= i1; k++) {
				const h = lo + k * step;
				const t = h1 === h0 ? 0 : Math.max(0, Math.min(1, (h - h0) / (h1 - h0)));
				const r = a.r + (b.r - a.r) * t;
				if (r > env[k]) env[k] = r;
			}
		}
	}
	for (const s of SPHERES) {
		const h = axis === 0 ? s.x : s.y;
		const i0 = Math.max(0, Math.floor((h - s.r - lo) / step));
		const i1 = Math.min(SAMPLES, Math.ceil((h + s.r - lo) / step));
		for (let k = i0; k <= i1; k++) {
			const dx = lo + k * step - h;
			if (Math.abs(dx) > s.r) continue;
			const r = Math.sqrt(s.r * s.r - dx * dx);
			if (r > env[k]) env[k] = r;
		}
	}

	const width = 24000;
	const height = 2400;
	const originX = width / 2;
	const originY = height / 2;
	const top = [];
	const bottom = [];
	for (let k = 0; k <= SAMPLES; k++) {
		const px = originX + (lo + k * step - centerConst);
		top.push([px, originY - env[k]]);
		bottom.push([px, originY + env[k]]);
	}
	const all = [...top, ...bottom.reverse()];
	const d = `M ${all.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L ")} Z`;

	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.2" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xml:space="preserve">
  <g class="Page">
    <text x="200" y="300" font-family="sans-serif" font-size="300" fill="#666">${label} — no depth defined yet; max diameter ${(2 * maxR).toFixed(0)}</text>
    <g class="FlatEdgeView">
      <path fill="${FILL}" stroke="${STROKE}" stroke-width="${BORDER_WIDTH}" stroke-linejoin="round" d="${d}"/>
    </g>
  </g>
</svg>
`;
	const out = join(imagesDir, fileName);
	writeFileSync(out, svg);
	console.log("Wrote", out, `(max diameter ${(2 * maxR).toFixed(0)})`);
}

function envelopeRadius(p, nx, ny, polygon) {
	const ray = (dx, dy) => {
		let best = Infinity;
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			const ax = polygon[j][0];
			const ay = polygon[j][1];
			const ex = polygon[i][0] - ax;
			const ey = polygon[i][1] - ay;
			const denom = dx * ey - dy * ex;
			if (Math.abs(denom) < 1e-9) continue;
			const s = ((ax - p[0]) * ey - (ay - p[1]) * ex) / denom;
			const u = ((ax - p[0]) * dy - (ay - p[1]) * dx) / denom;
			if (s > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 && s < best) best = s;
		}
		return best;
	};
	const plus = ray(nx, ny);
	const minus = ray(-nx, -ny);
	if (isFinite(plus) && isFinite(minus)) return (plus + minus) / 2;
	if (isFinite(plus)) return plus;
	if (isFinite(minus)) return minus;
	return 0;
}

const source = await loadSource();
writeFaceOn(source);
writeEdgeOn(source, {
	horizKey: "y",
	label: "X-axis view (looking along X; edge-on, no depth yet)",
	fileName: "3d-image-x-axis.svg",
});
writeEdgeOn(source, {
	horizKey: "x",
	label: "Y-axis view (looking along Y; edge-on, no depth yet)",
	fileName: "3d-image-y-axis.svg",
});

import { mirrorPoints } from "./shape-utils";

// Single source of truth for the emblem's 2D geometry, in raw SVG viewBox
// units (viewBox 0 0 21590 27940, symmetry axis x = 10777).
//
// Both the Three.js builders (shapes/*.ts) and the flat reference drawings
// under src/assets/images/ derive from THIS file. Coordinates used to be
// hand-copied into each place independently, which let them drift: the lower
// spikes ended up 280 units too low and carried a stale pre-rounding spur
// vertex, so the 3D model and the SVGs described different objects. Edit the
// emblem here and regenerate the SVGs (tools/build-emblem-svg.mjs) rather
// than touching coordinates in more than one file.

// Each object is a rod: the polygon below is the rod's ENVELOPE as seen
// face-on (looking down +Z toward -Z), so the polygon's local width is the
// rod's diameter at that point along its centerline. Rods that come to a
// point do so only at the vertices listed in `sharp`; every other vertex is
// rounded. The two circles are spheres.

/** Gap opened between the crown and both the spike above and the tail below. */
export const AXIS_GAP_INCREASE = 280;

/** Extra downward shift applied to the lower spikes + spade tail as a group. */
export const LOWER_GROUP_SHIFT = 200;

export interface RodSource {
	name: string;
	/** Face-on envelope polygon, raw viewBox units, already fully transformed. */
	polygon: number[][];
	/** Centerline spine the rod sweeps along, already fully transformed. */
	centerline: number[][];
	/** Indices into `polygon` that stay sharp points; all others are rounded. */
	sharp: number[];
	/**
	 * The rod's radius from its start to its end. One number holds a uniform
	 * thickness; a list of numbers is walked at even fractions along the
	 * spine, so [a, b] is a linear taper; a list of [at, radius] pairs places
	 * each control point explicitly, for a rod whose landmarks do not fall at
	 * even intervals.
	 *
	 * Every rod here defines its own radius rather than having it measured
	 * off the envelope outline. The outline is a face-on silhouette of
	 * several rods meeting, so a cross-section ray from one rod's spine can
	 * escape through a notch or pick up a neighbour, reporting a width the
	 * rod does not have.
	 */
	radiusProfile?: number | number[] | Array<[number, number]>;
}

const translateY = (points: number[][], dy: number): number[][] => points.map(([x, y]) => [x, y + dy]);

const translate = (points: number[][], dx: number, dy: number): number[][] => points.map(([x, y]) => [x + dx, y + dy]);

// Margin pass. Measured surface-to-surface, the objects that actually touch
// sat anywhere from -169 (the central spike overlapping the crown) to 1030
// units apart, which read as uneven spacing rather than a deliberate margin.
// Each object is nudged straight out from the crown - which stays put, being
// the hub the emblem is built around - until every touching pair clears by
// MARGIN. Mirrored objects share one offset so the emblem stays symmetric,
// and the two axis objects move vertically so they stay on the axis.
// Target clearance between any two touching objects.
export const MARGIN = 420;
const SPIKE_NUDGE = { dx: 0, dy: -717 };
const SIDE_SPIKE_NUDGE = { dx: 134, dy: 27 };
const LOWER_SPIKE_NUDGE = { dx: 272, dy: 479 };
const SPADE_NUDGE = { dx: 0, dy: 578 };
const SPHERE_NUDGE = { dx: 495, dy: 437 };

export const CENTRAL_SPIKE: RodSource = {
	name: "central-spike",
	polygon: translate(
		translateY(
			[
				[10777, 5445],
				[11343, 15006],
				[10777, 15568],
				[10211, 15006],
			],
			-AXIS_GAP_INCREASE,
		),
		SPIKE_NUDGE.dx,
		SPIKE_NUDGE.dy,
	),
	centerline: translate(
		translateY(
			[
				[10777, 5445],
				[10777, 12000],
				[10777, 15006],
				[10777, 15568],
			],
			-AXIS_GAP_INCREASE,
		),
		SPIKE_NUDGE.dx,
		SPIKE_NUDGE.dy,
	),
	sharp: [0], // outer tip only; the near-center end is rounded
	// Point at the tip, swelling to radius 566 (half the kite's 1132 widest
	// span) at the blunt end that meets the crown.
	radiusProfile: [0, 119, 238, 357, 476, 566],
};

// The crown is one constant-diameter rod bent in three places: it runs from
// the left arm tip down to the left bend, across through the bottom, up to
// the right bend, and out to the right arm tip. Four straight runs, three
// bends, both ends rounded - no sharp point anywhere on it.
//
// It is NOT a closed loop. Routing a tube around the full outline made the
// crown render as a hollow wire hoop - the silhouette drawn as a bent rod
// with an empty middle - because the spine traced the rim instead of the
// body. The path below follows the shape's medial line instead.
//
// Diameter is constant: the arm-tip pads measure 806 across and the bottom
// run 845, so the rod is ~825 wide (radius 412) along its whole length.
export const UPPER_CROWN: RodSource = {
	name: "upper-crown",
	polygon: [
		[10777, 15849],
		[11906, 15006],
		[11626, 14162],
		[11626, 13677],
		[12054, 13600],
		[12405, 13882],
		[12750, 15006],
		[12750, 15287],
		[10777, 16694],
		[8805, 15287],
		[8804, 15006],
		[9149, 13882],
		[9500, 13600],
		[9928, 13677],
		[9928, 14162],
		[9648, 15006],
	],
	// Left arm tip, left bend, bottom, right bend, right arm tip - each taken
	// from the centre of the corresponding cluster of envelope vertices.
	centerline: [
		[9526, 13720],
		[9086, 15100],
		[10777, 16272],
		[12469, 15100],
		[12028, 13720],
	],
	sharp: [],
	radiusProfile: 412,
};

export const SIDE_SPIKE_RIGHT: RodSource = {
	name: "side-spike-right",
	polygon: translate(
		[
			[13031, 14444],
			[13313, 14162],
			[13828, 14162],
			[14437, 15287],
			[20155, 16590],
			[13828, 16079],
		],
		SIDE_SPIKE_NUDGE.dx,
		SIDE_SPIKE_NUDGE.dy,
	),
	// Blunt at the base, tapering to the outer point. Starts at the centre of
	// the rounded base pad (vertices 0-2), not outside it: the old start sat
	// 339 units beyond the envelope, left over from a base vertex that has
	// since been corrected, which put the cap in open space instead of
	// buried in the rod's own base.
	//
	// The intermediate points track the midline between the envelope's upper
	// and lower edges. They are not decoration: the outline bows, so a spine
	// drawn straight from base to tip cuts up to 217 units outside it.
	centerline: translate(
		[
			[13391, 14256],
			[14491, 15748],
			[15435, 15889],
			[16379, 16029],
			[17323, 16169],
			[18267, 16309],
			[19211, 16450],
			[20155, 16590],
		],
		SIDE_SPIKE_NUDGE.dx,
		SIDE_SPIKE_NUDGE.dy,
	),
	sharp: [4], // outermost tip
	// Blunt end radius 423 = half the base pad's measured 845 width, and the
	// same stock as the two spheres (422.5).
	radiusProfile: [423, 0],
};

// One rod, blunt at the crown end and pointed at the outer end, tapering
// smoothly between them, bent in a single place.
//
// The path is a V, which the envelope states twice over: edges v0->v1 (2070)
// and v3->v4 (1537) are antiparallel within 1.8 degrees, forming the flanks
// of a run heading up toward the crown, and edges v4->v5 (5552) and v5->v6
// (5458) are antiparallel within 9.6 degrees, forming the flanks of the long
// run out to the point. So the rod starts blunt near the crown, runs
// down-left to the bend, then turns and runs down-right to its tip.
//
// The radius is the rod's own linear taper rather than the envelope's local
// width. Measuring the envelope made this piece read as two misaligned runs
// that merely overlapped: the width swings from ~617 at the crown end to
// ~927 at the bend, so the radius lurched 122 units in one step, while the
// re-centring step dragged rings up to 261 units off the path. The swell at
// the bend is an artifact of the hand-drawn outline, so the taper ignores it.
//
// Blunt end radius 419 gives this rod the same volume as a side spike
// (1.42e9 cubic units each). The two are already the same length - 7713
// against 7580, under 2% apart - so the whole gap was thickness: at the
// outline's own ~617 width (radius 309) this rod held only 54% of a side
// spike's volume. Volume goes as radius squared, so 309 -> 419 closes it
// without touching the path. That also lands within 1% of the side spike's
// own 423, which is why the emblem now reads as one consistent rod stock.
export const LOWER_SPIKE_RIGHT: RodSource = {
	name: "lower-spike-right",
	// Wraps the thickened rod: the blunt cap's two corners, then the flank
	// offset (radius at that point along the taper) down one side and back up
	// the other, converging at the tip. The previous outline was drawn for a
	// much thinner rod - its spur pad left only 128-299 units of clearance
	// where the cap now needs 419 - so it described a rod the model no longer
	// builds.
	polygon: translate(
		translateY(
			[
				[12870, 15398],
				[12183, 15986],
				[11415, 16669],
				[11440, 17286],
				[12361, 18400],
				[13247, 19447],
				[14967, 21586],
				[13359, 19363],
				[12583, 18230],
				[11840, 17162],
				[11907, 16933],
				[12595, 16550],
				[13364, 16074],
			],
			LOWER_GROUP_SHIFT,
		),
		LOWER_SPIKE_NUDGE.dx,
		LOWER_SPIKE_NUDGE.dy,
	),
	// Blunt end near the crown, down-left to the bend, then down-right to the
	// point. Intermediate points are midlines between the matching pair of
	// flanks, so the spine stays inside the envelope on both runs.
	centerline: translate(
		translateY(
			[
				[13117, 15736],
				[12389, 16268],
				[11661, 16801],
				[11640, 17224],
				[12472, 18315],
				[13303, 19405],
				[14967, 21586],
			],
			LOWER_GROUP_SHIFT,
		),
		LOWER_SPIKE_NUDGE.dx,
		LOWER_SPIKE_NUDGE.dy,
	),
	sharp: [6], // outermost tip
	radiusProfile: [419, 0],
};

// Sharp at both shoulders and at the outer tip; the waist nearest the crown
// is rounded. The shoulders are the widest part of the emblem (~1866 across),
// and keeping them pointed is what gives the tail its spade read.
export const SPADE_TAIL: RodSource = {
	name: "spade-tail",
	polygon: translate(
		translateY(
			[
				[10777, 16974],
				[11710, 18396],
				[11091, 19050],
				[10777, 25130],
				[10463, 19050],
				[9844, 18396],
			],
			AXIS_GAP_INCREASE + LOWER_GROUP_SHIFT,
		),
		SPADE_NUDGE.dx,
		SPADE_NUDGE.dy,
	),
	centerline: translate(
		translateY(
			[
				[10777, 16974],
				[10777, 18396],
				[10777, 19050],
				[10777, 21500],
				[10777, 25130],
			],
			AXIS_GAP_INCREASE + LOWER_GROUP_SHIFT,
		),
		SPADE_NUDGE.dx,
		SPADE_NUDGE.dy,
	),
	sharp: [1, 3, 5], // both shoulders and the outer tip
	// The spade's four landmarks, at their true fractions along the spine:
	// a point at the waist tucked under the crown, flaring hard to the
	// shoulders at 933 (the emblem's widest place), pinching straight back in
	// to the 314 neck, then a long slow taper to the tail's point.
	//
	// Positions matter more than the values here. An evenly spaced profile
	// cannot put the shoulder peak at 17% and the neck at 25%, and an earlier
	// one both started at 314 instead of 0 and never pinched back - it held
	// ~800 down a tail that should be ~250, filling the waist in and losing
	// the spade entirely. These four pairs reproduce the outline exactly.
	radiusProfile: [
		[0, 0],
		[0.1744, 933],
		[0.2545, 314],
		[1, 0],
	],
};

export interface SphereSource {
	name: string;
	x: number;
	y: number;
	r: number;
}

// Mirrored about the axis at a shared y. The drawing had them 60 units apart
// in x and 115 in y, which left one sphere's margin visibly looser than the
// other's; these are the averaged, symmetric positions.
export const SPHERES: SphereSource[] = [
	{ name: "sphere-left", x: 10777 - 2706.5 - SPHERE_NUDGE.dx, y: 17174.5 + SPHERE_NUDGE.dy, r: 422.5 },
	{ name: "sphere-right", x: 10777 + 2706.5 + SPHERE_NUDGE.dx, y: 17174.5 + SPHERE_NUDGE.dy, r: 422.5 },
];

const mirrorRod = (rod: RodSource, name: string): RodSource => ({
	name,
	polygon: mirrorPoints(rod.polygon),
	centerline: mirrorPoints(rod.centerline),
	sharp: rod.sharp,
	radiusProfile: rod.radiusProfile,
});

export const SIDE_SPIKE_LEFT = mirrorRod(SIDE_SPIKE_RIGHT, "side-spike-left");
export const LOWER_SPIKE_LEFT = mirrorRod(LOWER_SPIKE_RIGHT, "lower-spike-left");

/** Every rod in the emblem, in a stable order. */
export const RODS: RodSource[] = [
	CENTRAL_SPIKE,
	UPPER_CROWN,
	SIDE_SPIKE_RIGHT,
	SIDE_SPIKE_LEFT,
	LOWER_SPIKE_RIGHT,
	LOWER_SPIKE_LEFT,
	SPADE_TAIL,
];

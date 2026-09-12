import * as THREE from "three";
import { buildEnvelopeSweep, mirrorPoints } from "./shape-utils";

/**
 * Objects 3 & 4 — side blades.
 *
 * A single definition authored on the RIGHT side. The left blade is the same
 * object reflected across the symmetry axis, so `mirror` re-mirrors the source
 * polygon and centreline before generation. Mirroring the source coordinates
 * (rather than negative-scaling the finished mesh) keeps triangle winding and
 * vertex normals correct.
 *
 * Circular cone swept from the domed inner base out to the pointed tip; radius
 * is the local half-width of the filled polygon.
 */
export function buildSideBlade(mirror = false): THREE.BufferGeometry {
	const polygon = [
		[13031, 14444],
		[13313, 14162],
		[13828, 14162],
		[14437, 15287],
		[20155, 16590],
		[13828, 16079],
	];

	const centerline = [
		[13500, 15150],
		[14400, 15600],
		[16200, 16050],
		[18200, 16350],
		[20155, 16590],
	];

	return buildEnvelopeSweep({
		name: mirror ? "side-blade-left" : "side-blade-right",
		polygon: mirror ? mirrorPoints(polygon) : polygon,
		centerline: mirror ? mirrorPoints(centerline) : centerline,
		startCap: "dome",
		endCap: "apex",
		tubularSegments: 56,
		radialSegments: 24,
	});
}
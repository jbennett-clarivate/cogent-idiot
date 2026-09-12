import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";

/**
 * Object 1 — central spike.
 *
 * Tapered cone on the vertical symmetry axis. The medial path is x = 10777; the
 * radius is taken from the filled diamond's half-width, so the swept cone fills
 * the silhouette and cannot break out of it. Both silhouette ends are points,
 * so both caps are apices.
 */
export function buildCentralSpike(): THREE.BufferGeometry {
	const polygon = [
		[10777, 5445],
		[11343, 15006],
		[10777, 15568],
		[10211, 15006],
	];

	return buildEnvelopeSweep({
		name: "central-spike",
		polygon,
		centerline: [
			[10777, 5445],
			[10777, 12000],
			[10777, 15006],
			[10777, 15568],
		],
		startCap: "apex",
		endCap: "apex",
		tubularSegments: 56,
		radialSegments: 28,
	});
}
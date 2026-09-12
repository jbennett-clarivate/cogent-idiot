import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";

/**
 * Object 7 — central spade tail.
 *
 * A single watertight compound conical shell. Sweeping a circular section along
 * the medial axis (x = 10777) with radius = polygon half-width reproduces the
 * required three contiguous phases automatically and seamlessly:
 *   1. top apex (r = 0 at y = 16974) expands to r = n (933 units at y = 18396),
 *   2. contracts to r = n - m (314 units at the neck, y = 19050),
 *   3. tapers gradually to the bottom apex (r = 0 at y = 25130).
 * The shared rings mean there are no divider caps between the phases.
 */
export function buildSpadeTail(): THREE.BufferGeometry {
	const polygon = [
		[10777, 16974],
		[11710, 18396],
		[11091, 19050],
		[10777, 25130],
		[10463, 19050],
		[9844, 18396],
	];

	return buildEnvelopeSweep({
		name: "spade-tail",
		polygon,
		centerline: [
			[10777, 16974],
			[10777, 18396],
			[10777, 19050],
			[10777, 21500],
			[10777, 25130],
		],
		startCap: "apex",
		endCap: "apex",
		tubularSegments: 80,
		radialSegments: 28,
	});
}
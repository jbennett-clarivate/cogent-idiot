import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";
import { SPADE_TAIL } from "./emblem-source";

export function buildSpadeTail(): THREE.BufferGeometry {
	return buildEnvelopeSweep({
		name: SPADE_TAIL.name,
		polygon: SPADE_TAIL.polygon,
		centerline: SPADE_TAIL.centerline,
		// Pinched at the waist, swelling through the shoulders, then a point.
		radiusProfile: SPADE_TAIL.radiusProfile,
		// Both spine ends are rod tips that come to a point: the waist tucked
		// against the crown and the long outer tail tip.
		startCap: "apex",
		endCap: "apex",
		tubularSegments: 80,
		radialSegments: 28,
	});
}

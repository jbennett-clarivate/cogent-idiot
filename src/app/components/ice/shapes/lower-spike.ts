import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";
import { LOWER_SPIKE_LEFT, LOWER_SPIKE_RIGHT } from "./emblem-source";

export function buildLowerSpike(mirror = false): THREE.BufferGeometry {
	const source = mirror ? LOWER_SPIKE_LEFT : LOWER_SPIKE_RIGHT;

	return buildEnvelopeSweep({
		name: source.name,
		polygon: source.polygon,
		centerline: source.centerline,
		// Blunt at the crown end, tapering smoothly to a point at the outer
		// end, bent in a single place.
		radiusProfile: source.radiusProfile,
		startCap: "dome",
		endCap: "apex",
		tubularSegments: 80,
		radialSegments: 24,
	});
}

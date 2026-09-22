import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";
import { SIDE_SPIKE_LEFT, SIDE_SPIKE_RIGHT } from "./emblem-source";

export function buildSideSpike(mirror = false): THREE.BufferGeometry {
	const source = mirror ? SIDE_SPIKE_LEFT : SIDE_SPIKE_RIGHT;

	return buildEnvelopeSweep({
		name: source.name,
		polygon: source.polygon,
		centerline: source.centerline,
		// Blunt at the base, tapering smoothly to a point at the outer tip.
		radiusProfile: source.radiusProfile,
		startCap: "dome",
		endCap: "apex",
		tubularSegments: 56,
		radialSegments: 24,
	});
}

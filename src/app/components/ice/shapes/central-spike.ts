import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";
import { CENTRAL_SPIKE } from "./emblem-source";

export function buildCentralSpike(): THREE.BufferGeometry {
	return buildEnvelopeSweep({
		name: CENTRAL_SPIKE.name,
		polygon: CENTRAL_SPIKE.polygon,
		centerline: CENTRAL_SPIKE.centerline,
		// Point at the tip, blunt where it meets the crown.
		radiusProfile: CENTRAL_SPIKE.radiusProfile,
		startCap: "apex",
		endCap: "dome",
		tubularSegments: 56,
		radialSegments: 28,
	});
}

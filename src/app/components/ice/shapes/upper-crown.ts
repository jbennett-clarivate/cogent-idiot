import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";
import { UPPER_CROWN } from "./emblem-source";

export function buildUpperCrown(): THREE.BufferGeometry {
	return buildEnvelopeSweep({
		name: UPPER_CROWN.name,
		polygon: UPPER_CROWN.polygon,
		centerline: UPPER_CROWN.centerline,
		// One rod of uniform thickness bent in three places, rounded at both
		// arm tips - the only piece with no sharp point anywhere.
		radiusProfile: UPPER_CROWN.radiusProfile,
		startCap: "dome",
		endCap: "dome",
		tubularSegments: 96,
		radialSegments: 24,
	});
}

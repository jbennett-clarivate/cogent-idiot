import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { buildCentralSpike } from "./central-spike";
import { buildUpperCrown } from "./upper-crown";
import { buildSideBladeRight } from "./side-blade-right";
import { buildSideBladeLeft } from "./side-blade-left";
import { buildLowerBladeRight } from "./lower-blade-right";
import { buildLowerBladeLeft } from "./lower-blade-left";
import { buildSpadeTail } from "./spade-tail";
import { buildLeftSphere, buildRightSphere } from "./spheres";

/**
 * Builds all nine individual ice-emblem objects and merges them into a single
 * geometry. Each object is authored in its own file from the coordinates in
 * src/assets/images/3d-image.svg (seven extruded outlines + two spheres).
 */
export function buildIceEmblem(): THREE.BufferGeometry {
	const parts: THREE.BufferGeometry[] = [
		buildCentralSpike(),
		buildUpperCrown(),
		buildSideBladeRight(),
		buildSideBladeLeft(),
		buildLowerBladeRight(),
		buildLowerBladeLeft(),
		buildSpadeTail(),
		buildLeftSphere(),
		buildRightSphere(),
	];

	// mergeGeometries requires a uniform attribute/index state across parts.
	const normalized = parts.map(p => (p.index ? p.toNonIndexed() : p));
	const merged = mergeGeometries(normalized, false);
	if (!merged) throw new Error("[ice] mergeGeometries returned null.");
	normalized.forEach((nrm, i) => {
		nrm.dispose();
		if (parts[i] !== nrm) parts[i].dispose();
	});

	merged.computeVertexNormals();
	merged.center();
	merged.computeBoundingBox();
	merged.computeBoundingSphere();
	return merged;
}
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { buildCentralSpike } from "./central-spike";
import { buildUpperCrown } from "./upper-crown";
import { buildSideBlade } from "./side-blade";
import { buildLowerBlade } from "./lower-blade";
import { buildSpadeTail } from "./spade-tail";
import { buildSpheres } from "./spheres";

/**
 * Builds the seven parametric outer shells and two complete decorative spheres,
 * then combines them into one render geometry. Left/right blade pairs share one
 * definition; the left instance is generated with the mirror flag.
 */
export function buildIceEmblem(): THREE.BufferGeometry {
	const parts: THREE.BufferGeometry[] = [
		buildCentralSpike(),
		buildUpperCrown(),
		buildSideBlade(false),
		buildSideBlade(true),
		buildLowerBlade(false),
		buildLowerBlade(true),
		buildSpadeTail(),
		...buildSpheres(),
	];

	/*
	 * Keep the merge input uniformly non-indexed as required by the component's
	 * unified geometry pipeline. `toNonIndexed()` copies each generator's smooth
	 * vertex normals, so they must not be recomputed afterward (doing so on a
	 * non-indexed mesh would replace them with flat triangle normals).
	 *
	 * SphereGeometry includes UVs while the procedural shells do not; UVs are
	 * unused by this material and removed to keep merge attributes identical.
	 */
	const normalized = parts.map(part => {
		const geometry = part.index ? part.toNonIndexed() : part.clone();
		geometry.deleteAttribute("uv");
		return geometry;
	});

	const merged = mergeGeometries(normalized, false);
	if (!merged) throw new Error("[ice] mergeGeometries returned null.");

	normalized.forEach(geometry => geometry.dispose());
	parts.forEach(geometry => geometry.dispose());

	merged.center();
	merged.computeBoundingBox();
	merged.computeBoundingSphere();
	return merged;
}
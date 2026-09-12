import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildCentralSpike } from "./central-spike";
import { buildUpperCrown } from "./upper-crown";
import { buildSideBlade } from "./side-blade";
import { buildLowerBlade } from "./lower-blade";
import { buildSpadeTail } from "./spade-tail";
import { buildSpheres } from "./spheres";


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
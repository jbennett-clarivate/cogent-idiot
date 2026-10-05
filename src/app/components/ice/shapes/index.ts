import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildCentralSpike } from "./central-spike";
import { buildUpperCrown } from "./upper-crown";
import { buildSideSpike } from "./side-spike";
import { buildLowerSpike } from "./lower-spike";
import { buildSpadeTail } from "./spade-tail";
import { buildSpheres } from "./spheres";

export function buildIceEmblem(): THREE.BufferGeometry {
	const parts: THREE.BufferGeometry[] = [
		buildCentralSpike(),
		buildUpperCrown(),
		buildSideSpike(false),
		buildSideSpike(true),
		buildLowerSpike(false),
		buildLowerSpike(true),
		buildSpadeTail(),
		...buildSpheres(),
	];

	// Each part shades itself before it ever meets the others, so at every seam
	// - spike into crown, spike into crown, dome into tube - two independently
	// computed normals meet at the same point and disagree, and that mismatch
	// shows up as a hard crease or a wavy ripple right at the join even though
	// the surface itself is continuous there. Dropping each part's own normals,
	// welding every coincident vertex across the whole merged model into one
	// shared vertex, and computing normals once on that unified surface makes
	// every seam shade as smoothly as the rest of the piece.
	const normalized = parts.map(part => {
		const geometry = part.index ? part.toNonIndexed() : part.clone();
		geometry.deleteAttribute("uv");
		geometry.deleteAttribute("normal");
		return geometry;
	});

	const merged = mergeGeometries(normalized, false);
	if (!merged) throw new Error("[ice] mergeGeometries returned null.");

	normalized.forEach(geometry => geometry.dispose());
	parts.forEach(geometry => geometry.dispose());

	const welded = mergeVertices(merged);
	welded.computeVertexNormals();
	merged.dispose();

	welded.center();
	welded.computeBoundingBox();
	welded.computeBoundingSphere();
	return welded;
}

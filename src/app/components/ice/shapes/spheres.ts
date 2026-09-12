import * as THREE from "three";
import { buildSphere } from "./shape-utils";

/**
 * Objects 8 & 9 — the two decorative spheres.
 *
 * Built from the two filled circles in 3d-image.svg (centre [x, y] and radius,
 * raw viewBox units). NOTE: these are NOT a mirror pair — the circles are
 * placed independently in the SVG with slightly different centres (same radius),
 * so each is authored explicitly rather than via a mirror flag. They remain
 * full, single-shell spheres.
 */
export function buildSpheres(): THREE.BufferGeometry[] {
	return [
		buildSphere(8041, 17232, 423), // left circle
		buildSphere(13454, 17117, 423), // right circle
	];
}

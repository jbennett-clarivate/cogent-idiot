import * as THREE from "three";
import { buildSphere } from "./shape-utils";

/**
 * Objects 8 & 9 - The two spheres.
 * Built from the two filled circles in 3d-image.svg: centre [x, y] and radius
 * in viewBox units.
 */
export function buildLeftSphere(): THREE.BufferGeometry {
	return buildSphere(8041, 17232, 423);
}

export function buildRightSphere(): THREE.BufferGeometry {
	return buildSphere(13454, 17117, 423);
}
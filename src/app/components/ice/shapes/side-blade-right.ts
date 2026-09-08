import * as THREE from "three";
import { extrudeContour } from "./shape-utils";

/**
 * Object 3 - Right side blade.
 * The long near-horizontal crystal sweeping out to the right edge.
 * Contour traced from the filled "Right side blade" path in 3d-image.svg.
 */
export function buildSideBladeRight(): THREE.BufferGeometry {
	return extrudeContour([
		[13031, 14444],
		[13313, 14162],
		[13828, 14162],
		[14437, 15287],
		[20155, 16590],
		[13828, 16079],
	]);
}
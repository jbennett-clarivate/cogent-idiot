import * as THREE from "three";
import { extrudeContour } from "./shape-utils";

/**
 * Object 4 - Left side blade.
 * Mirror of the right side blade, sweeping out to the left edge.
 * Contour traced from the filled "Left side blade" path in 3d-image.svg.
 */
export function buildSideBladeLeft(): THREE.BufferGeometry {
	return extrudeContour([
		[8523, 14444],
		[8241, 14162],
		[7726, 14162],
		[7117, 15287],
		[1399, 16590],
		[7726, 16079],
	]);
}
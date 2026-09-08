import * as THREE from "three";
import { extrudeContour } from "./shape-utils";

/**
 * Object 6 - Left lower blade.
 * Mirror of the right lower blade, angled down-and-outward to the lower left.
 * Contour traced from the filled "Left lower blade" path in 3d-image.svg.
 */
export function buildLowerBladeLeft(): THREE.BufferGeometry {
	return extrudeContour([
		[10210, 16694],
		[8555, 15451],
		[8303, 15568],
		[8320, 16021],
		[9576, 16907],
		[6587, 21586],
		[10086, 17435],
		[10210, 16975],
	]);
}
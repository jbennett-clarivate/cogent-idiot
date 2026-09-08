import * as THREE from "three";
import { extrudeContour } from "./shape-utils";

/**
 * Object 5 - Right lower blade.
 * The long crystal angled down-and-outward to the lower right.
 * Contour traced from the filled "Right lower blade" path in 3d-image.svg.
 */
export function buildLowerBladeRight(): THREE.BufferGeometry {
	return extrudeContour([
		[11344, 16694],
		[12999, 15451],
		[13251, 15568],
		[13234, 16021],
		[11978, 16907],
		[14967, 21586],
		[11468, 17435],
		[11344, 16975],
	]);
}
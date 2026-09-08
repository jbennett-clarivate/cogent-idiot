import * as THREE from "three";
import { extrudeContour } from "./shape-utils";

/**
 * Object 2 - Upper crown.
 * The cluster of inner teeth around the centre-top, spanning the symmetry
 * axis. Contour traced from the filled "Upper crown" path in 3d-image.svg.
 */
export function buildUpperCrown(): THREE.BufferGeometry {
	return extrudeContour([
		[10777, 15849],
		[11906, 15006],
		[11626, 14162],
		[11626, 13677],
		[12054, 13600],
		[12405, 13882],
		[12750, 15006],
		[12750, 15287],
		[10777, 16694],
		[8805, 15287],
		[8804, 15006],
		[9149, 13882],
		[9500, 13600],
		[9928, 13677],
		[9928, 14162],
		[9648, 15006],
	]);
}
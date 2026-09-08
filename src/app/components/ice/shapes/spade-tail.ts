import * as THREE from "three";
import { extrudeContour } from "./shape-utils";

/**
 * Object 7 - Central spade tail.
 * The elongated spade shape hanging straight down from the centre, spanning
 * the symmetry axis. Contour traced from the filled "Central spade tail" path
 * in 3d-image.svg.
 */
export function buildSpadeTail(): THREE.BufferGeometry {
	return extrudeContour([
		[10777, 16974],
		[11710, 18396],
		[11091, 19050],
		[10777, 25130],
		[10463, 19050],
		[9844, 18396],
	]);
}
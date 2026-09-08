import * as THREE from "three";
import { extrudeContour } from "./shape-utils";

/**
 * Object 1 - Central spike.
 * The tall vertical crystal rising from the centre to the top point.
 * Contour traced from the filled "Central spike" path in 3d-image.svg.
 */
export function buildCentralSpike(): THREE.BufferGeometry {
	return extrudeContour([
		[10777, 5445],
		[11343, 15006],
		[10777, 15568],
		[10211, 15006],
	]);
}
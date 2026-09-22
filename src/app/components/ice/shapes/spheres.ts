import * as THREE from "three";
import { buildSphere } from "./shape-utils";
import { SPHERES } from "./emblem-source";

export function buildSpheres(): THREE.BufferGeometry[] {
	return SPHERES.map(({ x, y, r }) => buildSphere(x, y, r));
}

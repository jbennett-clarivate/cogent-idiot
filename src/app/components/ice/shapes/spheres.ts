import * as THREE from "three";
import { buildSphere } from "./shape-utils";

export function buildSpheres(): THREE.BufferGeometry[] {
	return [
		buildSphere(8041, 17232, 423), // left circle
		buildSphere(13454, 17117, 423), // right circle
	];
}

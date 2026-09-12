import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";

export function buildSpadeTail(): THREE.BufferGeometry {
	const polygon = [
		[10777, 16974],
		[11710, 18396],
		[11091, 19050],
		[10777, 25130],
		[10463, 19050],
		[9844, 18396],
	];

	return buildEnvelopeSweep({
		name: "spade-tail",
		polygon,
		centerline: [
			[10777, 16974],
			[10777, 18396],
			[10777, 19050],
			[10777, 21500],
			[10777, 25130],
		],
		startCap: "apex",
		endCap: "apex",
		tubularSegments: 80,
		radialSegments: 28,
	});
}
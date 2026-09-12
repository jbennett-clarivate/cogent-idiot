import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";

export function buildCentralSpike(): THREE.BufferGeometry {
	const polygon = [
		[10777, 5445],
		[11343, 15006],
		[10777, 15568],
		[10211, 15006],
	];

	return buildEnvelopeSweep({
		name: "central-spike",
		polygon,
		centerline: [
			[10777, 5445],
			[10777, 12000],
			[10777, 15006],
			[10777, 15568],
		],
		startCap: "apex",
		endCap: "apex",
		tubularSegments: 56,
		radialSegments: 28,
	});
}
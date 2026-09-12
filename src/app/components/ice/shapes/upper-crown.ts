import * as THREE from "three";
import { buildEnvelopeSweep } from "./shape-utils";

export function buildUpperCrown(): THREE.BufferGeometry {
	const polygon = [
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
	];

	return buildEnvelopeSweep({
		name: "upper-crown",
		polygon,
		centerline: [
			[9777, 13950],
			[9430, 14700],
			[9720, 15400],
			[10777, 16000],
			[11834, 15400],
			[12124, 14700],
			[11777, 13950],
		],
		startCap: "dome",
		endCap: "dome",
		tubularSegments: 64,
		radialSegments: 24,
	});
}
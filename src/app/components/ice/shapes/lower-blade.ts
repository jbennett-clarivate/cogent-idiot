import * as THREE from "three";
import { buildEnvelopeSweep, mirrorPoints } from "./shape-utils";

export function buildLowerBlade(mirror = false): THREE.BufferGeometry {
	const polygon = [
		[11344, 16694],
		[12999, 15451],
		[13251, 15568],
		[13234, 16021],
		[11978, 16907],
		[14967, 21586],
		[11468, 17435],
		[11344, 16975],
	];

	const centerline = [
		[11723, 17171],
		[12794, 18628],
		[13864, 20085],
		[14967, 21586],
	];

	return buildEnvelopeSweep({
		name: mirror ? "lower-blade-left" : "lower-blade-right",
		polygon: mirror ? mirrorPoints(polygon) : polygon,
		centerline: mirror ? mirrorPoints(centerline) : centerline,
		startCap: "dome",
		endCap: "apex",
		tubularSegments: 56,
		radialSegments: 24,
	});
}
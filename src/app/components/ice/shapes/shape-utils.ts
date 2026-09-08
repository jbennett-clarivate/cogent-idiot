import * as THREE from "three";

/**
 * Shared helpers for building the ice emblem's individual objects from the
 * coordinates in src/assets/images/3d-image.svg.
 *
 * The SVG viewBox is 0 0 21590 27940 with a bilateral symmetry axis at
 * x = 10777. All object files author their outlines in those raw viewBox units
 * and convert to world space through `toWorld` so every piece stays aligned.
 */

/** SVG viewBox centre X (symmetry axis). */
export const CX = 10777;
/** SVG viewBox reference Y (vertical centring). */
export const CY = 15287;
/** viewBox-units -> world-units scale factor. */
export const SCALE = 0.00024;

/** Uniform extrude depth for every flat crystal object (world units). */
export const DEPTH = 0.16;

/** Converts a raw SVG [x, y] (viewBox units) to a world-space Vector2. */
export const toWorld = (x: number, y: number): THREE.Vector2 =>
	new THREE.Vector2((x - CX) * SCALE, -(y - CY) * SCALE);

/**
 * Bevel-extrudes a closed contour (a flat list of raw SVG [x, y] pairs) into a
 * faceted crystal slab centred on z = 0.
 */
export function extrudeContour(contour: number[][]): THREE.BufferGeometry {
	const shape = new THREE.Shape(contour.map(([x, y]) => toWorld(x, y)));
	const geometry = new THREE.ExtrudeGeometry(shape, {
		depth: DEPTH,
		steps: 1,
		bevelEnabled: true,
		bevelThickness: 0.04,
		bevelSize: 0.03,
		bevelOffset: 0,
		bevelSegments: 2,
		curveSegments: 4,
	});
	geometry.translate(0, 0, -DEPTH / 2);
	return geometry;
}

/**
 * Builds a sphere from a raw SVG circle: centre [x, y] and radius r, all in
 * viewBox units, positioned in world space on the z = 0 plane.
 */
export function buildSphere(x: number, y: number, r: number): THREE.BufferGeometry {
	const sphere = new THREE.SphereGeometry(r * SCALE, 32, 24);
	const p = toWorld(x, y);
	sphere.translate(p.x, p.y, 0);
	return sphere;
}
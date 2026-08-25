/// <reference types="@webgpu/types" />
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** A single [x, y] coordinate in the tattoo reference SVG's viewBox space. */
type SvgPoint = readonly [number, number];

@Component({
	selector: "app-ice",
	imports: [CommonModule, FormsModule],
	templateUrl: "./ice.html",
	styleUrls: ["./ice.scss"],
})
export class IceComponent implements AfterViewInit, OnDestroy {
	@ViewChild("iceCanvas", { static: false }) iceCanvas!: ElementRef<HTMLCanvasElement>;

	// UI-bound controls
	autoRotate = signal<boolean>(true);
	thickness = signal<number>(1.5);
	roughness = signal<number>(0.12);
	tint = signal<string>("#bfe9ff");

	private renderer?: THREE.WebGLRenderer;
	private scene?: THREE.Scene;
	private camera?: THREE.PerspectiveCamera;
	private controls?: OrbitControls;
	private mesh?: THREE.Mesh;
	private material?: THREE.MeshPhysicalMaterial;
	private thicknessMap?: THREE.DataTexture;
	private pmrem?: THREE.PMREMGenerator;
	private animationId?: number;
	private resizeObserver?: ResizeObserver;

	constructor(private ngZone: NgZone) {}

	ngAfterViewInit(): void {
		this.initScene();
		this.ngZone.runOutsideAngular(() => this.animate());
	}

	ngOnDestroy(): void {
		if (this.animationId !== undefined) {
			cancelAnimationFrame(this.animationId);
		}
		this.resizeObserver?.disconnect();
		this.controls?.dispose();
		this.mesh?.geometry.dispose();
		this.material?.dispose();
		this.thicknessMap?.dispose();
		this.pmrem?.dispose();
		this.renderer?.dispose();
	}

	private initScene(): void {
		const canvas = this.iceCanvas.nativeElement;
		const parent = canvas.parentElement as HTMLElement;
		const width = parent.clientWidth || 600;
		const height = parent.clientHeight || 600;

		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(width, height, false);
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.1;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x000000);

		this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
		this.camera.position.set(0, 0, 8);

		// Environment for realistic refraction/reflection
		this.pmrem = new THREE.PMREMGenerator(this.renderer);
		const envScene = new RoomEnvironment();
		this.scene.environment = this.pmrem.fromScene(envScene, 0.04).texture;

		// Lighting
		const key = new THREE.DirectionalLight(0xffffff, 2.0);
		key.position.set(5, 8, 6);
		this.scene.add(key);
		const rim = new THREE.DirectionalLight(0x88ccff, 1.2);
		rim.position.set(-6, -2, -4);
		this.scene.add(rim);
		this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));

		// Ice material
		this.material = new THREE.MeshPhysicalMaterial({
			color: new THREE.Color(this.tint()),
			metalness: 0,
			roughness: this.roughness(),
			transmission: 1,
			thickness: this.thickness(),
			ior: 1.31,
			clearcoat: 1,
			clearcoatRoughness: 0.06,
			attenuationColor: new THREE.Color(this.tint()),
			attenuationDistance: 1.4,
			envMapIntensity: 1.25,
		});

		// Symmetric ice emblem geometry built from the tattoo reference SVG
		const geometry = this.buildIceGeometry();
		this.mesh = new THREE.Mesh(geometry, this.material);
		this.scene.add(this.mesh);

		// Controls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.08;
		this.controls.minDistance = 3;
		this.controls.maxDistance = 20;

		// Responsive resize
		this.resizeObserver = new ResizeObserver(() => this.onResize());
		this.resizeObserver.observe(parent);
	}

	/**
	 * Builds the solid ice regions enclosed by the line work in
	 * src/assets/images/tattoo-reference.svg.
	 *
	 * The SVG lines are boundaries rather than the sculpture itself. They form
	 * seven closed regions: two central spikes, one central wing, and mirrored
	 * pairs of side and lower blades. Each region is filled, extruded, and
	 * beveled independently so the original boundaries remain visible as
	 * sculpted seams while the pointed contours create naturally tapered
	 * icicles.
	 */
	private buildIceGeometry(): THREE.BufferGeometry {
		// SVG viewBox: 0 0 400 560; bilateral symmetry axis: x = 200.
		const cx = 200;
		const cy = 280;
		const scale = 0.011;
		const mirror = ([x, y]: SvgPoint): SvgPoint => [400 - x, y];
		const toWorld = ([x, y]: SvgPoint): THREE.Vector2 =>
			new THREE.Vector2((x - cx) * scale, -(y - cy) * scale);

		// Closed contours reconstructed from the SVG's connected line segments.
		const upperSpike: SvgPoint[] = [
			[200, 32.7],
			[187.3, 223.2],
			[200, 242.3],
			[212.7, 223.2],
		];

		const upperWing: SvgPoint[] = [
			[200, 254.9],
			[142.8, 229.5],
			[174.6, 204.1],
			[117.4, 229.5],
			[200, 274],
			[282.6, 229.5],
			[225.4, 204.1],
			[257.2, 229.5],
		];

		const sideBladeLeft: SvgPoint[] = [
			[123.8, 210.5],
			[98.4, 229.5],
			[117.4, 248.6],
			[15.8, 369.2],
			[98.4, 248.6],
			[73, 223.2],
		];

		const lowerBladeLeft: SvgPoint[] = [
			[130.1, 248.6],
			[180.9, 280.3],
			[66.6, 483.5],
			[161.9, 286.7],
		];

		const lowerSpike: SvgPoint[] = [
			[200, 286.7],
			[180.9, 318.5],
			[193.6, 331.2],
			[200, 528],
			[206.4, 331.2],
			[219.1, 318.5],
		];

		const svgContours: SvgPoint[][] = [
			upperSpike,
			upperWing,
			sideBladeLeft,
			sideBladeLeft.map(mirror),
			lowerBladeLeft,
			lowerBladeLeft.map(mirror),
			lowerSpike,
		];

		// Convert every contour to world-space once so the extruded geometry,
		// the planar UVs, and the thickness map are all derived from the exact
		// same outlines and therefore cannot drift apart.
		const contours: THREE.Vector2[][] = svgContours.map(contour => contour.map(toWorld));

		// Planar bounds spanning all contours; used for both UVs and the map.
		const bounds = new THREE.Box2();
		for (const contour of contours) {
			for (const point of contour) bounds.expandByPoint(point);
		}

		const depth = 0.32;
		const extrudeSettings: THREE.ExtrudeGeometryOptions = {
			depth,
			steps: 1,
			bevelEnabled: true,
			bevelThickness: 0.055,
			bevelSize: 0.035,
			bevelOffset: 0,
			bevelSegments: 4,
			curveSegments: 1,
		};

		const parts = contours.map(contour => {
			const shape = new THREE.Shape(contour);
			const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
			// ExtrudeGeometry grows along +Z; center its depth around z = 0.
			geometry.translate(0, 0, -depth / 2);
			return geometry;
		});

		const merged = mergeGeometries(parts, false);
		parts.forEach(geometry => geometry.dispose());

		// Assign planar UVs from the world XY position (before centering) so the
		// thickness map, authored in the same planar space, lines up exactly.
		this.assignPlanarUVs(merged, bounds);

		// Build the edge-distance thickness map from the same contours and wire
		// it into the material as the per-fragment optical-depth field.
		this.thicknessMap = this.buildThicknessTexture(contours, bounds);
		if (this.material) this.material.thicknessMap = this.thicknessMap;

		merged.computeVertexNormals();
		merged.center();
		return merged;
	}

	/**
	 * Projects world-space XY onto normalized [0, 1] UVs over the emblem bounds.
	 * The extruded caps and side walls therefore sample the thickness map by
	 * planar position, matching how the map is rasterized.
	 */
	private assignPlanarUVs(geometry: THREE.BufferGeometry, bounds: THREE.Box2): void {
		const position = geometry.getAttribute("position") as THREE.BufferAttribute;
		const width = bounds.max.x - bounds.min.x || 1;
		const height = bounds.max.y - bounds.min.y || 1;
		const uv = new Float32Array(position.count * 2);
		for (let i = 0; i < position.count; i++) {
			const x = position.getX(i);
			const y = position.getY(i);
			uv[i * 2] = (x - bounds.min.x) / width;
			uv[i * 2 + 1] = (y - bounds.min.y) / height;
		}
		geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
	}

	/**
	 * Rasterizes an edge-distance field over the emblem bounds into the green
	 * channel of a DataTexture (the channel MeshPhysicalMaterial reads for
	 * thicknessMap). Points near a contour edge or tip map toward 0 (optically
	 * thin) while broad interiors map toward 1 (optically thick). The global
	 * `thickness` slider then scales this normalized field uniformly.
	 */
	private buildThicknessTexture(contours: THREE.Vector2[][], bounds: THREE.Box2): THREE.DataTexture {
		const resolution = 256;
		const width = bounds.max.x - bounds.min.x || 1;
		const height = bounds.max.y - bounds.min.y || 1;
		const field = new Float32Array(resolution * resolution);
		let maxDistance = 0;

		for (let j = 0; j < resolution; j++) {
			// Row 0 maps to v = 0 (y = min); DataTexture does not flip Y.
			const y = bounds.min.y + ((j + 0.5) / resolution) * height;
			for (let i = 0; i < resolution; i++) {
				const x = bounds.min.x + ((i + 0.5) / resolution) * width;
				let best = 0;
				for (const contour of contours) {
					if (!this.pointInPolygon(x, y, contour)) continue;
					const distance = this.distanceToPolygonEdge(x, y, contour);
					if (distance > best) best = distance;
				}
				const index = j * resolution + i;
				field[index] = best;
				if (best > maxDistance) maxDistance = best;
			}
		}

		const data = new Uint8Array(resolution * resolution * 4);
		const inverseMax = maxDistance > 0 ? 1 / maxDistance : 0;
		for (let k = 0; k < field.length; k++) {
			const normalized = Math.min(1, field[k] * inverseMax);
			const value = Math.round(normalized * 255);
			data[k * 4] = 0; // R unused
			data[k * 4 + 1] = value; // G: thicknessMap channel
			data[k * 4 + 2] = 0; // B unused
			data[k * 4 + 3] = 255; // A
		}

		const texture = new THREE.DataTexture(data, resolution, resolution, THREE.RGBAFormat);
		texture.wrapS = THREE.ClampToEdgeWrapping;
		texture.wrapT = THREE.ClampToEdgeWrapping;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.needsUpdate = true;
		return texture;
	}

	/** Ray-casting point-in-polygon test in world XY. */
	private pointInPolygon(x: number, y: number, polygon: THREE.Vector2[]): boolean {
		let inside = false;
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			const xi = polygon[i].x;
			const yi = polygon[i].y;
			const xj = polygon[j].x;
			const yj = polygon[j].y;
			const intersects =
				yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
			if (intersects) inside = !inside;
		}
		return inside;
	}

	/** Shortest distance from a point to any edge segment of the polygon. */
	private distanceToPolygonEdge(x: number, y: number, polygon: THREE.Vector2[]): number {
		let min = Infinity;
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			const distance = this.distanceToSegment(x, y, polygon[j], polygon[i]);
			if (distance < min) min = distance;
		}
		return min;
	}

	/** Distance from point (x, y) to the segment a-b. */
	private distanceToSegment(x: number, y: number, a: THREE.Vector2, b: THREE.Vector2): number {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const lengthSquared = dx * dx + dy * dy;
		if (lengthSquared === 0) return Math.hypot(x - a.x, y - a.y);
		let t = ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared;
		t = Math.max(0, Math.min(1, t));
		return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
	}

	private onResize(): void {
		if (!this.renderer || !this.camera) return;
		const canvas = this.iceCanvas.nativeElement;
		const parent = canvas.parentElement as HTMLElement;
		const width = parent.clientWidth || 600;
		const height = parent.clientHeight || 600;
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	private animate = (): void => {
		this.animationId = requestAnimationFrame(this.animate);
		if (this.mesh && this.autoRotate()) {
			this.mesh.rotation.y += 0.005;
		}
		this.controls?.update();
		if (this.renderer && this.scene && this.camera) {
			this.renderer.render(this.scene, this.camera);
		}
	};

	// UI handlers
	toggleAutoRotate(): void {
		this.autoRotate.update(v => !v);
	}
	onThicknessChange(value: number): void {
		this.thickness.set(value);
		if (this.material) this.material.thickness = value;
	}

	onRoughnessChange(value: number): void {
		this.roughness.set(value);
		if (this.material) this.material.roughness = value;
	}

	onTintChange(value: string): void {
		this.tint.set(value);
		if (this.material) {
			this.material.color.set(value);
			this.material.attenuationColor.set(value);
		}
	}

	resetView(): void {
		if (this.camera && this.controls) {
			this.camera.position.set(0, 0, 8);
			this.controls.target.set(0, 0, 0);
			this.controls.update();
		}
	}
}
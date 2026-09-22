import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, Input } from "@angular/core";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildIceEmblem } from "@components/ice/shapes";

// A decorative, non-interactive miniature of the `ice` tool's emblem: same
// geometry and the same default material, but no controls, no OrbitControls
// and a transparent background so it floats over whatever is behind it.
@Component({
	selector: "app-ice-emblem",
	template: "<canvas #emblemCanvas class=\"emblem-canvas\"></canvas>",
	styleUrls: ["./ice-emblem.scss"],
})
export class IceEmblemComponent implements AfterViewInit, OnDestroy {
	@ViewChild("emblemCanvas", { static: true }) emblemCanvas!: ElementRef<HTMLCanvasElement>;

	// Pulls the camera back or in; the emblem itself is never scaled.
	@Input() distance = 9;

	private renderer?: THREE.WebGLRenderer;
	private scene?: THREE.Scene;
	private camera?: THREE.PerspectiveCamera;
	private mesh?: THREE.Mesh;
	private material?: THREE.MeshPhysicalMaterial;
	private pmrem?: THREE.PMREMGenerator;
	private environment?: THREE.WebGLRenderTarget;
	private animationId?: number;
	private resizeObserver?: ResizeObserver;

	constructor(private ngZone: NgZone) {}

	ngAfterViewInit(): void {
		this.initScene();
		this.ngZone.runOutsideAngular(() => this.animate());
	}

	ngOnDestroy(): void {
		if (this.animationId !== undefined) cancelAnimationFrame(this.animationId);
		this.resizeObserver?.disconnect();
		this.mesh?.geometry.dispose();
		this.material?.dispose();
		this.environment?.dispose();
		this.pmrem?.dispose();
		this.renderer?.dispose();
	}

	private initScene(): void {
		const canvas = this.emblemCanvas.nativeElement;
		const parent = canvas.parentElement as HTMLElement;
		const { width, height } = this.size();

		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(width, height, false);
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.1;
		// Transparent clear colour: the page shows through around the emblem.
		this.renderer.setClearColor(0x000000, 0);

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
		this.camera.position.set(0, 0, this.distance);

		this.pmrem = new THREE.PMREMGenerator(this.renderer);
		this.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04);
		this.scene.environment = this.environment.texture;

		const key = new THREE.DirectionalLight(0xffffff, 2.0);
		key.position.set(5, 8, 6);
		this.scene.add(key);
		const rim = new THREE.DirectionalLight(0x88ccff, 1.2);
		rim.position.set(-6, -2, -4);
		this.scene.add(rim);
		this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

		// Mirrors the ice tool's defaults, with its solidity of 0.10 already
		// folded into transmission (lerp(1, 0.90, 0.10) = 0.99).
		this.material = new THREE.MeshPhysicalMaterial({
			color: new THREE.Color("#bfe9ff"),
			metalness: 0.10,
			roughness: 0.30,
			transmission: 0.99,
			thickness: 2.0,
			ior: 1.30,
			specularIntensity: 0.90,
			specularColor: new THREE.Color("#ffffff"),
			clearcoat: 1,
			clearcoatRoughness: 0.06,
			attenuationColor: new THREE.Color("#bfe9ff"),
			attenuationDistance: 1.4,
			envMapIntensity: 1.25,
			side: THREE.DoubleSide,
			forceSinglePass: false,
		});

		this.mesh = new THREE.Mesh(buildIceEmblem(), this.material);
		this.scene.add(this.mesh);

		this.resizeObserver = new ResizeObserver(() => this.onResize());
		this.resizeObserver.observe(parent);
	}

	private size(): { width: number; height: number } {
		const parent = this.emblemCanvas.nativeElement.parentElement as HTMLElement;
		return {
			width: parent.clientWidth || 200,
			height: parent.clientHeight || 200,
		};
	}

	private onResize(): void {
		if (!this.renderer || !this.camera) return;
		const { width, height } = this.size();
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	private animate = (): void => {
		this.animationId = requestAnimationFrame(this.animate);
		if (this.mesh) this.mesh.rotation.y += 0.005;
		if (this.renderer && this.scene && this.camera) {
			this.renderer.render(this.scene, this.camera);
		}
	};
}

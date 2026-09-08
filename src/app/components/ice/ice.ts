/// <reference types="@webgpu/types" />
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildIceEmblem } from "./shapes";

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
	private pmrem?: THREE.PMREMGenerator;
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
		this.controls?.dispose();
		this.mesh?.geometry.dispose();
		this.material?.dispose();
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
		this.scene.background = new THREE.Color(0x0a1622);

		this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
		this.camera.position.set(0, 0, 9);

		this.pmrem = new THREE.PMREMGenerator(this.renderer);
		this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

		const key = new THREE.DirectionalLight(0xffffff, 2.0);
		key.position.set(5, 8, 6);
		this.scene.add(key);
		const rim = new THREE.DirectionalLight(0x88ccff, 1.2);
		rim.position.set(-6, -2, -4);
		this.scene.add(rim);
		this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

		this.material = new THREE.MeshPhysicalMaterial({
			color: new THREE.Color(this.tint()),
			metalness: 0,
			roughness: this.roughness(),
			transmission: 0,
			thickness: this.thickness(),
			ior: 1.31,
			clearcoat: 1,
			clearcoatRoughness: 0.06,
			attenuationColor: new THREE.Color(this.tint()),
			attenuationDistance: 1.4,
			envMapIntensity: 1.25,
			side: THREE.DoubleSide,
		});

		let geometry: THREE.BufferGeometry;
		try {
			geometry = buildIceEmblem();
			const pos = geometry.getAttribute("position");
			console.info("[ice] geometry built:", pos ? pos.count : 0, "vertices");
		} catch (err) {
			console.error("[ice] buildIceEmblem failed, using fallback cube:", err);
			geometry = new THREE.BoxGeometry(2, 2, 2);
		}
		this.mesh = new THREE.Mesh(geometry, this.material);
		this.scene.add(this.mesh);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.08;
		this.controls.minDistance = 3;
		this.controls.maxDistance = 20;

		this.resizeObserver = new ResizeObserver(() => this.onResize());
		this.resizeObserver.observe(parent);
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
		if (this.mesh && this.autoRotate()) this.mesh.rotation.y += 0.005;
		this.controls?.update();
		if (this.renderer && this.scene && this.camera) {
			this.renderer.render(this.scene, this.camera);
		}
	};

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
			this.camera.position.set(0, 0, 9);
			this.controls.target.set(0, 0, 0);
			this.controls.update();
		}
	}
}
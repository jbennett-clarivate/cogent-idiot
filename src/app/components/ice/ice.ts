/// <reference types="@webgpu/types" />
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildIceEmblem } from "./shapes";
import { quadrantAnchorPositioner } from "@services/quadrant-anchor-positioner";

@Component({
	selector: "app-ice",
	imports: [CommonModule, FormsModule],
	templateUrl: "./ice.html",
	styleUrls: ["./ice.scss"],
})
export class IceComponent implements AfterViewInit, OnDestroy {
	@ViewChild("iceCanvas", { static: false }) iceCanvas!: ElementRef<HTMLCanvasElement>;

	autoRotate = signal<boolean>(true);
	solidity = signal<number>(0.10);
	transmission = signal<number>(0.90);
	thickness = signal<number>(2.0);
	roughness = signal<number>(0.30);
	metalness = signal<number>(0.10);
	ior = signal<number>(1.30);
	specularIntensity = signal<number>(0.90);
	tint = signal<string>("#bfe9ff");
	specularColor = signal<string>("#ffffff");

	private renderer?: THREE.WebGLRenderer;
	private scene?: THREE.Scene;
	private camera?: THREE.PerspectiveCamera;
	private controls?: OrbitControls;
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
		// Tooltips live on the body, so they would outlast this component if it
		// were destroyed while one was open.
		document.querySelectorAll(".dynamic-tooltip").forEach(el => el.remove());
		if (this.animationId !== undefined) cancelAnimationFrame(this.animationId);
		this.resizeObserver?.disconnect();
		this.controls?.dispose();
		this.mesh?.geometry.dispose();
		this.material?.dispose();
		this.scene?.environment?.dispose();
		this.environment?.dispose();
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
		this.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04);
		this.scene.environment = this.environment.texture;

		const key = new THREE.DirectionalLight(0xffffff, 2.0);
		key.position.set(5, 8, 6);
		this.scene.add(key);
		const rim = new THREE.DirectionalLight(0x88ccff, 1.2);
		rim.position.set(-6, -2, -4);
		this.scene.add(rim);
		this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

		this.material = new THREE.MeshPhysicalMaterial({
			color: new THREE.Color(this.tint()),
			metalness: this.metalness(),
			roughness: this.roughness(),
			opacity: 1,
			transparent: false,
			transmission: this.effectiveTransmission(),
			thickness: this.thickness(),
			ior: this.ior(),
			specularIntensity: this.specularIntensity(),
			specularColor: new THREE.Color(this.specularColor()),
			clearcoat: 1,
			clearcoatRoughness: 0.06,
			attenuationColor: new THREE.Color(this.tint()),
			attenuationDistance: 1.4,
			envMapIntensity: 1.25,
			side: THREE.DoubleSide,
			forceSinglePass: false,
		});

		let geometry: THREE.BufferGeometry;
		try {
			geometry = buildIceEmblem();
			const position = geometry.getAttribute("position");
			console.info("[ice] geometry built:", position ? position.count : 0, "vertices");
		} catch (error) {
			console.error("[ice] buildIceEmblem failed, using fallback cube:", error);
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

	private effectiveTransmission(): number {
		const base = THREE.MathUtils.clamp(this.transmission(), 0, 1);
		const solid = THREE.MathUtils.clamp(this.solidity(), 0, 1);
		// At 0 the emblem is fully transmissive regardless of `base`; raising
		// solidity fades it in toward the requested transmission.
		return THREE.MathUtils.lerp(1, base, solid);
	}

	private updateTransmission(): void {
		if (!this.material) return;
		const next = this.effectiveTransmission();
		const was = this.material.transmission;
		this.material.transmission = next;
		if ((was <= 0) !== (next <= 0)) this.material.needsUpdate = true;
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

	// Reuses the app's quadrant-aware tooltip (see tool-wrapper and
	// quadrant-anchor-positioner): it positions `fixed` and flips its corner
	// pairing by viewport quadrant, so a description never renders off the top
	// of the page or gets clipped by an ancestor's overflow. The CSS-only
	// [data-title] tooltip cannot do either, and these controls sit close
	// enough to the top edge that it matters.
	//
	// Appended to the body rather than the trigger: the labels are nowrap
	// flex rows, so an extra child would perturb the control's own layout.
	showTooltip(event: MouseEvent, text: string): void {
		const trigger = event.currentTarget as HTMLElement;
		this.hideTooltip();

		const tooltip = document.createElement("div");
		tooltip.className = "anchor-content dynamic-tooltip";
		tooltip.textContent = text;
		document.body.appendChild(tooltip);

		quadrantAnchorPositioner.applyPosition(tooltip, trigger);
		requestAnimationFrame(() => tooltip.classList.add("visible"));
	}

	hideTooltip(): void {
		document.querySelectorAll(".dynamic-tooltip").forEach(element => {
			element.classList.remove("visible");
			setTimeout(() => element.parentNode?.removeChild(element), 200);
		});
	}

	toggleAutoRotate(): void {
		this.autoRotate.update(value => !value);
	}

	onSolidityChange(value: number | string): void {
		this.solidity.set(Number(value));
		this.updateTransmission();
	}

	onTransmissionChange(value: number | string): void {
		this.transmission.set(Number(value));
		this.updateTransmission();
	}

	onThicknessChange(value: number | string): void {
		const v = Number(value);
		this.thickness.set(v);
		if (this.material) this.material.thickness = v;
	}

	onRoughnessChange(value: number | string): void {
		const v = Number(value);
		this.roughness.set(v);
		if (this.material) this.material.roughness = v;
	}

	onMetalnessChange(value: number | string): void {
		const v = Number(value);
		this.metalness.set(v);
		if (this.material) this.material.metalness = v;
	}

	onIorChange(value: number | string): void {
		const v = Number(value);
		this.ior.set(v);
		if (this.material) this.material.ior = v;
	}

	onSpecularIntensityChange(value: number | string): void {
		const v = Number(value);
		this.specularIntensity.set(v);
		if (this.material) this.material.specularIntensity = v;
	}

	onTintChange(value: string): void {
		this.tint.set(value);
		if (this.material) {
			this.material.color.set(value);
			this.material.attenuationColor.set(value);
		}
	}

	onSpecularColorChange(value: string): void {
		this.specularColor.set(value);
		if (this.material) this.material.specularColor.set(value);
	}

	resetView(): void {
		if (this.camera && this.controls) {
			this.camera.position.set(0, 0, 9);
			this.controls.target.set(0, 0, 0);
			this.controls.update();
		}
	}
}


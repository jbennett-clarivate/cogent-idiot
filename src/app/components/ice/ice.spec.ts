import { TestBed } from "@angular/core/testing";
import { IceComponent } from "./ice";

// Pins the browser-compatibility contract for /tools/ice.
//
// LibreWolf (and Tor Browser, and hardened Firefox profiles) restrict WebGL
// to resist fingerprinting -- via `privacy.resistFingerprinting` as well as
// `webgl.disabled`, so a context can be refused even with the latter unset.
// In any of those cases
// `new THREE.WebGLRenderer()` THROWS, and because it is called from
// `initScene()` inside `ngAfterViewInit`, an unguarded throw aborts the
// lifecycle hook and the route renders a dead black box with an uncaught
// "Error creating WebGL context" in the console.
//
// The intent is that a browser which refuses WebGL gets an explanation
// instead of a broken page, so these tests assert the OBSERVABLE outcome --
// what the user sees in the container -- not that a helper was called.
//
// WebGL is forced off by stubbing the probe's canvas rather than by trusting
// the test browser's own capability, so the result is the same on a headless
// Firefox with or without working WebGL.

describe("IceComponent WebGL fallback", () => {
	let realCreateElement: typeof document.createElement;

	// Makes every probe canvas report what `webgl.disabled = true` reports.
	function disableWebGL(): void {
		spyOn(document, "createElement").and.callFake(((tag: string) => {
			const element = realCreateElement.call(document, tag);
			if (tag === "canvas") {
				(element as HTMLCanvasElement).getContext = (() => null) as never;
			}
			return element;
		}) as typeof document.createElement);
	}

	beforeEach(async () => {
		realCreateElement = document.createElement;
		await TestBed.configureTestingModule({ imports: [IceComponent] }).compileComponents();
	});

	it("renders the notice instead of the canvas when WebGL is refused", async () => {
		disableWebGL();
		const { resetWebGLSupportCache } = await import("@services/webgl-support");
		resetWebGLSupportCache();

		const fixture = TestBed.createComponent(IceComponent);
		// Must not throw: an uncaught error here is exactly the LibreWolf bug.
		expect(() => fixture.detectChanges()).not.toThrow();
		fixture.detectChanges();

		const host: HTMLElement = fixture.nativeElement;
		expect(host.querySelector(".webgl-unavailable")).withContext("fallback notice").toBeTruthy();
		expect(host.querySelector("canvas.ice-canvas")).withContext("canvas").toBeNull();
		// The notice has to say why, or it is just a different blank box.
		expect(host.querySelector(".webgl-unavailable")!.textContent)
			.toContain("privacy.resistFingerprinting");

		resetWebGLSupportCache();
	});

	it("destroys cleanly after falling back, having built no renderer", async () => {
		disableWebGL();
		const { resetWebGLSupportCache } = await import("@services/webgl-support");
		resetWebGLSupportCache();

		const fixture = TestBed.createComponent(IceComponent);
		fixture.detectChanges();
		expect(() => fixture.destroy()).not.toThrow();

		resetWebGLSupportCache();
	});
});

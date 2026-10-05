import { isWebGLAvailable, resetWebGLSupportCache } from "./webgl-support";

// These tests pin the contract that lets the 3D components degrade instead of
// throwing: `isWebGLAvailable()` must return false for EVERY way a browser can
// refuse a WebGL context, because each one of them makes
// `new THREE.WebGLRenderer()` throw and take out `ngAfterViewInit`.
//
// The motivating case is LibreWolf, which ships `webgl.disabled = true` as an
// anti-fingerprinting default. There `getContext()` returns null, but hardened
// and blocklisted setups have also been observed to throw outright or to hand
// back a context that is already lost -- hence one test per failure mode.
//
// The probe is stubbed at `document.createElement` rather than run against the
// real test browser, so these pass on a headless Firefox whether or not it has
// working WebGL (see .github/code-review.instructions.md on tests that must not
// depend on the host machine).

describe("isWebGLAvailable", () => {
	let createElement: typeof document.createElement;

	// Stands in for the probe canvas. `getContext` is whatever the test needs
	// the browser to do; nothing else on the canvas is touched by the probe.
	function stubCanvas(getContext: (id: string) => unknown): void {
		spyOn(document, "createElement").and.callFake(((tag: string) => {
			if (tag !== "canvas") return createElement.call(document, tag);
			return { getContext } as unknown as HTMLCanvasElement;
		}) as typeof document.createElement);
	}

	beforeEach(() => {
		createElement = document.createElement;
		// The answer is cached for the page lifetime, so every test must start
		// from an unprobed state or it would assert against the previous test.
		resetWebGLSupportCache();
	});

	afterEach(() => resetWebGLSupportCache());

	it("is true when the browser returns a live webgl2 context", () => {
		stubCanvas(id => (id === "webgl2" ? { isContextLost: () => false } : null));
		expect(isWebGLAvailable()).toBe(true);
	});

	it("is true when only webgl1 is available, which three still supports", () => {
		stubCanvas(id => (id === "webgl" ? { isContextLost: () => false } : null));
		expect(isWebGLAvailable()).toBe(true);
	});

	// LibreWolf's default: webgl.disabled = true makes getContext return null.
	it("is false when the browser refuses every context", () => {
		stubCanvas(() => null);
		expect(isWebGLAvailable()).toBe(false);
	});

	it("is false when getContext throws rather than returning null", () => {
		stubCanvas(() => {
			throw new Error("WebGL is currently disabled");
		});
		expect(isWebGLAvailable()).toBe(false);
	});

	// A context that exists but is already lost draws nothing, so rendering into
	// it would leave a blank canvas with no explanation -- worse than the notice.
	it("is false when the returned context is already lost", () => {
		stubCanvas(() => ({ isContextLost: () => true }));
		expect(isWebGLAvailable()).toBe(false);
	});

	it("probes only once, because live contexts are a limited resource", () => {
		let calls = 0;
		stubCanvas(() => {
			calls++;
			return { isContextLost: () => false };
		});
		isWebGLAvailable();
		isWebGLAvailable();
		isWebGLAvailable();
		expect(calls).toBe(1);
	});
});

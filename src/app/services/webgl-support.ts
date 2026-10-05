// LibreWolf, Tor Browser and hardened Firefox profiles restrict WebGL as an
// anti-fingerprinting measure, and some machines fail context creation on a
// blocklisted driver instead. Note that `webgl.disabled` is NOT the only
// gate: `privacy.resistFingerprinting` drives the canvas/WebGL permission
// path in CanvasUtils.cpp, which blocks the context on a site-by-site basis
// ("Blocked <origin> from creating WebGL context but prompting the user")
// even when `webgl.disabled` is false. Probing is the only reliable test. In
// every one of those cases `new THREE.WebGLRenderer()` throws, which takes
// out the whole `ngAfterViewInit` and leaves the route broken rather than
// merely un-rendered. Probing first lets the 3D components degrade to a
// static notice instead.
//
// The probe canvas is never attached to the document and is dropped as soon
// as the answer is known; the result is cached because a browser's answer
// cannot change within a page lifetime, and because repeated context
// creation counts against the browser's limit on live WebGL contexts.
let cached: boolean | undefined;

export function isWebGLAvailable(): boolean {
	if (cached !== undefined) return cached;
	cached = probe();
	return cached;
}

function probe(): boolean {
	try {
		const canvas = document.createElement("canvas");
		// `webgl2` is what three's WebGLRenderer asks for first; falling back
		// to `webgl` keeps older browsers that three still supports working.
		const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
		if (!context) return false;
		// A context that exists but is already lost renders nothing, so treat
		// it as unavailable rather than letting the component draw blank.
		return !(context as WebGLRenderingContext).isContextLost();
	} catch {
		// Blocked contexts can throw outright rather than returning null.
		return false;
	}
}

// Exposed for tests, which need to re-probe against a stubbed canvas.
export function resetWebGLSupportCache(): void {
	cached = undefined;
}

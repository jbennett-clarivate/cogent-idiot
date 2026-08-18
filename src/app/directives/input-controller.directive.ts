import {
	Directive,
	ElementRef,
	Input,
	OnInit,
	OnDestroy,
	Renderer2,
} from "@angular/core";

/**
 * A validator inspects the element and returns true when its value is valid.
 */
export type InputValidator = (el: HTMLInputElement) => boolean;

/**
 * An enforcer may mutate the element's value in place (e.g. strip characters).
 */
export type InputEnforcer = (el: HTMLInputElement) => void;

/**
 * A CSS callback applies feedback styling for the current validity state.
 */
export type InputCSS = (el: HTMLInputElement) => void;

/**
 * Angular port of the framework-agnostic `InputController`.
 *
 * On every `input` event it:
 *   1. runs the enforcer to clean up the raw value,
 *   2. runs the validator, and
 *   3. applies the valid/invalid CSS callback accordingly.
 *
 * All four behaviours are overridable via inputs; sensible defaults match the
 * original class (strip control chars, flag control chars as invalid).
 *
 * Angular manages the listener lifecycle for us: `Renderer2.listen` returns an
 * unlisten function that we invoke in `ngOnDestroy`, so there is no manual
 * `destroy()` to remember to call.
 */
@Directive({
	selector: "input[appInputController]",
	standalone: true,
})
export class InputControllerDirective implements OnInit, OnDestroy {
	static readonly DEFAULT_TEST_REGEXP = /\p{Cc}/u;
	static readonly DEFAULT_REPLACE_REGEXP = /\p{Cc}/gu;
	static readonly numberValidator: InputValidator = (el) =>
		el.value.trim() === "" || !Number.isNaN(Number(el.value));
	static readonly noWhitespaceEnforcer: InputEnforcer = (el) => {
		const cleaned = el.value.replace(/\s/g, "");
		if (el.value !== cleaned) {
			el.value = cleaned;
		}
	};
	static readonly digitsOnlyEnforcer: InputEnforcer = (el) => {
		const cleaned = el.value.replace(/\D/g, "");
		if (el.value !== cleaned) {
			el.value = cleaned;
		}
	};

	@Input() validator?: InputValidator;
	@Input() enforcer?: InputEnforcer;
	@Input() onValidCSS?: InputCSS;
	@Input() onInvalidCSS?: InputCSS;

	private unlisten?: () => void;

	constructor(
		private readonly elementRef: ElementRef<HTMLInputElement>,
		private readonly renderer: Renderer2,
	) {}

	ngOnInit(): void {
		const el = this.elementRef.nativeElement;

		if (!(el instanceof HTMLInputElement)) {
			throw new TypeError(
				"InputControllerDirective requires an HTMLInputElement",
			);
		}

		this.unlisten = this.renderer.listen(el, "input", () => this.handleInput());
	}

	ngOnDestroy(): void {
		this.unlisten?.();
	}

	private handleInput(): void {
		const el = this.elementRef.nativeElement;
		(this.enforcer ?? this.defaultEnforcer)(el);
		const valid = (this.validator ?? this.defaultValidator)(el);
		if (valid) {
			(this.onValidCSS ?? this.defaultValidCSS)(el);
		} else {
			(this.onInvalidCSS ?? this.defaultInvalidCSS)(el);
		}
	}

	private readonly defaultValidator: InputValidator = (el) =>
		!InputControllerDirective.DEFAULT_TEST_REGEXP.test(el.value);

	private readonly defaultEnforcer: InputEnforcer = (el) => {
		if (!el.value) {
			return;
		}
		const cleaned = el.value.replace(
			InputControllerDirective.DEFAULT_REPLACE_REGEXP,
			"",
		);
		if (el.value.length !== cleaned.length) {
			el.value = cleaned;
		}
	};

	private readonly defaultInvalidCSS: InputCSS = (el) => {
		el.animate(
			[{ transform: "translateX(4px)" }, { transform: "translateX(0)" }],
			{ duration: 150 },
		);
		this.renderer.setStyle(el, "outline", "2px solid red");
	};

	private readonly defaultValidCSS: InputCSS = (el) => {
		this.renderer.removeStyle(el, "outline");
	};
}
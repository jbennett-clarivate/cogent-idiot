import { Component, signal, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DecimalPipe } from "@angular/common";
import { BreakpointObserver } from "@angular/cdk/layout";

@Component({
	selector: "app-bayes",
	templateUrl: "./bayes.html",
	styleUrls: ["./bayes.scss"],
	imports: [FormsModule, DecimalPipe],
})
export class BayesComponent {
	suspicion = signal<number | null>(null);
	confirmedSuspicion = signal<number | null>(null);
	isFlexRow = signal(true);

	// Computed signals for derived values
	falseSuspicion = computed(() => {
		const suspicionVal = this.suspicion();
		return suspicionVal !== null ? 100 - suspicionVal : null;
	});

	confirmedFalseSuspicion = computed(() => {
		const confirmedSuspicionVal = this.confirmedSuspicion();
		return confirmedSuspicionVal !== null ? 100 - confirmedSuspicionVal : null;
	});

	rawAnswer = computed(() => {
		const suspicionVal = this.suspicion();
		const confirmedSuspicionVal = this.confirmedSuspicion();
		const falseSuspicionVal = this.falseSuspicion();
		const confirmedFalseSuspicionVal = this.confirmedFalseSuspicion();

		if (suspicionVal === null || confirmedSuspicionVal === null ||
			falseSuspicionVal === null || confirmedFalseSuspicionVal === null) {
			return 0;
		}

		// Convert percentage inputs to decimal values
		const suspicionDecimal = suspicionVal / 100;
		const confirmedSuspicionDecimal = confirmedSuspicionVal / 100;
		const falseSuspicionDecimal = 1 - suspicionDecimal;
		const confirmedFalseSuspicionDecimal = 1 - confirmedSuspicionDecimal;

		const p_E_H = suspicionDecimal * confirmedSuspicionDecimal;
		const p_E_NotH = falseSuspicionDecimal * confirmedFalseSuspicionDecimal;
		const displayAnswer = p_E_H / (p_E_H + p_E_NotH);

		return Number((displayAnswer).toFixed(3));
	});

	private resizeTimeout: any;

	constructor(private breakpointObserver: BreakpointObserver) {
		this.setFlexDirection();
		window.addEventListener("resize", () => {
			clearTimeout(this.resizeTimeout);
			this.resizeTimeout = setTimeout(() => {
				this.setFlexDirection();
			}, 150);
		});
	}

	setFlexDirection() {
		const isWide = window.innerWidth > 730;
		this.isFlexRow.set(isWide);
		console.log("Flex direction set:", isWide ? "row" : "column");
	}

	onSuspicionChange(): void {
		const suspicionVal = this.suspicion();
		if (suspicionVal === null || suspicionVal < 0 || suspicionVal > 100) {
			return;
		}
		// The falseSuspicion is automatically computed, no manual calculation needed
	}

	onConfirmedSuspicionChange(): void {
		const confirmedSuspicionVal = this.confirmedSuspicion();
		if (confirmedSuspicionVal === null || confirmedSuspicionVal < 0 || confirmedSuspicionVal > 100) {
			return;
		}
		// The confirmedFalseSuspicion is automatically computed, no manual calculation needed
	}

	reset(): void {
		this.suspicion.set(null);
		this.confirmedSuspicion.set(null);
		// falseSuspicion, confirmedFalseSuspicion, rawAnswer, and answer are computed signals
		// so they will automatically update when the base signals are reset
	}

	regenerateIt(): void {
		const rawAnswerVal = this.rawAnswer();
		if (rawAnswerVal === null || rawAnswerVal === 0) {
			this.suspicion.set(rawAnswerVal);
			this.onSuspicionChange();
		}

		const suspicionVal = this.suspicion();
		const confirmedSuspicionVal = this.confirmedSuspicion();
		const falseSuspicionVal = this.falseSuspicion();
		const confirmedFalseSuspicionVal = this.confirmedFalseSuspicion();

		if (suspicionVal !== null && confirmedSuspicionVal !== null &&
			falseSuspicionVal !== null && confirmedFalseSuspicionVal !== null) {

			const p_E_H = suspicionVal * confirmedSuspicionVal;
			const p_E_NotH = falseSuspicionVal * confirmedFalseSuspicionVal;
			const displayAnswer = p_E_H / (p_E_H + p_E_NotH);

			const newRawAnswer = Number((displayAnswer).toFixed(3));
			const newSuspicion = Math.round(1000 * displayAnswer) / 10;
			this.suspicion.set(newSuspicion);
			this.onSuspicionChange();
		} else {
			this.reset();
		}
	}

	get startButtonLabel(): string {
		return !this.rawAnswer() ? "✓ Start" : "♺ Reuse";
	}
}

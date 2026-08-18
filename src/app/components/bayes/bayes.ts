import { Component, signal, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DecimalPipe } from "@angular/common";
import { QuadrantAnchorDirective } from "../../directives/quadrant-anchor.directive";
import { InputControllerDirective } from "../../directives/input-controller.directive";
import { TOOL_INFO } from "@app/config/tool-info";
@Component({
	selector: "app-bayes",
	templateUrl: "./bayes.html",
	styleUrls: ["./bayes.scss"],
	imports: [FormsModule, DecimalPipe, QuadrantAnchorDirective, InputControllerDirective],
})
export class BayesComponent {
	readonly info = TOOL_INFO["/tools/bayes"].fields!;
	readonly numberValidator = InputControllerDirective.numberValidator;
	readonly noWhitespaceEnforcer = InputControllerDirective.noWhitespaceEnforcer;

	suspicion = signal<number | null>(null);
	confirmedSuspicion = signal<number | null>(null);
	confirmedFalseSuspicion = signal<number | null>(null);
	activeInfo = signal<string | null>(null);

	showInfo(key: string): void {
		this.activeInfo.set(key);
	}

	hideInfo(key: string): void {
		if (this.activeInfo() === key) {
			this.activeInfo.set(null);
		}
	}

	toggleInfo(key: string): void {
		this.activeInfo.set(this.activeInfo() === key ? null : key);
	}

	falseSuspicion = computed(() => {
		const suspicionVal = this.suspicion();
		return suspicionVal !== null ? 100 - suspicionVal : null;
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
		const suspicionDecimal = suspicionVal / 100;
		const confirmedSuspicionDecimal = confirmedSuspicionVal / 100;
		const falseSuspicionDecimal = falseSuspicionVal / 100;
		const confirmedFalseSuspicionDecimal = confirmedFalseSuspicionVal / 100;

		const p_E_H = suspicionDecimal * confirmedSuspicionDecimal;
		const p_E_NotH = falseSuspicionDecimal * confirmedFalseSuspicionDecimal;

		if (p_E_H + p_E_NotH === 0) {
			return 0;
		}

		const displayAnswer = p_E_H / (p_E_H + p_E_NotH);
		return Number((displayAnswer).toFixed(3));
	});

	onSuspicionChange(): void {
		const suspicionVal = this.suspicion();
		if (suspicionVal === null || suspicionVal < 0 || suspicionVal > 100) {
			return;
		}
	}

	onConfirmedSuspicionChange(): void {
		const confirmedSuspicionVal = this.confirmedSuspicion();
		if (confirmedSuspicionVal === null || confirmedSuspicionVal < 0 || confirmedSuspicionVal > 100) {
			return;
		}
	}

	onConfirmedFalseSuspicionChange(): void {
		const val = this.confirmedFalseSuspicion();
		if (val === null || val < 0 || val > 100) {
			return;
		}
	}

	reset(): void {
		this.suspicion.set(null);
		this.confirmedSuspicion.set(null);
		this.confirmedFalseSuspicion.set(null);
	}

	regenerateIt(): void {
		const rawAnswerVal = this.rawAnswer();
		if (!rawAnswerVal) {
			return;
		}
		this.suspicion.set(Math.round(1000 * rawAnswerVal) / 10);
		this.onSuspicionChange();
	}
	get startButtonLabel(): string {
		return !this.rawAnswer() ? "✓ Start" : "♺ Reuse";
	}
}


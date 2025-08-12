import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DecimalPipe} from '@angular/common';

@Component({
	selector: 'app-bayes',
	templateUrl: './bayes.html',
	styleUrls: ['./bayes.scss'],
	imports: [FormsModule, DecimalPipe]
})
export class BayesComponent {
	suspicion: number | null = null;
	confirmedSuspicion: number | null = null;
	falseSuspicion: number | null = null;
	confirmedFalseSuspicion: number | null = null;
	answer: number | null = null;
	rawAnswer: number = 0;

	onSuspicionChange(): void {
		if (this.suspicion === null || this.suspicion < 0 || this.suspicion > 100) {
			return;
		}
		this.falseSuspicion = (100 - this.suspicion);
		this.calculateAnswer();
	}

	onConfirmedSuspicionChange(): void {
		if (this.confirmedSuspicion === null || this.confirmedSuspicion < 0 || this.confirmedSuspicion > 100) {
			return;
		}
		this.confirmedFalseSuspicion = (100 - this.confirmedSuspicion);
		this.calculateAnswer();

	}

	private calculateAnswer(): void {
		if (this.suspicion === null || this.confirmedSuspicion === null ||
			this.falseSuspicion === null || this.confirmedFalseSuspicion === null) {
			return;
		}
		const suspicionVal = this.suspicion;
		const confirmedSuspicionVal = this.confirmedSuspicion;

		// Convert percentage inputs to decimal values
		const suspicionDecimal = suspicionVal / 100;
		const confirmedSuspicionDecimal = confirmedSuspicionVal / 100;
		const falseSuspicionDecimal = 1 - suspicionDecimal;
		const confirmedFalseSuspicionDecimal = 1 - confirmedSuspicionDecimal;

		const p_E_H = suspicionDecimal * confirmedSuspicionDecimal;
		const p_E_NotH = falseSuspicionDecimal * confirmedFalseSuspicionDecimal;
		const displayAnswer = p_E_H / (p_E_H + p_E_NotH);

		this.rawAnswer = Number((displayAnswer).toFixed(3));
		this.answer = Math.round(1000 * displayAnswer) / 10;

	}

	reset(): void {
		this.suspicion = null;
		this.confirmedSuspicion = null;
		this.falseSuspicion = null;
		this.confirmedFalseSuspicion = null;
		this.rawAnswer = 0;
		this.answer = null;
	}

	regenerateIt(): void {
		if (this.rawAnswer === null || this.rawAnswer === 0) {
			this.suspicion = this.rawAnswer;
			this.onSuspicionChange();
		}

		const suspicionVal = this.suspicion;
		const confirmedSuspicionVal = this.confirmedSuspicion;
		const falseSuspicionVal = this.falseSuspicion;
		const confirmedFalseSuspicionVal = this.confirmedFalseSuspicion;

		if (suspicionVal !== null && confirmedSuspicionVal !== null &&
			falseSuspicionVal !== null && confirmedFalseSuspicionVal !== null) {

			const p_E_H = suspicionVal * confirmedSuspicionVal;
			const p_E_NotH = falseSuspicionVal * confirmedFalseSuspicionVal;
			const displayAnswer = p_E_H / (p_E_H + p_E_NotH);

			this.rawAnswer = Number((displayAnswer).toFixed(3));
			this.suspicion = Math.round(1000 * displayAnswer) / 10;
			this.onSuspicionChange();
			this.calculateAnswer();
		} else {
			this.reset();
		}
	}

	get startButtonLabel(): string {
		return !this.rawAnswer ? '✓ Start' : '♺ Reuse';
	}
}

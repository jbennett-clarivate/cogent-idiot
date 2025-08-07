import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-taxes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './taxes.component.html',
  styleUrls: ['./taxes.component.scss']
})
export class TaxesComponent {
  corporate: number = 59000;
  personal: number = 12760;
  taxType: string = '';
  quantity: number | null = null;
  minTaxable: number = 12760;
  maxTaxable: number = 9999999;

  showTaxes() {
    // Placeholder for chart logic
    // You would implement chart rendering here, e.g. using Chart.js or D3
    // For now, just clear and show a message
    const plot = document.getElementById('taxPlot');
    if (plot) {
      plot.innerHTML = `<div style='text-align:center;padding:2em;'>[Tax chart would render here]</div>`;
    }
  }

  reset() {
    this.corporate = 59000;
    this.personal = 12760;
    this.taxType = '';
    this.quantity = null;
    this.minTaxable = 12760;
    this.maxTaxable = 9999999;
    const plot = document.getElementById('taxPlot');
    if (plot) {
      plot.innerHTML = '';
    }
  }
}

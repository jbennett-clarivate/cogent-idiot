import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
	selector: "app-taxes",
	imports: [CommonModule, FormsModule],
	templateUrl: "./taxes.html",
	styleUrls: ["./taxes.scss"],
})
export class TaxesComponent {
	corporate: number = 59000;
	personal: number = 12760;
	taxType: string = "";
	quantity: number | null = null;
	minTaxable: number = 12760;
	maxTaxable: number = 9999999;


}

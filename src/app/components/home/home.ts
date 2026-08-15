import { Component } from "@angular/core";
import { CommonModule, NgOptimizedImage } from "@angular/common";
import { Router } from "@angular/router";

@Component({
	selector: "app-home",
	imports: [CommonModule, NgOptimizedImage],
	templateUrl: "./home.html",
	styleUrls: ["./home.scss"],
})
export class HomeComponent {
	constructor(private router: Router) {
	}

	tools = [
		{
			name: "Bayes' Theorem",
			description: "Update a probability after new evidence",
			icon: "bayes.svg",
			route: "/tools/bayes",
		},
		{
			name: "List Comparator",
			description: "Compare two lists or clean one",
			icon: "comparator.svg",
			route: "/tools/comparator",
		},
		{
			name: "List Random",
			description: "Generate random strings",
			icon: "random.svg",
			route: "/tools/random",
		},
		{
			name: "Pascal's Triangle",
			description: "Draw the triangle and compute nCk",
			icon: "pascal.svg",
			route: "/tools/pascal",
		},
		{
			name: "Safe Cron",
			description: "Find the best meeting time across zones",
			icon: "cron.svg",
			route: "/tools/safecron",
		},
		{
			name: "Tax vs. Poverty Line",
			description: "Visualize a poverty-anchored tax curve",
			icon: "taxes.svg",
			route: "/tools/taxes",
		},
		{
			name: "Password Breach Check",
			description: "Check if a password has been breached",
			icon: "pwned.svg",
			route: "/tools/pwned",
		},
	];

	openTool(route: string): void {
		console.log("Navigating to:", route); // Debug log
		this.router.navigate([route]).catch(err => console.error("Navigation failed:", err));
	}
}


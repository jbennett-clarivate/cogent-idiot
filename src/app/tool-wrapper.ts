import { Component } from "@angular/core";
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from "@angular/router";
import { AuthService } from "@services/auth.service";
import { CommonModule, NgOptimizedImage } from "@angular/common";
import { filter, map } from "rxjs/operators";
import { Observable } from "rxjs";
import { quadrantAnchorPositioner } from "@services/quadrant-anchor-positioner";
import { TOOL_INFO } from "@app/config/tool-info";

@Component({
	selector: "app-tool-wrapper",
	imports: [CommonModule, RouterModule, NgOptimizedImage],
	templateUrl: "./tool-wrapper.html",
	styleUrls: ["./tool-wrapper.scss"],
})
export class ToolWrapperComponent {
	tools = [
		{ name: "Bayes' Theorem", icon: "bayes.svg", route: "/tools/bayes" },
		
		{ name: "List Comparator", icon: "comparator.svg", route: "/tools/comparator" },
		{ name: "List Random", icon: "random.svg", route: "/tools/random" },
		{ name: "Pascal's Triangle", icon: "pascal.svg", route: "/tools/pascal" },
		{ name: "Safe Cron", icon: "cron.svg", route: "/tools/safecron" },
		{ name: "Tax vs. Poverty Line", icon: "taxes.svg", route: "/tools/taxes" },
		{ name: "Password Breach Check", icon: "pwned.svg", route: "/tools/pwned" },
	];

	private descriptions: { [route: string]: string } = {
		"/tools/bayes":
			"Updates a probability after new evidence using Bayes' theorem. Enter how likely something is to be true to begin with and how reliable your test is, and it calculates the revised probability that it's actually true given a positive result. Handy for medical-test and false-positive style questions. Reuse the answer as the next starting point to chain several updates together.",
		"/tools/comparator":
			"Compares two lists and shows you four results at once: entries only in list A, entries only in list B, the overlap they share, and the two lists combined. Paste them or upload text, CSV, or TSV files, choose case-sensitive and/or optionally enable Dedupe to remove duplicate entries within each list before comparing (fill only one side to use it as a silent list cleaner). Then export the results as CSV or TXT.",
		"/tools/random":
			"Generates random strings to your spec. Choose how many and how long, then tick which character types to allow: lowercase, uppercase, numbers, special characters, and UTF-8. It produces one column where each type may appear and another where every chosen type is guaranteed to appear in each string. Good for passwords, test fixtures, and sample tokens.",
		"/tools/pascal":
			"Draws Pascal's triangle and computes 'n choose k' (the binomial coefficient). Enter N and K to see how many ways you can pick K items from N, with the matching cell highlighted in the triangle below. A quick visual reference for combinatorics and binomial expansions.",
		"/tools/safecron":
			"Finds the best meeting and downtime windows across multiple time zones. Add each zone your team works in and give it an importance weight, then it overlaps everyone's 9-to-5 working hours on a chart (relative to your local time) and suggests the hour that suits the most people for a meeting and the quietest hour for maintenance or downtime.",
		"/tools/taxes":
			"This tool visualizes a proposed tax system where your tax rate is decided entirely by how your income compares to the poverty line. There are no brackets. The only two numbers needed to draw the whole tax curve are the poverty line from a fixed reference year and today's poverty line. Change those two numbers and watch the curve redraw.",
		"/tools/pwned":
			"Checks whether a password has appeared in a known data breach. Type a password and press the Right Arrow key (or the Check button) to see a green check if it's safe or a red mark if it's been exposed. It uses k-anonymity: only the first five characters of the password's SHA-1 hash are sent to the breach database, so the password itself never leaves your browser.",
	};

	toolTitle$: Observable<string>;

	constructor(private router: Router, private route: ActivatedRoute, private authService: AuthService) {
		this.toolTitle$ = this.router.events.pipe(
			filter(event => event instanceof NavigationEnd),
			map(() => {
				let child = this.route.firstChild;
				while (child?.firstChild) child = child.firstChild;
				return child?.snapshot.data["title"] || "";
			}),
		);
	}

	logout(): void {
		this.authService.logout().subscribe({
			next: () => {
				console.log("Logged out successfully");
				window.location.href = "/login";
			},
		});
	}

	navigate(route: string) {
		if (route === "/" || route === "") {
			route = "/home";
		}
		this.router.navigate([route]);
	}

	isActive(route: string): boolean {
		return this.router.url.startsWith(route);
	}

	showTooltip(event: MouseEvent, text: string) {
		const button = event.currentTarget as HTMLElement;
		const rect = button.getBoundingClientRect();
		this.hideTooltip();
		const tooltipElement = this.createTooltipElement(button, text);
		button.appendChild(tooltipElement);

		quadrantAnchorPositioner.applyPosition(tooltipElement, button);

		requestAnimationFrame(() => {
			tooltipElement.classList.add('visible');
		});
	}

	private createTooltipElement(trigger: HTMLElement, text: string): HTMLElement {
		const tooltip = document.createElement('div');
		tooltip.className = 'anchor-content dynamic-tooltip';
		tooltip.textContent = text;

		if (trigger.classList.contains('info-help')) {
			tooltip.classList.add('wide');
		}

		return tooltip;
	}

	infoText(): string {
		const url = this.router.url.split("?")[0];
		return TOOL_INFO[url]?.summary || "This page does not have a description yet.";
	}

	hideTooltip() {
		const activeTooltips = document.querySelectorAll(".dynamic-tooltip");
		activeTooltips.forEach(element => {
			element.classList.remove("visible");
			// Remove after fade-out transition
			setTimeout(() => {
				if (element.parentNode) {
					element.parentNode.removeChild(element);
				}
			}, 200);
		});
	}
}


import { Component } from "@angular/core";
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from "@angular/router";
import { AuthService } from "@services/auth.service";
import { CommonModule, NgOptimizedImage } from "@angular/common";
import { filter, map } from "rxjs/operators";
import { Observable } from "rxjs";

@Component({
	selector: "app-tool-wrapper",
	imports: [CommonModule, RouterModule, NgOptimizedImage],
	templateUrl: "./tool-wrapper.html",
	styleUrls: ["./tool-wrapper.scss"],
})
export class ToolWrapperComponent {
	tools = [
		{ name: "Bayes' Theorem", icon: "bayes.svg", route: "/tools/bayes" },
		{ name: "List Cleaner", icon: "cleaner.svg", route: "/tools/cleaner" },
		{ name: "List Comparator", icon: "comparator.svg", route: "/tools/comparator" },
		{ name: "List Iterator", icon: "iterator.svg", route: "/tools/iterator" },
		{ name: "List Random", icon: "random.svg", route: "/tools/random" },
		{ name: "TZ Tool", icon: "localtime.svg", route: "/tools/localtime" },
		{ name: "Pascal Triangle", icon: "pascal.svg", route: "/tools/pascal" },
		{ name: "Safe Cron", icon: "cron.svg", route: "/tools/safecron" },
		{ name: "Tax Calculator", icon: "taxes.svg", route: "/tools/taxes" },
	];
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
		this.router.navigate([route]);
	}

	isActive(route: string): boolean {
		return this.router.url.startsWith(route);
	}

	showTooltip(event: MouseEvent, text: string) {
		const button = event.currentTarget as HTMLElement;
		const rect = button.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const midPoint = viewportHeight / 2;

		// Remove any existing tooltips
		this.hideTooltip();

		// Add tooltip text as data attribute
		button.setAttribute("data-tooltip", text);

		// Add appropriate positioning class
		if (rect.top < midPoint) {
			button.classList.add("tooltip-bottom");
		} else {
			button.classList.add("tooltip-top");
		}

		button.classList.add("tooltip-active");
	}

	hideTooltip() {
		const activeTooltips = document.querySelectorAll(".tooltip-active");
		activeTooltips.forEach(element => {
			element.classList.remove("tooltip-active", "tooltip-top", "tooltip-bottom");
			element.removeAttribute("data-tooltip");
		});
	}
}

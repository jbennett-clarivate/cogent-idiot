import { Component, signal, inject } from "@angular/core";
import { Router, NavigationError, RouterOutlet } from "@angular/router";
import { ExitPopupComponent } from "./components/exit/exit";

@Component({
	selector: "app-root",
	imports: [RouterOutlet, ExitPopupComponent],
	templateUrl: "./app.html",
	styleUrls: ["./app.scss"],
})
export class AppComponent {
	title = signal("CogentIdiot - Tools Collection");
	router = inject(Router);

	constructor() {
		this.router.events.subscribe(event => {
			if (event instanceof NavigationError) {
				this.router.navigate(["/home"]);
			}
		});
	}
}
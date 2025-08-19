import { Component, signal, inject } from '@angular/core';
import { Router, NavigationError, RouterOutlet } from '@angular/router';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	templateUrl: './app.html',
	styleUrls: ['./app.scss']
})
export class AppComponent {
	title = signal('CogentIdiot - Tools Collection');
	router = inject(Router);

	constructor() {
		this.router.events.subscribe(event => {
			if (event instanceof NavigationError) {
				this.router.navigate(['/home']);
			}
		});
	}
}
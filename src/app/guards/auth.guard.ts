import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { Observable, map, filter, take } from "rxjs";
import { AuthService } from "@services/auth.service";

@Injectable({
	providedIn: "root",
})
export class AuthGuard implements CanActivate {
	constructor(
		private authService: AuthService,
		private router: Router,
	) {
	}

	canActivate(): Observable<boolean> {
		return this.authService.isAuthenticated$.pipe(
			filter(isAuthenticated => isAuthenticated !== null),
			take(1),
			map(isAuthenticated => {
				if (!isAuthenticated) {
					this.router.navigate(["/login"]);
					return false;
				}
				return true;
			}),
		);
	}
}

import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "@app/app";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from "@angular/common/http";
import { routes } from "@app/app.routes";
import { MockBackendInterceptor } from "@app/interceptors/mock-backend.interceptor";

bootstrapApplication(AppComponent, {
	providers: [
		provideRouter(routes),
		provideHttpClient(withInterceptorsFromDi()),
		{
			provide: HTTP_INTERCEPTORS,
			useClass: MockBackendInterceptor,
			multi: true,
		},
	],
}).catch((err: any) => console.error(err));

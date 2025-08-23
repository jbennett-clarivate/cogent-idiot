import { Routes } from "@angular/router";
import { ToolWrapperComponent } from "./tool-wrapper";
import { AuthGuard } from "./guards/auth.guard";

export const routes: Routes = [
	{ path: "login", loadComponent: () => import("./components/login/login").then(m => m.LoginComponent) },
	{ path: "", redirectTo: "/home", pathMatch: "full" },
	{ path: "home", loadComponent: () => import("./components/home/home").then(m => m.HomeComponent), canActivate: [AuthGuard] },
	{
		path: "tools",
		component: ToolWrapperComponent,
		canActivate: [AuthGuard],
		children: [
			{ path: "bayes", loadComponent: () => import("./components/bayes/bayes").then(m => m.BayesComponent), data: { title: "Bayes' Theorem" }, canActivate: [AuthGuard] },
			{ path: "cleaner", loadComponent: () => import("./components/listcleaner/listcleaner").then(m => m.ListcleanerComponent), data: { title: "List Cleaner" }, canActivate: [AuthGuard] },
			{ path: "comparator", loadComponent: () => import("./components/listcomparator/listcomparator").then(m => m.ListcomparatorComponent), data: { title: "List Comparator" }, canActivate: [AuthGuard] },
			{ path: "iterator", loadComponent: () => import("./components/listiterator/listiterator").then(m => m.ListiteratorComponent), data: { title: "List Iterator" }, canActivate: [AuthGuard] },
			{ path: "random", loadComponent: () => import("./components/listrandom/listrandom").then(m => m.ListrandomComponent), data: { title: "List Random" }, canActivate: [AuthGuard] },
			{ path: "localtime", loadComponent: () => import("@components/localtime/localtime").then(m => m.LocaltimeComponent), data: { title: "Local Time Translate" }, canActivate: [AuthGuard] },
			{ path: "pascal", loadComponent: () => import("./components/pascal/pascal").then(m => m.PascalComponent), data: { title: "Pascal's Triangle" }, canActivate: [AuthGuard] },
			{ path: "safecron", loadComponent: () => import("./components/safecron/safecron").then(m => m.SafecronComponent), data: { title: "Safe Time Zones" }, canActivate: [AuthGuard] },
			{ path: "taxes", loadComponent: () => import("./components/taxes/taxes").then(m => m.TaxesComponent), data: { title: "Taxes" }, canActivate: [AuthGuard] },
		],
	},
	{ path: "**", redirectTo: "/home" },
];

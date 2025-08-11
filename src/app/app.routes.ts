import { Routes } from '@angular/router';
import { ToolWrapperComponent } from './tool-wrapper.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent), canActivate: [AuthGuard] },
  {
    path: 'tools',
    component: ToolWrapperComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'bayes', loadComponent: () => import('./bayes/bayes.component').then(m => m.BayesComponent), data: { title: "Bayes' Theorem" } },
      { path: 'cleaner', loadComponent: () => import('./listcleaner/listcleaner.component').then(m => m.ListcleanerComponent), data: { title: 'List Cleaner' } },
      { path: 'comparator', loadComponent: () => import('./listcomparator/listcomparator.component').then(m => m.ListcomparatorComponent), data: { title: 'List Comparator' } },
      { path: 'iterator', loadComponent: () => import('./listiterator/listiterator.component').then(m => m.ListiteratorComponent), data: { title: 'List Iterator' } },
      { path: 'random', loadComponent: () => import('./listrandom/listrandom.component').then(m => m.ListrandomComponent), data: { title: 'List Random' } },
      { path: 'message', loadComponent: () => import('./message/message.component').then(m => m.MessageComponent), data: { title: 'Teams Message' } },
      { path: 'pascal', loadComponent: () => import('./pascal/pascal.component').then(m => m.PascalComponent), data: { title: 'Pascal\'s Triangle' } },
      { path: 'safecron', loadComponent: () => import('./safecron/safecron.component').then(m => m.SafecronComponent), data: { title: 'Safe Time Zones' } },
      { path: 'taxes', loadComponent: () => import('./taxes/taxes.component').then(m => m.TaxesComponent), data: { title: 'Taxes' } },
    ]
  },
  { path: '**', redirectTo: '/home' }
];

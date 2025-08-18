import { Component } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
	imports: [CommonModule, NgOptimizedImage],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent {
  constructor(private router: Router) {}

  tools = [
    {
      name: 'Bayes Calculator',
      description: 'Calculate Bayesian probabilities',
      icon: 'bayes.svg',
      route: '/tools/bayes'
    },
    {
      name: 'List Cleaner',
      description: 'Clean and format lists',
      icon: 'cleaner.svg',
      route: '/tools/cleaner'
    },
    {
      name: 'List Comparator',
      description: 'Compare two lists',
      icon: 'comparator.svg',
      route: '/tools/comparator'
    },
    {
      name: 'List Iterator',
      description: 'Iterate through lists',
      icon: 'iterator.svg',
      route: '/tools/iterator'
    },
    {
      name: 'List Random',
      description: 'Generate random items from lists',
      icon: 'random.svg',
      route: '/tools/random'
    },
    {
      name: 'Message Tool',
      description: 'Message handling utilities',
      icon: 'localtime.svg',
      route: '/tools/localtime'
    },
    {
      name: 'Pascal Triangle',
      description: 'Generate Pascal\'s triangle',
      icon: 'pascal.svg',
      route: '/tools/pascal'
    },
    {
      name: 'Safe Cron',
      description: 'Safe time zone scheduling',
      icon: 'cron.svg',
      route: '/tools/safecron'
    },
    {
      name: 'Tax Calculator',
      description: 'Calculate taxes',
      icon: 'taxes.svg',
      route: '/tools/taxes'
    }
  ];

  openTool(route: string): void {
    console.log('Navigating to:', route); // Debug log
    this.router.navigate([route]).catch(err => console.error('Navigation failed:', err));
  }
}

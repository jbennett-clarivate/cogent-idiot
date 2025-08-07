import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  constructor(private router: Router) {}

  tools = [
    {
      name: 'Bayes Calculator',
      description: 'Calculate Bayesian probabilities',
      icon: 'bayes.svg',
      route: '/bayes'
    },
    {
      name: 'List Cleaner',
      description: 'Clean and format lists',
      icon: 'cleaner.svg',
      route: '/cleaner'
    },
    {
      name: 'List Comparator',
      description: 'Compare two lists',
      icon: 'comparator.svg',
      route: '/comparator'
    },
    {
      name: 'List Iterator',
      description: 'Iterate through lists',
      icon: 'iterator.svg',
      route: '/iterator'
    },
    {
      name: 'List Random',
      description: 'Generate random items from lists',
      icon: 'random.svg',
      route: '/random'
    },
    {
      name: 'Message Tool',
      description: 'Message handling utilities',
      icon: 'message.svg',
      route: '/message'
    },
    {
      name: 'Pascal Triangle',
      description: 'Generate Pascal\'s triangle',
      icon: 'pascal.svg',
      route: '/pascal'
    },
    {
      name: 'Safe Cron',
      description: 'Cron job utilities',
      icon: 'cron.svg',
      route: '/safecron'
    },
    {
      name: 'Tax Calculator',
      description: 'Tax calculation tools',
      icon: 'taxes.svg',
      route: '/taxes'
    }
  ];

  openTool(route: string): void {
    console.log('Navigating to:', route); // Debug log
    this.router.navigate([route]).catch(err => console.error('Navigation failed:', err));
  }
}

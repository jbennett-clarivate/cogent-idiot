import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tool-wrapper',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tool-wrapper.component.html',
  styleUrls: ['./tool-wrapper.component.scss']
})
export class ToolWrapperComponent {
  tools = [
    { name: "Bayes' Theorem", icon: 'bayes.svg', route: '/bayes' },
    { name: 'List Cleaner', icon: 'cleaner.svg', route: '/cleaner' },
    { name: 'List Comparator', icon: 'comparator.svg', route: '/comparator' },
    { name: 'List Iterator', icon: 'iterator.svg', route: '/iterator' },
    { name: 'List Random', icon: 'random.svg', route: '/random' },
    { name: 'Message Tool', icon: 'message.svg', route: '/message' },
    { name: 'Pascal Triangle', icon: 'pascal.svg', route: '/pascal' },
    { name: 'Safe Cron', icon: 'cron.svg', route: '/safecron' },
    { name: 'Tax Calculator', icon: 'taxes.svg', route: '/taxes' }
  ];
  toolTitle$: Observable<string>;
  constructor(private router: Router, private route: ActivatedRoute) {
    this.toolTitle$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        let child = this.route.firstChild;
        while (child?.firstChild) child = child.firstChild;
        return child?.snapshot.data['title'] || '';
      })
    );
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
    button.setAttribute('data-tooltip', text);
    
    // Add appropriate positioning class
    if (rect.top < midPoint) {
      button.classList.add('tooltip-bottom');
    } else {
      button.classList.add('tooltip-top');
    }
    
    button.classList.add('tooltip-active');
  }

  hideTooltip() {
    const activeTooltips = document.querySelectorAll('.tooltip-active');
    activeTooltips.forEach(element => {
      element.classList.remove('tooltip-active', 'tooltip-top', 'tooltip-bottom');
      element.removeAttribute('data-tooltip');
    });
  }
}

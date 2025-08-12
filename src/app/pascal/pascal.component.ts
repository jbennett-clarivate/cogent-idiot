import { Component, ElementRef, Renderer2, AfterViewInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pascal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pascal.component.html',
  styleUrls: ['./pascal.component.scss']
})
export class PascalComponent implements AfterViewInit {
  rows: number | null = null;
  pascal: number[][] = [];

  // nCk functionality
  n: number = 5;
  k: number = 2;
  maxInputValue: number = 45;
  nChooseK: number = 10;
  fullTriangle: number[][] = [];

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.buildFullTriangle();
  }

  ngAfterViewInit() {
    this.setupMaxInputRange();
    window.addEventListener('resize', () => {
      setTimeout(() => this.setupMaxInputRange(), 100);
      setTimeout(() => this.displayTriangle(), 100);
    });
    this.displayTriangle();
  }

  buildFullTriangle() {
    this.fullTriangle = [];
    this.fullTriangle.push([1]);
    for (let i = 1; i < 46; i++) {
      const row = [1];
      for (let j = 1; j < i; j++) {
        row.push(this.fullTriangle[i - 1][j - 1] + this.fullTriangle[i - 1][j]);
      }
      row.push(1);
      this.fullTriangle.push(row);
    }
  }

  onNInput(event: any) {
    let inputStr = event.target.value.replace(/\D/g, "");
    this.n = Math.min(parseInt(inputStr) || 0, this.maxInputValue);
    event.target.value = this.n;
    if (this.k > this.n) {
      this.k = this.n;
    }
    this.displayTriangle();
  }

  onKInput(event: any) {
    let inputStr = event.target.value.replace(/\D/g, "");
    this.k = Math.min(parseInt(inputStr) || 0, this.n);
    event.target.value = this.k;
    this.displayTriangle();
  }

  displayTriangle() {
    if (this.n > 45 || !(this.n >= 0 && this.k <= this.n)) {
      this.pascal = [];
      this.rows = null;
      return;
    }

    this.rows = this.n + 1;
    this.generatePascal();
    this.nChooseK = this.pascal[this.n] ? this.pascal[this.n][this.k] : 0;

    // Run UI updates outside Angular zone to prevent ExpressionChangedAfterItHasBeenCheckedError
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        // Apply dynamic font sizing like original
        const container = this.elementRef.nativeElement.querySelector('.white-bg');
        if (container) {
          const containerSize = container.offsetWidth || 600;
          const elemCount = this.pascal[this.n] ? this.pascal[this.n].join(" ").length : 0;
          const textSize = Math.min(1, containerSize / (elemCount * 10));
          const lineHeight = textSize + 0.33;

          this.elementRef.nativeElement.style.setProperty('--dynamic-font-size', `${textSize}em`);
          this.elementRef.nativeElement.style.setProperty('--dynamic-line-height', `${lineHeight}em`);

          // Re-enter Angular zone and detect changes
          this.ngZone.run(() => this.cdr.detectChanges());
        }
      });
    });
  }

  setupMaxInputRange() {
    const container = this.elementRef.nativeElement.querySelector('.white-bg');
    if (!container) return;

    const containerSize = container.offsetWidth || 600;
    for (let i = 45; i >= 0; i--) {
      const elemCount = this.fullTriangle[i].join(" ").length;
      const textSize = Math.min(1, containerSize / (elemCount * 10));
      if (textSize > 0.33) {
        this.maxInputValue = i;
        if (this.n > i) {
          this.n = i;
          if (this.k > this.n) this.k = this.n;
        }
        this.displayTriangle();
        break;
      }
    }
  }

  isHighlighted(rowIndex: number, colIndex: number): boolean {
    return this.n === rowIndex && this.k === colIndex;
  }

  get dynamicCellWidth(): number {
    if (!this.rows) return 20;
    return Math.ceil(this.rows / 10) + 1; // Dynamic width based on number of rows, minimum 1em
  }

  get pascalDisplay(): string {
    if (!this.pascal.length) return '';

    // Format as HTML with divs for flexbox layout
    const rows = this.pascal.map(row => {
      const cells = row.map(num => `<div class="pascal-cell">${num}</div>`).join('');
      return `<div class="pascal-row">${cells}</div>`;
    }).join('');

    return `<div class="pascal-triangle">${rows}</div>`;
  }

  generatePascal(): void {
    if (!this.rows || this.rows < 1 || this.rows > 50) return;
    this.pascal = [];
    for (let i = 0; i < this.rows; i++) {
      this.pascal[i] = [];
      for (let j = 0; j <= i; j++) {
        if (j === 0 || j === i) {
          this.pascal[i][j] = 1;
        } else {
          this.pascal[i][j] = this.pascal[i - 1][j - 1] + this.pascal[i - 1][j];
        }
      }
    }
    this.elementRef.nativeElement.style.setProperty('--dynamic-cell-width', `${this.dynamicCellWidth}em`);
  }

  reset(): void {
    this.rows = null;
    this.pascal = [];
    this.n = 5;
    this.k = 2;
    this.nChooseK = 10;
    this.setupMaxInputRange();
  }
}

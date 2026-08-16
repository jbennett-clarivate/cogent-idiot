import { Directive, Input, ElementRef, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { quadrantAnchorPositioner, PositionResult } from '@services/quadrant-anchor-positioner';

@Directive({
  selector: '[quadrantAnchor]',
  standalone: true,
})
export class QuadrantAnchorDirective implements OnInit, OnDestroy {
  @Input({ required: true }) anchorTarget!: HTMLElement;
  @Input() anchorViewport?: HTMLElement | Window;
  @Input() set anchorVisible(visible: boolean) {
    this._visible = visible;
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  private _visible = false;
  private positionResult?: PositionResult;
  private mutationObserver?: MutationObserver;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.applyPosition();

    const viewport = this.anchorViewport || window;
    const scrollEventTarget = viewport instanceof Window ? viewport : viewport;

    this.renderer.listen(scrollEventTarget, 'scroll', () => {
      if (this._visible) {
        this.applyPosition();
      }
    });

    this.renderer.listen('window', 'resize', () => {
      if (this._visible) {
        this.applyPosition();
      }
    });

    this.mutationObserver = new MutationObserver(() => {
      if (this._visible) {
        this.applyPosition();
      }
    });

    this.mutationObserver.observe(this.anchorTarget, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  ngOnDestroy(): void {
    this.mutationObserver?.disconnect();
  }

  show(): void {
    this.applyPosition();
    this.renderer.addClass(this.elementRef.nativeElement, 'visible');
  }

  hide(): void {
    this.renderer.removeClass(this.elementRef.nativeElement, 'visible');
  }

  private applyPosition(): void {
    const contentElement = this.elementRef.nativeElement;
    const viewport = this.anchorViewport || window;

    this.positionResult = quadrantAnchorPositioner.applyPosition(
      contentElement,
      this.anchorTarget,
      viewport
    );
  }
}

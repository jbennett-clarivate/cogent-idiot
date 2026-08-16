export interface PositionResult {
  anchorClass: string;
  quadrant: QuadrantLabel;
  triggerCorner: Corner;
  contentCorner: Corner;
}

export type QuadrantLabel = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

const CORNER_PAIRINGS: Record<QuadrantLabel, { contentCorner: Corner; triggerCorner: Corner }> = {
  'top-left': { contentCorner: 'tl', triggerCorner: 'br' },
  'top-right': { contentCorner: 'tr', triggerCorner: 'bl' },
  'bottom-left': { contentCorner: 'bl', triggerCorner: 'tr' },
  'bottom-right': { contentCorner: 'br', triggerCorner: 'tl' },
};

const ANCHOR_CLASSES: Record<string, string> = {
  'tl-br': 'anchor-tl-to-br',  // content top-left anchored to trigger bottom-right
  'tr-bl': 'anchor-tr-to-bl',  // content top-right anchored to trigger bottom-left
  'bl-tr': 'anchor-bl-to-tr',  // content bottom-left anchored to trigger top-right
  'br-tl': 'anchor-br-to-tl',  // content bottom-right anchored to trigger top-left
};

export class QuadrantAnchorPositioner {
  calculatePosition(
    triggerElement: HTMLElement,
    viewportContainer: HTMLElement | Window = window
  ): PositionResult {
    const triggerRect = triggerElement.getBoundingClientRect();
    const viewportRect = this.getViewportRect(viewportContainer);
    const centerX = viewportRect.left + viewportRect.width / 2;
    const centerY = viewportRect.top + viewportRect.height / 2;
    const quadrant = this.classifyQuadrant(triggerRect.left, triggerRect.top, centerX, centerY);
    const pairing = CORNER_PAIRINGS[quadrant];
    const anchorKey = `${pairing.contentCorner}-${pairing.triggerCorner}`;
    const anchorClass = ANCHOR_CLASSES[anchorKey];

    return {
      anchorClass,
      quadrant,
      triggerCorner: pairing.triggerCorner,
      contentCorner: pairing.contentCorner,
    };
  }

  applyPosition(
    contentElement: HTMLElement,
    triggerElement: HTMLElement,
    viewportContainer: HTMLElement | Window = window
  ): PositionResult {
    const position = this.calculatePosition(triggerElement, viewportContainer);

    Object.values(ANCHOR_CLASSES).forEach(cls => contentElement.classList.remove(cls));

    contentElement.classList.add(position.anchorClass);
    contentElement.dataset['anchorQuadrant'] = position.quadrant;
    contentElement.dataset['anchorTriggerCorner'] = position.triggerCorner;
    contentElement.dataset['anchorContentCorner'] = position.contentCorner;

    // Pin the chosen content corner to the matching trigger corner using
    // viewport-relative (fixed) coordinates. Because the panel is positioned
    // against the viewport rather than a flow ancestor, it can never reflow or
    // shift the elements it is attached to. The anchor class supplies only the
    // transform that offsets the panel by its own size.
    const rect = triggerElement.getBoundingClientRect();
    const left = position.triggerCorner === 'tl' || position.triggerCorner === 'bl'
      ? rect.left
      : rect.right;
    const top = position.triggerCorner === 'tl' || position.triggerCorner === 'tr'
      ? rect.top
      : rect.bottom;

    contentElement.style.position = 'fixed';
    contentElement.style.left = `${left}px`;
    contentElement.style.top = `${top}px`;
    contentElement.style.right = 'auto';
    contentElement.style.bottom = 'auto';

    return position;
  }

  private classifyQuadrant(
    x: number,
    y: number,
    centerX: number,
    centerY: number
  ): QuadrantLabel {
    const horizontal = x < centerX ? 'left' : 'right';
    const vertical = y < centerY ? 'top' : 'bottom';

    if (vertical === 'top' && horizontal === 'right') {
      return 'top-right';
    } else if (vertical === 'top' && horizontal === 'left') {
      return 'top-left';
    } else if (vertical === 'bottom' && horizontal === 'left') {
      return 'bottom-left';
    } else {
      return 'bottom-right';
    }
  }

  private getViewportRect(container: HTMLElement | Window): { left: number; top: number; width: number; height: number } {
    if (container instanceof Window) {
      return {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    } else {
      return {
        left: 0,
        top: 0,
        width: container.clientWidth,
        height: container.clientHeight,
      };
    }
  }
}

export const quadrantAnchorPositioner = new QuadrantAnchorPositioner();

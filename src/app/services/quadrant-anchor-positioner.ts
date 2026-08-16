export interface PositionResult {
  anchorClass: string;
  quadrant: QuadrantLabel;
  triggerCorner: Corner;
  contentCorner: Corner;
}

export type QuadrantLabel = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

// Each quadrant selects one horizontal edge of the trigger (left edge for the
// left-hand quadrants Q2/Q3, right edge for the right-hand quadrants Q1/Q4) and
// one vertical edge that pushes the panel away from the element: the bottom edge
// when the element sits in the top half (grow downward) and the top edge when it
// sits in the bottom half (grow upward). This guarantees the panel never
// overlaps the trigger while maximizing the horizontal room it grows into.
const CORNER_PAIRINGS: Record<QuadrantLabel, { contentCorner: Corner; triggerCorner: Corner }> = {
  'top-left': { contentCorner: 'tl', triggerCorner: 'bl' },   // Q2: left edge, push down
  'top-right': { contentCorner: 'tr', triggerCorner: 'br' },  // Q1: right edge, push down
  'bottom-left': { contentCorner: 'bl', triggerCorner: 'tl' }, // Q3: left edge, push up
  'bottom-right': { contentCorner: 'br', triggerCorner: 'tr' }, // Q4: right edge, push up
};

const ANCHOR_CLASSES: Record<string, string> = {
  'tl-bl': 'anchor-tl-to-bl',  // content top-left pinned to trigger bottom-left (grow right + down)
  'tr-br': 'anchor-tr-to-br',  // content top-right pinned to trigger bottom-right (grow left + down)
  'bl-tl': 'anchor-bl-to-tl',  // content bottom-left pinned to trigger top-left (grow right + up)
  'br-tr': 'anchor-br-to-tr',  // content bottom-right pinned to trigger top-right (grow left + up)
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

import { Component, signal } from '@angular/core';
import { QuadrantAnchorDirective } from '../../directives/quadrant-anchor.directive';
import { TOOL_INFO } from '@app/config/tool-info';

@Component({
    selector: 'app-exit',
    templateUrl: './exit.html',
    styleUrls: ["./exit.scss"],
    imports: [QuadrantAnchorDirective],
})
export class ExitPopupComponent {
    // Field-level help text, from the shared single-source-of-truth config.
    readonly info = TOOL_INFO["/tools/exit"].fields!;

    visible = signal(false);
    shown = false;

    // Which info panel is currently open (by key), or null. Supports hover on
    // desktop and tap-to-toggle on touch devices; only one open at a time.
    activeInfo = signal<string | null>(null);

    constructor() {
        document.addEventListener('mouseout', this.onMouseOut.bind(this));
    }

    showInfo(key: string): void {
        this.activeInfo.set(key);
    }

    hideInfo(key: string): void {
        if (this.activeInfo() === key) {
            this.activeInfo.set(null);
        }
    }

    toggleInfo(key: string): void {
        this.activeInfo.set(this.activeInfo() === key ? null : key);
    }

    onMouseOut(e: MouseEvent) {
        if (!this.shown && e.clientY < 10) {
            this.visible.set(true);
            this.shown = true;
        }
    }

    close() {
        this.visible.set(false);
    }
}
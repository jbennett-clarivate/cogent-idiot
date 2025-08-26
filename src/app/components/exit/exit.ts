import { Component, signal } from '@angular/core';

@Component({
    selector: 'app-exit',
    templateUrl: './exit.html',
    styleUrls: ["./exit.scss"],
})
export class ExitPopupComponent {
    visible = signal(false);
    shown = false;

    constructor() {
        document.addEventListener('mouseout', this.onMouseOut.bind(this));
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
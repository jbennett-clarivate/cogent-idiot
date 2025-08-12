import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message',
  templateUrl: './message.html',
  styleUrls: ['./message.scss'],
  imports: [FormsModule, CommonModule]
})
export class MessageComponent {
  visibleMessage = '';
  titleMessage = '';
  messageOutput = '';

  createTeamsMessage() {
    const visible = this.visibleMessage.trim();
    const title = this.titleMessage.trim();
    if (!visible) {
      this.messageOutput = '<span style="color: #888;">Please enter a visible message.</span>';
      return;
    }
    this.messageOutput = `
      <div><p style="font-size: 13px; text-align-last: left;" title="${this.escapeHtml(title)}">${this.escapeHtml(visible)}</p></div>
    `;
  }

  reset() {
    this.visibleMessage = '';
    this.titleMessage = '';
    this.messageOutput = '';
  }

  private escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c] || ''));
  }
}

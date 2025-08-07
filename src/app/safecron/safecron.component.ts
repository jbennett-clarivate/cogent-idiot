import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface TimeZoneOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-safecron',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './safecron.component.html',
  styleUrl: './safecron.component.scss'
})
export class SafecronComponent {
  timeZones: TimeZoneOption[] = [
    { value: 'LINT', label: 'Line Islands (LINT, UTC+14)' },
    { value: 'CHADT', label: 'Chatham Islands (CHADT, UTC+13.75)' },
    { value: 'NZDT', label: 'New Zealand DT (NZDT, UTC+13)' },
    { value: 'ANAT', label: 'Anadyr (ANAT, UTC+12)' },
    { value: 'AEDT', label: 'Australian Eastern DT (AEDT, UTC+11)' },
    { value: 'ACDT', label: 'Australian Central (ACDT, UTC+10.5)' },
    { value: 'AEST', label: 'Australian Eastern ST (AEST, UTC+10)' },
    { value: 'ACST', label: 'Australian Central ST (ACST, UTC+9.5)' },
    { value: 'JST', label: 'Japan ST (JST, UTC+9)' },
    { value: 'ACWST', label: 'Australian Central Western ST (ACWST, UTC+8.75)' },
    { value: 'PYT', label: 'Pyongyang (PYT, UTC+8.5)' },
    { value: 'CST', label: 'China ST (CST, UTC+8)' },
    { value: 'WIB', label: 'Western Indonesian (WIB, UTC+7)' },
    { value: 'MMT', label: 'Myanmar (MMT, UTC+6.5)' },
    { value: 'BST', label: 'Bangladesh ST (BST, UTC+6)' },
    { value: 'NPT', label: 'Nepal (NPT, UTC+5.75)' },
    { value: 'IST', label: 'Irish ST (IST, UTC+5.5)' },
    { value: 'UZT', label: 'Uzbekistan (UZT, UTC+5)' },
    { value: 'IRDT', label: 'Iran DT (IRDT, UTC+4.5)' },
    { value: 'GST', label: 'Gulf ST (GST, UTC+4)' },
    { value: 'MSK', label: 'Moscow ST (MSK, UTC+3)' },
    { value: 'CEST', label: 'Central European ST (CEST, UTC+2)' },
    { value: 'BST2', label: 'British ST (BST, UTC+1)' },
    { value: 'GMT', label: 'Accra (GMT, UTC+0)' },
    { value: 'CVT', label: 'Praia (CVT, UTC-1)' },
    { value: 'WGST', label: 'Nuuk (WGST, UTC-2)' },
    { value: 'NDT', label: 'St. John\'s (NDT, UTC-2.5)' },
    { value: 'ART', label: 'Buenos Aires (ART, UTC-3)' },
    { value: 'EDT', label: 'New York (EDT, UTC-4)' },
    { value: 'CDT', label: 'Chicago (CDT, UTC-5)' },
    { value: 'CST2', label: 'Mexico City (CST, UTC-6)' }
  ];
  weights: string[] = ['Low', 'Moderate', 'High', 'Critical'];
  selectedZone: string = '';
  selectedWeight: string = '';
  meetingTime: string = '';
  downtime: string = '';
  addedZones: { zone: string; weight: string }[] = [];

  addZone() {
    if (this.selectedZone) {
      this.addedZones.push({ zone: this.selectedZone, weight: this.selectedWeight });
      this.selectedZone = '';
      this.selectedWeight = '';
    }
  }

  canComputeSafeTime(): boolean {
    return this.addedZones.length > 0;
  }

  computeSafeTime() {
    // Placeholder: In a real app, compute the best time based on addedZones
    this.meetingTime = '09:00 UTC';
    this.downtime = '23:00 UTC';
    const plot = document.getElementById('cronUTC');
    if (plot) {
      plot.innerHTML = `<div style='text-align:center;padding:2em;'>[Safe time chart would render here]</div>`;
    }
  }
}

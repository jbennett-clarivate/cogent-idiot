import { Component, ElementRef, ViewChild, AfterViewInit, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface TimeZoneData {
  offset: number;
  code: string;
  weight: number;
  description: string;
  color: string;
}

interface TimeZoneOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-safecron',
  imports: [CommonModule, FormsModule],
  templateUrl: './safecron.html',
  styleUrl: './safecron.scss'
})
export class SafecronComponent implements AfterViewInit {
  @ViewChild('cronChart', { static: false }) cronChart!: ElementRef<HTMLCanvasElement>;

  private timeZoneData: TimeZoneData[] = [
    { offset: 14, code: 'LINT', weight: 0, description: 'Line Islands', color: '' },
    { offset: 13.75, code: 'CHADT', weight: 0, description: 'Chatham Islands', color: '' },
    { offset: 13, code: 'NZDT', weight: 0, description: 'New Zealand DT', color: '' },
    { offset: 12, code: 'ANAT', weight: 0, description: 'Anadyr', color: '' },
    { offset: 11, code: 'AEDT', weight: 0, description: 'Australian Eastern DT', color: '' },
    { offset: 10.5, code: 'ACDT', weight: 0, description: 'Australian Central', color: '' },
    { offset: 10, code: 'AEST', weight: 0, description: 'Australian Eastern ST', color: '' },
    { offset: 9.5, code: 'ACST', weight: 0, description: 'Australian Central ST', color: '' },
    { offset: 9, code: 'JST', weight: 0, description: 'Japan ST', color: '' },
    { offset: 8.75, code: 'ACWST', weight: 0, description: 'Australian Central Western ST', color: '' },
    { offset: 8.5, code: 'PYT', weight: 0, description: 'Pyongyang', color: '' },
    { offset: 8, code: 'CST', weight: 0, description: 'China ST', color: '' },
    { offset: 7, code: 'WIB', weight: 0, description: 'Western Indonesian', color: '' },
    { offset: 6.5, code: 'MMT', weight: 0, description: 'Myanmar', color: '' },
    { offset: 6, code: 'BDT', weight: 0, description: 'Bangladesh ST', color: '' },
    { offset: 5.75, code: 'NPT', weight: 0, description: 'Nepal', color: '' },
    { offset: 5.5, code: 'IST', weight: 0, description: 'Irish ST', color: '' },
    { offset: 5, code: 'UZT', weight: 0, description: 'Uzbekistan', color: '' },
    { offset: 4.5, code: 'IRDT', weight: 0, description: 'Iran DT', color: '' },
    { offset: 4, code: 'GST', weight: 0, description: 'Gulf ST', color: '' },
    { offset: 3, code: 'MSK', weight: 0, description: 'Moscow ST', color: '' },
    { offset: 2, code: 'CEST', weight: 0, description: 'Central European ST', color: '' },
    { offset: 1, code: 'BST', weight: 0, description: 'British ST', color: '' },
    { offset: 0, code: 'GMT', weight: 0, description: 'Accra', color: '' },
    { offset: -1, code: 'CVT', weight: 0, description: 'Praia', color: '' },
    { offset: -2, code: 'WGST', weight: 0, description: 'Nuuk', color: '' },
    { offset: -2.5, code: 'NDT', weight: 0, description: 'St. John\'s', color: '' },
    { offset: -3, code: 'ART', weight: 0, description: 'Buenos Aires', color: '' },
    { offset: -4, code: 'EDT', weight: 0, description: 'New York', color: '' },
    { offset: -5, code: 'CDT', weight: 0, description: 'Chicago', color: '' },
    { offset: -6, code: 'CST', weight: 0, description: 'Mexico City', color: '' },
    { offset: -7, code: 'PDT', weight: 0, description: 'Los Angeles', color: '' },
    { offset: -8, code: 'AKDT', weight: 0, description: 'Anchorage', color: '' },
    { offset: -9, code: 'HADT', weight: 0, description: 'Adak', color: '' },
    { offset: -9.5, code: 'MART', weight: 0, description: 'Taiohae', color: '' },
    { offset: -10, code: 'HAST', weight: 0, description: 'Honolulu', color: '' },
    { offset: -11, code: 'NUT', weight: 0, description: 'Alofi', color: '' },
    { offset: -12, code: 'AoE', weight: 0, description: 'Baker Island', color: '' }
  ];

  // Signals for reactive state management
  selectedZone = signal<string>('');
  selectedWeight = signal<string>('1');
  meetingTime = signal<string>('');
  downtime = signal<string>('');
  selectedLocalTimes = signal<TimeZoneData[]>([]);
  safeScheduleArray = signal<number[]>([]);

  // Computed values
  timeZones = computed(() => this.timeZoneData.map(tz => ({
    value: tz.code,
    label: `UTC${tz.offset >= 0 ? '+' : ''}${tz.offset}`
  })));

  canComputeSafeTime = computed(() => this.selectedLocalTimes().length > 0);

  weights: string[] = ['1', '2', '3', '4', '5'];

  constructor() {
    this.initializeTimeZoneData();

    // Effect to update chart when selected times change
    effect(() => {
      if (this.selectedLocalTimes().length > 0) {
        this.updateChart();
      }
    });
  }

  ngAfterViewInit() {
    this.setupCanvasEventListeners();
  }

  private initializeTimeZoneData() {
    this.timeZoneData = [
      { offset: 14, code: 'LINT', weight: 0, description: 'Line Islands', color: '' },
      { offset: 13.75, code: 'CHADT', weight: 0, description: 'Chatham Islands', color: '' },
      { offset: 13, code: 'NZDT', weight: 0, description: 'New Zealand DT', color: '' },
      { offset: 12, code: 'ANAT', weight: 0, description: 'Anadyr', color: '' },
      { offset: 11, code: 'AEDT', weight: 0, description: 'Australian Eastern DT', color: '' },
      { offset: 10.5, code: 'ACDT', weight: 0, description: 'Australian Central', color: '' },
      { offset: 10, code: 'AEST', weight: 0, description: 'Australian Eastern ST', color: '' },
      { offset: 9.5, code: 'ACST', weight: 0, description: 'Australian Central ST', color: '' },
      { offset: 9, code: 'JST', weight: 0, description: 'Japan ST', color: '' },
      { offset: 8.75, code: 'ACWST', weight: 0, description: 'Australian Central Western ST', color: '' },
      { offset: 8.5, code: 'PYT', weight: 0, description: 'Pyongyang', color: '' },
      { offset: 8, code: 'CST', weight: 0, description: 'China ST', color: '' },
      { offset: 7, code: 'WIB', weight: 0, description: 'Western Indonesian', color: '' },
      { offset: 6.5, code: 'MMT', weight: 0, description: 'Myanmar', color: '' },
      { offset: 6, code: 'BDT', weight: 0, description: 'Bangladesh ST', color: '' },
      { offset: 5.75, code: 'NPT', weight: 0, description: 'Nepal', color: '' },
      { offset: 5.5, code: 'IST', weight: 0, description: 'Irish ST', color: '' },
      { offset: 5, code: 'UZT', weight: 0, description: 'Uzbekistan', color: '' },
      { offset: 4.5, code: 'IRDT', weight: 0, description: 'Iran DT', color: '' },
      { offset: 4, code: 'GST', weight: 0, description: 'Gulf ST', color: '' },
      { offset: 3, code: 'MSK', weight: 0, description: 'Moscow ST', color: '' },
      { offset: 2, code: 'CEST', weight: 0, description: 'Central European ST', color: '' },
      { offset: 1, code: 'BST', weight: 0, description: 'British ST', color: '' },
      { offset: 0, code: 'GMT', weight: 0, description: 'Accra', color: '' },
      { offset: -1, code: 'CVT', weight: 0, description: 'Praia', color: '' },
      { offset: -2, code: 'WGST', weight: 0, description: 'Nuuk', color: '' },
      { offset: -2.5, code: 'NDT', weight: 0, description: 'St. John\'s', color: '' },
      { offset: -3, code: 'ART', weight: 0, description: 'Buenos Aires', color: '' },
      { offset: -4, code: 'EDT', weight: 0, description: 'New York', color: '' },
      { offset: -5, code: 'CDT', weight: 0, description: 'Chicago', color: '' },
      { offset: -6, code: 'CST', weight: 0, description: 'Mexico City', color: '' },
      { offset: -7, code: 'PDT', weight: 0, description: 'Los Angeles', color: '' },
      { offset: -8, code: 'AKDT', weight: 0, description: 'Anchorage', color: '' },
      { offset: -9, code: 'HADT', weight: 0, description: 'Adak', color: '' },
      { offset: -9.5, code: 'MART', weight: 0, description: 'Taiohae', color: '' },
      { offset: -10, code: 'HAST', weight: 0, description: 'Honolulu', color: '' },
      { offset: -11, code: 'NUT', weight: 0, description: 'Alofi', color: '' },
      { offset: -12, code: 'AoE', weight: 0, description: 'Baker Island', color: '' }
    ];
  }

  getTooltipText(code: string): string {
    const zone = this.timeZoneData.find(tz => tz.code === code);
    return zone ? `${zone.code} - ${zone.description}` : '';
  }

  private getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  addZone() {
    const selectedZoneValue = this.selectedZone();
    const selectedWeightValue = this.selectedWeight();

    if (selectedZoneValue && selectedWeightValue) {
      const timeZone = this.timeZoneData.find(tz => tz.code === selectedZoneValue);
      if (timeZone) {
        const newZone: TimeZoneData = {
          ...timeZone,
          weight: parseInt(selectedWeightValue),
          color: this.getRandomColor()
        };

        // Update signals
        this.selectedLocalTimes.update(times => [...times, newZone]);
        this.selectedZone.set('');
        this.selectedWeight.set('1');
      }
    }
  }

  computeSafeTime() {
    const currentSelectedTimes = this.selectedLocalTimes();
    if (currentSelectedTimes.length === 0) return;

    // Initialize safe schedule array
    const newSafeScheduleArray = new Array(96).fill(0);

    // Calculate safe schedule based on selected time zones
    currentSelectedTimes.forEach(localTime => {
      let offset = (new Date().getTimezoneOffset()) / -60;
      const differentWorkingHoursBegin = localTime.offset;
      offset = differentWorkingHoursBegin - offset;
      const workStart = 9 - offset;
      const workEnd = workStart + 8;

      const minutes = workStart - Math.floor(workStart);
      let arrayOffset = 0;
      if (minutes === 0.75) arrayOffset = 3;
      else if (minutes === 0.5) arrayOffset = 2;
      else if (minutes === 0.25) arrayOffset = 1;

      const start = Math.floor(workStart) * 4 + arrayOffset + 96;
      const end = Math.floor(workEnd) * 4 + arrayOffset + 96;

      for (let i = start; i < end; i++) {
        newSafeScheduleArray[i % 96] += localTime.weight;
      }
    });

    // Update signal
    this.safeScheduleArray.set(newSafeScheduleArray);
    this.calculateBestTimes();
  }

  private calculateBestTimes() {
    const currentArray = this.safeScheduleArray();
    const afterHoursStart = 68; // 5pm UTC
    const beforeHoursStart = 36; // 9am UTC

    const afterHoursArray = currentArray.slice(afterHoursStart).concat(currentArray.slice(0, afterHoursStart));
    const beforeHoursArray = currentArray.slice(beforeHoursStart).concat(currentArray.slice(0, beforeHoursStart));

    const minIndex = (this.indexOfMin(afterHoursArray) + afterHoursStart) % 96;
    const maxIndex = (this.indexOfMax(beforeHoursArray) + beforeHoursStart) % 96;

    // Update signals
    this.meetingTime.set(this.getTimestamp(maxIndex));
    this.downtime.set(this.getTimestamp(minIndex));
  }

  private indexOfMin(arr: number[]): number {
    return arr.indexOf(Math.min(...arr));
  }

  private indexOfMax(arr: number[]): number {
    return arr.indexOf(Math.max(...arr));
  }

  private getTimestamp(index: number): string {
    const hours = Math.floor(index / 4);
    const quarterHours = index % 4;
    const minutes = quarterHours * 15;

    // Convert UTC time to user's local time
    const userOffset = (new Date().getTimezoneOffset()) / -60;
    let localHours = hours + userOffset;

    // Handle day overflow/underflow
    if (localHours < 0) {
      localHours += 24;
    } else if (localHours >= 24) {
      localHours -= 24;
    }

		localHours = localHours % 24; // Ensure localHours is always within 0-23

    let displayHours = localHours;
    let period = 'AM';

    if (localHours === 0) {
      displayHours = 12;
      period = 'AM';
    } else if (localHours < 12) {
      displayHours = localHours;
      period = 'AM';
    } else if (localHours === 12) {
      displayHours = 12;
      period = 'PM';
    } else {
      displayHours = localHours - 12;
      period = 'PM';
    }

    const minutesStr = minutes.toString().padStart(2, '0');
    const userTimezoneName = this.getUserTimezoneName();

    return `${displayHours}:${minutesStr} ${period} ${userTimezoneName}`;
  }

  private updateChart() {
    if (!this.cronChart) return;

    const canvas = this.cronChart.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 400;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw chart background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid and axes
    this.drawGrid(ctx, canvas);
    this.drawTimeZoneSchedules(ctx, canvas);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const margin = { top: 40, right: 40, bottom: 80, left: 100 };
    const chartWidth = canvas.width - margin.left - margin.right;
    const chartHeight = canvas.height - margin.top - margin.bottom;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Draw vertical grid lines (15-minute intervals)
    for (let i = 0; i <= 96; i += 4) { // Every hour
      const x = margin.left + (i / 96) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
      ctx.stroke();

      // Draw hour labels (rotated for readability) - fixed positioning
      ctx.save();
      ctx.translate(x, canvas.height - 70); // Move up from bottom edge
      ctx.rotate(-Math.PI / 4); // Rotate 45 degrees
      ctx.fillStyle = '#333';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';

      let hours = Math.floor(i / 4);
      let displayHours = hours;
      let period = 'AM';

			hours = hours % 24; // Ensure hours are within 0-23

      if (hours === 0) {
        displayHours = 12;
        period = 'AM';
      } else if (hours < 12) {
        displayHours = hours;
        period = 'AM';
      } else if (hours === 12) {
        displayHours = 12;
        period = 'PM';
      } else {
        displayHours = hours - 12;
        period = 'PM';
      }

      ctx.fillText(`${displayHours}:00${period}`, 0, 0);
      ctx.restore();
    }

    // Draw horizontal grid lines (time zones)
    const zoneHeight = chartHeight / Math.max(this.selectedLocalTimes.length, 1);
    for (let i = 0; i <= this.selectedLocalTimes.length; i++) {
      const y = margin.top + i * zoneHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }

    // Draw current time indicator line
    this.drawCurrentTimeLine(ctx, canvas, margin, chartWidth, chartHeight);

    // Draw time zone labels (matches original format)
    this.selectedLocalTimes().forEach((zone: TimeZoneData, index: number) => {
      const y = margin.top + (index + 0.5) * zoneHeight;
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`GMT${zone.offset >= 0 ? '+' : ''}${zone.offset}`, margin.left - 10, y + 4);
    });

    // Draw axis labels - use user's local timezone
    const userOffset = (new Date().getTimezoneOffset()) / -60;
    const userTimezoneName = this.getUserTimezoneName();
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${userTimezoneName} (You)`, canvas.width / 2, canvas.height - 10);

    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Time Zones', 0, 0);
    ctx.restore();
  }

  private drawCurrentTimeLine(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement,
                             margin: any, chartWidth: number, chartHeight: number) {
    // Get current time in user's local timezone
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Convert to quarter-hour slots (0-95)
    const currentTimeSlot = currentHour * 4 + Math.floor(currentMinute / 15);

    // Calculate x position on chart
    const x = margin.left + (currentTimeSlot / 96) * chartWidth;

    // Draw the current time line
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line

    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + chartHeight);
    ctx.stroke();

    // Reset line style for other elements
    ctx.setLineDash([]);
    ctx.lineWidth = 1;

    // Add "NOW" label at the top
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('NOW', x, margin.top - 5);
  }

  private getUserTimezoneName(): string {
    try {
      // Use Intl.DateTimeFormat to get the actual current timezone name
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Get the short timezone abbreviation for the current date
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        timeZoneName: 'short'
      });

      const parts = formatter.formatToParts(new Date());
      const timeZonePart = parts.find(part => part.type === 'timeZoneName');

      return timeZonePart ? timeZonePart.value : timeZone;
    } catch (error) {
      // Fallback to offset-based approach if Intl API fails
      const userOffset = (new Date().getTimezoneOffset()) / -60;
      return `UTC${userOffset >= 0 ? '+' : ''}${userOffset}`;
    }
  }

  private drawTimeZoneSchedules(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const margin = { top: 40, right: 40, bottom: 80, left: 100 };
    const chartWidth = canvas.width - margin.left - margin.right;
    const chartHeight = canvas.height - margin.top - margin.bottom;
    const zoneHeight = chartHeight / Math.max(this.selectedLocalTimes.length, 1);

    this.selectedLocalTimes().forEach((zone: TimeZoneData, index: number) => {
      const y = margin.top + index * zoneHeight;
      const centerY = y + zoneHeight / 2;

      // Match original JS calculation exactly
      const localOffset = (new Date().getTimezoneOffset()) / -60;
      let workStart = 9 - (zone.offset - localOffset);
      let workEnd = workStart + 8;

      // Handle minutes offset for fractional timezones
      const minutes = workStart - Math.floor(workStart);
      let minutesValue = 0;
      if (minutes === 0.75) minutesValue = 45;
      else if (minutes === 0.5) minutesValue = 30;
      else if (minutes === 0.25) minutesValue = 15;

      ctx.fillStyle = zone.color;
      ctx.globalAlpha = 0.7;

      // Handle edge cases as in original JS
      if (workStart > 16) {
        // Case: work starts after 4pm - spans to next day
        this.drawWorkSpan(ctx, workStart, workEnd, y, zoneHeight, chartWidth, margin, true);
      } else if (workStart < 0 && workStart > -9) {
        // Case: work starts previous day but not too early
        this.drawWorkSpan(ctx, workStart, workEnd, y, zoneHeight, chartWidth, margin, true);
      } else if (workStart < -8) {
        // Case: work starts very early previous day
        workStart += 24;
        workEnd += 24;
        this.drawWorkSpan(ctx, workStart, workEnd, y, zoneHeight, chartWidth, margin, false);
      } else {
        // Normal case: work hours within same day
        this.drawWorkSpan(ctx, workStart, workEnd, y, zoneHeight, chartWidth, margin, false);
      }

      ctx.globalAlpha = 1;

      // Draw zone code
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(zone.code, margin.left + 5, centerY + 4);
    });
  }

  private drawWorkSpan(ctx: CanvasRenderingContext2D, workStart: number, workEnd: number,
                      y: number, zoneHeight: number, chartWidth: number, margin: any,
                      spansDays: boolean) {
    if (spansDays) {
      // Handle spans across midnight
      if (workStart < 0) {
        // Start previous day
        const prevDayStart = ((workStart + 24) / 24) * chartWidth;
        const prevDayEnd = chartWidth;
        ctx.fillRect(margin.left + prevDayStart, y + 5, prevDayEnd - prevDayStart, zoneHeight - 10);

        // Continue current day
        const currDayStart = 0;
        const currDayEnd = (workEnd / 24) * chartWidth;
        if (currDayEnd > 0) {
          ctx.fillRect(margin.left + currDayStart, y + 5, currDayEnd, zoneHeight - 10);
        }
      } else if (workEnd > 24) {
        // End next day
        const currDayStart = (workStart / 24) * chartWidth;
        const currDayEnd = chartWidth;
        ctx.fillRect(margin.left + currDayStart, y + 5, currDayEnd - currDayStart, zoneHeight - 10);

        // Continue next day
        const nextDayStart = 0;
        const nextDayEnd = ((workEnd - 24) / 24) * chartWidth;
        ctx.fillRect(margin.left + nextDayStart, y + 5, nextDayEnd, zoneHeight - 10);
      }
    } else {
      // Normal single-day span
      const startX = Math.max(0, (workStart / 24) * chartWidth);
      const endX = Math.min(chartWidth, (workEnd / 24) * chartWidth);
      if (endX > startX) {
        ctx.fillRect(margin.left + startX, y + 5, endX - startX, zoneHeight - 10);
      }
    }
  }

  private setupCanvasEventListeners() {
    if (!this.cronChart) return;

    const canvas = this.cronChart.nativeElement;

    // Add mouse move event listener for tooltips
    canvas.addEventListener('mousemove', (event) => {
      this.handleCanvasMouseMove(event);
    });

    // Add mouse leave event listener to hide tooltips
    canvas.addEventListener('mouseleave', () => {
      this.hideCanvasTooltip();
    });
  }

  private handleCanvasMouseMove(event: MouseEvent) {
    if (!this.cronChart || this.selectedLocalTimes().length === 0) return;

    const canvas = this.cronChart.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const margin = { top: 40, right: 40, bottom: 80, left: 100 };
    const chartHeight = canvas.height - margin.top - margin.bottom;
    const zoneHeight = chartHeight / this.selectedLocalTimes().length;

    // Check if mouse is over y-axis label area
    if (x >= 10 && x <= margin.left - 10) {
      // Check which timezone label we're hovering over
      for (let i = 0; i < this.selectedLocalTimes().length; i++) {
        const labelY = margin.top + (i + 0.5) * zoneHeight;
        if (y >= labelY - zoneHeight/2 && y <= labelY + zoneHeight/2) {
          const zone = this.selectedLocalTimes()[i];
          this.showCanvasTooltip(event, `${zone.code} - ${zone.description}`);
          return;
        }
      }
    }

    this.hideCanvasTooltip();
  }

  private showCanvasTooltip(event: MouseEvent, text: string) {
    // Remove any existing tooltip
    this.hideCanvasTooltip();

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'canvas-tooltip';
    tooltip.innerHTML = text;
    tooltip.style.cssText = `
      position: fixed;
      background: #333;
      color: white;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      white-space: nowrap;
      left: ${event.clientX + 10}px;
      top: ${event.clientY - 30}px;
    `;

    document.body.appendChild(tooltip);
  }

  private hideCanvasTooltip() {
    const existingTooltip = document.getElementById('canvas-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
  }
}

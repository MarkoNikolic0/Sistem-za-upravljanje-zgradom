import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-bez-mreze',
  host: {
    role: 'status',
    '(window:online)': 'bezMreze.set(false)',
    '(window:offline)': 'bezMreze.set(true)',
  },
  styleUrl: './bez-mreze.scss',
  templateUrl: './bez-mreze.html',
})
export class BezMreze {
  protected readonly bezMreze = signal(!navigator.onLine);
}

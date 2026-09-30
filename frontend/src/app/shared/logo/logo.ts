import { Component } from '@angular/core';

@Component({
  selector: 'app-logo',
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 32 36" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="36" rx="1" fill="#2c3b5e" />
      <rect width="32" height="4" fill="#36466b" />

      <rect x="5" y="8" width="6" height="7" fill="#1a2440" />
      <rect x="14" y="8" width="6" height="7" fill="#f5b83d" />
      <rect x="23" y="8" width="6" height="7" fill="#1a2440" />

      <rect x="5" y="17" width="6" height="7" fill="#f5b83d" />
      <rect x="14" y="17" width="6" height="7" fill="#1a2440" />
      <rect x="23" y="17" width="6" height="7" fill="#1a2440" />

      <rect x="5" y="26" width="6" height="7" fill="#1a2440" />
      <rect x="14" y="26" width="6" height="7" fill="#1a2440" />
      <rect x="23" y="26" width="6" height="7" fill="#f5b83d" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      width: 1.75rem;
      line-height: 0;
    }

    svg {
      width: 100%;
      height: auto;
    }
  `,
})
export class Logo {}

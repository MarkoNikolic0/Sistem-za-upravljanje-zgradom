import { Component } from '@angular/core';

@Component({
  selector: 'app-logo',
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 32 36" xmlns="http://www.w3.org/2000/svg">
      <rect class="telo" x="0.5" y="0.5" width="31" height="35" rx="1" />
      <rect class="krov" width="32" height="4" />

      <rect class="prozor" x="5" y="8" width="6" height="7" />
      <rect class="prozor upaljen" x="14" y="8" width="6" height="7" />
      <rect class="prozor" x="23" y="8" width="6" height="7" />

      <rect class="prozor upaljen" x="5" y="17" width="6" height="7" />
      <rect class="prozor" x="14" y="17" width="6" height="7" />
      <rect class="prozor" x="23" y="17" width="6" height="7" />

      <rect class="prozor" x="5" y="26" width="6" height="7" />
      <rect class="prozor" x="14" y="26" width="6" height="7" />
      <rect class="prozor upaljen" x="23" y="26" width="6" height="7" />
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

    // Iste boje kao velika zgrada na loginu (tokeni iz styles.scss)
    .telo {
      fill: var(--color-fasada);
      stroke: var(--color-ivica);
      stroke-width: 1;
    }

    .krov {
      fill: var(--color-fasada-krov);
    }

    .prozor {
      fill: var(--color-prozor);
    }

    .prozor.upaljen {
      fill: var(--color-svetlo);
    }
  `,
})
export class Logo {}

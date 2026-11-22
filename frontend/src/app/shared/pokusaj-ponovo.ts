import {
  afterNextRender,
  Directive,
  DOCUMENT,
  ElementRef,
  EnvironmentInjector,
  inject,
  OnDestroy,
} from '@angular/core';

@Directive({
  selector: 'button[appPokusajPonovo]',
  host: { '(click)': 'zapamtiOblast()' },
})
export class PokusajPonovo implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dokument = inject(DOCUMENT);
  private readonly injector = inject(EnvironmentInjector);
  private oblast: HTMLElement | null | undefined;

  protected zapamtiOblast(): void {
    this.oblast = this.host.nativeElement.closest<HTMLElement>('section, aside, main');
  }

  ngOnDestroy(): void {
    if (this.oblast === undefined) {
      return;
    }
    const oblast = this.oblast;
    afterNextRender(
      () => {
        const aktivan = this.dokument.activeElement;
        if (aktivan && aktivan !== this.dokument.body) {
          return;
        }
        const cilj = this.cilj(oblast);
        if (!cilj) {
          return;
        }
        if (!cilj.hasAttribute('tabindex')) {
          cilj.setAttribute('tabindex', '-1');
        }
        cilj.focus();
      },
      { injector: this.injector },
    );
  }

  private cilj(oblast: HTMLElement | null): HTMLElement | null {
    if (!oblast?.isConnected) {
      return this.dokument.getElementById('sadrzaj');
    }
    const naslov = oblast.getAttribute('aria-labelledby');
    if (naslov) {
      return this.dokument.getElementById(naslov) ?? oblast;
    }
    if (oblast.tagName === 'MAIN') {
      return oblast.querySelector<HTMLElement>('h1') ?? oblast;
    }
    return oblast;
  }
}

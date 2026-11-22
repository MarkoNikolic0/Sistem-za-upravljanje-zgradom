import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PokusajPonovo } from './pokusaj-ponovo';

@Component({
  imports: [PokusajPonovo],
  template: `
    <section aria-labelledby="naslov-test">
      <h2 id="naslov-test">Kvarovi</h2>
      @if (greska()) {
        <button appPokusajPonovo type="button" (click)="greska.set(false)">Pokušaj ponovo</button>
      } @else {
        <p>Učitano</p>
      }
    </section>
    <section aria-label="Bez naslova">
      @if (drugaGreska()) {
        <button appPokusajPonovo type="button" (click)="drugaGreska.set(false)">
          Pokušaj ponovo
        </button>
      }
    </section>
    <input id="drugo" />
  `,
})
class Domacin {
  readonly greska = signal(true);
  readonly drugaGreska = signal(true);
}

describe('PokusajPonovo', () => {
  async function napravi() {
    const fixture = TestBed.createComponent(Domacin);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const dugmad = () => [...element.querySelectorAll<HTMLButtonElement>('button')];
    return { fixture, element, dugmad };
  }

  it('posle klika fokus prelazi na naslov odeljka kad dugme nestane', async () => {
    const { fixture, element, dugmad } = await napravi();
    dugmad()[0].focus();
    dugmad()[0].click();
    await fixture.whenStable();
    const naslov = element.querySelector('#naslov-test');
    expect(document.activeElement).toBe(naslov);
    expect(naslov?.getAttribute('tabindex')).toBe('-1');
  });

  it('odeljak bez naslova dobija fokus sam', async () => {
    const { fixture, element, dugmad } = await napravi();
    const dugme = dugmad()[1];
    dugme.focus();
    dugme.click();
    await fixture.whenStable();
    expect(document.activeElement).toBe(element.querySelector('[aria-label="Bez naslova"]'));
  });

  it('ne pomera fokus ako dugme nestane bez klika', async () => {
    const { fixture, element } = await napravi();
    const drugo = element.querySelector<HTMLInputElement>('#drugo')!;
    drugo.focus();
    fixture.componentInstance.greska.set(false);
    await fixture.whenStable();
    expect(document.activeElement).toBe(drugo);
  });

  it('ne otima fokus ako je korisnik već na drugom mestu', async () => {
    const { fixture, element, dugmad } = await napravi();
    const drugo = element.querySelector<HTMLInputElement>('#drugo')!;
    dugmad()[0].click();
    drugo.focus();
    await fixture.whenStable();
    expect(document.activeElement).toBe(drugo);
  });
});

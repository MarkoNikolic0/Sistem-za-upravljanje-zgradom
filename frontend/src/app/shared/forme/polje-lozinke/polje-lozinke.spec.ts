import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PoljeLozinke } from './polje-lozinke';

@Component({
  imports: [PoljeLozinke],
  template: `
    <app-polje-lozinke #polje oznaka="novu lozinku">
      <input [type]="polje.sakrivena() ? 'password' : 'text'" />
    </app-polje-lozinke>
  `,
})
class Forma {}

describe('PoljeLozinke', () => {
  it('dugme prikazuje i sakriva lozinku i javlja stanje čitaču ekrana', async () => {
    const fixture = TestBed.createComponent(Forma);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const polje = element.querySelector('input')!;
    const dugme = element.querySelector('button')!;

    expect(polje.type).toBe('password');
    expect(dugme.getAttribute('aria-label')).toBe('Prikaži novu lozinku');
    expect(dugme.getAttribute('aria-pressed')).toBe('false');

    dugme.click();
    await fixture.whenStable();
    expect(polje.type).toBe('text');
    expect(dugme.getAttribute('aria-pressed')).toBe('true');

    dugme.click();
    await fixture.whenStable();
    expect(polje.type).toBe('password');
  });
});

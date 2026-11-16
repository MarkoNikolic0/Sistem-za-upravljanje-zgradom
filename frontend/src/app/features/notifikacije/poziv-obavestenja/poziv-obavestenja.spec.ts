import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Instalacija } from '../../pwa/instalacija';
import { PushObavestenja, StanjePusha } from '../push-obavestenja';
import { PozivObavestenja } from './poziv-obavestenja';

describe('poziv za obaveštenja', () => {
  const pozivInstalacije = signal(false);
  const stanje = signal<StanjePusha>('iskljuceno');
  const iskljucio = signal(false);

  beforeEach(() => {
    localStorage.clear();
    pozivInstalacije.set(false);
    stanje.set('iskljuceno');
    iskljucio.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Instalacija, useValue: { pozivPrikazan: pozivInstalacije } },
        { provide: PushObavestenja, useValue: { stanje, iskljucio } },
      ],
    });
  });

  const prikazan = async () => {
    const fixture = TestBed.createComponent(PozivObavestenja);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent.includes('Obaveštenja na telefonu');
  };

  it('čeka dok je na početnoj poziv za instalaciju, pa ga stanar ne dobija dva odjednom', async () => {
    pozivInstalacije.set(true);
    expect(await prikazan()).toBe(false);
    pozivInstalacije.set(false);
    expect(await prikazan()).toBe(true);
  });

  it('ne nudi se ponovo korisniku koji je isključio obaveštenja', async () => {
    iskljucio.set(true);
    expect(await prikazan()).toBe(false);
  });

  it('ne nudi obaveštenja koja traže instalaciju, za to je poziv za instalaciju', async () => {
    stanje.set('potrebna-instalacija');
    expect(await prikazan()).toBe(false);
  });
});

import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withViewTransitions } from '@angular/router';
import { preskociNepotrebanPrelaz } from './prelaz-stranice';

@Component({ template: '' })
class Prazna {}

interface LazniPrelaz {
  skipTransition: ReturnType<typeof vi.fn>;
}

describe('prelaz između stranica', () => {
  let prelazi: LazniPrelaz[];
  let smanjenoKretanje: boolean;
  let router: Router;

  beforeEach(async () => {
    prelazi = [];
    smanjenoKretanje = false;
    vi.stubGlobal('matchMedia', (upit: string) => ({
      matches: upit.includes('reduce') && smanjenoKretanje,
    }));
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (azuriraj: () => Promise<void>) => {
        const prelaz = {
          skipTransition: vi.fn(),
          updateCallbackDone: Promise.resolve(azuriraj()),
          ready: Promise.resolve(),
          finished: Promise.resolve(),
        };
        prelazi.push(prelaz);
        return prelaz;
      },
    });

    TestBed.configureTestingModule({
      providers: [
        provideLocationMocks(),
        provideRouter(
          [
            { path: '', component: Prazna },
            { path: 'kvarovi', component: Prazna },
            { path: 'kvarovi/:id', component: Prazna },
          ],
          withViewTransitions({
            skipInitialTransition: true,
            onViewTransitionCreated: preskociNepotrebanPrelaz,
          }),
        ),
      ],
    });
    router = TestBed.inject(Router);
    router.initialNavigation();
    await vi.waitFor(() => expect(router.navigated).toBe(true));
    prelazi.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (document as Partial<Document>).startViewTransition;
  });

  it('prelazak na drugu stranicu ima prelaz', async () => {
    await router.navigateByUrl('/kvarovi');
    await router.navigateByUrl('/kvarovi/5');

    expect(prelazi).toHaveLength(2);
    expect(prelazi.every((p) => p.skipTransition.mock.calls.length === 0)).toBe(true);
  });

  it('promena samo upita ili fragmenta na istoj stranici preskače prelaz', async () => {
    await router.navigateByUrl('/kvarovi');
    prelazi.length = 0;

    await router.navigateByUrl('/kvarovi?strana=2');
    await router.navigateByUrl('/kvarovi?strana=2#vrh');

    expect(prelazi).toHaveLength(2);
    expect(prelazi.every((p) => p.skipTransition.mock.calls.length === 1)).toBe(true);
  });

  it('nazad i napred preskaču prelaz', async () => {
    await router.navigateByUrl('/kvarovi');
    prelazi.length = 0;

    TestBed.inject(Location).back();
    await vi.waitFor(() => expect(router.url).toBe('/'));

    expect(prelazi).toHaveLength(1);
    expect(prelazi[0].skipTransition).toHaveBeenCalledOnce();
  });

  it('uz smanjeno kretanje prelaz se preskače', async () => {
    smanjenoKretanje = true;

    await router.navigateByUrl('/kvarovi');

    expect(prelazi).toHaveLength(1);
    expect(prelazi[0].skipTransition).toHaveBeenCalledOnce();
  });
});

import { TestBed } from '@angular/core/testing';
import { StanjeMreze } from '../stanje-mreze';
import { BezMreze, ODLOZENA_NAJAVA_MS } from './bez-mreze';

describe('BezMreze', () => {
  afterEach(() => vi.restoreAllMocks());

  async function napravi() {
    const fixture = TestBed.createComponent(BezMreze);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const ispis = element.textContent;
    await new Promise((resolve) => setTimeout(resolve, ODLOZENA_NAJAVA_MS));
    await fixture.whenStable();
    return { fixture, element, ispis };
  }

  it('poruka se pojavi bez mreže i nestane kad server ponovo odgovori', async () => {
    const { fixture, element } = await napravi();
    expect(element.getAttribute('role')).toBe('status');
    expect(element.textContent).not.toContain('Nema mreže.');

    window.dispatchEvent(new Event('offline'));
    await fixture.whenStable();
    expect(element.textContent).toContain('Nema mreže.');

    TestBed.inject(StanjeMreze).serverOdgovara();
    await fixture.whenStable();
    expect(element.textContent).not.toContain('Nema mreže.');
  });

  it('bez mreže pri otvaranju poruka stiže tek posle prvog crtanja, da je čitač ekrana najavi', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { element, ispis } = await napravi();
    expect(ispis).not.toContain('Nema mreže.');
    expect(element.textContent).toContain('Nema mreže.');
  });
});
